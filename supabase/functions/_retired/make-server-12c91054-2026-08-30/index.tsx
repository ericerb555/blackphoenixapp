import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

// Edge function entrypoint for the Design CAD Center.
const app = new Hono();
const P = "/make-server-12c91054";

// ---------------------------------------------------------------------------
// Storage — private bucket for user-uploaded reference photos & videos.
// ---------------------------------------------------------------------------
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const MEDIA_BUCKET = "make-12c91054-media";

// ---------------------------------------------------------------------------
// Who is asking? Two kinds of people reach this function:
//   * staff  — the contractor and their employees, who see everything
//   * a customer — who sees only their own folder, and only when signed in
// Anything not in one of those two buckets gets nothing.
// ---------------------------------------------------------------------------

interface Caller {
  id: string;
  email: string;
  staff: boolean;
  /** The role you granted this account: "owner", "tech", "customer", "". */
  role?: string;
  /** The role their sign-up put on the account — a hint, never access. */
  signupRole?: string;
  /** Their name from sign-up, when they gave one. */
  name?: string;
  /** The customer record this caller owns, when they are a customer. */
  customerId: string | null;
}

/**
 * Roles that open the office side. You hand these out yourself on the Team
 * access page — an account's own sign-up role is only ever a hint.
 */
const STAFF_ROLES = [
  "owner",
  "admin",
  "manager",
  "office",
  "dispatcher",
  "estimator",
  "sales",
  "foreman",
  "tech",
  "employee",
];

/** Roles that mean "this person is a customer" — never staff, whatever else. */
const CUSTOMER_ROLES = ["customer", "client", "homeowner", "lead", "prospect"];

/** Every role-ish value we can find on an account, lowercased. */
function rolesOf(user: any): string[] {
  const meta = { ...(user?.app_metadata ?? {}), ...(user?.user_metadata ?? {}) } as any;
  const raw = [
    meta.role,
    meta.user_role,
    meta.user_type,
    meta.account_type,
    meta.type,
    ...(Array.isArray(meta.roles) ? meta.roles : []),
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ];
  return raw
    .filter((r) => typeof r === "string")
    .map((r) => r.trim().toLowerCase().replace(/[\s-]+/g, "_"))
    .filter(Boolean);
}

/** The role you granted an email, if any. */
async function grantedRole(email: string): Promise<string> {
  if (!email) return "";
  const record = await kv.get(`staff:${email}`);
  if (!record || record.active === false) return "";
  return String(record.role ?? "").toLowerCase();
}

/** Emails allowed to act as staff, from the STAFF_EMAILS secret (comma list). */
function staffEmails(): string[] {
  return (Deno.env.get("STAFF_EMAILS") ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True while no staff list is configured — the first-run bootstrap state. */
function staffListMissing(): boolean {
  return staffEmails().length === 0;
}

/**
 * Note that this account exists so it shows up on the Team access page the
 * moment its owner signs in for the first time. Called from /me only, so it's
 * one write per app load, not one per request.
 */
async function rememberAccount(caller: Caller): Promise<any> {
  const email = caller.email;
  const key = `account:${email}`;
  const existing = (await kv.get(key)) ?? null;
  const record = {
    email,
    userId: caller.id,
    name: caller.name || existing?.name || "",
    signupRole: caller.signupRole ?? "",
    firstSeen: existing?.firstSeen ?? new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  await kv.set(key, record);
  return record;
}

/**
 * Resolve the signed-in user from the Authorization header. Returns null when
 * the header carries only the anon key (an unauthenticated visitor).
 *
 * Access is whatever you granted this email — nothing else. Signing in proves
 * who someone is; it does not, on its own, get them in.
 */
async function callerOf(c: any): Promise<Caller | null> {
  try {
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const user = data?.user;
    if (error || !user) return null;

    const email = (user.email ?? "").toLowerCase();
    const [owned, granted] = await Promise.all([
      email ? kv.get(`customer-user:${email}`) : null,
      grantedRole(email),
    ]);
    const customerId = owned?.customerId ?? null;
    const listed = staffEmails().includes(email);

    return {
      id: user.id,
      email,
      role: listed && !granted ? "owner" : granted,
      signupRole: rolesOf(user)[0] ?? "",
      name:
        (user.user_metadata as any)?.name ??
        (user.user_metadata as any)?.full_name ??
        "",
      staff: listed || STAFF_ROLES.includes(granted),
      customerId,
    };
  } catch (err) {
    console.log(`Error resolving the caller from the access token: ${err}`);
    return null;
  }
}

/**
 * Office routes are open — there is no sign-in on the Design CAD Center side.
 * When someone IS signed in we still resolve them, so anything that records who
 * did what stays accurate. The customer portal is a different story: it is
 * still gated, so a customer only ever sees their own folder.
 *
 * To put the office behind a login again, restore the two checks below.
 */
async function requireStaff(c: any): Promise<{ caller: Caller } | Response> {
  const caller = await callerOf(c);
  return {
    caller: caller ?? { id: "", email: "office", staff: true, customerId: null },
  };
}

function isResponse(x: unknown): x is Response {
  return typeof Response !== "undefined" && x instanceof Response;
}


let bucketReady: Promise<void> | null = null;
async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const exists = buckets?.some((b) => b.name === MEDIA_BUCKET);
        if (!exists) await supabaseAdmin.storage.createBucket(MEDIA_BUCKET);
      } catch (err) {
        console.log(`Error ensuring media bucket: ${err}`);
      }
    })();
  }
  return bucketReady;
}

interface StoredMedia {
  id: string;
  type: "image" | "video";
  name?: string;
  path: string; // storage object path (private)
}

/** Upload all files from a multipart form (fields "file"/"file0"…) to storage. */
async function uploadFormMedia(form: FormData): Promise<StoredMedia[]> {
  const files = form
    .getAll("file")
    .concat(form.getAll("files"))
    .filter((f): f is File => f instanceof File);
  if (!files.length) return [];
  await ensureBucket();
  const out: StoredMedia[] = [];
  for (const file of files) {
    try {
      const mime = file.type || "application/octet-stream";
      const isVideo = mime.startsWith("video");
      const ext = (file.name?.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
      const path = `${uid("m")}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error } = await supabaseAdmin.storage
        .from(MEDIA_BUCKET)
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (error) {
        console.log(`Media upload failed for ${file.name}: ${error.message}`);
        continue;
      }
      out.push({
        id: uid("md"),
        type: isVideo ? "video" : "image",
        name: file.name || undefined,
        path,
      });
    } catch (err) {
      console.log(`Error uploading a media file: ${err}`);
    }
  }
  return out;
}

/** Turn stored media paths into signed URLs the frontend can render. */
async function signMedia(media: any[]): Promise<any[]> {
  if (!Array.isArray(media) || !media.length) return [];
  return Promise.all(
    media.map(async (m) => {
      if (!m?.path) return m; // already a URL (external / legacy)
      try {
        const { data } = await supabaseAdmin.storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(m.path, 60 * 60 * 24 * 7); // 7 days
        return { ...m, url: data?.signedUrl ?? "" };
      } catch (err) {
        console.log(`Error signing media ${m.path}: ${err}`);
        return { ...m, url: "" };
      }
    }),
  );
}

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get(`${P}/health`, (c) => c.json({ status: "ok" }));

// ---------------------------------------------------------------------------
// Materials Hub — shared, editable unit-cost catalog (kv key: "materials:catalog")
// Stores only the price overrides keyed by CostKey; the client merges these over
// the built-in national-average defaults so the estimate stays in sync.
// ---------------------------------------------------------------------------
app.get(`${P}/materials`, async (c) => {
  try {
    const catalog = (await kv.get("materials:catalog")) ?? { costs: {}, zip: "", updatedAt: null };
    return c.json(catalog);
  } catch (err) {
    console.log(`Error loading materials catalog: ${err}`);
    return c.json({ error: `Failed to load materials catalog: ${err}` }, 500);
  }
});

app.put(`${P}/materials`, async (c) => {
  try {
    const body = await c.req.json();
    const costs = body?.costs && typeof body.costs === "object" ? body.costs : {};
    // Keep only finite positive numbers to avoid poisoning the estimate.
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(costs)) {
      const n = Number(v);
      if (isFinite(n) && n > 0) clean[k] = Math.round(n * 100) / 100;
    }
    const zip = String(body?.zip ?? "").replace(/\D/g, "").slice(0, 5);
    const record = { costs: clean, zip, updatedAt: new Date().toISOString() };
    await kv.set("materials:catalog", record);
    return c.json(record);
  } catch (err) {
    console.log(`Error saving materials catalog: ${err}`);
    return c.json({ error: `Failed to save materials catalog: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Supplier price sync — pulls live retail pricing for representative products
// from a home-improvement supplier and maps them to estimate CostKeys as
// suggested INSTALLED unit costs (retail material × labor/waste uplift). These
// are returned as suggestions for the user to review & apply in the Materials
// Hub, never auto-written. Uses SerpApi's Home Depot / Lowe's engines.
// ---------------------------------------------------------------------------

// For each CostKey we can price from retail: a search query, the unit the
// estimate uses, how much retail product covers one estimate unit, and an
// installed uplift (labor + waste + fasteners) applied to the material cost.
interface SyncSpec {
  key: string;
  query: string;
  // retail is typically priced per-piece/bundle; coverage converts a retail
  // unit price into an estimate-unit material cost (× per estimate unit).
  perUnit: number; // material $ per estimate unit = retailPrice × perUnit
  uplift: number; // installed = material × uplift
  label: string;
}

const SYNC_SPECS: SyncSpec[] = [
  { key: "shingles", query: "architectural roofing shingles bundle", perUnit: 0.34, uplift: 2.4, label: "Shingle bundle (≈33 sf)" },
  { key: "metalRoof", query: "standing seam metal roof panel", perUnit: 0.42, uplift: 2.3, label: "Metal roof panel" },
  { key: "sidingVinyl", query: "vinyl siding panel", perUnit: 0.5, uplift: 2.2, label: "Vinyl siding" },
  { key: "sidingFiber", query: "james hardie fiber cement siding plank", perUnit: 0.6, uplift: 2.2, label: "Fiber-cement siding" },
  { key: "drywall", query: "1/2 in drywall sheet 4x8", perUnit: 0.031, uplift: 2.4, label: "Drywall sheet (32 sf)" },
  { key: "insulation", query: "r13 fiberglass insulation batt", perUnit: 0.02, uplift: 2.2, label: "Insulation batt" },
  { key: "deckBoardPT", query: "pressure treated deck board 5/4x6x12", perUnit: 0.36, uplift: 2.2, label: "PT deck board" },
  { key: "deckBoardComposite", query: "composite decking board 12 ft", perUnit: 0.42, uplift: 2.0, label: "Composite deck board" },
  { key: "window", query: "vinyl double hung window", perUnit: 1, uplift: 2.0, label: "Window" },
  { key: "extDoor", query: "steel entry exterior door", perUnit: 1, uplift: 2.1, label: "Exterior door" },
  { key: "railing", query: "aluminum deck railing kit 6 ft", perUnit: 0.167, uplift: 2.2, label: "Deck railing" },
  { key: "flooring", query: "luxury vinyl plank flooring box", perUnit: 0.045, uplift: 2.0, label: "LVP flooring (≈22 sf box)" },
];

const SUPPLIER_ENGINE: Record<string, string> = {
  "home-depot": "home_depot",
  "homedepot": "home_depot",
  "lowes": "lowes",
  "lowe's": "lowes",
};

async function serpProductPrice(engine: string, query: string, apiKey: string): Promise<number | null> {
  const url =
    `https://serpapi.com/search.json?engine=${engine}` +
    `&q=${encodeURIComponent(query)}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`SerpApi ${engine} error (${res.status}) for "${query}"`);
    return null;
  }
  const data = await res.json();
  const products =
    data?.products || data?.shopping_results || data?.organic_results || [];
  for (const p of products) {
    const raw = p?.price ?? p?.extracted_price ?? p?.price_raw;
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
    if (isFinite(n) && n > 0) return n;
  }
  return null;
}

app.post(`${P}/materials/sync`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const supplierRaw = String(body?.supplier ?? "home-depot").toLowerCase();
    const engine = SUPPLIER_ENGINE[supplierRaw] ?? "home_depot";
    const supplier = engine === "lowes" ? "Lowe's" : "The Home Depot";

    const apiKey =
      engine === "lowes"
        ? Deno.env.get("LOWES_API_KEY")
        : Deno.env.get("HOME_DEPOT_API_KEY");
    if (!apiKey) {
      return c.json(
        { error: `${supplier} pricing API key is not configured on the server.` },
        501,
      );
    }

    const suggestions: Record<string, number> = {};
    const sources: Record<string, { product: string; retail: number }> = {};
    // Query specs sequentially-ish but bounded; failures per-item are skipped.
    await Promise.all(
      SYNC_SPECS.map(async (spec) => {
        try {
          const retail = await serpProductPrice(engine, spec.query, apiKey);
          if (retail == null) return;
          const installed = Math.round(retail * spec.perUnit * spec.uplift * 100) / 100;
          if (installed > 0) {
            suggestions[spec.key] = installed;
            sources[spec.key] = { product: spec.label, retail: Math.round(retail * 100) / 100 };
          }
        } catch (err) {
          console.log(`Sync failed for ${spec.key}: ${err}`);
        }
      }),
    );

    const count = Object.keys(suggestions).length;
    if (count === 0) {
      return c.json(
        { error: `No pricing could be retrieved from ${supplier}. Check the API key and try again.` },
        502,
      );
    }

    return c.json({
      supplier,
      suggestions,
      sources,
      fetchedAt: new Date().toISOString(),
      note: `Live ${supplier} retail pricing, converted to installed unit costs (material × labor/waste uplift). Review before applying.`,
    });
  } catch (err) {
    console.log(`Error syncing supplier pricing: ${err}`);
    return c.json({ error: `Failed to sync supplier pricing: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Saved quotes with version history  (kv keys: "quote:<id>")
// A quote bundles the priced estimate snapshot + the project seed (so it can be
// reopened in the 3D workspace). Each save to an existing id appends a version
// snapshot rather than overwriting, giving a simple revision trail.
// ---------------------------------------------------------------------------
app.get(`${P}/quotes`, async (c) => {
  try {
    const quotes = await kv.getByPrefix("quote:");
    // Return lightweight summaries (drop the heavy version payloads for the list).
    const summaries = quotes
      .map((q: any) => ({
        id: q.id,
        name: q.name,
        customer: q.customer ?? "",
        location: q.location ?? "",
        moduleId: q.moduleId,
        seed: q.seed ?? "",
        total: q.total,
        perSqft: q.perSqft,
        areaSqft: q.areaSqft,
        regionLabel: q.regionLabel ?? "",
        versionCount: Array.isArray(q.versions) ? q.versions.length : 0,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      }))
      .sort((a: any, b: any) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""));
    return c.json({ quotes: summaries });
  } catch (err) {
    console.log(`Error listing quotes: ${err}`);
    return c.json({ error: `Failed to list quotes: ${err}` }, 500);
  }
});

app.get(`${P}/quotes/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const quote = await kv.get(`quote:${id}`);
    if (!quote) return c.json({ error: `Quote ${id} not found` }, 404);
    return c.json({ quote });
  } catch (err) {
    console.log(`Error fetching quote: ${err}`);
    return c.json({ error: `Failed to fetch quote: ${err}` }, 500);
  }
});

app.post(`${P}/quotes`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const now = new Date().toISOString();
    // A single version snapshot carries the full priced estimate + params.
    const snapshot = {
      estimate: body.estimate ?? null,
      params: body.params ?? {},
      widthFt: body.widthFt ?? null,
      depthFt: body.depthFt ?? null,
      markupPct: body.markupPct ?? null,
      zip: body.zip ?? "",
      note: body.note ?? "",
      savedAt: now,
    };

    const existingId = body.id ? String(body.id) : null;
    const existing = existingId ? await kv.get(`quote:${existingId}`) : null;

    let record: any;
    if (existing) {
      const versions = Array.isArray(existing.versions) ? existing.versions : [];
      versions.push({ ...snapshot, version: versions.length + 1 });
      record = {
        ...existing,
        name: body.name ?? existing.name,
        customer: body.customer ?? existing.customer ?? "",
        location: body.location ?? existing.location ?? "",
        moduleId: body.moduleId ?? existing.moduleId,
        seed: body.seed ?? existing.seed ?? "",
        total: body.estimate?.total ?? existing.total,
        perSqft: body.estimate?.perSqft ?? existing.perSqft,
        areaSqft: body.estimate?.areaSqft ?? existing.areaSqft,
        regionLabel: body.estimate?.regionLabel ?? existing.regionLabel ?? "",
        versions,
        updatedAt: now,
      };
    } else {
      const id = existingId ?? uid("q");
      record = {
        id,
        name: body.name ?? "Untitled Quote",
        customer: body.customer ?? "",
        location: body.location ?? "",
        moduleId: body.moduleId ?? "house",
        seed: body.seed ?? "",
        total: body.estimate?.total ?? 0,
        perSqft: body.estimate?.perSqft ?? 0,
        areaSqft: body.estimate?.areaSqft ?? 0,
        regionLabel: body.estimate?.regionLabel ?? "",
        versions: [{ ...snapshot, version: 1 }],
        createdAt: now,
        updatedAt: now,
      };
    }
    await kv.set(`quote:${record.id}`, record);
    return c.json({ quote: record });
  } catch (err) {
    console.log(`Error saving quote: ${err}`);
    return c.json({ error: `Failed to save quote: ${err}` }, 500);
  }
});

app.delete(`${P}/quotes/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`quote:${id}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error deleting quote: ${err}`);
    return c.json({ error: `Failed to delete quote: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Work requests  (kv keys: "wr:<id>")
// ---------------------------------------------------------------------------
app.get(`${P}/work-requests`, async (c) => {
  try {
    const requests = await kv.getByPrefix("wr:");
    requests.sort((a: any, b: any) =>
      (b?.createdAt ?? "").localeCompare(a?.createdAt ?? ""),
    );
    for (const r of requests) {
      if (r?.media?.length) r.media = await signMedia(r.media);
    }
    return c.json({ requests });
  } catch (err) {
    console.log(`Error listing work requests: ${err}`);
    return c.json({ error: `Failed to list work requests: ${err}` }, 500);
  }
});

app.get(`${P}/work-requests/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const request = await kv.get(`wr:${id}`);
    if (!request) return c.json({ error: `Work request ${id} not found` }, 404);
    if (request?.media?.length) request.media = await signMedia(request.media);
    return c.json({ request });
  } catch (err) {
    console.log(`Error fetching work request: ${err}`);
    return c.json({ error: `Failed to fetch work request: ${err}` }, 500);
  }
});

app.post(`${P}/work-requests`, async (c) => {
  try {
    const contentType = c.req.header("content-type") ?? "";
    let body: any = {};
    let uploaded: StoredMedia[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.formData();
      body = {
        request: form.get("request") ?? form.get("description") ?? "",
        title: form.get("title") ?? undefined,
        requester: form.get("requester") ?? undefined,
        location: form.get("location") ?? undefined,
        address: form.get("address") ?? undefined,
        routed: (() => {
          try {
            return JSON.parse(String(form.get("routed") ?? "[]"));
          } catch {
            return [];
          }
        })(),
        // Optional linked/property JSON blobs pulled from the address lookup.
        property: (() => {
          try {
            const v = form.get("property");
            return v ? JSON.parse(String(v)) : undefined;
          } catch {
            return undefined;
          }
        })(),
        customer: (() => {
          try {
            const v = form.get("customer");
            return v ? JSON.parse(String(v)) : undefined;
          } catch {
            return undefined;
          }
        })(),
        documents: (() => {
          try {
            const v = form.get("documents");
            return v ? JSON.parse(String(v)) : undefined;
          } catch {
            return undefined;
          }
        })(),
      };
      uploaded = await uploadFormMedia(form);
    } else {
      body = await c.req.json().catch(() => ({}));
    }

    const text: string = String(body.request ?? body.description ?? "");
    if (!text.trim()) {
      return c.json({ error: "Missing 'request' text in body" }, 400);
    }
    const id = uid("wr");
    const firstLine = text.split("\n")[0].slice(0, 80);
    // Persist storage paths (not signed URLs, which expire); sign on read.
    const media = uploaded.length ? uploaded : body.media ?? [];
    const request = {
      id,
      title: body.title ?? firstLine ?? "Work Request",
      description: text,
      status: "new",
      createdAt: new Date().toISOString(),
      requester: body.requester ?? "Design Intake",
      location: body.location,
      address: body.address,
      // Parcel/zoning/setbacks snapshot + auto-linked customer/documents folder
      // captured from the address lookup at intake time (all optional).
      property: body.property,
      customer: body.customer,
      documents: body.documents,
      routed: body.routed ?? [],
      media,
    };
    await kv.set(`wr:${id}`, request);
    // Return with signed URLs so the client can show what was uploaded.
    return c.json({ request: { ...request, media: await signMedia(media) } });
  } catch (err) {
    console.log(`Error creating work request: ${err}`);
    return c.json({ error: `Failed to create work request: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Projects  (kv keys: "project:<id>")
// ---------------------------------------------------------------------------
app.get(`${P}/projects`, async (c) => {
  try {
    const projects = await kv.getByPrefix("project:");
    projects.sort((a: any, b: any) =>
      (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""),
    );
    return c.json({ projects });
  } catch (err) {
    console.log(`Error listing projects: ${err}`);
    return c.json({ error: `Failed to list projects: ${err}` }, 500);
  }
});

app.post(`${P}/projects`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const id = body.id ?? uid("p");
    const elements = Array.isArray(body.elements) ? body.elements : [];
    const project = {
      id,
      name: body.name ?? "Untitled Design",
      type: body.type ?? "structural",
      status: body.status ?? "draft",
      updatedAt: new Date().toISOString(),
      elements: elements.length,
      location: body.location,
      // Keep the full element payload so a saved project can be reopened.
      data: elements,
    };
    await kv.set(`project:${id}`, project);
    return c.json({ project });
  } catch (err) {
    console.log(`Error saving project: ${err}`);
    return c.json({ error: `Failed to save project: ${err}` }, 500);
  }
});

app.get(`${P}/projects/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    if (!project) return c.json({ error: `Project ${id} not found` }, 404);
    return c.json({ project });
  } catch (err) {
    console.log(`Error fetching project: ${err}`);
    return c.json({ error: `Failed to fetch project: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Generate  (records a deliverable-generation job)
// ---------------------------------------------------------------------------
app.post(`${P}/generate`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const jobId = uid("gen");
    const job = {
      id: jobId,
      module: body.module ?? "unknown",
      dimension: body.dimension ?? null,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    await kv.set(`gen:${jobId}`, job);
    return c.json({ ok: true, job });
  } catch (err) {
    console.log(`Error creating generate job: ${err}`);
    return c.json({ error: `Failed to create generate job: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Blueprint vision analysis (OpenAI). Frontend posts multipart with "file".
// Falls back to mock on the client if this errors.
// ---------------------------------------------------------------------------
async function analyzeFloorplan(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return c.json({ error: "Missing 'file' in form data" }, 400);
    }
    const buf = new Uint8Array(await (file as File).arrayBuffer());
    // base64 encode
    let binary = "";
    for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const b64 = btoa(binary);
    const mime = (file as File).type || "image/png";

    const prompt =
      "You are an architectural plan analyzer. Examine this floor plan image and " +
      "return STRICT JSON only, matching exactly this TypeScript type: " +
      '{ "rooms": {"name": string, "areaSqm": number, "type": string}[], ' +
      '"totalAreaSqm": number, "walls": number, "doors": number, "windows": number, ' +
      '"confidence": number, "scaleNote": string }. ' +
      "type is one of living|sleeping|service|circulation. confidence is 0..1. " +
      "Estimate reasonable values if the scale is unclear and note it in scaleNote.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI vision error (${res.status}): ${detail}`);
      return c.json({ error: `Vision API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content);
    return c.json(analysis);
  } catch (err) {
    console.log(`Error analyzing floorplan: ${err}`);
    return c.json({ error: `Failed to analyze floorplan: ${err}` }, 500);
  }
}

app.post(`${P}/project-vision/analyze`, analyzeFloorplan);
app.post(`${P}/ai-floorplan`, analyzeFloorplan);

// ---------------------------------------------------------------------------
// House takeoff (OpenAI vision). Frontend posts multipart with "file" (a photo
// or captured video frame of a house). Returns parametric-house parameters the
// 3D House Builder can seed itself with. Frontend falls back to a sensible
// default model on any error.
// ---------------------------------------------------------------------------
async function analyzeHouse(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    // Accept one or many angles of the same house (field "file" repeated, or
    // "files"). Fusing multiple views yields a far better footprint/roof estimate.
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File && f.type.startsWith("image"))
      .slice(0, 6);
    if (!files.length) {
      return c.json({ error: "Missing 'file' in form data" }, 400);
    }
    const imageParts: any[] = [];
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const b64 = btoa(binary);
      const mime = file.type || "image/jpeg";
      // "high" detail keeps enough resolution to read siding lap, brick courses,
      // window mullions and roof pitch — critical for an accurate takeoff.
      imageParts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}`, detail: "high" },
      });
    }

    // Full allowed palettes — must stay in sync with SIDING/ROOF/TRIM/DOOR
    // options in src/app/components/viewport/parametric.ts so the model can pick
    // exactly what it sees instead of being clamped to a handful of colors.
    const SIDING =
      "sidingWhite|sidingCream|sidingGray|sidingCharcoal|sidingBlack|sidingBlue|sidingNavy|sidingSage|sidingMoss|sidingGreen|sidingBeige|sidingTan|sidingClay|sidingYellow|sidingRed|brick|brickBlend|brickBrown|brickTan|brickGray|brickCharcoal|brickWhite|stucco|stoneVeneer|stoneGray";
    const ROOFC =
      "roofCharcoal|roofBlack|roofGray|roofWeathered|roofBrown|roofDesertTan|roofGreen|roofBarnRed|roofTerracotta|roofSlateBlue|roofCopper|roofSilver|roofBronzeMetal";
    const TRIM = "trimWhite|trimAlmond|trimGray|trimBlack|trimBronze|trimGreen|trimNavy";
    const DOOR = "walnut|doorRed|doorBlack|doorBlue|doorGreen|doorTeal|doorWhite";
    const FOUND = "concrete|stoneGray|stoneVeneer|brickCharcoal";

    const multi = files.length > 1;
    const prompt =
      "You are a precise architectural takeoff assistant. Your job is to reconstruct " +
      "a real house as a parametric 3D model as ACCURATELY as possible from photos. " +
      (multi
        ? `You are given ${files.length} photos/video frames of the SAME house from different angles. ` +
          "Fuse ALL views into one consistent model: use the front elevation for width and " +
          "the raking/side views for depth, count stories from the clearest view, and resolve " +
          "roof type, pitch and materials from whichever angle shows each best. Do not average " +
          "away real detail — prefer the sharpest view for each attribute. "
        : "Study this single photo of a house carefully. ") +
      "MEASUREMENT METHOD — estimate real dimensions by scaling against standard reference " +
      "objects visible in the image: an entry door is ~3 ft wide and ~6.7 ft tall; a single " +
      "garage door is ~9 ft wide x ~7 ft tall (double ~16 ft); one finished story is ~9-10 ft " +
      "floor-to-floor; a brick course is ~2.66 in; clapboard/lap siding reveals are ~4-8 in; " +
      "standard windows are ~3 ft wide x ~4-5 ft tall. Count window bays and door/garage widths " +
      "along the front to derive widthFt, and use the side wall length (via perspective) for depthFt. " +
      "Cross-check story count against total wall height. " +
      "Return STRICT JSON only, matching EXACTLY this TypeScript type: " +
      '{ "stories": number, "storyHeight": number, "widthFt": number, "depthFt": number, ' +
      '"roofType": "gable"|"hip"|"shed"|"flat", "roofPitch": number, "overhang": number, ' +
      '"dormers": number, "chimney": boolean, ' +
      `"siding": "${SIDING}", ` +
      `"roofColor": "${ROOFC}", ` +
      `"trim": "${TRIM}", "door": "${DOOR}", "foundationColor": "${FOUND}", ` +
      '"massing": "rect"|"L", "wingSide": "left"|"right", "wingWidthFt": number, ' +
      '"wingProjectFt": number, "coveredEntry": boolean, ' +
      '"garage": boolean, "garageBays": number, "garageSide": "left"|"right", ' +
      `"garageDoorColor": "${TRIM}", "windowsPerFloorFront": number, ` +
      '"deck": { "present": boolean, "widthFt": number, "depthFt": number, ' +
      '"flooring": string, "covered": boolean, "side": "front"|"back"|"left"|"right" } | null, ' +
      '"confidence": number, "notes": string }. ' +
      "If an existing deck/porch is visible, fill 'deck' by measuring it the same way (door=3ft, " +
      "step tread=~10-11in, riser=~7in, deck board=5.5in wide, balusters 4in apart) and describe its " +
      "flooring in plain words (e.g. 'gray composite','brown pvc','natural cedar','pressure treated') " +
      "and whether it has a solid roof (covered) or is open. If no deck is visible, set deck to null. " +
      "Rules: stories 1-3 (integer). storyHeight feet 8-12. widthFt/depthFt overall footprint " +
      "feet (typically 20-70). roofPitch rise per 12 (flat=0, low=3-4, typical=6, steep=9-12). " +
      "overhang eave depth in feet (0-3, typical ~1). dormers 0-3. garageBays 0-3 (0 if no garage). " +
      "massing = the footprint/roof shape: 'rect' for a simple single-gable rectangular block, or " +
      "'L' when a section of the house PROJECTS toward the front with its own gable (a cross-gabled / " +
      "L-shaped home, common with a projecting garage or front wing). If 'L', set wingSide ('left'/'right' " +
      "as you look at the house) to the projecting section's side, wingWidthFt to how wide that projecting " +
      "wing is, and wingProjectFt to how far it juts forward past the main wall (feet). " +
      "coveredEntry = true if there is a roofed porch/portico over the front door on posts. " +
      "garageSide = which side of the front elevation the attached garage sits on as YOU look at the " +
      "house ('left' or 'right'); pick the closest garageDoorColor from the trim list. " +
      "windowsPerFloorFront = the exact number of windows across the FRONT elevation on a single floor " +
      "(count them directly; do not guess) — this drives the modeled facade, so be precise. Pick the SINGLE closest value " +
      "from each allowed list for siding, roofColor, trim, door and foundationColor — match the actual " +
      "observed hue and material (brick vs lap siding vs stucco vs stone). " +
      "confidence 0..1" +
      (multi ? " (higher when the angles agree)" : "") +
      ". In notes, briefly state which reference objects you scaled from and any assumptions.";

    const model = Deno.env.get("HOUSE_VISION_MODEL") || "gpt-4o";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        // Low temperature keeps measurements stable across repeat scans.
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }, ...imageParts],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI house vision error (${res.status}): ${detail}`);
      return c.json({ error: `Vision API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content);
    return c.json(analysis);
  } catch (err) {
    console.log(`Error analyzing house: ${err}`);
    return c.json({ error: `Failed to analyze house: ${err}` }, 500);
  }
}

app.post(`${P}/house-vision/analyze`, analyzeHouse);

// ---------------------------------------------------------------------------
// Deck / porch measurement takeoff (OpenAI vision). Frontend posts multipart
// with one or many "file" photos of the existing deck/porch. Returns real-world
// dimensions estimated by scaling against standard reference objects, plus
// framing-ready spans so the 3D build and permit takeoff start from measured
// numbers instead of guesses. Frontend falls back gracefully on any error.
// ---------------------------------------------------------------------------
async function measureDeck(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File && f.type.startsWith("image"))
      .slice(0, 6);
    if (!files.length) return c.json({ error: "Missing 'file' in form data" }, 400);

    // Optional known reference the contractor can supply to anchor the scale
    // (e.g. "front door is 36 inches wide" or "one board is 5.5in").
    const knownRef = String(form.get("knownRef") ?? "").trim();

    const imageParts: any[] = [];
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const b64 = btoa(binary);
      const mime = file.type || "image/jpeg";
      imageParts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}`, detail: "high" },
      });
    }

    const multi = files.length > 1;
    const prompt =
      "You are a precise deck/porch takeoff estimator for a contractor pulling a " +
      "building permit. Measure the EXISTING deck or porch in the photo(s) as " +
      "accurately as possible and return STRICT JSON only, matching exactly this " +
      "TypeScript type: " +
      '{ "sides": {"name": string, "lengthFt": number, "depthFt": number}[], ' +
      '"overallLengthFt": number, "overallDepthFt": number, "areaSqft": number, ' +
      '"heightOffGradeFt": number, "wraparound": boolean, ' +
      '"stairs": {"location": string, "widthFt": number, "steps": number}[], ' +
      '"postCount": number, "postSpacingFt": number, "beamSpanFt": number, ' +
      '"joistSpanFt": number, "joistSpacingIn": number, ' +
      '"recommendedJoist": string, "recommendedBeam": string, "recommendedPost": string, ' +
      '"footingCount": number, "confidence": number, "scaleNote": string, "summary": string }. ' +
      "MEASUREMENT METHOD — scale against standard reference objects visible in the " +
      "image: an entry door is ~3 ft wide and ~6.7 ft tall; one deck board is ~5.5 in " +
      "wide (5/4x6); a stair riser is ~7 in tall and a tread ~11 in deep; railing height " +
      "is ~36 in; one story is ~9-10 ft; brick course ~2.66 in; lap siding reveal ~4-8 in. " +
      (knownRef ? `KNOWN REFERENCE from the contractor (trust this to anchor scale): ${knownRef}. ` : "") +
      (multi
        ? `You are given ${files.length} photos of the SAME deck/porch from different angles. ` +
          "Fuse ALL views: list EACH run of the porch as a separate entry in \"sides\" " +
          "(e.g. front, right return, back), measuring each run's length and depth. Sum " +
          "them for overallLengthFt. Set wraparound=true if it turns a corner. "
        : "From this single view, estimate each visible run in \"sides\" and note in " +
          "scaleNote that hidden runs are approximate. ") +
      "For framing: pick recommendedJoist/recommendedBeam/recommendedPost as standard " +
      "lumber sizes appropriate for the measured spans (e.g. \"2x8 @ 16in OC\", " +
      "\"(2) 2x10\", \"6x6\") using conservative residential deck spans. joistSpacingIn is " +
      "typically 16. footingCount should match postCount. confidence is 0..1 — lower it " +
      "when references are unclear. Put your scale reasoning in scaleNote and a one-line " +
      "plain-English recap in summary. Estimate reasonable values rather than leaving fields blank.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }, ...imageParts] },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI deck-measure error (${res.status}): ${detail}`);
      return c.json({ error: `Measurement API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content);
    return c.json(analysis);
  } catch (err) {
    console.log(`Error measuring deck: ${err}`);
    return c.json({ error: `Failed to measure deck: ${err}` }, 500);
  }
}

app.post(`${P}/deck-measure/analyze`, measureDeck);

/**
 * Read a hand-drawn deck FRAMING PLAN (not a photo of a built deck).
 *
 * A sketch is a fundamentally different reading task from a photograph: it has
 * labelled dimensions ("34 feet", "12 inch on center"), a grid to count against,
 * and named members (ledger, double rim, sill plate) rather than reference
 * objects to scale from. Trust the numbers written on the page, count squares
 * where a number is missing, and pull the framing spec straight off the labels.
 */
async function analyzeDeckPlan(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File && f.type.startsWith("image"))
      .slice(0, 4);
    if (!files.length) return c.json({ error: "Missing 'file' in form data" }, 400);

    const note = String(form.get("note") ?? "").trim();

    const imageParts: any[] = [];
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk)
        binary += String.fromCharCode(...buf.subarray(i, i + chunk));
      const b64 = btoa(binary);
      imageParts.push({
        type: "image_url",
        image_url: { url: `data:${file.type || "image/jpeg"};base64,${b64}`, detail: "high" },
      });
    }

    const prompt =
      "You are a deck framing estimator reading a contractor's HAND-DRAWN framing " +
      "plan on graph paper. Return STRICT JSON only, matching exactly this " +
      "TypeScript type: " +
      '{ "runs": {"name": string, "lengthFt": number, "depthFt": number}[], ' +
      '"overallLengthFt": number, "overallDepthFt": number, "areaSqft": number, ' +
      '"lShaped": boolean, "joistSpacingIn": number, "joistDirection": string, ' +
      '"joistSize": string, "beamSize": string, "postSize": string, ' +
      '"rimBoard": "single"|"double", "ledger": boolean, "houseSide": string, ' +
      '"decking": string, "diagonal": boolean, "heightOffGradeFt": number, ' +
      '"confidence": number, "readNotes": string, "summary": string }. ' +
      "HOW TO READ IT: trust dimensions written on the page verbatim (e.g. '34 feet', " +
      "'30 feet', '6.5 feet'). Where a dimension isn't written, count graph squares. " +
      "Break an L-shaped or wraparound deck into separate rectangular runs in \"runs\": " +
      "the largest is the main run first, then each leg; set lShaped true if it turns a " +
      "corner. Read joistSpacingIn from a note like '12 inch on center' (else 16). " +
      "joistDirection: which way the joists span (e.g. 'perpendicular to house'). " +
      "joistSize/beamSize/postSize as standard lumber ('2x8','(2) 2x10','6x6') — infer " +
      "conservative residential sizes from the spans if the sketch doesn't name them. " +
      "rimBoard 'double' if it says double rim. ledger true if a ledger board is drawn " +
      "against the house. houseSide: where the house/ledger is ('front','back','left'," +
      "'right'). decking: the material noted ('composite','PVC','pressure-treated'). " +
      "diagonal true only if boards are drawn at 45°. Put how you scaled it and any " +
      "assumptions in readNotes, and a one-line recap in summary. confidence 0..1. " +
      (note ? `The contractor adds: ${note}. ` : "") +
      "Estimate reasonable values rather than leaving fields blank.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }, ...imageParts] },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI deck-plan error (${res.status}): ${detail}`);
      return c.json({ error: `Framing plan read failed (${res.status}): ${detail}` }, 502);
    }
    const data = await res.json();
    const analysis = JSON.parse(data?.choices?.[0]?.message?.content);
    return c.json(analysis);
  } catch (err) {
    console.log(`Error reading deck framing plan: ${err}`);
    return c.json({ error: `Failed to read the framing plan: ${err}` }, 500);
  }
}

