/**
 * design-links — the spine joining a design to the rest of the business.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The design centre grew up on its own. A deck design was stored under
 * `design_project:decks:{id}` with an address typed into it and nothing else:
 * no customer, no job, no link to the quote it was priced from or the invoice
 * it was billed on. Meanwhile customers, work requests, quotes and invoices all
 * existed and all knew about each other. The drawings were the only thing
 * standing outside.
 *
 * So this does two jobs, and nothing else:
 *
 *   1. It resolves a customer into everything else attached to them — their
 *      work requests, quotes, invoices and designs — so a designer can attach a
 *      drawing to the right job rather than retyping an address.
 *
 *   2. It gives a customer a real document folder, and lets the design centre
 *      file into it. Permit packets, calculation sheets, framing drawings,
 *      renders and scanned town paperwork currently end up in whoever's
 *      Downloads folder generated them, which means the one place they are
 *      guaranteed not to be is with the customer they belong to.
 *
 * ACCESS. Everything here reads across customer records — quotes, invoices,
 * contact details — so it is gated to internal staff on the same rule the
 * /customers routes use. Being signed in is not enough; a customer signed into
 * their own portal must not be able to read this. The portal reads its own
 * documents through a separate, narrower route at the bottom of this file that
 * only ever returns that caller's own files.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const BUCKET = "make-3eae23a6-project-files";
const CRM_CONTACTS_KEY = "crm_contacts:default";

/** Same set the intake routes treat as internal staff. */
const STAFF_ROLES = new Set([
  "admin", "owner", "super_admin", "superadmin", "staff", "employee",
  "project_manager", "estimator", "office",
]);

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function actor(c: any) {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await service().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function isStaff(user: any): Promise<boolean> {
  if (!user?.id) return false;
  const owners = (Deno.env.get("PLATFORM_OWNER_EMAILS") || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (owners.includes(String(user.email || "").toLowerCase())) return true;

  const role = String(
    user.app_metadata?.role || user.user_metadata?.role || user.user_metadata?.accountType || "",
  ).toLowerCase().replace(/[\s-]+/g, "_");
  if (STAFF_ROLES.has(role)) return true;

  try {
    const sb = service();
    const [perms, members] = await Promise.all([
      sb.from("user_permissions").select("role_name").eq("user_id", user.id),
      sb.from("company_members").select("role").eq("user_id", user.id).eq("is_active", true),
    ]);
    if ((perms.data || []).some((r: any) => STAFF_ROLES.has(String(r.role_name || "").toLowerCase()))) return true;
    if ((members.data || []).some((r: any) => ["owner", "admin"].includes(String(r.role || "").toLowerCase()))) return true;
  } catch {
    // A lookup failure must not grant access.
  }
  return false;
}

/** Staff-only guard for everything except the portal route. */
async function requireStaff(c: any, next: any) {
  const user = await actor(c);
  if (!user) return c.json({ error: "Sign in required." }, 401);
  if (!(await isStaff(user))) return c.json({ error: "Internal access is required." }, 403);
  c.set("user", user);
  await next();
}

const FILE_PREFIX = "project_file:";
const fileKey = (id: string) => `${FILE_PREFIX}${id}`;

/* ─────────────────────────── context lookup ─────────────────────────── */

/**
 * Everything attached to one customer, in one call.
 *
 * The designer needs all of it at once to offer a sensible job picker, and
 * making it one round trip keeps the panel from popping in piece by piece while
 * someone is trying to pick.
 */
app.get("/context", requireStaff, async (c) => {
  try {
    const customerId = String(c.req.query("customerId") || "").trim();
    if (!customerId) return c.json({ error: "customerId is required." }, 400);

    const contacts = ((await kv.get(CRM_CONTACTS_KEY)) as any[]) || [];
    const customer = contacts.find((x: any) => String(x.id) === customerId) || null;
    const email = String(customer?.email || "").toLowerCase();

    const [quotesRaw, invoicesRaw, requestsRaw, designsRaw, filesRaw] = await Promise.all([
      kv.getByPrefix("quote:"),
      kv.getByPrefix("invoice:"),
      kv.getByPrefix("work_request:"),
      kv.getByPrefix("design_project:"),
      kv.getByPrefix(FILE_PREFIX),
    ]);

    const mine = (r: any) => {
      const id = String(r?.customerId ?? r?.customer_id ?? "");
      if (id && id === customerId) return true;
      // Records created before a customer existed carry only an email.
      const e = String(r?.customerEmail ?? r?.customer_email ?? r?.clientEmail ?? r?.client_email ?? r?.email ?? "").toLowerCase();
      return !!email && e === email;
    };

    const quotes = (quotesRaw || []).filter(mine).map((q: any) => ({
      id: q.id, number: q.number, type: q.type, status: q.status,
      total: q.total ?? null, issueDate: q.issueDate, updatedAt: q.updatedAt,
    }));

    const invoices = (invoicesRaw || []).filter(mine).map((i: any) => ({
      id: i.id, number: i.number ?? i.invoiceNumber, status: i.status,
      total: i.total ?? i.amount ?? null, dueDate: i.dueDate, updatedAt: i.updatedAt,
    }));

    const requests = (requestsRaw || []).filter(mine).map((r: any) => ({
      id: r.id, title: r.title ?? r.subject ?? r.service ?? "Work request",
      status: r.status, address: r.address ?? r.propertyAddress ?? "",
      createdAt: r.createdAt ?? r.created_at,
    }));

    const designs = (designsRaw || [])
      .filter((d: any) => String(d?.meta?.customerId || "") === customerId)
      .map((d: any) => ({
        id: d.id, name: d.name, kind: d.meta?.kind || "design",
        jobId: d.meta?.jobId || "", version: d.version,
        town: d.meta?.site?.town || "", updatedAt: d.updatedAt,
      }));

    const files = (filesRaw || [])
      .filter((f: any) => String(f?.customerId || "") === customerId)
      .map((f: any) => ({ ...f, path: undefined }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return c.json({ customer, quotes, invoices, requests, designs, files });
  } catch (err: any) {
    console.log(`[design-links] context failed: ${err?.message || err}`);
    return c.json({ error: `Could not load that customer: ${err?.message || err}` }, 500);
  }
});

/**
 * Attach a design to a customer and, optionally, to one of their jobs.
 *
 * Written onto the design's own meta rather than into a side table, so the link
 * travels with the record and cannot be orphaned by a save that does not know
 * about it.
 */
app.post("/attach", requireStaff, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const ownerKey = String(body?.ownerKey || "decks").trim();
    const id = String(body?.designId || "").trim();
    const customerId = String(body?.customerId || "").trim();
    const jobId = String(body?.jobId || "").trim();

    if (!id) return c.json({ error: "designId is required." }, 400);

    const key = `design_project:${ownerKey}:${id}`;
    const project = await kv.get(key);
    if (!project) return c.json({ error: "That design could not be found." }, 404);

    const contacts = ((await kv.get(CRM_CONTACTS_KEY)) as any[]) || [];
    const customer = customerId ? contacts.find((x: any) => String(x.id) === customerId) : null;
    if (customerId && !customer) return c.json({ error: "That customer could not be found." }, 404);

    const updated = {
      ...project,
      meta: {
        ...(project.meta || {}),
        customerId,
        // Denormalised so a list can show who a design belongs to without
        // loading the whole CRM for every row.
        customerName: customer?.name || "",
        customerEmail: customer?.email || "",
        jobId,
      },
      updatedAt: new Date().toISOString(),
    };
    await kv.set(key, updated);

    console.log(`[design-links] design ${id} → customer ${customerId || "(cleared)"}${jobId ? ` job ${jobId}` : ""}`);
    return c.json({ success: true, meta: updated.meta });
  } catch (err: any) {
    console.log(`[design-links] attach failed: ${err?.message || err}`);
    return c.json({ error: `Could not attach that design: ${err?.message || err}` }, 500);
  }
});

/* ─────────────────────────── document folder ─────────────────────────── */

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * File a document into a customer's folder.
 *
 * Takes a data URI because everything the design centre produces is generated
 * in the browser — a permit packet PDF, a captured drawing, a render. Bytes go
 * to storage; only metadata goes in the key-value store, so the folder listing
 * stays small however many drawings accumulate.
 */
app.post("/files", requireStaff, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "").trim();
    const jobId = String(body?.jobId || "").trim();
    const designId = String(body?.designId || "").trim();
    const label = String(body?.label || "Document").slice(0, 200);
    const category = String(body?.category || "document").slice(0, 40);
    const dataUri = String(body?.dataUri || "");

    if (!customerId) return c.json({ error: "Pick a customer before filing a document." }, 400);

    const m = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(dataUri.trim());
    if (!m) return c.json({ error: "That file could not be read." }, 400);
    const contentType = m[1];
    const bytes = base64ToBytes(m[2]);

    const sb = service();
    const { data: buckets } = await sb.storage.listBuckets();
    if (!(buckets || []).some((b: any) => b.name === BUCKET)) {
      await sb.storage.createBucket(BUCKET, { public: false });
    }

    const id = crypto.randomUUID();
    const ext = contentType.includes("pdf") ? "pdf"
      : contentType.includes("png") ? "png"
      : contentType.includes("jpeg") ? "jpg" : "bin";
    const path = `${customerId}/${id}.${ext}`;

    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
    if (error) return c.json({ error: `Could not store that file: ${error.message}` }, 500);

    const record = {
      id, customerId, jobId, designId, label, category, contentType, path,
      sizeBytes: bytes.length,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "",
    };
    await kv.set(fileKey(id), record);

    console.log(`[design-links] filed ${category} "${label}" for customer ${customerId}`);
    return c.json({ success: true, file: { ...record, path: undefined } });
  } catch (err: any) {
    console.log(`[design-links] file save failed: ${err?.message || err}`);
    return c.json({ error: `Could not file that document: ${err?.message || err}` }, 500);
  }
});

