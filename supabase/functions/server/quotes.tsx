/**
 * quotes — server routes backing the Invoice/Estimate builder (InvoiceBuilder.tsx).
 *
 * Quotes (estimates) and invoices are persisted here so they survive refreshes
 * and sync across devices. A quote can be created WITHOUT a customer and be
 * assigned (or reassigned) to one later via the /assign route.
 *
 * KV keys: `quote:{id}`
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const quotesRouter = new Hono();

// ─────────────────────────────────────────────────────────────────────────────
// WHO IS ASKING
//
// A customer approves their own quote from the portal, so this cannot be
// staff-only. It also cannot be open: listing every quote returned every
// customer's pricing, line items and contact details to anyone who asked.
//
// Staff see everything; a customer sees the quotes addressed to them. A quote
// with no client email yet — they can be created before being assigned — is
// visible to staff only, because there is nobody it can be proven to belong to.
// ─────────────────────────────────────────────────────────────────────────────

const STAFF_ROLES = new Set(['owner', 'platform_owner', 'business_owner', 'admin', 'master_admin', 'management']);

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function quoteActor(c: any): Promise<{ email: string; staff: boolean }> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { email: "", staff: false };
  const { data, error } = await service().auth.getUser(token);
  const user = error ? null : data?.user;
  if (!user?.email) return { email: "", staff: false };

  const owners = (Deno.env.get("PLATFORM_OWNER_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = String(user.email).toLowerCase();
  const role = String(
    user.app_metadata?.role || user.user_metadata?.role || user.user_metadata?.accountType || "",
  ).toLowerCase().replace(/[\s-]+/g, "_");

  return { email, staff: owners.includes(email) || STAFF_ROLES.has(role) };
}

/** True when this quote is addressed to that email. */
function quoteBelongsTo(doc: any, email: string): boolean {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return false;
  return [doc?.clientEmail, doc?.client_email, doc?.customerEmail, doc?.email]
    .some((value: any) => String(value || "").trim().toLowerCase() === target);
}

quotesRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// Normalize a quote/invoice document into a consistent stored shape.
function normalizeDoc(input: any) {
  return {
    id: String(input.id || `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
    type: input.type === "invoice" ? "invoice" : "estimate",
    number: String(input.number || ""),
    // Embedded client fields (may be empty — an unassigned quote).
    clientName: String(input.clientName || ""),
    clientEmail: String(input.clientEmail || ""),
    clientPhone: String(input.clientPhone || ""),
    clientAddress: String(input.clientAddress || ""),
    // Real link to a CRM customer, if one has been assigned.
    customerId: input.customerId ? String(input.customerId) : "",
    issueDate: String(input.issueDate || ""),
    dueDate: String(input.dueDate || ""),
    items: Array.isArray(input.items) ? input.items : [],
    // Subcontractor quotes folded into this quote — kept on OUR side (internal record).
    subQuotes: Array.isArray(input.subQuotes) ? input.subQuotes : [],
    // Design Studio round-trip: floor plan + design-extracted materials.
    floorPlanData: input.floorPlanData ?? null,
    designMaterials: Array.isArray(input.designMaterials) ? input.designMaterials : [],
    // Buildable plans & renderings (stored in Storage; metadata only here).
    deliverables: Array.isArray(input.deliverables) ? input.deliverables : [],
    notes: String(input.notes || ""),
    taxRate: Number(input.taxRate) || 0,
    status: ["draft", "sent", "viewed", "paid"].includes(input.status) ? input.status : "draft",
    createdAt: String(input.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };
}

// ── List all quotes/invoices ──────────────────────────────────────────────────
quotesRouter.get("/make-server-3eae23a6/quotes", async (c) => {
  try {
    const { email, staff } = await quoteActor(c);
    if (!email) return c.json({ success: false, error: "Sign in required." }, 401);
    const docs = (await kv.getByPrefix("quote:")) || [];
    return c.json({ success: true, quotes: staff ? docs : docs.filter((doc: any) => quoteBelongsTo(doc, email)) });
  } catch (error) {
    console.error("[Quotes] Error fetching quotes:", error);
    return c.json({ success: false, error: "Failed to load quotes", details: String(error) }, 500);
  }
});

// ── Create or update a quote/invoice ──────────────────────────────────────────
quotesRouter.post("/make-server-3eae23a6/quotes", async (c) => {
  try {
    const body = await c.req.json();
    const input = body?.quote || body;
    if (!input || typeof input !== "object") {
      return c.json({ success: false, error: "`quote` payload is required" }, 400);
    }
    const existing = input.id ? await kv.get(`quote:${input.id}`) : null;
    const doc = normalizeDoc({ ...(existing || {}), ...input });
    await kv.set(`quote:${doc.id}`, doc);
    console.log(`[Quotes] Saved ${doc.type} ${doc.number} (${doc.id})${doc.customerId ? " → customer " + doc.customerId : " (unassigned)"}`);
    return c.json({ success: true, quote: doc });
  } catch (error) {
    console.error("[Quotes] Error saving quote:", error);
    return c.json({ success: false, error: "Failed to save quote", details: String(error) }, 500);
  }
});

// ── Partial update (used by Design Studio to save the floor plan back) ─────────
// Design Studio sends { floorPlanData, materials, lastModified } — we merge those
// onto the existing quote without clobbering the customer-facing line items.
quotesRouter.put("/make-server-3eae23a6/quotes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`quote:${id}`);
    if (!existing) {
      return c.json({ success: false, error: `Quote ${id} not found` }, 404);
    }
    const merged = {
      ...existing,
      // Design Studio's "materials" are the design-extracted list — store them
      // separately as designMaterials so manual line items stay intact.
      designMaterials: Array.isArray(body.materials) ? body.materials
        : (Array.isArray(body.designMaterials) ? body.designMaterials : existing.designMaterials),
      floorPlanData: body.floorPlanData ?? existing.floorPlanData ?? null,
    };
    const doc = normalizeDoc(merged);
    await kv.set(`quote:${id}`, doc);
    console.log(`[Quotes] Updated quote ${id} from Design Studio (${doc.designMaterials.length} design materials)`);
    return c.json({ success: true, quote: doc });
  } catch (error) {
    console.error("[Quotes] Error updating quote:", error);
    return c.json({ success: false, error: "Failed to update quote", details: String(error) }, 500);
  }
});

// ── Assign / reassign a customer to an existing quote ─────────────────────────
quotesRouter.post("/make-server-3eae23a6/quotes/:id/assign", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`quote:${id}`);
    if (!existing) {
      return c.json({ success: false, error: `Quote ${id} not found` }, 404);
    }
    const doc = normalizeDoc({
      ...existing,
      customerId: body.customerId || "",
      clientName: body.clientName ?? existing.clientName,
      clientEmail: body.clientEmail ?? existing.clientEmail,
      clientPhone: body.clientPhone ?? existing.clientPhone,
      clientAddress: body.clientAddress ?? existing.clientAddress,
    });
    await kv.set(`quote:${id}`, doc);
    console.log(`[Quotes] Assigned quote ${id} to customer ${doc.customerId || "(cleared)"}`);
    return c.json({ success: true, quote: doc });
  } catch (error) {
    console.error("[Quotes] Error assigning customer:", error);
    return c.json({ success: false, error: "Failed to assign customer", details: String(error) }, 500);
  }
});

// ── Delete a quote ────────────────────────────────────────────────────────────
quotesRouter.delete("/make-server-3eae23a6/quotes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`quote:${id}`);
    console.log(`[Quotes] Deleted quote ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Quotes] Error deleting quote:", error);
    return c.json({ success: false, error: "Failed to delete quote", details: String(error) }, 500);
  }
});

export default quotesRouter;