app.post(`${P}/deck-plan/analyze`, analyzeDeckPlan);

// ---------------------------------------------------------------------------
// Extract the 3D-model design from an APPROVED photoreal render. The render is
// the source of truth for what the customer signed off on — this reads it back
// into the parametric deck parameters so the 3D workspace builds exactly what's
// in the picture instead of whatever the editor was last left on.
//
// Multipart form: "file" (the approved render), plus text fields
//   instructions  — every prompt/fix the contractor gave, newline separated
//   current       — JSON of the current deck params (fallback for anything the
//                   render can't show)
//   dims          — JSON {widthFt, depthFt} of the measured/known footprint
// Returns { params, widthFt, depthFt, changed: string[], summary }.
// ---------------------------------------------------------------------------
app.post(`${P}/deck-render/extract-design`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "Missing 'file' (the approved render) in form data" }, 400);
    }
    const instructions = String(form.get("instructions") ?? "").trim();
    const currentRaw = String(form.get("current") ?? "{}");
    const dimsRaw = String(form.get("dims") ?? "{}");
    let current: Record<string, unknown> = {};
    let dims: { widthFt?: number; depthFt?: number } = {};
    try { current = JSON.parse(currentRaw); } catch { current = {}; }
    try { dims = JSON.parse(dimsRaw); } catch { dims = {}; }

    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const b64 = btoa(binary);
    const mime = file.type || "image/png";

    const prompt =
      "You are reading an APPROVED photorealistic render of a deck/porch back into " +
      "a parametric 3D model so the model matches the picture exactly. Look at the " +
      "render and return STRICT JSON only, matching exactly this TypeScript type: " +
      '{ "params": { "flooring": string, "railing": "wood"|"cable"|"glass", ' +
      '"railColor": string, "postSize": "4x4"|"4x6"|"6x6"|"6x8", ' +
      '"beamSize": "2x8"|"2x10"|"2x12"|"4x10"|"4x12", ' +
      '"joistSize": "2x6"|"2x8"|"2x10"|"2x12", "diagonal": boolean, ' +
      '"multiLevel": boolean, "cover": "none"|"pergola"|"gable"|"shed"|"flat", ' +
      '"coverColor": string, "coverPitch": number, "deckHeight": number, ' +
      '"runs": {"name": string, "lengthFt": number, "depthFt": number}[] }, ' +
      '"widthFt": number, "depthFt": number, ' +
      '"changed": string[], "summary": string }.\n\n' +
      "RULES:\n" +
      "- \"flooring\" MUST be one of these exact values, picked to match the decking " +
      "colour and material in the render: pvcGray, pvcCoastalGray, pvcWeatheredGray, " +
      "pvcSlate, pvcCharcoal, pvcEbony, pvcWhite, pvcSandstone, pvcTan, pvcClay, " +
      "pvcDriftwood, pvcSaddle, compositeBrown, compositeGray, compositeRedwood, " +
      "cedar, redwood, pressureTreated, ipe, mahogany, timber.\n" +
      "- \"railColor\" MUST be one of: timber, walnut, trimWhite, trimBlack, " +
      "trimBronze, trimGray, brushed.\n" +
      "- \"coverColor\" MUST be a roof material key such as roofCharcoal, roofBlack, " +
      "roofBrown, roofWeathered, roofSilver, roofCopper. Use roofCharcoal if unsure.\n" +
      "- \"cover\" describes the overhead structure actually visible: none for an open " +
      "deck, pergola for an open lattice, gable/shed/flat for a solid roof.\n" +
      "- \"runs\" describes the SHAPE. A simple rectangle is a single run. A " +
      "wraparound or L-shape has the main platform first, then each wing that turns " +
      "the corner. Use feet.\n" +
      "- \"deckHeight\" is the walking surface height above grade in feet.\n" +
      "- \"widthFt\"/\"depthFt\" are the MAIN run's dimensions.\n" +
      "- \"changed\" lists the human-readable things you set from the render that " +
      "differ from the current parameters (e.g. \"railing → cable\", \"added pergola\").\n" +
      "- \"summary\" is one plain-English sentence describing the design you read.\n\n" +
      "CURRENT model parameters (keep a value only when the render genuinely shows " +
      "the same thing, or when the render can't show it): " +
      JSON.stringify(current) +
      "\n\nKNOWN footprint (trust these dimensions over your visual estimate when " +
      "present): " + JSON.stringify(dims) +
      (instructions
        ? "\n\nEVERY instruction the contractor gave while producing this render — " +
          "these state the design intent explicitly, so honour them over a " +
          "guess from the pixels:\n" + instructions
        : "");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "high" } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI extract-design error (${res.status}): ${detail}`);
      return c.json({ error: `Design extraction API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const design = JSON.parse(content);
    return c.json(design);
  } catch (err) {
    console.log(`Error extracting design from render: ${err}`);
    return c.json({ error: `Failed to extract the design from the render: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// AI Design Tech — the one-stop generation point.
//
// The contractor uploads photos of the site (or the existing structure) and
// writes what they want built. This route acts like a senior design technician:
// it reads the photos + the brief and EITHER asks the few clarifying questions a
// real designer would ask before drawing anything, OR — once it has enough — it
// returns a complete parametric spec (footprint, height, framing members, finish
// materials, shape/runs) that drives the 3D model, framing take-off and permit
// package. Works for a brand-new deck, a rebuild, an outdoor bar, or an addition
// from the foundation up.
//
// Multipart form:
//   buildType    — "new-deck" | "rebuild-deck" | "outdoor-bar" | "addition"
//   description  — the contractor's own words for what they want
//   answers      — JSON array [{ question, answer }] of anything already asked
//   dims         — JSON {widthFt?, depthFt?, heightOffGradeFt?} if already known
//   current      — JSON of any current params to build on (rebuilds)
//   file(s)      — up to 6 site/structure photos
//
// Returns:
//   { ready: boolean,
//     questions: [{ id, question, why, suggestions: string[] }],
//     spec: { buildType, widthFt, depthFt, heightOffGradeFt, params, runs,
//             materials: string[], framingNotes: string[], summary },
//     confidence: number, notes: string }
// ---------------------------------------------------------------------------
app.post(`${P}/design-tech/brief`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const buildType = String(form.get("buildType") ?? "new-deck").trim();
    const description = String(form.get("description") ?? "").trim();
    const answersRaw = String(form.get("answers") ?? "[]");
    const dimsRaw = String(form.get("dims") ?? "{}");
    const currentRaw = String(form.get("current") ?? "{}");
    let answers: { question?: string; answer?: string }[] = [];
    let dims: Record<string, unknown> = {};
    let current: Record<string, unknown> = {};
    try { answers = JSON.parse(answersRaw); } catch { answers = []; }
    try { dims = JSON.parse(dimsRaw); } catch { dims = {}; }
    try { current = JSON.parse(currentRaw); } catch { current = {}; }

    // Collect every uploaded photo as a high-detail data URL. Chunked base64 so
    // multi-megabyte phone photos don't blow the worker's memory budget.
    const files = [
      ...form.getAll("file"),
      ...form.getAll("files"),
    ].filter((f): f is File => f instanceof File).slice(0, 6);
    const imageParts: any[] = [];
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const b64 = btoa(binary);
      const mime = file.type || "image/jpeg";
      imageParts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "high" } });
    }

    const kindLabel: Record<string, string> = {
      "new-deck": "a brand-new deck or porch",
      "rebuild-deck": "a rebuild of the existing deck/porch shown in the photos",
      "outdoor-bar": "an outdoor bar / covered bar structure",
      "pergola": "a freestanding (or attached) open pergola shade structure",
      "gazebo": "a freestanding covered gazebo",
      "shed": "an enclosed storage shed with walls, a door and a roof",
      "addition": "a home addition built from the foundation up",
    };
    const kind = kindLabel[buildType] ?? kindLabel["new-deck"];

    const answeredBlock = answers.length
      ? "\n\nThe contractor has already answered these clarifying questions — treat " +
        "them as firm requirements:\n" +
        answers
          .filter((a) => a && (a.question || a.answer))
          .map((a) => `- ${a.question ?? "Q"}: ${a.answer ?? "(no answer)"}`)
          .join("\n")
      : "";

    const prompt =
      "You are a senior residential design technician and structural detailer for a " +
      "deck/outdoor-structure contractor in southern New Hampshire (2021 IRC / IBC, " +
      "ground snow load 50 psf, deck live load 40 psf). The contractor wants you to " +
      "design " + kind + ". Study the photos and the written brief the way a real " +
      "designer would before drawing anything.\n\n" +
      "DECIDE ONE OF TWO OUTCOMES and return STRICT JSON:\n\n" +
      "1) If a critical detail needed to draw a code-correct, buildable design is " +
      "genuinely MISSING or ambiguous (e.g. you can't tell the footprint size, the " +
      "height off grade, how it attaches to the house, the railing/decking choice, " +
      "roof vs open, number of levels, or — for an addition — the number of stories, " +
      "foundation type or roof style), set \"ready\": false and ASK. Return the " +
      "smallest set of questions a pro would actually need (max 5). Never ask about " +
      "something the photos or brief already answer. For each question give 2–4 " +
      "concrete suggestions the contractor can tap.\n\n" +
      "2) If you have enough to draw it, set \"ready\": true and return a complete " +
      "\"spec\".\n\n" +
      "Return EXACTLY this TypeScript shape:\n" +
      '{ "ready": boolean,\n' +
      '  "questions": { "id": string, "question": string, "why": string, ' +
      '"suggestions": string[] }[],\n' +
      '  "spec": {\n' +
      '    "buildType": string,\n' +
      '    "widthFt": number, "depthFt": number, "heightOffGradeFt": number,\n' +
      '    "params": {\n' +
      '      "flooring": "pvcGray"|"pvcCoastalGray"|"pvcWeatheredGray"|"pvcSlate"|' +
      '"pvcCharcoal"|"pvcEbony"|"pvcWhite"|"pvcSandstone"|"pvcTan"|"pvcClay"|' +
      '"pvcDriftwood"|"pvcSaddle"|"compositeBrown"|"compositeGray"|"compositeRedwood"|' +
      '"cedar"|"redwood"|"pressureTreated"|"ipe"|"mahogany"|"timber",\n' +
      '      "railing": "wood"|"cable"|"glass",\n' +
      '      "railColor": "timber"|"walnut"|"trimWhite"|"trimBlack"|"trimBronze"|"trimGray"|"brushed",\n' +
      '      "postSize": "4x4"|"4x6"|"6x6"|"6x8",\n' +
      '      "beamSize": "2x8"|"2x10"|"2x12"|"4x10"|"4x12",\n' +
      '      "joistSize": "2x6"|"2x8"|"2x10"|"2x12",\n' +
      '      "joistSpacingIn": 12|16|19.2|24,\n' +
      '      "diagonal": boolean, "multiLevel": boolean,\n' +
      '      "cover": "none"|"pergola"|"gable"|"shed"|"flat",\n' +
      '      "coverColor": string, "coverPitch": number,\n' +
      '      "houseSide": "z0"|"z1"|"none"\n' +
      '    },\n' +
      '    "runs": { "name": string, "lengthFt": number, "depthFt": number }[],\n' +
      '    "materials": string[],\n' +
      '    "framingNotes": string[],\n' +
      '    "summary": string\n' +
      "  },\n" +
      '  "confidence": number, "notes": string }\n\n' +
      "RULES:\n" +
      "- When \"ready\" is false you may leave \"spec\" as null.\n" +
      "- \"runs\" is the SHAPE: a rectangle is one run; a wraparound/L-shape lists the " +
      "main platform first then each wing. Feet.\n" +
      "- Size framing members to actually pass at the given spans under the loads " +
      "above (choose joistSize/beamSize/postSize/joistSpacingIn accordingly) and put " +
      "the reasoning + footing/ledger/guard notes into \"framingNotes\".\n" +
      "- \"materials\" is a short human-readable bill of the finish materials.\n" +
      "- \"houseSide\" is the ledger edge for an attached structure, \"none\" if freestanding.\n" +
      "- For an outdoor bar, include the bar counter/roof in framingNotes and pick a " +
      "cover; for an addition, describe the foundation/stories/roof in framingNotes.\n" +
      "- For a pergola set cover to \"pergola\" (open, no snow roof). For a gazebo pick " +
      "a solid cover (gable/shed/flat). For a shed pick a solid cover AND note the " +
      "wall framing, door size and roof in framingNotes; sheds and gazebos carry roof " +
      "snow so size rafters/posts/footings for it.\n" +
      "- Trust any dimensions the contractor gives over your visual estimate.\n\n" +
      "The contractor's brief: " + (description || "(none given — rely on the photos)") +
      "\n\nKnown dimensions (use when present): " + JSON.stringify(dims) +
      "\nAny current design to build on: " + JSON.stringify(current) +
      answeredBlock;

    const content: any[] = [{ type: "text", text: prompt }, ...imageParts];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI design-tech error (${res.status}): ${detail}`);
      return c.json({ error: `Design brief API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    let brief: any = {};
    try { brief = JSON.parse(raw); } catch (err) {
      console.log(`Could not parse design-tech JSON: ${err}; raw=${raw}`);
      return c.json({ error: "The design tech returned an unreadable response — try again." }, 502);
    }
    // Normalize so the client can rely on the shape.
    brief.ready = !!brief.ready && !!brief.spec;
    brief.questions = Array.isArray(brief.questions) ? brief.questions : [];
    if (!brief.ready && (!brief.questions.length) && !brief.spec) {
      brief.questions = [{
        id: "restate",
        question: "Tell me a bit more about what you'd like built.",
        why: "I couldn't read enough from the photos and description to start.",
        suggestions: [],
      }];
    }
    return c.json(brief);
  } catch (err) {
    console.log(`Error producing design brief: ${err}`);
    return c.json({ error: `Failed to produce the design brief: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Zoning variance — read the town's application, fill it, keep the case file
// ---------------------------------------------------------------------------

/**
 * Ask a model to read a document that may be a PDF or a scan. PDFs go through
 * the Files + Responses API (which handles page rendering); images go through
 * chat completions vision. Both return the model's raw text.
 */
async function readDocument(apiKey: string, file: File, prompt: string): Promise<string> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");

  if (isPdf) {
    const upload = new FormData();
    upload.append("purpose", "user_data");
    upload.append("file", file, file.name || "application.pdf");
    const fileRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upload,
    });
    if (!fileRes.ok) {
      const detail = await fileRes.text();
      throw new Error(`OpenAI file upload failed (${fileRes.status}): ${detail}`);
    }
    const uploaded = await fileRes.json();
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        text: { format: { type: "json_object" } },
        input: [
          {
            role: "user",
            content: [
              { type: "input_file", file_id: uploaded.id },
              { type: "input_text", text: prompt },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`OpenAI responses failed (${res.status}): ${detail}`);
    }
    const data = await res.json();
    if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;
    // Older shape: walk the output array for the first text chunk.
    const chunks: string[] = [];
    for (const item of data.output ?? []) {
      for (const part of item.content ?? []) {
        if (typeof part.text === "string") chunks.push(part.text);
      }
    }
    if (!chunks.length) throw new Error("The model returned no text for the PDF");
    return chunks.join("");
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${file.type || "image/png"};base64,${btoa(binary)}`, detail: "high" },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI vision failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "{}";
}

/**
 * Read an uploaded variance application (the town's own PDF or a scan of it)
 * and return its structure: every question it asks, the attachments it demands,
 * the fee, the deadlines and the findings test the board applies.
 */
app.post(`${P}/variance/extract`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "Missing 'file' (the variance application) in form data" }, 400);
    }

    const prompt =
      "You are reading a municipal ZONING VARIANCE / ZBA application form so it can be " +
      "filled out programmatically. Read every page. Return STRICT JSON only, matching " +
      "exactly this TypeScript type:\n" +
      '{ "title": string, "jurisdiction": string, "board": string, ' +
      '"varianceTypes": string[], ' +
      '"fields": { "id": string, "label": string, "section": string, ' +
      '"type": "text"|"textarea"|"number"|"date"|"checkbox"|"signature", ' +
      '"hint": string, "required": boolean }[], ' +
      '"findingsTest": { "prong": string, "question": string }[], ' +
      '"attachments": string[], "fee": string, "deadlines": string, ' +
      '"noticeRequirement": string, "submission": string }\n\n' +
      "RULES:\n" +
      "- One entry in \"fields\" per blank the form asks the applicant to complete, in " +
      "document order. Keep the form's own wording in \"label\".\n" +
      "- \"id\" is a short stable snake_case slug derived from the label.\n" +
      "- \"section\" is the heading that blank sits under on the form.\n" +
      "- \"hint\" is any instruction printed next to the blank, or \"\" if none.\n" +
      "- \"findingsTest\" is the hardship/findings criteria the board must find (the " +
      "four- or five-prong test), one entry per prong, quoting the form's language.\n" +
      "- \"attachments\" is the exhibit list the form requires (plot plan, elevations, " +
      "photographs, deed, abutter list, etc.).\n" +
      "- Use \"\" for anything the document does not state. Never invent a requirement.";

    const raw = await readDocument(apiKey, file, prompt);
    const parsed = JSON.parse(raw);
    return c.json({
      title: String(parsed.title ?? "Zoning variance application"),
      jurisdiction: String(parsed.jurisdiction ?? ""),
      board: String(parsed.board ?? ""),
      varianceTypes: Array.isArray(parsed.varianceTypes) ? parsed.varianceTypes : [],
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      findingsTest: Array.isArray(parsed.findingsTest) ? parsed.findingsTest : [],
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      fee: String(parsed.fee ?? ""),
      deadlines: String(parsed.deadlines ?? ""),
      noticeRequirement: String(parsed.noticeRequirement ?? ""),
      submission: String(parsed.submission ?? ""),
      fileName: file.name || "application",
    });
  } catch (err) {
    console.log(`Error extracting variance application structure: ${err}`);
    return c.json({ error: `Failed to read the variance application: ${err}` }, 500);
  }
});

/**
 * Fill the form. Given the extracted fields plus everything known about the
 * parcel, the zoning encroachment and the design, answer every blank and draft
 * the hardship findings — and say plainly what it could not answer.
 */
app.post(`${P}/variance/fill`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);
    const body = await c.req.json().catch(() => ({}));
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (!fields.length) return c.json({ error: "No fields to fill — extract the application first" }, 400);

    const prompt =
      "You are a land-use professional preparing a ZONING VARIANCE application for a " +
      "licensed contractor. Fill out the form from the case facts. Return STRICT JSON " +
      "only, matching exactly this TypeScript type:\n" +
      '{ "values": { [fieldId: string]: string }, ' +
      '"findings": { "prong": string, "heading": string, "text": string }[], ' +
      '"reliefRequested": string, "projectDescription": string, ' +
      '"missing": { "id": string, "label": string, "why": string }[], ' +
      '"notes": string[] }\n\n' +
      "RULES:\n" +
      "- Answer every field id given. If the facts do not support an answer, put \"\" in " +
      "\"values\" and add an entry to \"missing\" saying exactly what the contractor has " +
      "to supply. NEVER invent an owner name, a deed book, a parcel id, a date, a fee or " +
      "a signature.\n" +
      "- \"reliefRequested\" states the relief in the form the board grants it: the code " +
      "section, the dimension required, the dimension proposed, and the variance amount.\n" +
      "- \"findings\" answers each prong of the findings test in the case facts, in the " +
      "board's own framing, arguing from the physical facts of the parcel — shape, " +
      "topography, an existing nonconforming structure, the location of the septic or " +
      "the well — not from convenience or cost, which boards reject.\n" +
      "- Argue the relief is the MINIMUM necessary and quantify why.\n" +
      "- Plain professional English. No adjectives that can't be supported by a fact " +
      "in the record.\n\n" +
      "CASE FACTS:\n" +
      JSON.stringify({
        application: body.application ?? null,
        parcel: body.parcel ?? null,
        zoning: body.zoning ?? null,
        encroachment: body.encroachment ?? null,
        design: body.design ?? null,
        framing: body.framing ?? null,
        buildDetails: body.buildDetails ?? null,
        contractor: body.contractor ?? null,
        extra: body.extra ?? null,
      }) +
      "\n\nFIELDS TO FILL:\n" +
      JSON.stringify(fields);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI variance-fill error (${res.status}): ${detail}`);
      return c.json({ error: `Variance fill API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    return c.json({
      values: parsed.values && typeof parsed.values === "object" ? parsed.values : {},
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      reliefRequested: String(parsed.reliefRequested ?? ""),
      projectDescription: String(parsed.projectDescription ?? ""),
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      filledAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log(`Error filling the variance application: ${err}`);
    return c.json({ error: `Failed to fill the variance application: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Generic fillable-form autofill. The client reads the editable fields out of
// an uploaded PDF (AcroForm) with pdf-lib and sends their names, human labels
// (the field tooltip/alternate text when present), types and any options, along
// with the project's known facts. This returns a value for each field so the
// client can write them straight back into the PDF's text boxes.
//
// JSON body: { fields: [{ name, type, label?, options?, maxLen? }], context, instructions? }
// Returns:   { values: {[name]: string}, missing: [{name,label,why}], notes: [] }
// ---------------------------------------------------------------------------
app.post(`${P}/form/fill`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);
    const body = await c.req.json().catch(() => ({}));
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (!fields.length) {
      return c.json({ error: "No fillable fields were found in the form." }, 400);
    }

    const prompt =
      "You are a contractor's office assistant completing a fillable form (a permit " +
      "application, inspection request, HOA form, etc.) on their behalf. You are given " +
      "the form's editable fields and the project's known facts. Fill every field you " +
      "can from the facts. Return STRICT JSON only, matching exactly:\n" +
      '{ "values": { [fieldName: string]: string }, ' +
      '"missing": { "name": string, "label": string, "why": string }[], ' +
      '"notes": string[] }\n\n' +
      "RULES:\n" +
      "- The keys in \"values\" MUST be the exact field \"name\" strings given below.\n" +
      "- Use the field \"label\" (the human question) to understand what each field wants; " +
      "the \"name\" may be cryptic.\n" +
      "- For a checkbox field (type \"checkbox\") return \"true\" or \"false\". For a " +
      "\"dropdown\" or \"radio\" field return one of its \"options\" EXACTLY.\n" +
      "- Respect \"maxLen\" when present — keep the answer within it.\n" +
      "- If the facts do not support a field, set its value to \"\" and add an entry to " +
      "\"missing\" describing what the contractor must supply. NEVER invent an owner name, " +
      "a signature, a license/permit number, a deed reference, a fee, or a date that isn't " +
      "in the facts.\n" +
      "- Dates: only fill a date you can derive from the facts (e.g. today's date for a " +
      "\"date prepared\" field is " + new Date().toISOString().slice(0, 10) + ").\n" +
      "- Plain, professional answers.\n\n" +
      (body.instructions ? "CONTRACTOR NOTE: " + String(body.instructions) + "\n\n" : "") +
      "PROJECT FACTS:\n" + JSON.stringify(body.context ?? {}) +
      "\n\nFORM FIELDS:\n" + JSON.stringify(fields);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI form-fill error (${res.status}): ${detail}`);
      return c.json({ error: `Form autofill API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    return c.json({
      values: parsed.values && typeof parsed.values === "object" ? parsed.values : {},
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      filledAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log(`Error autofilling the form: ${err}`);
    return c.json({ error: `Failed to autofill the form: ${err}` }, 500);
  }
});

// Generate a single framing assembly (a shed roof, a beam, a joist bay, a stair
// stringer set…) from a plain-English request so the contractor can drop it into
// the 3D model while framing it out. Returns renderable "elements" plus a
// human takeoff. Ungated — it's a design aid, not a data mutation.
app.post(`${P}/framing/piece`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);
    const body = await c.req.json().catch(() => ({}));
    const request = String(body.prompt ?? "").trim();
    if (!request) return c.json({ error: "Describe the framing piece to build." }, 400);
    const ctx = body.context ?? {};

    const prompt =
      "You are a senior framing detailer. The contractor describes ONE framing " +
      "assembly and you output it as structured geometry that can be rendered in a " +
      "3D deck/structure model, plus a lumber takeoff. Return STRICT JSON only:\n" +
      '{ "name": string, "summary": string, ' +
      '"elements": Element[], ' +
      '"takeoff": { "label": string, "nominal"?: string, "qty"?: number, "lengthFt"?: number, "note"?: string }[], ' +
      '"notes": string[] }\n\n' +
      "COORDINATE SYSTEM (all distances in FEET):\n" +
      "- Origin (0,0,0) is the CENTER of the deck/structure footprint at GRADE (ground).\n" +
      "- x = across the width, z = across the depth, y = height above grade (up).\n" +
      "- The deck surface is about 1.2 ft to a few ft above grade; a wall top/high side is " +
      "whatever height the contractor states.\n\n" +
      "ELEMENT KINDS:\n" +
      '- { "kind":"member", "label":string, "nominal":"2x10", "lengthFt":number, ' +
      '"axis":"x"|"z"|"y", "at":[x,y,z], "tiltDeg"?:number } — one stick. "at" is its CENTER. ' +
      'For a sloped roof rafter/joist give tiltDeg from the pitch (rise:12 → deg = atan(rise/12) in degrees).\n' +
      '- { "kind":"array", "label":string, "nominal":"2x10", "lengthFt":number, "axis":"x"|"z", ' +
      '"count":number, "spacingIn":number, "start":[x,y,z], "stepAxis":"x"|"z", "tiltDeg"?:number } — ' +
      "a repeated row of identical members (e.g. joists 16 in o.c.). \"start\" is the center of the " +
      "FIRST member; the row marches along stepAxis. Compute count from the span and spacing.\n" +
      '- { "kind":"panel", "label":string, "material"?:string, "sizeFt":[w,h,d], "at":[x,y,z], "rotDeg"?:[x,y,z] } — ' +
      "sheathing/decking sheet.\n\n" +
      "RULES:\n" +
      "- Use realistic dimensional lumber nominals (2x6, 2x8, 2x10, 2x12, 4x10, 6x6, etc.).\n" +
      "- Model exactly what's asked: joists/rafters as an \"array\" with the right count for the " +
      "span and spacing; supporting beams as \"member\"; posts as vertical members.\n" +
      "- For a shed/mono-slope roof: the joists/rafters run down-slope; the HIGH end sits at the " +
      "stated wall-top height, the LOW end lands on the beam; set y to the mid-height and tiltDeg " +
      "to the pitch.\n" +
      "- Keep the piece INSIDE or adjacent to the given footprint using the coordinate system.\n" +
      "- The takeoff must list every distinct member with its nominal, quantity and length so it " +
      "can go on a permit set.\n" +
      "- Put any assumptions or code cautions (span check, hangers, snow) in \"notes\".\n\n" +
      "CONTEXT (current footprint & params): " + JSON.stringify(ctx) + "\n\n" +
      "REQUEST: " + request;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI framing-piece error (${res.status}): ${detail}`);
      return c.json({ error: `Framing generator API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    let piece: any;
    try {
      piece = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch (err) {
      console.log(`Could not parse framing-piece JSON: ${err}`);
      return c.json({ error: "The framing generator returned an unreadable response — try again." }, 502);
    }
    return c.json({
      name: typeof piece.name === "string" ? piece.name : "Framing piece",
      summary: typeof piece.summary === "string" ? piece.summary : "",
      elements: Array.isArray(piece.elements) ? piece.elements : [],
      takeoff: Array.isArray(piece.takeoff) ? piece.takeoff : [],
      notes: Array.isArray(piece.notes) ? piece.notes : [],
    });
  } catch (err) {
    console.log(`Error generating framing piece: ${err}`);
    return c.json({ error: `Failed to generate the framing piece: ${err}` }, 500);
  }
});

// Workspace copilot — turns a plain-English request ("show me the roof framing",
// "make the joists 2x10 at 12 on center", "put a drip edge on with coil stock")
// into concrete actions the 3D workspace can execute, plus a short reply.
app.post(`${P}/workspace/assistant`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);
    const body = await c.req.json().catch(() => ({}));
    const request = String(body.prompt ?? "").trim();
    if (!request) return c.json({ error: "Ask the assistant to do something." }, 400);
    const ctx = body.context ?? {};

    const prompt =
      "You are the in-app design copilot for a deck/structure 3D CAD workspace. The " +
      "contractor tells you what they want to see or change and you respond with a " +
      "short reply plus a list of ACTIONS the app will execute. Return STRICT JSON only:\n" +
      '{ "reply": string, "actions": Action[] }\n\n' +
      "You can do ANYTHING in the workspace via these ACTION TYPES — combine as many as needed:\n" +
      '- { "type":"setView", "view":"rendered"|"framing"|"layout" } — switch the viewport. ' +
      'Use "framing" for anything about framing, joists, rafters, structure. "layout" is the top-down plan.\n' +
      '- { "type":"toggle", "panel":PANEL, "on":boolean } — turn a workspace overlay/panel on or off. ' +
      "PANEL is one of: dims (measurement dimensions: joist widths, spans, spacing), framing, codes (code checks), " +
      "snow (snow/load overlay), electrical, plumbing, estimate (cost estimate), foundation, roofing, kitchen, " +
      "zoning (setbacks/lot), options (options panel), grid, wireframe, asbuilt (photograph how it was really " +
      "framed on site and file it in the project folder). Turn dims ON whenever they ask to see " +
      "measurements/dimensions/widths.\n" +
      '- { "type":"setParam", "key":string, "value":string|number|boolean } — change a design parameter. ' +
      "Only use keys from CONTROLS below, and values from that control's allowed options (for selects) or within min/max (for sliders).\n" +
      '- { "type":"setSize", "widthFt"?:number, "depthFt"?:number } — resize the footprint.\n' +
      '- { "type":"addPiece", "prompt":string } — when they ask to BUILD/ADD a new framing member ' +
      "(e.g. \"add a shed roof 8x22 with 2x10 joists 16 o.c.\"), pass their description through here verbatim.\n" +
      '- { "type":"lighting", "mode":"day"|"night" } — day or night lighting.\n' +
      '- { "type":"wallMode", "mode":"all"|"cutaway"|"none" } — show all walls, a cutaway, or hide walls.\n' +
      '- { "type":"gizmo", "mode":"translate"|"rotate"|"scale" } — the move/rotate/scale tool for selected pieces.\n' +
      '- { "type":"alignNorth", "on":boolean } — align the model to true north.\n' +
      '- { "type":"select", "category":CATEGORY } or { "type":"select", "label":string } — select a piece in the ' +
      "3D model. CATEGORY is one of: railing, decking, post, joist, beam, cover, footing, stairs, wall.\n" +
      '- { "type":"deselect" } — clear the selection.\n' +
      '- { "type":"removeSelected" } — remove the currently selected single piece.\n' +
      '- { "type":"hidePart", "category":CATEGORY } — remove/hide an entire category (e.g. "take off the railing").\n' +
      '- { "type":"restorePart", "category":CATEGORY } — bring a hidden category back.\n' +
      '- { "type":"restoreAll" } — restore everything that was removed/hidden.\n' +
      '- { "type":"openPackage" } — open the construction / permit package.\n' +
      '- { "type":"enterBuild" } — enter framing/build mode with code checks on.\n\n' +
      "GUIDANCE:\n" +
      "- You are capable of every workspace operation above — never say you can't do something in the workspace; " +
      "map it to the closest action(s). Prefer the smallest set of actions that satisfies the request. " +
      "Always include a friendly one-line reply describing what you did.\n" +
      "- If the contractor ASKS A QUESTION about the current design (e.g. \"what size are my joists?\", " +
      "\"how wide is the deck?\", \"what railing did I pick?\"), answer it directly in \"reply\" using CURRENT STATE " +
      "below and return an EMPTY actions array — don't change anything.\n" +
      "- To change a category you must sometimes select first, but for design changes prefer setParam directly. " +
      "To REMOVE something use hidePart (whole category) or select + removeSelected (one piece).\n" +
      "- 'fascia', 'drip edge', 'plastic/PVC trim', 'coil stock', 'wood fascia' map to the 'fasciaMaterial' " +
      "control (values: pvc, coil, wood, none). A drip edge is included with any fascia option except none.\n" +
      "- 'railing'/'balusters' map to 'railing' (wood, composite, pvc, metal, cable, glass).\n" +
      "- joist size→'joistSize', joist spacing→'joistSpacingIn' (12,16,19.2,24), beam→'beamSize', post→'postSize', " +
      "roof pitch→'coverPitch', roof type→'cover', roof high side→'coverSlope'.\n" +
      "- If they ask to SEE something (framing, roof framing, measurements) set the view and toggles; don't change the design.\n\n" +
      "CONTROLS (allowed keys, kinds and options): " + JSON.stringify(ctx.controls ?? []) + "\n" +
      "CURRENT STATE: " + JSON.stringify({ moduleId: ctx.moduleId, view: ctx.view, widthFt: ctx.widthFt, depthFt: ctx.depthFt, params: ctx.params }) + "\n\n" +
      "REQUEST: " + request;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI workspace-assistant error (${res.status}): ${detail}`);
      return c.json({ error: `Assistant API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    let out: any;
    try {
      out = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch (err) {
      console.log(`Could not parse workspace-assistant JSON: ${err}`);
      return c.json({ error: "The assistant returned an unreadable response — try again." }, 502);
    }
    return c.json({
      reply: typeof out.reply === "string" ? out.reply : "Done.",
      actions: Array.isArray(out.actions) ? out.actions : [],
    });
  } catch (err) {
    console.log(`Error in workspace assistant: ${err}`);
    return c.json({ error: `Assistant failed: ${err}` }, 500);
  }
});