/** A time-limited link to one document. Never returns the storage path. */
app.get("/files/:id/url", requireStaff, async (c) => {
  try {
    const record: any = await kv.get(fileKey(c.req.param("id")));
    if (!record) return c.json({ error: "That document could not be found." }, 404);
    const { data, error } = await service().storage.from(BUCKET)
      .createSignedUrl(record.path, 60 * 10);
    if (error || !data?.signedUrl) return c.json({ error: "Could not open that document." }, 500);
    return c.json({ url: data.signedUrl, label: record.label, contentType: record.contentType });
  } catch (err: any) {
    return c.json({ error: `Could not open that document: ${err?.message || err}` }, 500);
  }
});

app.delete("/files/:id", requireStaff, async (c) => {
  try {
    const id = c.req.param("id");
    const record: any = await kv.get(fileKey(id));
    if (!record) return c.json({ error: "That document could not be found." }, 404);
    await service().storage.from(BUCKET).remove([record.path]).catch(() => null);
    await kv.del(fileKey(id));
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: `Could not remove that document: ${err?.message || err}` }, 500);
  }
});

/* ─────────────────────────── the portal side ─────────────────────────── */

/**
 * A customer's own documents, for their portal.
 *
 * Deliberately separate from the staff routes above and deliberately narrow: it
 * resolves the customer from the signed-in caller's own email and will only
 * ever return that person's files. It takes no customerId parameter, because a
 * route that accepts one is a route that can be asked for somebody else's.
 */