// As-built framing capture: the crew photographs how a structure is REALLY
// framed on site; the vision model reads the members/spacing/connections and we
// file the photos + analysis in the customer's project folder so the office can
// learn from real field framing and reuse it on the next design.
app.post(`${P}/framing/as-built`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const form = await c.req.formData();
    const projectId = String(form.get("projectId") ?? "").trim();
    if (!projectId) return c.json({ error: "Missing projectId for the customer's project folder." }, 400);
    const note = String(form.get("note") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();

    // Accept BOTH framing photos and documents (PDF/plan sets, spec sheets, etc.).
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File)
      .slice(0, 10);
    if (!files.length) return c.json({ error: "Attach at least one framing photo or document." }, 400);

    // Store the originals in the project folder first (so nothing is lost even if
    // the vision call fails), then analyze the images.
    await ensureBucket();
    const media: StoredMedia[] = [];
    const imageParts: any[] = [];
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
      const path = `asbuilt/${projectId}/${uid("f")}.${ext}`;
      const mime = file.type || "application/octet-stream";
      const isImage = mime.startsWith("image");
      const { error } = await supabaseAdmin.storage
        .from(MEDIA_BUCKET)
        .upload(path, buf, { contentType: mime, upsert: false });
      if (error) { console.log(`As-built upload failed: ${error.message}`); continue; }
      media.push({ id: uid("md"), type: isImage ? "image" : "doc", name: file.name || undefined, path } as StoredMedia);
      if (isImage) {
        let binary = "";
        for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        imageParts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${btoa(binary)}`, detail: "high" } });
      }
    }
    if (!media.length) return c.json({ error: "Could not store the files — try again." }, 502);
    const docNames = media.filter((m: any) => m.type === "doc").map((m) => m.name).filter(Boolean);

    // Vision analysis — read the real framing so the office can learn from it.
    // Runs when at least one image was attached; documents are filed as reference.
    let analysis: any = null;
    if (apiKey && imageParts.length) {
      try {
        const prompt =
          "You are a senior framing inspector reviewing AS-BUILT field photos of how a " +
          "structure (deck, porch, shed, addition, roof) was actually framed. Read the " +
          "real framing and return STRICT JSON only:\n" +
          '{ "assembly": string, "members": {"element": string, "size": string, "spacingIn"?: number, "notes"?: string}[], ' +
          '"connections": string[], "fasteners": string[], "species"?: string, ' +
          '"codeObservations": string[], "qualityFlags": string[], "lessons": string[], "confidence": number, "summary": string }.\n' +
          "GUIDANCE: identify each framing member you can see (joists, rafters, beams/girders, posts, " +
          "ledger, rim/band, blocking, hangers) with its best-guess nominal size (2x8, 2x10, (2)2x10, 6x6…) " +
          "and on-center spacing in inches. List connection details (hangers, through-bolts, ledger flashing, " +
          "post bases, hurricane ties). qualityFlags = anything that looks off or non-code. lessons = short, " +
          "reusable takeaways about how this was framed that the office should remember for future designs. " +
          "confidence is 0..1. Be concrete and specific." +
          (note ? ` FIELD NOTE from the crew: ${note}.` : "") +
          (location ? ` LOCATION: ${location}.` : "") +
          (docNames.length ? ` Reference documents also filed with this capture: ${docNames.join(", ")}.` : "");
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...imageParts] }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          analysis = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
        } else {
          console.log(`As-built vision error (${res.status}): ${await res.text()}`);
        }
      } catch (err) {
        console.log(`As-built analysis failed: ${err}`);
      }
    }

    const id = uid("ab");
    const record = {
      id,
      projectId,
      note,
      location,
      media,
      analysis,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`asbuilt:${projectId}:${id}`, record);
    // Append to a running "learned framing" digest for the whole office to reuse.
    if (analysis?.lessons?.length || analysis?.members?.length) {
      const key = `framing-knowledge:${projectId}`;
      const existing = (await kv.get(key)) ?? { projectId, entries: [] };
      existing.entries = [
        ...(existing.entries ?? []),
        { id, assembly: analysis.assembly, members: analysis.members, lessons: analysis.lessons, createdAt: record.createdAt },
      ].slice(-50);
      await kv.set(key, existing);
    }
    return c.json({ record: { ...record, media: await signMedia(media) } });
  } catch (err) {
    console.log(`Error saving as-built framing: ${err}`);
    return c.json({ error: `Failed to save the as-built framing: ${err}` }, 500);
  }
});

// List every as-built framing capture filed for a project (newest first).
app.get(`${P}/framing/as-built/:projectId`, async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const records = await kv.getByPrefix(`asbuilt:${projectId}:`);
    const signed = await Promise.all(
      (records ?? []).map(async (r: any) => ({ ...r, media: await signMedia(r.media ?? []) })),
    );
    signed.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return c.json({ records: signed });
  } catch (err) {
    console.log(`Error listing as-built framing: ${err}`);
    return c.json({ error: `Failed to list as-built framing: ${err}` }, 500);
  }
});

// Remove one as-built capture (and its photos) from the project folder.
app.delete(`${P}/framing/as-built/:projectId/:id`, async (c) => {
  try {
    const { projectId, id } = c.req.param();
    const rec: any = await kv.get(`asbuilt:${projectId}:${id}`);
    if (rec?.media?.length) {
      const paths = rec.media.map((m: any) => m.path).filter(Boolean);
      if (paths.length) await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(paths);
    }
    await kv.del(`asbuilt:${projectId}:${id}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error deleting as-built framing: ${err}`);
    return c.json({ error: `Failed to delete the as-built capture: ${err}` }, 500);
  }
});

// Persist a variance case file so the whole crew sees the same one.
app.post(`${P}/variance/save`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const body = await c.req.json().catch(() => ({}));
    const ref = String(body.ref ?? "").trim();
    if (!ref) return c.json({ error: "Missing ref" }, 400);
    const record = { ...body, ref, updatedAt: new Date().toISOString() };
    await kv.set(`variance:${ref}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`Error saving variance case: ${err}`);
    return c.json({ error: `Failed to save the variance case: ${err}` }, 500);
  }
});

app.get(`${P}/variance/:ref`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const record = await kv.get(`variance:${c.req.param("ref")}`);
    return c.json(record ?? null);
  } catch (err) {
    console.log(`Error loading variance case: ${err}`);
    return c.json({ error: `Failed to load the variance case: ${err}` }, 500);
  }
});

app.get(`${P}/variance`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const records = await kv.getByPrefix("variance:");
    return c.json({ cases: Array.isArray(records) ? records : [] });
  } catch (err) {
    console.log(`Error listing variance cases: ${err}`);
    return c.json({ error: `Failed to list variance cases: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// AI Build Details (OpenAI). Generates — and iteratively edits — a detailed,
// human-readable construction build write-up for a specific project (scope,
// materials, structure, sequence, code notes, etc.). The document is stored per
// project in the KV store so it can be edited by hand and refined by AI over
// time. JSON body:
//   { projectRef, mode?: "generate"|"fix", moduleId, scopeLabel, widthFt,
//     depthFt, areaSqft, params, measured?, framingSummary?, notes?,
//     existing?: {sections,summary}, fix?: string }
// Returns { sections: {title, body}[], summary, updatedAt }.
// ---------------------------------------------------------------------------
async function buildDetails(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const body = await c.req.json().catch(() => ({}));
    const projectRef = String(body.projectRef ?? "").trim();
    if (!projectRef) return c.json({ error: "Missing projectRef" }, 400);
    const mode = body.mode === "fix" ? "fix" : "generate";

    // A compact, model-friendly description of the project the details describe.
    const facts = {
      scope: body.scopeLabel ?? body.moduleId ?? "project",
      moduleId: body.moduleId ?? "project",
      footprint: `${body.widthFt ?? "?"}ft x ${body.depthFt ?? "?"}ft`,
      areaSqft: body.areaSqft ?? null,
      params: body.params ?? {},
      measured: body.measured ?? null,
      framing: body.framingSummary ?? null,
      notes: body.notes ?? null,
    };

    const schema =
      'STRICT JSON only, matching exactly: { "sections": {"title": string, ' +
      '"body": string}[], "summary": string }. "body" is plain text (use "- " for ' +
      "bullet lines and blank lines between paragraphs; no markdown headers). Keep " +
      "each section focused and specific to THIS project's numbers.";

    const guidance =
      "You are a senior residential construction estimator/PM writing the build " +
      "details a crew and a plan reviewer will actually use. Be specific to the " +
      "project facts (materials, spans, footprint, measured dimensions). Cover, as " +
      "applicable: Scope of Work, Materials & Specifications, Site Prep & Foundation, " +
      "Structural / Framing, Weatherproofing & Finishes, MEP notes, Code & Permit " +
      "considerations, Build Sequence, and Assumptions & Exclusions. Use real " +
      "residential code references (IRC/IBC) where relevant, and clearly flag items " +
      "that must be field-verified or engineer-sealed. Do not invent a price.";

    let prompt: string;
    if (mode === "fix") {
      const existing = JSON.stringify(body.existing ?? { sections: [], summary: "" });
      prompt =
        guidance +
        "\n\nHere is the CURRENT build-details document as JSON:\n" +
        existing +
        "\n\nApply this change requested by the contractor, then return the FULL " +
        "updated document. Only change what the request implies (add, revise, or " +
        "remove the relevant content) and keep everything else intact and consistent. " +
        "If the request adds a new topic, add a new section or extend the right one. " +
        "CHANGE REQUEST: " +
        String(body.fix ?? "").trim() +
        "\n\nProject facts for reference: " +
        JSON.stringify(facts) +
        "\n\n" +
        schema;
    } else {
      prompt =
        guidance +
        "\n\nWrite the build-details document for this project.\nProject facts: " +
        JSON.stringify(facts) +
        "\n\n" +
        schema;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI build-details error (${res.status}): ${detail}`);
      return c.json({ error: `Build details API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    const doc = {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`builddetails:${projectRef}`, doc);
    return c.json(doc);
  } catch (err) {
    console.log(`Error generating build details: ${err}`);
    return c.json({ error: `Failed to generate build details: ${err}` }, 500);
  }
}

app.post(`${P}/build-details/generate`, buildDetails);

// Save a hand-edited build-details document.
app.post(`${P}/build-details/save`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const projectRef = String(body.projectRef ?? "").trim();
    if (!projectRef) return c.json({ error: "Missing projectRef" }, 400);
    const doc = {
      sections: Array.isArray(body.sections) ? body.sections : [],
      summary: typeof body.summary === "string" ? body.summary : "",
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`builddetails:${projectRef}`, doc);
    return c.json(doc);
  } catch (err) {
    console.log(`Error saving build details: ${err}`);
    return c.json({ error: `Failed to save build details: ${err}` }, 500);
  }
});

// Load a saved build-details document.
app.get(`${P}/build-details/:ref`, async (c) => {
  try {
    const ref = c.req.param("ref");
    const doc = await kv.get(`builddetails:${ref}`);
    return c.json(doc ?? { sections: [], summary: "", updatedAt: null });
  } catch (err) {
    console.log(`Error loading build details: ${err}`);
    return c.json({ error: `Failed to load build details: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Deck photo rebuild (OpenAI image edit). Frontend posts multipart with "file"
// (a photo of the existing deck / yard) plus text fields describing the new deck
// design. Returns a photorealistic render of the SAME photo — same house, yard,
// camera angle and deck location — with the deck rebuilt to the chosen design.
// The result is also persisted to storage so it can be attached to the project.
// ---------------------------------------------------------------------------
async function rebuildDeckPhoto(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    // Accept one or many angles of the SAME deck/yard. Extra angles give the
    // model more context (the wall it attaches to, ground level, stairs) so the
    // rebuilt deck lands in the right place. gpt-image-1 edits the FIRST image
    // and treats the rest as references.
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File && f.type.startsWith("image"))
      .slice(0, 6);
    if (!files.length) {
      return c.json({ error: "Missing 'file' image in form data" }, 400);
    }

    // Human-readable design description assembled by the client from the deck
    // editor selections (material, railing, cover, dimensions, extra notes).
    const design = String(form.get("design") ?? "").trim();
    const dims = String(form.get("dims") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const size = String(form.get("size") ?? "auto").trim() || "auto";
    // "refine" mode applies targeted fixes/additions to a previously generated
    // render (sent back as the first image) instead of a fresh rebuild.
    const mode = String(form.get("mode") ?? "rebuild").trim();
    const fix = String(form.get("fix") ?? "").trim();

    const refinePrompt =
      "Photorealistic architectural photograph, shot on a DSLR with natural " +
      "daylight — indistinguishable from a real photo, NOT a 3D render or CGI. " +
      "This image already shows a rebuilt deck/porch. Make ONLY the following " +
      "changes requested by the contractor, and keep everything else in the image " +
      "EXACTLY the same (house, siding, roof, windows, doors, landscaping, yard, " +
      "sky, lighting, time of day, camera position, framing and the parts of the " +
      "deck not mentioned): " +
      (fix || "clean up any artifacts and make the deck look more realistic") +
      ". Keep the EXACT same composition, aspect ratio, crop and zoom level as the " +
      "input image — do not pan, zoom, rotate or reframe. Every fixed element " +
      "(rooflines, window and door positions, corners of the house) must stay in " +
      "the identical pixel location" +
      ". Preserve the existing deck's overall shape, footprint, wraparound and " +
      "every stairway unless the change explicitly says otherwise. Keep straight " +
      "boards, even gaps, solid railings, proper posts/footings, realistic " +
      "wood/composite grain, accurate soft shadows matching the original sunlight, " +
      "and correct perspective. Match the white balance, exposure and depth of " +
      "field of the source image so the edit blends seamlessly. Do not add text, " +
      "watermarks, logos or people.";

    const rebuildPrompt =
      "Photorealistic architectural photograph, shot on a DSLR with natural " +
      "daylight — indistinguishable from a real photo, NOT a 3D render, drawing, " +
      "illustration or CGI. Rebuild ONLY the existing deck/porch structure in " +
      "this photograph. Keep everything else exactly the same: the house, siding, " +
      "roof, windows, doors, landscaping, yard, fence, sky, lighting, time of day, " +
      "camera position and perspective must all remain identical. Do not move the " +
      "camera or change the framing.\n\n" +
      "PRESERVE THE COMPOSITION EXACTLY: keep the same aspect ratio, crop and zoom " +
      "level as the input photo. Do not pan, zoom, rotate, tilt or reframe. Every " +
      "fixed feature — the rooflines, wall corners, and each window and door — must " +
      "stay in the SAME position in the frame as the original photo so the output " +
      "overlays the input one-to-one.\n\n" +
      "CRITICAL — REBUILD THE DECK ON EVERY SIDE, NOT JUST ONE. First study the " +
      "current deck/porch and reproduce its COMPLETE shape and footprint. Rebuild " +
      "the deck/porch on EVERY side of the house that has one — front, back, left " +
      "and right — including every section visible in this shot. If any part of the " +
      "structure runs along a side wall or continues past a corner, rebuild that " +
      "whole run too; do NOT finish only the side facing the camera and leave " +
      "another side old, bare or unbuilt. If it is a " +
      "wraparound or farmer's porch that turns a corner and continues down the " +
      "side (right or left) of the house, you MUST rebuild the FULL wraparound — " +
      "every section that wraps around the corner, not just the front face. Do not " +
      "shorten, straighten, square off or omit any wing of the porch. Keep the same " +
      "roof line / covered porch roof if one exists. Reproduce EVERY set of stairs " +
      "in the ORIGINAL count and the SAME locations (e.g. if there are three " +
      "separate stairways, rebuild all three exactly where they are now, with the " +
      "same width and number of steps). Keep every post, column and railing run in " +
      "its current position.\n\n" +
      "Only change the BUILD and FINISH of that existing structure to match this " +
      "design: " +
      (design || "a clean, freshly rebuilt deck matching the existing layout") +
      (dims ? `. Approximate footprint of the front section: ${dims}` : "") +
      (notes ? `. Additional details from the contractor: ${notes}` : "") +
      (files.length > 1
        ? ` You are given ${files.length} photos of the SAME deck/porch from different angles — ` +
          "study ALL of them together to understand the full wraparound layout, how it " +
          "turns each corner, and where every stairway is, then produce ONE rebuilt " +
          "render from the exact perspective of the FIRST photo (matching its framing "  +
          "and crop) while correctly rebuilding the sections that wrap out of that view."
        : " If part of the porch wraps around a corner and is only partly visible, still " +
          "rebuild the portion that is visible correctly and continue it naturally around " +
          "the corner.") +
      ". The rebuilt structure must sit in the same position, attach to the same walls " +
      "of the house, follow the same ground/floor level, and keep all stairs where they " +
      "are. Make it look like a professional contractor's finished build — straight " +
      "boards, even gaps, solid railings, proper posts and footings, realistic " +
      "wood/composite grain and texture, subtle surface reflections, accurate soft " +
      "shadows cast in the same direction as the original sunlight, and correct " +
      "perspective vanishing lines matching the house. Match the white balance, " +
      "exposure, grain and depth of field of the original photograph so the rebuilt " +
      "porch blends in seamlessly. Do not add text, watermarks, logos or people.";

    const prompt = mode === "refine" ? refinePrompt : rebuildPrompt;
    // When multiple angles are provided for a fresh rebuild, render EACH angle so
    // every side of the house that has a deck/porch gets rebuilt — not just the
    // one side visible in the first photo. Refine mode always edits one image.
    const allAngles =
      mode !== "refine" &&
      files.length > 1 &&
      String(form.get("allAngles") ?? "true").trim() !== "false";

    // Read every file's bytes once up front (a File can be re-appended to many
    // FormData bodies, but reading its stream repeatedly is unreliable in Deno).
    const inputs: { name: string; type: string; bytes: Uint8Array }[] = [];
    for (const f of files) {
      inputs.push({
        name: f.name || "deck.jpg",
        type: f.type || "image/jpeg",
        bytes: new Uint8Array(await f.arrayBuffer()),
      });
    }

    // Render a single view: `primaryIdx` is the shot to produce, the rest are
    // sent as reference angles. Persists the PNG and returns a signed URL.
    async function renderOne(primaryIdx: number, promptText: string) {
      const order = [primaryIdx, ...inputs.map((_, j) => j).filter((j) => j !== primaryIdx)];
      const oaForm = new FormData();
      oaForm.append("model", "gpt-image-1");
      for (const j of order) {
        const inp = inputs[j];
        oaForm.append("image[]", new File([inp.bytes], inp.name, { type: inp.type }));
      }
      oaForm.append("prompt", promptText);
      oaForm.append("size", size);
      oaForm.append("n", "1");
      // Maximum render fidelity keeps the house, siding, landscaping and lighting
      // sharp and faithful while only the deck is regenerated.
      oaForm.append("quality", "high");
      oaForm.append("input_fidelity", "high");

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: oaForm,
      });
      if (!res.ok) {
        const detail = await res.text();
        console.log(`OpenAI deck rebuild error (${res.status}): ${detail}`);
        throw new Error(`Image edit failed (${res.status}): ${detail}`);
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        console.log(`OpenAI deck rebuild returned no image: ${JSON.stringify(data).slice(0, 500)}`);
        throw new Error("No image returned from render");
      }

      let url = "";
      let path = "";
      try {
        await ensureBucket();
        path = `${uid("deckrender")}.png`;
        const outBytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const { error } = await supabaseAdmin.storage
          .from(MEDIA_BUCKET)
          .upload(path, outBytes, { contentType: "image/png", upsert: false });
        if (!error) {
          const { data: signed } = await supabaseAdmin.storage
            .from(MEDIA_BUCKET)
            .createSignedUrl(path, 60 * 60 * 24 * 7);
          url = signed?.signedUrl ?? "";
        } else {
          console.log(`Deck render upload failed: ${error.message}`);
        }
      } catch (err) {
        console.log(`Error persisting deck render: ${err}`);
      }
      return { image: `data:image/png;base64,${b64}`, url, path };
    }

    // One render per angle (every side) or a single render from the first shot.
    // Each high-fidelity render takes 60-120s, so rendering several sides blows
    // past the request timeout. Run them as a BACKGROUND JOB and let the client
    // poll for progress instead of holding the HTTP request open.
    const indices = allAngles ? inputs.map((_, j) => j) : [0];
    const jobId = uid("deckjob");
    const jobKey = `deckrender:${jobId}`;
    await kv.set(jobKey, {
      status: "processing",
      total: indices.length,
      done: 0,
      images: [] as { image: string; url: string; path: string }[],
    });

    const runJob = async () => {
      const images: { image: string; url: string; path: string }[] = [];
      try {
        for (let i = 0; i < indices.length; i++) {
          const r = await renderOne(indices[i], prompt);
          images.push(r);
          // Persist incremental progress so the client can show sides as they land.
          await kv.set(jobKey, {
            status: i === indices.length - 1 ? "done" : "processing",
            total: indices.length,
            done: images.length,
            images,
            finishedAt: i === indices.length - 1 ? Date.now() : undefined,
          });
        }
        if (!images.length) {
          await kv.set(jobKey, { status: "error", error: "No image returned from render", total: indices.length, done: 0, images: [] });
        }
      } catch (err) {
        console.log(`Deck render job ${jobId} failed: ${err}`);
        await kv.set(jobKey, {
          status: images.length ? "done" : "error",
          error: String(err),
          total: indices.length,
          done: images.length,
          images,
          finishedAt: Date.now(),
        });
      }
    };

    // Keep the isolate alive to finish rendering after the HTTP response returns.
    const task = runJob();
    const er = (globalThis as any).EdgeRuntime;
    if (er?.waitUntil) er.waitUntil(task);
    else task.catch((e) => console.log(`Deck render job error: ${e}`));

    return c.json({ jobId, status: "processing", total: indices.length });
  } catch (err) {
    console.log(`Error rebuilding deck photo: ${err}`);
    return c.json({ error: `Failed to rebuild deck photo: ${err}` }, 500);
  }
}

app.post(`${P}/deck-render/rebuild`, rebuildDeckPhoto);

// Poll the status/result of a background deck-render job.
app.get(`${P}/deck-render/status/:id`, async (c: any) => {
  const id = c.req.param("id");
  const rec = await kv.get(`deckrender:${id}`);
  if (!rec) return c.json({ status: "unknown" }, 404);
  return c.json(rec);
});

// ---------------------------------------------------------------------------
// Photoreal house render (OpenAI image edit). Frontend posts multipart with
// "file" (one or more photos of the customer's house) plus a text "design"
// describing the matched build. Returns a clean, marketing-quality
// photorealistic render of the SAME house — same architecture, materials and
// perspective — polished as a professional twilight/daytime hero shot. Used to
// turn a rough field photo into a client-facing image. Persisted to storage.
// ---------------------------------------------------------------------------
async function renderHousePhoto(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File && f.type.startsWith("image"))
      .slice(0, 6);
    if (!files.length) {
      return c.json({ error: "Missing 'file' image in form data" }, 400);
    }

    const design = String(form.get("design") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const lighting = String(form.get("lighting") ?? "golden hour daylight").trim();
    const size = String(form.get("size") ?? "auto").trim() || "auto";

    const prompt =
      "Photorealistic architectural photograph of THIS house, shot on a full-frame " +
      "DSLR with a tilt-shift lens — a professional real-estate / builder hero shot, " +
      "indistinguishable from a real photo, NOT a 3D render, drawing or CGI. " +
      "Recreate the SAME house exactly: keep its architecture, footprint, number of " +
      "stories, roof shape and pitch, dormers, chimney, window layout, doors, garage, " +
      "siding/brick materials and colors, and trim EXACTLY as in the photo. Do not " +
      "redesign the house or change its proportions.\n\n" +
      "Clean up and beautify the presentation only: " +
      (design ? `reflect this build spec where relevant: ${design}. ` : "") +
      "Render it under flattering " + lighting + " with a clear sky, crisp soft " +
      "shadows, a tidy freshly-landscaped lawn, clean driveway and walkway, and " +
      "professional composition. Remove clutter (trash cans, cars, wires, people, " +
      "for-sale signs). Sharp focus, true-to-life materials, accurate reflections in " +
      "the windows, realistic depth of field. " +
      (notes ? `Additional direction: ${notes}. ` : "") +
      (files.length > 1
        ? `You are given ${files.length} photos of the SAME house from different ` +
          "angles — study them all to get the architecture right, then render ONE " +
          "polished three-quarter hero view."
        : "") +
      " Do not add text, watermarks or logos.";

    const oaForm = new FormData();
    oaForm.append("model", "gpt-image-1");
    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      oaForm.append(
        "image[]",
        new File([bytes], f.name || "house.jpg", { type: f.type || "image/jpeg" }),
      );
    }
    oaForm.append("prompt", prompt);
    oaForm.append("size", size);
    oaForm.append("n", "1");
    oaForm.append("quality", "high");
    oaForm.append("input_fidelity", "high");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: oaForm,
    });
    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI house render error (${res.status}): ${detail}`);
      return c.json({ error: `Image edit failed (${res.status}): ${detail}` }, 502);
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.log(`OpenAI house render returned no image: ${JSON.stringify(data).slice(0, 500)}`);
      return c.json({ error: "No image returned from render" }, 502);
    }

    let url = "";
    let path = "";
    try {
      await ensureBucket();
      path = `${uid("houserender")}.png`;
      const outBytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const { error } = await supabaseAdmin.storage
        .from(MEDIA_BUCKET)
        .upload(path, outBytes, { contentType: "image/png", upsert: false });
      if (!error) {
        const { data: signed } = await supabaseAdmin.storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        url = signed?.signedUrl ?? "";
      } else {
        console.log(`House render upload failed: ${error.message}`);
      }
    } catch (err) {
      console.log(`Error persisting house render: ${err}`);
    }

    return c.json({ image: `data:image/png;base64,${b64}`, url, path });
  } catch (err) {
    console.log(`Error rendering house photo: ${err}`);
    return c.json({ error: `Failed to render house photo: ${err}` }, 500);
  }
}

app.post(`${P}/house-render/photoreal`, renderHousePhoto);

// ---------------------------------------------------------------------------
// AI Assistant — turns a free-text description (and/or an uploaded photo or
// captured video frame) into a build plan: which design module to open and the
// parametric parameters to seed it with. Frontend posts multipart form with
// "description" (string) and optional "file" (image). Falls back client-side.
// ---------------------------------------------------------------------------
async function assistantPlan(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const form = await c.req.formData();
    const description = String(form.get("description") ?? "").trim();
    // Accept one or many images (field "file" repeated, or "files").
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File && f.type.startsWith("image"))
      .slice(0, 6); // cap to keep the vision request reasonable

    const imageParts: any[] = [];
    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const b64 = btoa(binary);
      const mime = file.type || "image/jpeg";
      // High detail so the model can read deck framing, railing style, board
      // direction and scale references (steps, doors) accurately.
      imageParts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}`, detail: "high" },
      });
    }

    if (!description && !imageParts.length) {
      return c.json({ error: "Provide a description and/or an image." }, 400);
    }

    const prompt =
      "You are the design assistant for a residential CAD app. Based on the user's " +
      "description and/or the attached image, choose the single best module to open " +
      "and seed it with parameters. Return STRICT JSON only:\n" +
      '{ "module": string, "widthFt": number, "depthFt": number, "params": object, "message": string }\n' +
      "module MUST be one of: house, home-addition, deck, kitchen, bathroom, room.\n" +
      "Parameter schemas per module:\n" +
      "- house: { stories:1-3, storyHeight:8-12, roofType:'gable'|'hip'|'shed'|'flat', roofPitch:0-12, " +
      "siding:'sidingWhite'|'sidingGray'|'sidingBlue'|'sidingSage'|'sidingBeige'|'sidingRed'|'sidingCharcoal'|'brick', " +
      "roofColor:'roofCharcoal'|'roofBrown'|'roofGray'|'roofGreen'|'roofWeathered', garage:boolean, windows:boolean, " +
      "dormers:0-3 (windowed gables on the roof; set 2-3 when the user says dormers/cape/craftsman/traditional), " +
      "chimney:boolean (set true for fireplace/chimney/cottage/traditional homes), " +
      "addon:'none'|'deck'|'coveredDeck'|'addition'|'sunroom' (pick 'coveredDeck' for covered/roofed deck/porch, " +
      "'addition' for a room/home addition, 'sunroom' for a sunroom/3-season/glazed room, 'deck' for an open deck), " +
      "deckSide:'back'|'front'|'left'|'right', deckWidth:number(ft), deckDepth:number(ft), coverColor:(same as roofColor), coverPitch:1-12 }\n" +
      "- home-addition: { stories:1-3, storyHeight:8-12, foundation:'slab'|'crawl'|'basement', " +
      "floor:'all', roofType:'gable'|'hip'|'shed'|'flat', roofPitch:0-12, siding:(same as house), roofColor:(same), windows:boolean }\n" +
      "- deck: { flooring:string (e.g. 'pvcGray','composite','wood'), railing:'wood'|'cable'|'glass', " +
      "postSize:'4x4'|'4x6'|'6x6'|'6x8', beamSize:'2x8'|'2x10'|'2x12'|'4x10'|'4x12', joistSize:'2x6'|'2x8'|'2x10'|'2x12', " +
      "multiLevel:boolean, cover:'none'|'pergola'|'gable'|'shed'|'flat', " +
      "coverColor:'roofCharcoal'|'roofBlack'|'roofGray'|'roofWeathered'|'roofBrown'|'roofDesertTan'|'roofGreen'|'roofBarnRed', coverPitch:1-12 }\n" +
      "IMPORTANT deck cover rules: a 'covered deck', 'roofed deck', 'covered patio', 'porch roof', or any " +
      "mention of shingles/asphalt/metal roofing means a SOLID roof — set cover:'gable' (or 'shed'/'flat' if the " +
      "user says so) and pick a matching coverColor (asphalt shingle = 'roofCharcoal' unless a color is given). " +
      "Only use cover:'pergola' when the user asks for an OPEN pergola/lattice with no weather protection. " +
      "Default cover:'none' when no overhead structure is mentioned.\n" +
      "DECK VISION — when a photo shows an existing deck, measure and match it precisely:\n" +
      "• SIZE: estimate widthFt (along the house) and depthFt (away from the house) using scale references — a " +
      "standard exterior door is 3ft wide / 6.7ft tall, a stair tread run is ~10-11in, a riser ~7in, deck boards are " +
      "5.5in wide, balusters are spaced 4in apart. Count boards or balusters to derive real feet. Typical residential " +
      "decks are 10-20ft x 10-16ft — do not default to a generic size, read it from the image.\n" +
      "• FLOORING: identify the decking — grey/brown composite or PVC (Trex/TimberTech look) vs natural cedar/wood vs " +
      "pressure-treated. Match the closest flooring color (e.g. 'pvcGray','pvcBrown','composite','wood').\n" +
      "• RAILING: read the style (wood balusters, cable/wire, or glass panels) into railing, and the color (white, " +
      "black, bronze, natural wood, brushed metal) into railColor.\n" +
      "• LAYOUT: set diagonal:true only if boards run at 45deg; multiLevel:true if there are two or more platform levels; " +
      "detect any overhead cover (pergola vs solid roof) per the cover rules above.\n" +
      "Only report what you can actually see; leave a field out rather than guessing wildly.\n" +
      "- kitchen: { layout:'single'|'galley'|'L'|'U', cabinetStyle:'shaker'|'flat'|'navy'|'walnut', countertop:'quartz'|'granite'|'marble'|'walnut', island:boolean }\n" +
      "- bathroom: { fixture:'shower'|'tub'|'both', vanity:'single'|'double' }\n" +
      "- room: { furniture:'empty'|'living'|'bedroom'|'office', windows:0-4, ceiling:7.5-12 }\n" +
      "widthFt/depthFt are the overall footprint in feet. Only include params valid for the chosen module. " +
      "message is one friendly sentence describing what you are building.";

    const content: any[] = [
      {
        type: "text",
        text:
          prompt +
          (imageParts.length > 1
            ? `\n\n${imageParts.length} reference images are attached — consider all of them together.`
            : "") +
          "\n\nUser description: " +
          (description || "(none)"),
      },
    ];
    content.push(...imageParts);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // Use the stronger vision model (same as the house takeoff) so photo
        // measurements and material reads are accurate; low temperature keeps
        // the estimates stable. Overridable via env for cost tuning.
        model: Deno.env.get("ASSISTANT_VISION_MODEL") ??
          Deno.env.get("HOUSE_VISION_MODEL") ??
          (imageParts.length ? "gpt-4o" : "gpt-4o-mini"),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI assistant error (${res.status}): ${detail}`);
      return c.json({ error: `Assistant API failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content);
    return c.json(parsed);
  } catch (err) {
    console.log(`Error in assistant plan: ${err}`);
    return c.json({ error: `Failed to build plan: ${err}` }, 500);
  }
}