app.get("/my-files", async (c) => {
  try {
    const user = await actor(c);
    if (!user) return c.json({ error: "Sign in required." }, 401);

    const email = String(user.email || "").toLowerCase();
    if (!email) return c.json({ files: [] });

    const contacts = ((await kv.get(CRM_CONTACTS_KEY)) as any[]) || [];
    const me = contacts.find((x: any) => String(x.email || "").toLowerCase() === email);
    if (!me) return c.json({ files: [] });

    const all = (await kv.getByPrefix(FILE_PREFIX)) || [];
    const files = all
      .filter((f: any) => String(f?.customerId || "") === String(me.id))
      .map((f: any) => ({ ...f, path: undefined, createdBy: undefined }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return c.json({ files });
  } catch (err: any) {
    console.log(`[design-links] my-files failed: ${err?.message || err}`);
    return c.json({ error: "Could not load your documents." }, 500);
  }
});

/** Opening one of your own documents. Ownership is re-checked, not trusted. */
app.get("/my-files/:id/url", async (c) => {
  try {
    const user = await actor(c);
    if (!user) return c.json({ error: "Sign in required." }, 401);

    const record: any = await kv.get(fileKey(c.req.param("id")));
    if (!record) return c.json({ error: "That document could not be found." }, 404);

    const contacts = ((await kv.get(CRM_CONTACTS_KEY)) as any[]) || [];
    const me = contacts.find((x: any) => String(x.email || "").toLowerCase() === String(user.email || "").toLowerCase());
    // The check that matters: this file must belong to the caller.
    if (!me || String(record.customerId) !== String(me.id)) {
      return c.json({ error: "That document could not be found." }, 404);
    }

    const { data, error } = await service().storage.from(BUCKET)
      .createSignedUrl(record.path, 60 * 10);
    if (error || !data?.signedUrl) return c.json({ error: "Could not open that document." }, 500);
    return c.json({ url: data.signedUrl, label: record.label, contentType: record.contentType });
  } catch (err: any) {
    return c.json({ error: `Could not open that document: ${err?.message || err}` }, 500);
  }
});

export default app;