app.post(`${P}/assistant/plan`, assistantPlan);

// ---------------------------------------------------------------------------
// Permit & Zoning assistant — given a job's location and scope, produce the
// municipal permit process, official links, required permits, and the zoning
// summary. Grounds the jurisdiction/zoning with Regrid parcel data when a
// REGRID_API_KEY is configured, then has the model assemble the town-specific
// roadmap and tie it to the building-code standards this app already checks.
// ---------------------------------------------------------------------------

/** Best-effort parcel/zoning lookup via Regrid. Returns null on any failure. */
async function regridLookup(query: string): Promise<any | null> {
  const token = Deno.env.get("REGRID_API_KEY");
  if (!token || !query.trim()) return null;

  // Cache parcel lookups keyed by the normalized address. Regrid geometry is
  // stable, so serving a cached hit avoids a repeat API call (and cost) when a
  // job's permit plan is re-opened.
  const cacheKey = `regrid:${query.trim().toLowerCase().replace(/\s+/g, " ")}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.log(`Regrid cache read failed for "${query}": ${err}`);
  }

  try {
    const url =
      `https://app.regrid.com/api/v1/search.json?query=${encodeURIComponent(query)}` +
      `&limit=1&token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Regrid lookup error (${res.status}) for "${query}"`);
      return null;
    }
    const data = await res.json();
    // Regrid returns GeoJSON-ish results; the parcel attributes live in
    // properties.fields. Be defensive about the exact shape.
    const feat =
      data?.results?.[0] ??
      data?.parcels?.features?.[0] ??
      data?.features?.[0] ??
      null;
    const f = feat?.properties?.fields ?? feat?.properties ?? feat ?? null;
    if (!f) return null;
    const geometry = feat?.geometry ?? null;
    const box = geometry ? geomBounds(geometry) : null;
    const lat = f.lat ?? f.centroid_lat ?? box?.centerLat ?? null;
    const lon = f.lon ?? f.centroid_lon ?? box?.centerLon ?? null;
    const result = {
      apn: f.parcelnumb ?? f.parcelnumb_no_formatting ?? null,
      zoning: f.zoning ?? f.zoning_description ?? null,
      zoningDescription: f.zoning_description ?? null,
      town: f.city ?? f.scity ?? f.mail_city ?? null,
      county: f.county ?? null,
      state: f.state2 ?? f.mail_state2 ?? null,
      zip: f.szip ?? f.mail_zip ?? null,
      lotSizeAcres: f.ll_gisacre ?? f.gisacre ?? null,
      address:
        f.address ??
        (f.saddno ? `${f.saddno} ${f.saddstr ?? ""}`.trim() : null),
      owner: f.owner ?? null,
      lat,
      lon,
      geometry,
      lotWidthFt: box?.widthFt ?? null,
      lotDepthFt: box?.depthFt ?? null,
      lotBearingDeg: box?.bearingDeg ?? null,
    };
    try {
      await kv.set(cacheKey, result);
    } catch (err) {
      console.log(`Regrid cache write failed for "${query}": ${err}`);
    }
    return result;
  } catch (err) {
    console.log(`Regrid lookup failed for "${query}": ${err}`);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Parcel fallbacks: Census geocoder + county/state ArcGIS services.
 *
 * Regrid is the primary parcel source, but it misses rural addresses and it
 * costs per call. Most counties (and a dozen states) publish their own parcel
 * layer as a free, keyless ArcGIS REST feature service — that data is the
 * assessor's own, which is as close to authoritative as we get without a
 * survey. There is no national registry of those endpoints, so the ones we
 * query are configured per deployment rather than guessed at.
 * ------------------------------------------------------------------ */

interface ArcgisService {
  /** Two-letter state this layer covers, or "" for "try it anywhere". */
  state: string;
  name: string;
  /** Full FeatureServer/MapServer layer URL, e.g. https://…/FeatureServer/0 */
  url: string;
}

/** Read the configured ArcGIS layers out of the environment. */
function arcgisServices(envKey: string): ArcgisService[] {
  const raw = Deno.env.get(envKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s: any) => typeof s?.url === "string" && /^https?:\/\//i.test(s.url))
      .map((s: any) => ({
        state: String(s.state ?? "").toUpperCase(),
        name: String(s.name ?? "County GIS"),
        url: String(s.url).replace(/\/query\/?$/i, ""),
      }));
  } catch (err) {
    console.log(`Could not parse ${envKey} — expected a JSON array: ${err}`);
    return [];
  }
}

/**
 * Free US address geocoder (Census Bureau — no key, no quota worth worrying
 * about). Gives us the rooftop point we need to hit a parcel layer by
 * intersection, plus the city/state when the address string was vague.
 */
async function censusGeocode(address: string): Promise<
  { lat: number; lon: number; city: string; state: string; zip: string; matched: string } | null
> {
  const cacheKey = `geocode:${address.trim().toLowerCase().replace(/\s+/g, " ")}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return cached as any;
  } catch (err) {
    console.log(`Geocode cache read failed for "${address}": ${err}`);
  }
  try {
    const url =
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
      `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Census geocoder error (${res.status}) for "${address}"`);
      return null;
    }
    const data = await res.json();
    const m = data?.result?.addressMatches?.[0];
    if (!m?.coordinates) return null;
    const comp = m.addressComponents ?? {};
    const result = {
      lat: Number(m.coordinates.y),
      lon: Number(m.coordinates.x),
      city: String(comp.city ?? ""),
      state: String(comp.state ?? ""),
      zip: String(comp.zip ?? ""),
      matched: String(m.matchedAddress ?? address),
    };
    if (!Number.isFinite(result.lat) || !Number.isFinite(result.lon)) return null;
    try {
      await kv.set(cacheKey, result);
    } catch (err) {
      console.log(`Geocode cache write failed for "${address}": ${err}`);
    }
    return result;
  } catch (err) {
    console.log(`Census geocode failed for "${address}": ${err}`);
    return null;
  }
}

/** Pull the first attribute whose name matches any of these patterns. */
function pickField(props: any, patterns: RegExp[]): any {
  if (!props) return null;
  for (const pat of patterns) {
    for (const key of Object.keys(props)) {
      if (pat.test(key)) {
        const v = props[key];
        if (v !== null && v !== undefined && String(v).trim() !== "") return v;
      }
    }
  }
  return null;
}

/**
 * Query the configured ArcGIS parcel layers for the parcel containing a point.
 *
 * Parcel layers name their columns however the county felt like that decade, so
 * the attributes are matched by pattern rather than by an exact schema.
 */
/** "50A NORTHWESTERN DR" → { num: "50", street: "NORTHWESTERN" } */
function addressParts(s: string): { num: string; street: string } {
  // Only the street line matters — everything after the first comma is the
  // town/state/zip, which would otherwise pollute the street comparison.
  const up = String(s ?? "")
    .split(",")[0]
    .toUpperCase()
    .replace(/[.#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = up.match(/^(\d+)/);
  const num = m ? m[1] : "";
  // Drop the house number and the street-type suffix; what's left identifies
  // the street well enough to match across differently-formatted layers.
  const words = up
    .replace(/^\S*\d\S*\s*/, "")
    .split(" ")
    .filter(
      (w) =>
        w.length > 1 &&
        !/^(ST|STREET|RD|ROAD|DR|DRIVE|AVE|AVENUE|LN|LANE|CT|COURT|WAY|BLVD|PL|PLACE|TER|TERRACE|CIR|CIRCLE|HWY|PKWY|N|S|E|W|NE|NW|SE|SW)$/.test(
          w,
        ),
    );
  return { num, street: words.join(" ") };
}

/**
 * Score a candidate parcel against the address we're looking for.
 * 2 = house number and street both match, 1 = street only, 0 = no match.
 */
function addressScore(props: any, want: { num: string; street: string }): number {
  if (!want.street) return 0;
  const candidates = [
    pickField(props, [/^(site|prop|situs|full).*(addr|address)/i, /^address/i, /^streetaddress$/i]),
    // Some layers split the number and the street into separate columns.
    [pickField(props, [/^addr.*num/i, /^(st|street).*num/i]), pickField(props, [/^full.*str/i, /^st(reet)?_?name/i])]
      .filter(Boolean)
      .join(" "),
  ]
    .filter((v) => v && String(v).trim())
    .map((v) => addressParts(String(v)));

  let best = 0;
  for (const c of candidates) {
    if (!c.street) continue;
    const streetHit = c.street === want.street || c.street.includes(want.street) || want.street.includes(c.street);
    if (!streetHit) continue;
    best = Math.max(best, c.num && want.num && c.num === want.num ? 2 : 1);
  }
  return best;
}

async function arcgisParcelLookup(
  lat: number,
  lon: number,
  state: string,
  address = "",
): Promise<any | null> {
  const services = arcgisServices("ARCGIS_PARCEL_SERVICES").filter(
    (s) => !s.state || !state || s.state === state.toUpperCase(),
  );
  if (!services.length) return null;
  const want = addressParts(address);

  for (const svc of services.slice(0, 4)) {
    try {
      // First try the parcel the point actually lands in.
      const pointUrl =
        `${svc.url}/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint` +
        "&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true" +
        "&outSR=4326&resultRecordCount=1&f=geojson";
      let res = await fetch(pointUrl);
      if (!res.ok) {
        console.log(`ArcGIS parcel query failed on ${svc.name} (${res.status})`);
        continue;
      }
      let data = await res.json();
      let feat = data?.features?.[0];
      let approximate = false;

      // The point landing inside *a* parcel doesn't mean it's the right one.
      // The geocoder interpolates along the centerline and is routinely a few
      // hundred feet out, so two different house numbers on the same street
      // can both land in the same lot — and the plan silently stops changing
      // when you change the address. Only trust a point hit when the parcel's
      // own address agrees; otherwise fall through to the sweep.
      let pointHit: any = null;
      if (feat?.geometry && want.street) {
        if (addressScore(feat.properties ?? {}, want) < 2) {
          pointHit = feat;
          feat = null;
        }
      }

      // Sweep the block and match on the address instead.
      if (!feat?.geometry) {
        const d = 0.004; // roughly 1,500 ft
        const envUrl =
          `${svc.url}/query?geometry=${lon - d},${lat - d},${lon + d},${lat + d}` +
          "&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects" +
          "&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=60&f=geojson";
        res = await fetch(envUrl);
        if (!res.ok) {
          console.log(`ArcGIS parcel sweep failed on ${svc.name} (${res.status})`);
          continue;
        }
        data = await res.json();
        const feats = (data?.features ?? []).filter((f: any) => f?.geometry);
        if (!feats.length) continue;

        let best: any = null;
        let bestScore = -1;
        let bestDist = Infinity;
        for (const f of feats) {
          const score = addressScore(f.properties ?? {}, want);
          const b = geomBounds(f.geometry);
          const dist = b
            ? Math.hypot(b.centerLat - lat, (b.centerLon - lon) * 0.74)
            : Infinity;
          // An address match always beats proximity; ties break on distance.
          if (score > bestScore || (score === bestScore && dist < bestDist)) {
            best = f;
            bestScore = score;
            bestDist = dist;
          }
        }
        if (bestScore >= 2) {
          // Exact house number and street: this is the lot.
          feat = best;
          approximate = false;
        } else if (pointHit) {
          // No better answer than the parcel the geocoder landed in. Take it,
          // but flag it so the sheet says the lot needs verifying.
          feat = pointHit;
          approximate = true;
        } else if (bestScore > 0 || bestDist <= 0.0025) {
          feat = best;
          approximate = true;
        } else {
          // Nothing matched the address and the nearest parcel is far away —
          // better to return nothing than to draw the wrong lot.
          continue;
        }
      }

      if (!feat?.geometry) continue;
      const p = feat.properties ?? {};
      const box = geomBounds(feat.geometry);
      const acres = Number(
        pickField(p, [/^(gis)?acres?$/i, /acre/i, /^calc.*acre/i]),
      );
      return {
        apn: pickField(p, [/^(apn|pin|pid)$/i, /parcel.*(id|no|num)/i, /^map.*lot/i])
          ?.toString() ?? null,
        zoning: pickField(p, [/^zon(ing|e)$/i, /zoning.*code/i, /zone.*class/i])?.toString() ?? null,
        zoningDescription:
          pickField(p, [/zoning.*desc/i, /zone.*desc/i])?.toString() ?? null,
        town: pickField(p, [/^(city|town|muni)/i, /municipal/i])?.toString() ?? null,
        county: pickField(p, [/^county/i])?.toString() ?? null,
        state: state || pickField(p, [/^state/i])?.toString() || null,
        zip: pickField(p, [/^zip/i, /postal/i])?.toString() ?? null,
        lotSizeAcres: Number.isFinite(acres) && acres > 0 ? acres : null,
        address:
          pickField(p, [/^(site|prop|situs|full).*(addr|address)/i, /^address/i])
            ?.toString() ?? null,
        owner: pickField(p, [/^owner/i, /owner.*name/i])?.toString() ?? null,
        lat: box?.centerLat ?? lat,
        lon: box?.centerLon ?? lon,
        geometry: feat.geometry,
        lotWidthFt: box?.widthFt ?? null,
        lotDepthFt: box?.depthFt ?? null,
        lotBearingDeg: box?.bearingDeg ?? null,
        source: svc.name,
        /** True when we matched by street/proximity, not by exact address. */
        approximate,
      };
    } catch (err) {
      console.log(`ArcGIS parcel lookup errored on ${svc.name}: ${err}`);
    }
  }
  return null;
}

/**
 * County building footprints, when the county publishes them. More reliable
 * than crowd-mapped OSM data in rural areas — but still not a survey.
 */
async function arcgisBuildings(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  state: string,
): Promise<{ buildings: any[]; source: string } | null> {
  const services = [
    ...arcgisServices("ARCGIS_BUILDING_SERVICES"),
    ...DEFAULT_BUILDING_SERVICES,
  ].filter((s) => !s.state || !state || s.state === state.toUpperCase());
  if (!services.length) return null;

  for (const svc of services.slice(0, 3)) {
    try {
      const env = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
      const url =
        `${svc.url}/query?geometry=${env}&geometryType=esriGeometryEnvelope` +
        "&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true" +
        "&outSR=4326&resultRecordCount=40&f=geojson";
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`ArcGIS building query failed on ${svc.name} (${res.status})`);
        continue;
      }
      const data = await res.json();
      const buildings: any[] = [];
      for (const feat of data?.features ?? []) {
        const g = feat?.geometry;
        const ring =
          g?.type === "Polygon"
            ? g.coordinates?.[0]
            : g?.type === "MultiPolygon"
            ? g.coordinates?.[0]?.[0]
            : null;
        if (!Array.isArray(ring) || ring.length < 3) continue;
        const p = feat.properties ?? {};
        buildings.push({
          id: String(pickField(p, [/^objectid/i, /^fid$/i, /^id$/i]) ?? buildings.length),
          kind: String(pickField(p, [/type/i, /use/i, /class/i]) ?? "yes"),
          name: String(pickField(p, [/^name/i, /descr/i]) ?? ""),
          levels: Number(pickField(p, [/stor(ies|y)/i, /levels?/i, /floors?/i])) || null,
          ring: ring.map((c: any) => [Number(c[0]), Number(c[1])]),
        });
      }
      if (buildings.length) return { buildings, source: svc.name };
    } catch (err) {
      console.log(`ArcGIS building lookup errored on ${svc.name}: ${err}`);
    }
  }
  return null;
}

/**
 * Spot grades from the USGS 3DEP elevation point service — free, keyless.
 *
 * A handful of samples around the lot is enough to put spot elevations on the
 * sheet and tell the contractor which way the site falls, which is what a
 * drainage note needs. It is not a topographic survey and won't replace one.
 */
async function usgsElevations(
  points: { lat: number; lon: number; label: string }[],
): Promise<{ lat: number; lon: number; label: string; elevFt: number }[]> {
  const out: { lat: number; lon: number; label: string; elevFt: number }[] = [];
  const sample = async (p: { lat: number; lon: number; label: string }) => {
    try {
      const url =
        "https://epqs.nationalmap.gov/v1/json" +
        `?x=${p.lon}&y=${p.lat}&units=Feet&wkid=4326&includeDate=false`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const v = Number(data?.value ?? data?.USGS_Elevation_Point_Query_Service?.Elevation_Query?.Elevation);
      // The service returns a large negative sentinel when it has no coverage.
      if (!Number.isFinite(v) || v < -1000) return;
      out.push({ ...p, elevFt: Math.round(v * 10) / 10 });
    } catch (err) {
      console.log(`USGS elevation sample failed at ${p.lat},${p.lon}: ${err}`);
    }
  };
  // Cap the fan-out; the sheet only has room for a handful of spot grades.
  await Promise.all(points.slice(0, 9).map(sample));
  return out;
}

/** Bounding box (and rough width/depth in feet) of a GeoJSON geometry. */
function geomBounds(geometry: any): {
  minLat: number; maxLat: number; minLon: number; maxLon: number;
  centerLat: number; centerLon: number; widthFt: number; depthFt: number;
  bearingDeg: number | null;
} | null {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  const visit = (co: any) => {
    if (typeof co?.[0] === "number" && typeof co?.[1] === "number") {
      const [lon, lat] = co;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(co)) {
      for (const c of co) visit(c);
    }
  };
  visit(geometry?.coordinates);
  if (!isFinite(minLat) || !isFinite(minLon)) return null;
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const M_PER_DEG = 111320;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  // Project ring vertices to local meters (equirectangular around the centroid)
  // and fit the minimum-area rectangle so the lot dimensions reflect the parcel's
  // true orientation, not just its N–S / E–W extent.
  const pts: [number, number][] = [];
  const collect = (co: any) => {
    if (typeof co?.[0] === "number" && typeof co?.[1] === "number") {
      pts.push([(co[0] - centerLon) * M_PER_DEG * cosLat, (co[1] - centerLat) * M_PER_DEG]);
    } else if (Array.isArray(co)) {
      for (const c of co) collect(c);
    }
  };
  collect(geometry?.coordinates);

  const rect = minAreaRect(pts);
  // Axis-aligned fallback if the oriented fit fails.
  const widthM = rect ? rect.w : (maxLon - minLon) * M_PER_DEG * cosLat;
  const depthM = rect ? rect.h : (maxLat - minLat) * M_PER_DEG;
  const a = Math.round(Math.abs(widthM) * 3.28084);
  const b = Math.round(Math.abs(depthM) * 3.28084);

  // Bearing of the frontage (shorter) axis, measured clockwise from north in
  // [0, 180). The 3D builder can rotate the zoning envelope by this so it lines
  // up with the parcel's true orientation instead of assuming it's square to N.
  let bearingDeg: number | null = null;
  if (rect) {
    // rect.angle is the w-axis orientation from east (CCW). The shorter side is
    // the frontage; if h is shorter, the frontage axis is perpendicular.
    const frontageAngleFromEast = rect.w <= rect.h ? rect.angle : rect.angle + Math.PI / 2;
    // Convert math angle (CCW from east) to compass bearing (CW from north).
    let deg = 90 - (frontageAngleFromEast * 180) / Math.PI;
    deg = ((deg % 180) + 180) % 180; // normalize to [0, 180)
    bearingDeg = Math.round(deg * 10) / 10;
  }
  return {
    minLat, maxLat, minLon, maxLon, centerLat, centerLon,
    // Lots are conventionally described frontage (width) × depth; default the
    // shorter side to width, the longer to depth.
    widthFt: Math.min(a, b),
    depthFt: Math.max(a, b),
    bearingDeg,
  };
}

/** Convex hull (Andrew's monotone chain) of 2D points. */
function convexHull(points: [number, number][]): [number, number][] {
  const p = points.slice().sort((u, v) => (u[0] - v[0]) || (u[1] - v[1]));
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Minimum-area bounding rectangle (rotating over hull edges). `angle` is the
 * orientation (radians) of the rectangle's w-axis in the local ENU frame, where
 * +x is east and +y is north.
 */
function minAreaRect(points: [number, number][]): { w: number; h: number; angle: number } | null {
  const hull = convexHull(points);
  if (hull.length < 3) return null;
  let best: { w: number; h: number; area: number; angle: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of hull) {
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
    const w = maxX - minX, h = maxY - minY, area = w * h;
    if (!best || area < best.area) best = { w, h, area, angle };
  }
  return best ? { w: best.w, h: best.h, angle: best.angle } : null;
}

async function permitsPlan(c: any) {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const body = await c.req.json().catch(() => ({}));
    const location = String(body?.location ?? "").trim();
    const scope = String(body?.scope ?? "").trim();
    if (!location) {
      return c.json({ error: "A job location (town/city and state, or address) is required." }, 400);
    }

    // Cache identical lookups so repeat opens are instant and consistent.
    const cacheKey =
      "permit:" +
      btoa(unescape(encodeURIComponent(`${location}||${scope}`.toLowerCase()))).slice(0, 80);
    if (!body?.refresh) {
      const cached = await kv.get(cacheKey);
      if (cached) return c.json({ ...cached, cached: true });
    }

    // Ground the jurisdiction/zoning with real parcel data when possible.
    const parcel = await regridLookup(location);
    // Slim copy for the model — omit the (large) geometry to save tokens.
    const parcelForPrompt = parcel
      ? (({ geometry, ...rest }) => rest)(parcel)
      : null;

    // The building-code standards this app already computes against — the model
    // ties the permit to these so the contractor knows what we can produce.
    const APP_CODES =
      "- Structural framing: NDS + IRC span tables (R502/R802/R507) and AWC DCA6 (deck framing lib)\n" +
      "- Snow loads & footings: ASCE 7-22 Ch.7 + IBC foundation sizing (snowFootings lib)\n" +
      "- Electrical: NEC (NFPA 70) Article 220 load calcs, 210.52 receptacle spacing (electrical lib)\n" +
      "- Plumbing: IPC drainage (DFU) & water-supply (WSFU) sizing (plumbing lib)\n" +
      "- General model-code compliance: IBC/IRC 2021, ADA clearances";

    const prompt =
      "You are a US residential construction permit expert helping a contractor pull permits. " +
      `The job is located at: "${location}". ` +
      (scope ? `Scope of work: "${scope}". ` : "Scope: general residential construction/remodel. ") +
      (parcelForPrompt
        ? "Verified parcel data (from a parcel database — treat as authoritative for " +
          `jurisdiction/zoning): ${JSON.stringify(parcelForPrompt)}. `
        : "") +
      "Identify the actual permitting jurisdiction (town/city, county, state) and produce a " +
      "precise, town-specific permitting roadmap. " +
      "The app already computes against these building-code standards — reference the ones that " +
      "apply to this scope so the contractor knows what documentation we can generate:\n" +
      APP_CODES +
      "\nReturn STRICT JSON only, matching exactly this TypeScript type:\n" +
      "{ jurisdiction:{ town:string, county:string, state:string }, " +
      "authority:{ name:string, department:string, website:string, permitPortal:string, phone:string, address:string }, " +
      "permitsNeeded:[{ type:string, trade:string, why:string, typicalReviewDays:number }], " +
      "process:[{ step:number, title:string, detail:string }], " +
      "timeline:string, fees:string, requiredDocuments:string[], " +
      "zoning:{ district:string, setbacks:{ front:string, side:string, rear:string }, maxHeightFt:string, maxLotCoveragePct:string, notes:string }, " +
      "codeReferences:[{ code:string, appliesTo:string, inApp:boolean }], " +
      "gis:{ parcelViewerUrl:string, assessorUrl:string, plotPlanHowTo:string }, " +
      "searchQuery:string, confidence:number, disclaimer:string }\n" +
      "CRITICAL RULES for links: website, permitPortal, gis.parcelViewerUrl and gis.assessorUrl MUST be " +
      "official government URLs only (municipal/county/state sites ending in .gov, .us, or the town's " +
      "official domain — the county/town GIS property viewer and the assessor/property-card site). NEVER invent " +
      "a URL you are not confident is real — if unsure, set it to the official town/county homepage and note that " +
      "in the disclaimer. gis.plotPlanHowTo explains, in 1-2 sentences, how to obtain an existing plot/site plan " +
      "or plat for this parcel from the town/county (e.g. building dept records, assessor, recorder of deeds). " +
      "If unsure of the exact permit portal, set permitPortal to the " +
      "same value as the official website (the town homepage) and explain in the disclaimer. " +
      "searchQuery is a Google query the user can run to find the building department (e.g. " +
      "'<Town> <State> building department permits'). " +
      "codeReferences.inApp is true when the code maps to one of the app standards listed above. " +
      "confidence is 0..1 reflecting how sure you are about this specific jurisdiction's process. " +
      "Keep every field concise and factual.";

    const model = Deno.env.get("PERMIT_MODEL") || "gpt-4o";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI permit plan error (${res.status}): ${detail}`);
      return c.json({ error: `Permit assistant failed (${res.status})` }, 502);
    }
    const data = await res.json();
    const plan = JSON.parse(data?.choices?.[0]?.message?.content);
    const result = {
      ...plan,
      parcel: parcel ?? null,
      parcelVerified: !!parcel,
      generatedAt: new Date().toISOString(),
    };
    try {
      await kv.set(cacheKey, result);
    } catch (err) {
      console.log(`Failed to cache permit plan: ${err}`);
    }
    return c.json(result);
  } catch (err) {
    console.log(`Error in permit plan: ${err}`);
    return c.json({ error: `Failed to build permit plan: ${err}` }, 500);
  }
}

app.post(`${P}/permits/plan`, permitsPlan);

/* ---- Persist a permit plan onto a work request (team-visible) ---- */

app.put(`${P}/work-requests/:id/permit`, async (c: any) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    if (!body?.plan) {
      return c.json({ error: "Missing 'plan' in request body." }, 400);
    }
    const record = {
      requestId: id,
      plan: body.plan,
      savedAt: new Date().toISOString(),
    };
    await kv.set(`permit-job:${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`Error saving permit to job: ${err}`);
    return c.json({ error: `Failed to save permit plan to job: ${err}` }, 500);
  }
});

app.get(`${P}/permitted-jobs`, async (c: any) => {
  try {
    const records = (await kv.getByPrefix("permit-job:")) as any[];
    const ids = (records || [])
      .map((r) => r?.requestId)
      .filter((x): x is string => !!x);
    return c.json({ requestIds: ids });
  } catch (err) {
    console.log(`Error listing permitted jobs: ${err}`);
    return c.json({ error: `Failed to list permitted jobs: ${err}` }, 500);
  }
});

app.get(`${P}/work-requests/:id/permit`, async (c: any) => {
  try {
    const id = c.req.param("id");
    const record = await kv.get(`permit-job:${id}`);
    if (!record) return c.json({ error: "No permit plan saved for this job." }, 404);
    return c.json(record);
  } catch (err) {
    console.log(`Error loading permit for job: ${err}`);
    return c.json({ error: `Failed to load permit plan for job: ${err}` }, 500);
  }
});

app.delete(`${P}/work-requests/:id/permit`, async (c: any) => {
  try {
    const id = c.req.param("id");
    await kv.del(`permit-job:${id}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error deleting permit for job: ${err}`);
    return c.json({ error: `Failed to delete permit plan for job: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Customers & their document folders
//   kv keys:  customer:<id>            → customer record
//             doc:<customerId>:<docId> → document metadata (file in DOCS_BUCKET)
// Files live in a private Storage bucket; the frontend gets 7-day signed URLs.
// ---------------------------------------------------------------------------
const DOCS_BUCKET = "make-12c91054-docs";
let docsBucketReady: Promise<void> | null = null;
async function ensureDocsBucket() {
  if (!docsBucketReady) {
    docsBucketReady = (async () => {
      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const exists = buckets?.some((b) => b.name === DOCS_BUCKET);
        if (!exists) await supabaseAdmin.storage.createBucket(DOCS_BUCKET);
      } catch (err) {
        console.log(`Error ensuring docs bucket: ${err}`);
      }
    })();
  }
  return docsBucketReady;
}

/** Sign a document's private storage path into a temporary URL. */
async function signDoc(doc: any): Promise<any> {
  if (!doc?.path) return doc;
  try {
    const { data } = await supabaseAdmin.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(doc.path, 60 * 60 * 24 * 7);
    return { ...doc, url: data?.signedUrl ?? "" };
  } catch (err) {
    console.log(`Error signing document ${doc.path}: ${err}`);
    return { ...doc, url: "" };
  }
}

/** How many documents a customer has (used by list + match). */
async function docCount(customerId: string): Promise<number> {
  try {
    const docs = await kv.getByPrefix(`doc:${customerId}:`);
    return Array.isArray(docs) ? docs.length : 0;
  } catch {
    return 0;
  }
}

/** Address similarity 0–1 (numeric tokens like house #/zip weighted double). */
function addressSimilarity(a: string, b: string): number {
  const tok = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[.,#/\\-]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  const ta = tok(a);
  const tb = new Set(tok(b));
  if (!ta.length || !tb.size) return 0;
  let hits = 0;
  let weight = 0;
  for (const t of ta) {
    const w = /^\d+$/.test(t) ? 2 : 1;
    weight += w;
    if (tb.has(t)) hits += w;
  }
  return weight ? hits / weight : 0;
}

// List all customers (with a document count for each).
app.get(`${P}/customers`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const customers = await kv.getByPrefix("customer:");
    customers.sort((a: any, b: any) =>
      (a?.name ?? "").localeCompare(b?.name ?? ""),
    );
    const withCounts = await Promise.all(
      customers.map(async (cust: any) => ({
        ...cust,
        documentCount: await docCount(cust.id),
      })),
    );
    return c.json({ customers: withCounts });
  } catch (err) {
    console.log(`Error listing customers: ${err}`);
    return c.json({ error: `Failed to list customers: ${err}` }, 500);
  }
});

// Rank customers by how well their address matches a query (?address=...).
app.get(`${P}/customers/match`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const address = c.req.query("address") ?? "";
    if (!address.trim()) return c.json({ matches: [] });
    const customers = await kv.getByPrefix("customer:");
    const scored = await Promise.all(
      customers.map(async (cust: any) => ({
        customer: cust,
        score: addressSimilarity(address, cust?.address ?? ""),
        documentCount: await docCount(cust.id),
      })),
    );
    const matches = scored
      .filter((m) => m.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return c.json({ matches });
  } catch (err) {
    console.log(`Error matching customers: ${err}`);
    return c.json({ error: `Failed to match customers: ${err}` }, 500);
  }
});

app.get(`${P}/customers/:id`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    const customer = await kv.get(`customer:${id}`);
    if (!customer) return c.json({ error: `Customer ${id} not found` }, 404);
    return c.json({ customer: { ...customer, documentCount: await docCount(id) } });
  } catch (err) {
    console.log(`Error fetching customer: ${err}`);
    return c.json({ error: `Failed to fetch customer: ${err}` }, 500);
  }
});

app.post(`${P}/customers`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const body = await c.req.json().catch(() => ({}));
    if (!String(body.name ?? "").trim()) {
      return c.json({ error: "Customer 'name' is required" }, 400);
    }
    const now = new Date().toISOString();
    const id = body.id ?? uid("cust");
    const existing = body.id ? await kv.get(`customer:${id}`) : null;
    const customer = {
      id,
      name: String(body.name).trim(),
      email: body.email ?? existing?.email ?? "",
      phone: body.phone ?? existing?.phone ?? "",
      address: body.address ?? existing?.address ?? "",
      notes: body.notes ?? existing?.notes ?? "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await kv.set(`customer:${id}`, customer);
    return c.json({ customer });
  } catch (err) {
    console.log(`Error saving customer: ${err}`);
    return c.json({ error: `Failed to save customer: ${err}` }, 500);
  }
});

app.put(`${P}/customers/:id`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`customer:${id}`);
    if (!existing) return c.json({ error: `Customer ${id} not found` }, 404);
    const body = await c.req.json().catch(() => ({}));
    const customer = {
      ...existing,
      name: body.name ?? existing.name,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
      address: body.address ?? existing.address,
      notes: body.notes ?? existing.notes,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`customer:${id}`, customer);
    return c.json({ customer });
  } catch (err) {
    console.log(`Error updating customer: ${err}`);
    return c.json({ error: `Failed to update customer: ${err}` }, 500);
  }
});

app.delete(`${P}/customers/:id`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    // Remove the customer's document metadata + files, then the record.
    const docs = await kv.getByPrefix(`doc:${id}:`);
    if (Array.isArray(docs) && docs.length) {
      const paths = docs.map((d: any) => d.path).filter(Boolean);
      if (paths.length) {
        try {
          await supabaseAdmin.storage.from(DOCS_BUCKET).remove(paths);
        } catch (err) {
          console.log(`Error removing docs files for customer ${id}: ${err}`);
        }
      }
      await kv.mdel(docs.map((d: any) => `doc:${id}:${d.id}`));
    }
    await kv.del(`customer:${id}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error deleting customer: ${err}`);
    return c.json({ error: `Failed to delete customer: ${err}` }, 500);
  }
});

// List a customer's documents (with signed URLs).
app.get(`${P}/customers/:id/documents`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    // A job folder is a filtered view of the customer's folder — same storage,
    // same portal, just narrowed to one job so the tabs can share it.
    const jobRef = String(c.req.query("jobRef") ?? "").trim();
    let docs = await kv.getByPrefix(`doc:${id}:`);
    if (jobRef) docs = docs.filter((d: any) => d?.jobRef === jobRef);
    docs.sort((a: any, b: any) =>
      (b?.uploadedAt ?? "").localeCompare(a?.uploadedAt ?? ""),
    );
    const signed = await Promise.all(docs.map((d: any) => signDoc(d)));
    return c.json({ documents: signed });
  } catch (err) {
    console.log(`Error listing documents: ${err}`);
    return c.json({ error: `Failed to list documents: ${err}` }, 500);
  }
});

// Upload one or more documents to a customer's folder (multipart form).
app.post(`${P}/customers/:id/documents`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    const customer = await kv.get(`customer:${id}`);
    if (!customer) return c.json({ error: `Customer ${id} not found` }, 404);
    await ensureDocsBucket();
    const form = await c.req.formData();
    const files = form
      .getAll("file")
      .concat(form.getAll("files"))
      .filter((f): f is File => f instanceof File);
    if (!files.length) return c.json({ error: "No files in upload" }, 400);

    // Which job (and which tab) these files belong to. Optional — a document
    // can still be filed straight to the customer with no job attached.
    const jobRef = String(form.get("jobRef") ?? "").trim();
    const jobLabel = String(form.get("jobLabel") ?? "").trim();
    const kind = String(form.get("kind") ?? "").trim();
    const source = String(form.get("source") ?? "").trim();

    const saved: any[] = [];
    for (const file of files) {
      try {
        const mime = file.type || "application/octet-stream";
        const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
        const docId = uid("doc");
        const path = `${id}/${docId}.${ext}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error } = await supabaseAdmin.storage
          .from(DOCS_BUCKET)
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (error) {
          console.log(`Doc upload failed for ${file.name}: ${error.message}`);
          continue;
        }
        const meta = {
          id: docId,
          customerId: id,
          name: file.name || `${docId}.${ext}`,
          path,
          size: bytes.byteLength,
          contentType: mime,
          uploadedAt: new Date().toISOString(),
          jobRef: jobRef || null,
          jobLabel: jobLabel || null,
          kind: kind || null,
          source: source || null,
        };
        await kv.set(`doc:${id}:${docId}`, meta);
        saved.push(meta);
      } catch (err) {
        console.log(`Error uploading a document: ${err}`);
      }
    }
    const signed = await Promise.all(saved.map((d) => signDoc(d)));
    return c.json({ documents: signed });
  } catch (err) {
    console.log(`Error uploading documents: ${err}`);
    return c.json({ error: `Failed to upload documents: ${err}` }, 500);
  }
});

app.delete(`${P}/customers/:id/documents/:docId`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    const docId = c.req.param("docId");
    const meta = await kv.get(`doc:${id}:${docId}`);
    if (meta?.path) {
      try {
        await supabaseAdmin.storage.from(DOCS_BUCKET).remove([meta.path]);
      } catch (err) {
        console.log(`Error removing doc file ${meta.path}: ${err}`);
      }
    }
    await kv.del(`doc:${id}:${docId}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error deleting document: ${err}`);
    return c.json({ error: `Failed to delete document: ${err}` }, 500);
  }
});

/* ------------------------------------------------------------------ *
 * Job <-> customer links, and the read-only customer portal
 * ------------------------------------------------------------------ */

// Record (or refresh) the link between a job/case and a customer, so the
// portal can show every job filed for that customer.
app.post(`${P}/job-links`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const body = await c.req.json().catch(() => ({}));
    const jobRef = String(body.jobRef ?? "").trim();
    const customerId = String(body.customerId ?? "").trim();
    if (!jobRef || !customerId) {
      return c.json({ error: "Both jobRef and customerId are required to link a job" }, 400);
    }
    const link = {
      jobRef,
      customerId,
      kind: String(body.kind ?? "other"),
      label: String(body.label ?? jobRef),
      customerName: String(body.customerName ?? ""),
      address: String(body.address ?? ""),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`joblink:${customerId}:${jobRef}`, link);
    return c.json({ link });
  } catch (err) {
    console.log(`Error linking a job to a customer: ${err}`);
    return c.json({ error: `Failed to link the job to the customer: ${err}` }, 500);
  }
});

app.get(`${P}/job-links`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const customerId = c.req.query("customerId") ?? "";
    if (!customerId) return c.json({ error: "customerId is required" }, 400);
    const links = await kv.getByPrefix(`joblink:${customerId}:`);
    const list = Array.isArray(links) ? links : [];
    list.sort((a: any, b: any) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""));
    return c.json({ links: list });
  } catch (err) {
    console.log(`Error listing job links: ${err}`);
    return c.json({ error: `Failed to list the customer's jobs: ${err}` }, 500);
  }
});

/**
 * Everything the customer-facing portal needs in one call: who they are, the
 * jobs filed for them, and their documents with fresh signed URLs. Read-only —
 * it never returns notes, costs or anything the office keeps internal.
 */
app.get(`${P}/portal/:customerId`, async (c) => {
  try {
    const id = c.req.param("customerId");

    // Only the customer whose folder this is, or staff, ever sees it.
    const caller = await callerOf(c);
    if (!caller) {
      return c.json({ error: "Sign in to view your documents.", code: "signin_required" }, 401);
    }
    if (!caller.staff && caller.customerId !== id) {
      return c.json(
        { error: "This folder belongs to another account.", code: "forbidden" },
        403,
      );
    }

    const customer = await kv.get(`customer:${id}`);
    if (!customer) return c.json({ error: "That portal link is not valid." }, 404);

    const docs = await kv.getByPrefix(`doc:${id}:`);
    const list = Array.isArray(docs) ? docs : [];
    list.sort((a: any, b: any) => (b?.uploadedAt ?? "").localeCompare(a?.uploadedAt ?? ""));
    const documents = await Promise.all(list.map((d: any) => signDoc(d)));

    const rawLinks = await kv.getByPrefix(`joblink:${id}:`);
    const jobs = (Array.isArray(rawLinks) ? rawLinks : []).sort((a: any, b: any) =>
      (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""),
    );

    return c.json({
      customer: {
        id: customer.id,
        name: customer.name ?? "",
        address: customer.address ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
      },
      jobs,
      documents,
      viewerIsStaff: caller.staff,
    });
  } catch (err) {
    console.log(`Error loading the customer portal: ${err}`);
    return c.json({ error: `Failed to load the portal: ${err}` }, 500);
  }
});

/**
 * Who am I? Lets the app decide what to show without guessing: staff get the
 * office, a customer gets their own folder, everyone else gets the sign-in.
 */
app.get(`${P}/me`, async (c) => {
  try {
    const caller = await callerOf(c);
    if (!caller) {
      return c.json({ signedIn: false, staff: false, status: "anonymous", customerId: null });
    }

    // Every account that ever signs in is listed for you to allow or not.
    const account = await rememberAccount(caller);

    // First run: the very first person to sign in becomes the owner, and that
    // is written down permanently. Everyone after them waits for you to say so.
    let role = caller.role;
    let staff = caller.staff;
    if (!staff && !caller.customerId && staffListMissing()) {
      const existing = (await kv.getByPrefix("staff:")) ?? [];
      if (existing.filter(Boolean).length === 0) {
        await kv.set(`staff:${caller.email}`, {
          email: caller.email,
          role: "owner",
          name: account.name ?? "",
          active: true,
          addedBy: "first sign-in",
          updatedAt: new Date().toISOString(),
        });
        role = "owner";
        staff = true;
        console.log(`Granted owner access to the first account to sign in: ${caller.email}`);
      }
    }

    let customerName = "";
    if (caller.customerId) {
      const customer = await kv.get(`customer:${caller.customerId}`);
      customerName = customer?.name ?? "";
    }

    return c.json({
      signedIn: true,
      staff,
      status: staff ? "staff" : caller.customerId ? "customer" : "pending",
      email: caller.email,
      role,
      signupRole: caller.signupRole ?? "",
      customerId: caller.customerId,
      customerName,
      staffListConfigured: true,
    });
  } catch (err) {
    console.log(`Error resolving the current user: ${err}`);
    return c.json({ error: `Failed to resolve the current user: ${err}` }, 500);
  }
});

app.post(`${P}/portal/signup`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || password.length < 8) {
      return c.json({ error: "Enter your email and a password of at least 8 characters." }, 400);
    }

    const customers = await kv.getByPrefix("customer:");
    const match = (Array.isArray(customers) ? customers : []).find(
      (cust: any) => String(cust?.email ?? "").trim().toLowerCase() === email,
    );
    if (!match) {
      // Deliberately vague: don't confirm or deny which emails we hold.
      return c.json(
        { error: "We don't have a project on file for that email. Check with your contractor." },
        404,
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: match.name ?? "", role: "customer" },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) {
      console.log(`Portal signup failed for ${email}: ${error.message}`);
      const taken = /already/i.test(error.message);
      return c.json(
        { error: taken ? "You already have an account — sign in instead." : `Could not create your account: ${error.message}` },
        taken ? 409 : 500,
      );
    }

    await kv.set(`customer-user:${email}`, {
      email,
      customerId: match.id,
      userId: data?.user?.id ?? null,
      linkedAt: new Date().toISOString(),
    });
    return c.json({ ok: true, customerId: match.id });
  } catch (err) {
    console.log(`Error during portal signup: ${err}`);
    return c.json({ error: `Failed to create the portal account: ${err}` }, 500);
  }
});

/**
 * Staff action: bind (or re-bind) a customer record to the email that signs in
 * for it, so an account created any other way still resolves to this folder.
 */
app.post(`${P}/customers/:id/portal-access`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const customer = await kv.get(`customer:${id}`);
    if (!customer) return c.json({ error: `Customer ${id} not found` }, 404);
    if (!email) return c.json({ error: "An email is required to grant portal access" }, 400);

    await kv.set(`customer-user:${email}`, {
      email,
      customerId: id,
      linkedAt: new Date().toISOString(),
    });
    await kv.set(`customer:${id}`, { ...customer, email, updatedAt: new Date().toISOString() });
    return c.json({ ok: true, email, customerId: id });
  } catch (err) {
    console.log(`Error granting portal access: ${err}`);
    return c.json({ error: `Failed to grant portal access: ${err}` }, 500);
  }
});

/**
 * The team list: people who work here but whose account doesn't carry a staff
 * role yet. Roles that come from your main app's sign-up are honoured on their
 * own; this is only for filling the gaps.
 */
/**
 * Everyone who has ever signed in, with the access you gave them. Signing in
 * puts a person on this list; it does not let them in.
 */
app.get(`${P}/team`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const [accounts, grants, links] = await Promise.all([
      kv.getByPrefix("account:"),
      kv.getByPrefix("staff:"),
      kv.getByPrefix("customer-user:"),
    ]);
    const grantBy = new Map<string, any>();
    for (const g of (grants ?? []).filter(Boolean)) {
      grantBy.set(String(g.email ?? "").toLowerCase(), g);
    }
    const customerBy = new Map<string, any>();
    for (const l of (links ?? []).filter(Boolean)) {
      customerBy.set(String(l.email ?? "").toLowerCase(), l);
    }

    const rows = new Map<string, any>();
    for (const a of (accounts ?? []).filter(Boolean)) {
      rows.set(String(a.email ?? "").toLowerCase(), { ...a });
    }
    // Someone you granted access to before they ever signed in still belongs here.
    for (const [email, g] of grantBy) {
      if (!rows.has(email)) rows.set(email, { email, name: g.name ?? "" });
    }

    const people = [...rows.values()].map((a) => {
      const email = String(a.email ?? "").toLowerCase();
      const grant = grantBy.get(email);
      const role = grant && grant.active !== false ? String(grant.role ?? "") : "";
      const customerId = customerBy.get(email)?.customerId ?? null;
      return {
        ...a,
        role,
        grantedBy: grant?.addedBy ?? "",
        grantedAt: grant?.updatedAt ?? "",
        customerId,
        status: STAFF_ROLES.includes(role) ? "staff" : customerId ? "customer" : "pending",
      };
    });
    people.sort((a, b) => String(b.lastSeen ?? "").localeCompare(String(a.lastSeen ?? "")));

    return c.json({
      people,
      staffEmails: staffEmails(),
      staffListConfigured: !staffListMissing(),
      roles: STAFF_ROLES,
      you: gate.caller.email,
    });
  } catch (err) {
    console.log(`Error listing accounts: ${err}`);
    return c.json({ error: `Failed to list accounts: ${err}` }, 500);
  }
});

/** Give an email a role, or take it away with role "none". */
app.post(`${P}/team`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return c.json({ error: "Enter a valid email address." }, 400);
    }
    if (email === gate.caller.email && !STAFF_ROLES.includes(role)) {
      return c.json({ error: "You can't remove your own access." }, 400);
    }
    if (role === "none" || role === "") {
      await kv.del(`staff:${email}`);
      return c.json({ member: { email, role: "" } });
    }
    if (!STAFF_ROLES.includes(role)) {
      return c.json({ error: `"${role}" is not a role you can grant.` }, 400);
    }
    const record = {
      email,
      role,
      name: String(body.name ?? "").trim(),
      active: true,
      addedBy: gate.caller.email,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`staff:${email}`, record);
    return c.json({ member: record });
  } catch (err) {
    console.log(`Error granting access: ${err}`);
    return c.json({ error: `Failed to save that access: ${err}` }, 500);
  }
});

app.delete(`${P}/team/:email`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const email = decodeURIComponent(c.req.param("email")).toLowerCase();
    if (email === gate.caller.email) {
      return c.json({ error: "You can't remove your own access." }, 400);
    }
    await kv.del(`staff:${email}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error removing access: ${err}`);
    return c.json({ error: `Failed to remove that access: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Project spec — the AI read of a Command Center description.
//
// The intake already makes a keyword-based guess. This asks the model to read
// the same description (plus the address and the local code data we have) and
// return the same shape, with a confidence on each item and an explicit list of
// what it wants the contractor to confirm. The frontend merges this over the
// guess and won't let anyone into the builder until the flagged items are
// looked at — that's the step we can't afford to miss.
// ---------------------------------------------------------------------------
app.post(`${P}/project-spec`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const body = await c.req.json();
    const description = String(body?.text ?? "").trim();
    if (!description) return c.json({ error: "A project description is required." }, 400);
    const address = String(body?.address ?? "").trim();
    const guess = body?.guess ?? null;

    const prompt =
      "You are a residential construction estimator reading a contractor's project description and " +
      "producing the starting design spec. Reply with JSON only, no prose, in exactly this shape:\n" +
      '{ "kind": "deck"|"porch"|"addition"|"sunroom"|"garage"|"house"|"kitchen"|"bathroom"|"room",\n' +
      '  "widthFt": number, "depthFt": number, "stories": 1|2|3,\n' +
      '  "foundation": "piers"|"slab"|"frost"|"crawl"|"basement",\n' +
      '  "roofType": "gable"|"hip"|"shed"|"flat"|"none", "roofPitch": number (0-18, rise in 12),\n' +
      '  "snowPg": number (ground snow load psf for the site),\n' +
      '  "snowBasis": string (where that snow number comes from — state/region, and say if it is a regional estimate),\n' +
      '  "confidence": { "kind": 0-1, "size": 0-1, "foundation": 0-1, "roof": 0-1, "snow": 0-1 },\n' +
      '  "confirm": [ { "field": "kind"|"size"|"foundation"|"roof"|"snow", "question": string, "why": string } ],\n' +
      '  "summary": string (one sentence describing what is being built) }\n\n' +
      "Rules:\n" +
      "- widthFt is the dimension along the house, depthFt the dimension away from it.\n" +
      "- A covered porch is kind 'porch'; an uncovered deck is 'deck' with roofType 'none'.\n" +
      "- Decks and porches sit on piers below frost unless the description says otherwise.\n" +
      "- Use the real ground snow load for the site's state/region per ASCE 7 practice. Never invent a " +
      "town-specific adopted value — if you only know the region, say so in snowBasis and put 'snow' in confirm.\n" +
      "- Put an item in 'confirm' whenever its confidence is below 0.8, when the description never said it, " +
      "or when getting it wrong would change the structure or the permit set. Confirming the ground snow load " +
      "against the town's adopted figure should almost always be in the list.\n" +
      "- Only report what the description supports; do not invent scope that was not asked for.\n\n" +
      `Address: ${address || "(not given)"}\n` +
      (guess ? `A keyword-based first pass produced: ${JSON.stringify(guess)}\n` : "") +
      `Description: ${description}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: Deno.env.get("SPEC_MODEL") ?? "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI project-spec error (${res.status}): ${detail}`);
      return c.json({ error: `Project spec read failed (${res.status}): ${detail}` }, 502);
    }

    const data = await res.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch (err) {
      console.log(`Could not parse the project spec JSON: ${err}`);
      return c.json({ error: "The model returned something we couldn't read." }, 502);
    }

    const num = (v: any, min: number, max: number, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
    };
    const confirm = Array.isArray(parsed.confirm)
      ? parsed.confirm
          .filter((x: any) => x && x.field)
          .map((x: any) => ({
            field: String(x.field),
            question: String(x.question ?? ""),
            why: String(x.why ?? ""),
          }))
      : [];

    return c.json({
      spec: {
        kind: String(parsed.kind ?? ""),
        widthFt: num(parsed.widthFt, 2, 200, 0),
        depthFt: num(parsed.depthFt, 2, 200, 0),
        stories: num(parsed.stories, 1, 3, 1),
        foundation: String(parsed.foundation ?? ""),
        roofType: String(parsed.roofType ?? ""),
        roofPitch: num(parsed.roofPitch, 0, 18, 6),
        snowPg: num(parsed.snowPg, 0, 200, -1),
        snowBasis: String(parsed.snowBasis ?? ""),
        confidence: parsed.confidence && typeof parsed.confidence === "object" ? parsed.confidence : {},
        confirm,
        summary: String(parsed.summary ?? ""),
      },
    });
  } catch (err) {
    console.log(`Error building the project spec: ${err}`);
    return c.json({ error: `Failed to read the project into a spec: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Ground snow load for a town — the lookup that turns the spec's snow figure
// from a judgment call into a citation. Answers with the jurisdiction's adopted
// pg, the code edition and amendment it comes from, and the page to verify it
// on. Cached per town, because a town's adopted figure doesn't move.
// ---------------------------------------------------------------------------
app.post(`${P}/snow-load`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 501);

    const body = await c.req.json().catch(() => ({}));
    const location = String(body?.location ?? "").trim();
    if (!location) return c.json({ error: "A town/state or address is required." }, 400);
    const authority = String(body?.authority ?? "").trim();

    const cacheKey =
      "snow:" + btoa(unescape(encodeURIComponent(location.toLowerCase()))).slice(0, 80);
    if (!body?.refresh) {
      const cached = await kv.get(cacheKey);
      if (cached) return c.json({ ...cached, cached: true });
    }

    const prompt =
      "You are a US building-code researcher. A contractor needs the design ground snow load (pg, psf) " +
      `adopted by the jurisdiction for this site: "${location}". ` +
      (authority ? `Their building department is: ${authority}. ` : "") +
      "Return STRICT JSON only:\n" +
      '{ "pg": number, "town": string, "state": string,\n' +
      '  "codeEdition": string (e.g. "2021 IRC with 2023 state amendments", or the ASCE 7 edition),\n' +
      '  "basis": "adopted"|"state-table"|"asce-map"|"regional-estimate",\n' +
      '  "sourceName": string (the document or page this comes from),\n' +
      '  "sourceUrl": string (official .gov / state code / town building department page to verify it on — ' +
      'never invent a URL; use the department or state code homepage if unsure),\n' +
      '  "caseStudy": boolean (true if the area is a case-study / site-specific region where the ' +
      'authority determines pg individually),\n' +
      '  "authoritative": boolean (true ONLY when this is the jurisdiction\'s actual adopted figure, ' +
      "not a regional read of the ASCE map),\n" +
      '  "note": string (one or two sentences: what to confirm and where) }\n' +
      "Be honest about certainty: if you only know the state table or the regional ASCE value, set basis " +
      "accordingly and authoritative:false. Never fabricate a town-specific number or a URL.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: Deno.env.get("SNOW_MODEL") ?? Deno.env.get("PERMIT_MODEL") ?? "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`OpenAI snow-load error (${res.status}): ${detail}`);
      return c.json({ error: `Snow load lookup failed (${res.status}): ${detail}` }, 502);
    }

    const data = await res.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch (err) {
      console.log(`Could not parse the snow-load JSON: ${err}`);
      return c.json({ error: "The model returned something we couldn't read." }, 502);
    }

    const pg = Number(parsed.pg);
    const url = String(parsed.sourceUrl ?? "");
    const result = {
      pg: Number.isFinite(pg) && pg >= 0 && pg <= 300 ? pg : null,
      town: String(parsed.town ?? ""),
      state: String(parsed.state ?? ""),
      codeEdition: String(parsed.codeEdition ?? ""),
      basis: String(parsed.basis ?? "regional-estimate"),
      sourceName: String(parsed.sourceName ?? ""),
      sourceUrl: /^https?:\/\//i.test(url) ? url : "",
      caseStudy: !!parsed.caseStudy,
      authoritative: !!parsed.authoritative && !parsed.caseStudy,
      note: String(parsed.note ?? ""),
      lookedUpAt: new Date().toISOString(),
    };

    try {
      await kv.set(cacheKey, result);
    } catch (err) {
      console.log(`Failed to cache the snow-load lookup: ${err}`);
    }
    return c.json(result);
  } catch (err) {
    console.log(`Error looking up the ground snow load: ${err}`);
    return c.json({ error: `Failed to look up the ground snow load: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Plot plan data — everything needed to draft a site plan for a property.
//
// Three layers, stacked from most to least authoritative:
//   1. Regrid parcel record: the lot boundary polygon, APN, zoning district,
//      acreage, owner. This is the survey-adjacent layer and drives the drawing.
//   2. OpenStreetMap (Overpass): existing building footprints on and around the
//      lot, plus street centerlines. Free, keyless, and it's what lets us work
//      out which lot line actually fronts the road instead of guessing.
//   3. The model: the district's dimensional standards — setbacks, height,
//      coverage — which are text in a bylaw, not a GIS layer anywhere.
//
// What this deliberately does NOT produce: septic, well, easements, wetland
// buffers or anything else that only appears on a recorded plat or an
// instrument survey. Those get flagged in fieldVerify.
// ---------------------------------------------------------------------------
/**
 * Is this address a unit in a condominium?
 *
 * It matters because NH and MA both map a condominium as one fee parcel for
 * the whole tract — the land is common area, and the individual units carry no
 * geometry at all. So the boundary that comes back is the entire development,
 * and drafting setbacks or lot coverage against it produces a meaningless
 * pass. Better to say so on the sheet than to hand a building department a
 * drawing of the wrong lot.
 */
function detectCondo(
  address: string,
  parcel: any,
  buildingCount: number,
): { likely: boolean; reason: string } {
  const unit = /\b(unit|apt|apartment|#\s*\d|bldg|building)\s*[-#]?\s*[0-9a-z]+\b/i.test(
    address,
  );
  const blob = JSON.stringify(parcel ?? {}).toLowerCase();
  const named = /condo|condominium|association|common area|hoa/.test(blob);
  const acres = Number(parcel?.lotSizeAcres);
  // A lot big enough to hold a development, with the buildings to match.
  const sprawling = Number.isFinite(acres) && acres > 3 && buildingCount >= 4;

  if (unit)
    return {
      likely: true,
      reason:
        "The address has a unit designator, and condominium units aren't mapped " +
        "as their own parcels — this boundary is the whole association.",
    };
  if (named)
    return {
      likely: true,
      reason:
        "The parcel record names a condominium or association, so this boundary " +
        "is the common land, not one unit's yard.",
    };
  if (sprawling)
    return {
      likely: true,
      reason:
        `This parcel is ${acres.toFixed(1)} acres with ${buildingCount} buildings on it, ` +
        "which usually means a condominium or a multi-building development rather " +
        "than a single house lot.",
    };
  return { likely: false, reason: "" };
}

/* ------------------------------------------------------------------ *
 * Site context layers: imagery, wetlands, flood, abutters.
 *
 * All of these are free, keyless public services that answer in about a
 * second. Together they turn a bare lot outline into something a building
 * department recognises: you can see the ground, you know whether a wetland
 * buffer or a flood zone governs the work, and the neighbours are named.
 * ------------------------------------------------------------------ */

/**
 * Building-footprint services we have actually queried and verified, merged
 * with whatever the deployment configures. Towns publish better footprints
 * than the crowdsourced data does, and hardcoding the ones we've tested beats
 * making every install rediscover them.
 */
const DEFAULT_BUILDING_SERVICES: ArcgisService[] = [
  {
    state: "NH",
    name: "Town of Salem, NH Buildings",
    url: "https://services6.arcgis.com/Do88DoK2xjTUCXd1/arcgis/rest/services/Salem_NH_Buildings/FeatureServer/0",
  },
  {
    state: "MA",
    name: "MassGIS Building Structures (2D)",
    url: "https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Building_Structures/FeatureServer/0",
  },
];

/** Pull the first polygon ring out of an Esri/GeoJSON geometry. */
function firstRing(g: any): [number, number][] | null {
  const ring =
    g?.type === "Polygon"
      ? g.coordinates?.[0]
      : g?.type === "MultiPolygon"
      ? g.coordinates?.[0]?.[0]
      : null;
  if (!Array.isArray(ring) || ring.length < 3) return null;
  return ring.map((c: any) => [Number(c[0]), Number(c[1])]);
}

/** Query an ArcGIS feature service over a bbox and hand back GeoJSON features. */
async function arcgisEnvelope(
  serviceUrl: string,
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  outFields = "*",
  max = 40,
): Promise<any[]> {
  const env = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
  const url =
    `${serviceUrl}/query?geometry=${env}&geometryType=esriGeometryEnvelope` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${encodeURIComponent(outFields)}` +
    `&returnGeometry=true&outSR=4326&resultRecordCount=${max}&f=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} from ${serviceUrl}`);
  const data = await res.json();
  return Array.isArray(data?.features) ? data.features : [];
}

/**
 * Wetlands from the USFWS National Wetlands Inventory.
 *
 * In New Hampshire and Massachusetts a mapped wetland pulls a buffer and a
 * conservation-commission review over the project, so it belongs on the sheet
 * even though NWI is a screening tool and not a delineation.
 */
async function nwiWetlands(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
): Promise<{ id: string; label: string; ring: [number, number][] }[]> {
  try {
    const feats = await arcgisEnvelope(
      "https://www.fws.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0",
      bbox,
      "*",
      20,
    );
    const out: { id: string; label: string; ring: [number, number][] }[] = [];
    for (const f of feats) {
      const ring = firstRing(f?.geometry);
      if (!ring) continue;
      const p = f.properties ?? {};
      const label =
        String(
          pickField(p, [/wetland_type/i, /^wetland$/i, /attribute/i, /^type$/i]) ?? "",
        ) || "Wetland";
      out.push({ id: `nwi-${out.length}`, label, ring });
    }
    return out;
  } catch (err) {
    console.log(`NWI wetland lookup failed: ${err}`);
    return [];
  }
}

/** FEMA flood hazard zones from the National Flood Hazard Layer. */
async function femaFloodZones(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
): Promise<{ id: string; zone: string; label: string; ring: [number, number][] }[]> {
  try {
    const feats = await arcgisEnvelope(
      "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
      bbox,
      "FLD_ZONE,ZONE_SUBTY,STATIC_BFE",
      20,
    );
    const out: { id: string; zone: string; label: string; ring: [number, number][] }[] = [];
    for (const f of feats) {
      const ring = firstRing(f?.geometry);
      if (!ring) continue;
      const p = f.properties ?? {};
      const zone = String(p.FLD_ZONE ?? "").trim() || "—";
      const sub = String(p.ZONE_SUBTY ?? "").trim();
      out.push({
        id: `fema-${out.length}`,
        zone,
        label: sub ? `Zone ${zone} — ${sub.toLowerCase()}` : `Zone ${zone}`,
        ring,
      });
    }
    return out;
  } catch (err) {
    console.log(`FEMA NFHL flood lookup failed: ${err}`);
    return [];
  }
}

/**
 * The abutting lots, so the sheet can name who is on each side the way a plat
 * does. Comes from the same parcel layer the boundary came from.
 */
async function abutterParcels(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  state: string,
  selfApn: string,
): Promise<{ id: string; label: string; ring: [number, number][] }[]> {
  const services = arcgisServices("ARCGIS_PARCEL_SERVICES").filter(
    (s) => !s.state || !state || s.state === state.toUpperCase(),
  );
  for (const svc of services.slice(0, 2)) {
    try {
      const feats = await arcgisEnvelope(svc.url, bbox, "*", 40);
      const out: { id: string; label: string; ring: [number, number][] }[] = [];
      for (const f of feats) {
        const ring = firstRing(f?.geometry);
        if (!ring) continue;
        const p = f.properties ?? {};
        const apn = String(
          pickField(p, [/^pid$/i, /parcel_?id/i, /map_?par/i, /state_?id/i, /displayid/i]) ?? "",
        );
        // Don't label the subject lot as its own neighbour.
        if (apn && selfApn && apn === selfApn) continue;
        const addr = String(
          pickField(p, [/site_?addr/i, /streetaddress/i, /prop_?loc/i, /situs/i]) ?? "",
        );
        const label = addr || (apn ? `Map/Lot ${apn}` : "Abutting lot");
        out.push({ id: `ab-${out.length}`, label, ring });
      }
      if (out.length) return out;
    } catch (err) {
      console.log(`Abutter lookup failed on ${svc.name}: ${err}`);
    }
  }
  return [];
}

async function overpassSite(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
): Promise<{ buildings: any[]; streets: any[] } | null> {
  // Pad the parcel box so we catch the road out front and the neighbours'
  // corners — useful context on a drawn sheet.
  const padLat = 0.0012;
  const padLon = 0.0016;
  const s = bbox.minLat - padLat;
  const w = bbox.minLon - padLon;
  const n = bbox.maxLat + padLat;
  const e = bbox.maxLon + padLon;
  const q =
    `[out:json][timeout:25];(` +
    `way["building"](${s},${w},${n},${e});` +
    `way["highway"~"^(residential|unclassified|tertiary|secondary|primary|service|living_street)$"](${s},${w},${n},${e});` +
    `);out geom;`;

  // Overpass is free and rate-limited, and the main instance throws 429/504
  // under load often enough that a single attempt loses the house on the lot
  // with no explanation. Walk the public mirrors, POST then GET, before giving
  // up — a missing building is far worse than a slow sheet.
  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];

  let data: any = null;
  let lastError = "";
  outer: for (const base of mirrors) {
    for (const method of ["POST", "GET"] as const) {
      try {
        const res =
          method === "POST"
            ? await fetch(base, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `data=${encodeURIComponent(q)}`,
              })
            : await fetch(`${base}?data=${encodeURIComponent(q)}`);
        if (!res.ok) {
          lastError = `${base} ${method} → ${res.status}`;
          console.log(`Overpass site query failed: ${lastError}`);
          continue;
        }
        data = await res.json();
        break outer;
      } catch (err) {
        lastError = `${base} ${method} → ${err}`;
        console.log(`Error querying Overpass site features: ${lastError}`);
      }
    }
  }
  if (!data) {
    console.log(`All Overpass mirrors failed for the site query. Last: ${lastError}`);
    return null;
  }

  try {
    const buildings: any[] = [];
    const streets: any[] = [];
    for (const el of data?.elements ?? []) {
      const geom = el?.geometry;
      if (!Array.isArray(geom) || geom.length < 2) continue;
      const pts = geom.map((g: any) => [g.lon, g.lat]);
      const tags = el.tags ?? {};
      if (tags.building) {
        buildings.push({
          id: String(el.id),
          kind: String(tags.building),
          name: tags.name ? String(tags.name) : "",
          levels: Number(tags["building:levels"]) || null,
          ring: pts,
        });
      } else if (tags.highway) {
        streets.push({
          id: String(el.id),
          name: tags.name ? String(tags.name) : "",
          kind: String(tags.highway),
          line: pts,
        });
      }
    }
    return { buildings, streets };
  } catch (err) {
    console.log(`Error reading the Overpass site response: ${err}`);
    return null;
  }
}

app.post(`${P}/plot-plan`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const body = await c.req.json().catch(() => ({}));
    const location = String(body?.location ?? "").trim();
    const scope = String(body?.scope ?? "").trim();
    if (!location) return c.json({ error: "A property address is required." }, 400);

    // Truncating the encoded key used to let two long addresses sharing a
    // prefix collide, so the second one got served the first one's plan. Keep
    // a hash of the whole string on the end so that can't happen.
    const seed = (location + "|" + scope).toLowerCase();
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    const cacheKey =
      "plotplan:" +
      btoa(unescape(encodeURIComponent(seed))).slice(0, 64) +
      ":" +
      h.toString(36);
    if (!body?.refresh) {
      const cached = await kv.get(cacheKey);
      if (cached) return c.json({ ...cached, cached: true });
    }

    // 1. The parcel boundary — Regrid first, then the county's own GIS.
    let parcel = await regridLookup(location);
    let parcelSource = parcel?.geometry ? "Regrid" : "";
    const geo = await censusGeocode(location);
    if (!parcel?.geometry) {
      if (geo) {
        const fromCounty = await arcgisParcelLookup(
          geo.lat,
          geo.lon,
          geo.state,
          geo.matched || location,
        );
        if (fromCounty?.geometry) {
          // Keep anything Regrid did know (zoning, owner) and layer the
          // county's boundary over it.
          parcel = { ...(parcel ?? {}), ...fromCounty };
          parcelSource =
            (fromCounty.source || "County GIS") +
            (fromCounty.approximate ? " (matched by street — verify the lot)" : "");
        } else if (!parcel) {
          // No boundary anywhere, but at least we know where the house is.
          parcel = {
            apn: null, zoning: null, zoningDescription: null,
            town: geo.city || null, county: null, state: geo.state || null,
            zip: geo.zip || null, lotSizeAcres: null, address: geo.matched,
            owner: null, lat: geo.lat, lon: geo.lon, geometry: null,
            lotWidthFt: null, lotDepthFt: null, lotBearingDeg: null,
          };
        }
      }
    }
    const box = parcel?.geometry ? geomBounds(parcel.geometry) : null;

    // 2. Existing site features around it. Town footprints and the crowdsourced
    //    ones each miss buildings the other has, so take both and de-duplicate
    //    rather than letting one source shadow the other.
    const site = box ? await overpassSite(box) : null;
    let buildings = site?.buildings ?? [];
    const sources: string[] = site?.buildings.length ? ["OpenStreetMap contributors"] : [];
    if (box) {
      const county = await arcgisBuildings(box, parcel?.state ?? geo?.state ?? "");
      if (county?.buildings.length) {
        const near = (a: any, b: any) => {
          // Two footprints are the same building if their centroids are within
          // about 25 ft — the offset you get between an ML trace and a town's
          // digitised outline of the same roof.
          const c = (r: any[]) => [
            r.reduce((t: number, p: any) => t + p[0], 0) / r.length,
            r.reduce((t: number, p: any) => t + p[1], 0) / r.length,
          ];
          const [ax, ay] = c(a.ring);
          const [bx, by] = c(b.ring);
          return Math.hypot((ax - bx) * 0.74, ay - by) < 0.00007;
        };
        // The town's outline wins where they overlap; it's the surveyed one.
        buildings = [
          ...county.buildings,
          ...buildings.filter((o) => !county.buildings.some((n: any) => near(o, n))),
        ];
        sources.unshift(county.source);
      }
    }
    let siteDataSource = sources.length ? sources.join(", ") : null;
    if (site?.streets.length && !sources.includes("OpenStreetMap contributors")) {
      siteDataSource = `${siteDataSource ?? ""}${siteDataSource ? ", " : ""}OpenStreetMap contributors (streets)`;
    }

    // 2b. The context that decides whether the work is even permittable, and
    //     who the plan has to name as abutters.
    const [wetlands, flood, abutters] = box
      ? await Promise.all([
          nwiWetlands(box),
          femaFloodZones(box),
          abutterParcels(box, parcel?.state ?? geo?.state ?? "", String(parcel?.apn ?? "")),
        ])
      : [[], [], []];

    // 3. Spot grades from USGS 3DEP, sampled around the lot.
    let grades: any[] = [];
    if (box && parcel?.geometry) {
      const ring =
        parcel.geometry.type === "Polygon"
          ? parcel.geometry.coordinates?.[0]
          : parcel.geometry.coordinates?.[0]?.[0];
      const pts: { lat: number; lon: number; label: string }[] = [];
      if (Array.isArray(ring)) {
        // Spread the samples around the boundary rather than clustering them.
        const step = Math.max(1, Math.floor(ring.length / 6));
        for (let i = 0; i < ring.length && pts.length < 6; i += step) {
          pts.push({ lon: Number(ring[i][0]), lat: Number(ring[i][1]), label: "" });
        }
      }
      pts.push({ lat: box.centerLat, lon: box.centerLon, label: "center" });
      grades = await usgsElevations(pts);
    }

    // 4. The district's dimensional standards.
    let zoning: any = null;
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (apiKey) {
      const known = parcel
        ? `Parcel data on file: town ${parcel.town ?? "?"}, county ${parcel.county ?? "?"}, ` +
          `state ${parcel.state ?? "?"}, zoning code "${parcel.zoning ?? "?"}" ` +
          `(${parcel.zoningDescription ?? "no description"}), lot size ${
            parcel.lotSizeAcres ?? "?"
          } acres. `
        : "";
      const prompt =
        "You are a municipal zoning researcher preparing a plot plan for a residential building permit. " +
        `Site: "${location}". ` +
        (scope ? `Proposed work: ${scope}. ` : "") +
        known +
        "Report the dimensional standards of the zoning district that governs this parcel. " +
        "Return STRICT JSON only:\n" +
        '{ "jurisdiction": {"town": string, "county": string, "state": string},\n' +
        '  "district": string (the code, e.g. "R-2"), "districtName": string,\n' +
        '  "setbacksFt": {"front": number|null, "side": number|null, "rear": number|null, "cornerSide": number|null},\n' +
        '  "maxHeightFt": number|null, "maxStories": number|null,\n' +
        '  "maxLotCoveragePct": number|null, "maxImperviousPct": number|null,\n' +
        '  "minLotSizeSqFt": number|null, "minFrontageFt": number|null,\n' +
        '  "accessorySetbacksFt": {"side": number|null, "rear": number|null},\n' +
        '  "requirements": string[] (what the town requires ON the plot plan itself — ' +
        "scale, north arrow, stamped survey, existing/proposed structures, septic, well, driveway),\n" +
        '  "fieldVerify": string[] (what must be measured or pulled from a recorded plan and ' +
        "cannot be determined remotely — septic, well, easements, wetland buffers, existing " +
        "structure locations),\n" +
        '  "surveyRequired": boolean, "surveyNote": string,\n' +
        '  "sourceUrl": string (the town zoning bylaw / ordinance page; never invent one),\n' +
        '  "confidence": number 0-1, "notes": string }\n' +
        "Critical: never guess a dimensional number. If you do not know a setback for certain, " +
        "return null for it and say so in notes — a guessed number would put a structure over a " +
        "property line on a drawing someone submits to a building department.";

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: Deno.env.get("PLOT_PLAN_MODEL") ?? Deno.env.get("PERMIT_MODEL") ?? "gpt-4o",
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          zoning = JSON.parse(data?.choices?.[0]?.message?.content ?? "null");
        } else {
          console.log(`OpenAI plot-plan zoning error (${res.status}): ${await res.text()}`);
        }
      } catch (err) {
        console.log(`Failed to read the zoning standards for the plot plan: ${err}`);
      }
    }

    if (!parcel && !zoning) {
      return c.json(
        {
          error:
            "No parcel record or zoning data could be found for that address. Check the address, " +
            "or pull the lot boundary from the town's GIS parcel viewer.",
        },
        404,
      );
    }

    const result = {
      location,
      scope,
      parcel: parcel ?? null,
      parcelVerified: !!parcel?.geometry,
      parcelSource: parcelSource || null,
      buildings,
      streets: site?.streets ?? [],
      siteDataSource,
      wetlands,
      wetlandSource: wetlands.length ? "USFWS National Wetlands Inventory" : null,
      flood,
      floodSource: flood.length ? "FEMA National Flood Hazard Layer" : null,
      abutters,
      condo: detectCondo(location, parcel, buildings.length),
      grades,
      gradeSource: grades.length ? "USGS 3DEP elevation point service" : null,
      zoning,
      generatedAt: new Date().toISOString(),
      disclaimer:
        "This plot plan is drafted from public parcel and GIS data plus a research read of the " +
        "zoning bylaw. It is not an instrument survey. Verify all boundary dimensions, setbacks, " +
        "and the location of septic, well, and easements before submitting to a building department.",
    };

    try {
      await kv.set(cacheKey, result);
    } catch (err) {
      console.log(`Failed to cache the plot plan data: ${err}`);
    }
    return c.json(result);
  } catch (err) {
    console.log(`Error building the plot plan data: ${err}`);
    return c.json({ error: `Failed to build the plot plan: ${err}` }, 500);
  }
});

/**
 * A georeferenced aerial photo of the lot, returned as a data URL.
 *
 * Esri's World Imagery export is free and keyless and gives roughly six-inch
 * ground resolution over New England. Screened behind the parcel it does the
 * job a survey base map does on a real sheet: you can see the driveway, the
 * roof lines and the tree line, trace what the footprint layers missed, and
 * check by eye that the boundary landed on the right lot.
 *
 * It comes back inlined rather than as a link so the printed sheet and the
 * copy filed in the customer's folder still have the image months later.
 */
app.post(`${P}/plot-plan/aerial`, async (c) => {
  const gate = await requireStaff(c);
  if (isResponse(gate)) return gate;
  try {
    const body = await c.req.json().catch(() => ({}));
    const minLat = Number(body?.minLat);
    const maxLat = Number(body?.maxLat);
    const minLon = Number(body?.minLon);
    const maxLon = Number(body?.maxLon);
    if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) {
      return c.json({ error: "A bbox of minLat/maxLat/minLon/maxLon is required." }, 400);
    }
    // Guard against an unbounded request pulling a county-sized image.
    if (maxLat - minLat > 0.05 || maxLon - minLon > 0.05) {
      return c.json({ error: "That area is too large for an aerial underlay." }, 400);
    }

    const cacheKey =
      `aerial:${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`;
    if (!body?.refresh) {
      const cached = await kv.get(cacheKey);
      if (cached) return c.json({ ...(cached as any), cached: true });
    }

    // Square the request off so the pixels aren't stretched relative to ground.
    const size = 1400;
    const url =
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
      `?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326` +
      `&size=${size},${size}&format=jpg&transparent=false&f=image`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log(`World Imagery export failed (${res.status}): ${text.slice(0, 300)}`);
      return c.json(
        { error: `The imagery service returned ${res.status}.` },
        502,
      );
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    // btoa needs a binary string, and spreading a megabyte into String.fromCharCode
    // blows the argument limit — walk it in chunks.
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const payload = {
      dataUrl: `data:image/jpeg;base64,${btoa(binary)}`,
      bbox: { minLat, maxLat, minLon, maxLon },
      source: "Esri World Imagery (Maxar, USDA NAIP and others)",
      capturedNote:
        "Imagery date varies by tile — treat it as recent context, not a survey.",
    };
    // Only cache the modest ones — a megabyte of base64 per lot would bloat the
    // KV table fast, and re-fetching an image is cheap.
    if (payload.dataUrl.length < 700_000) await kv.set(cacheKey, payload);
    return c.json(payload);
  } catch (err) {
    console.log(`Error building the aerial underlay: ${err}`);
    return c.json({ error: `Failed to fetch the aerial image: ${err}` }, 500);
  }
});


Deno.serve(app.fetch);
