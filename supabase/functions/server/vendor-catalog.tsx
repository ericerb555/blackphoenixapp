/**
 * vendor-catalog — what each vendor actually supplies, and at what price.
 *
 * WHY THIS IS THE CENTRE OF THE MATERIALS HUB
 *
 * The hub exists so vendors attach their catalogues, customers pick real
 * products at real vendor prices, and the quote that comes out is accurate. A
 * stock list then goes to the vendor for pickup or delivery.
 *
 * Every step of that depends on a catalogue, and there was not one. Storage held
 * zero materials, zero vendor prices and zero catalogue items. Which is why
 * `/vendor-pricing/compare` was inventing prices with a seeded random number
 * generator — there was nothing real for it to read, so it manufactured the
 * comparison instead, and those invented prices and SKUs flowed into customer
 * quotes and purchase orders sent to real suppliers.
 *
 * KV keys:
 *   vendor_catalog:{vendorId}:{itemId}   one line a vendor supplies
 *
 * A vendor may only read and write their own catalogue. Their pricing is
 * commercial information and vendors are paying tenants — one vendor seeing
 * another's cost base is the thing tenant isolation exists to prevent.
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

export const vendorCatalogRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const ITEM = (vendorId: string, itemId: string) => `vendor_catalog:${vendorId}:${itemId}`;

/** Resolve the caller, and which vendor they are, by the same rules as /vendor/me. */
async function catalogActor(c: any): Promise<{ email: string; isAdmin: boolean; vendorId: string | null } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  const isAdmin = ["owner", "admin", "master_admin", "management"].includes(role);
  const email = String(user.email || "").toLowerCase();

  const stamped = String(user.app_metadata?.vendorId || user.app_metadata?.vendor_id || "").trim();
  if (stamped) return { email, isAdmin, vendorId: stamped };

  const vendors = ((await kv.getByPrefix("vendor:")) as any[] || []).filter(Boolean);
  const match = vendors.find((v: any) =>
    [v?.email, v?.contactEmail, v?.ownerEmail].some((e) => String(e || "").toLowerCase() === email && email),
  );
  return { email, isAdmin, vendorId: match ? String(match.id || "") : null };
}

/** May this caller touch this vendor's catalogue? */
function mayTouch(who: { isAdmin: boolean; vendorId: string | null }, vendorId: string) {
  return who.isAdmin || (Boolean(who.vendorId) && who.vendorId === vendorId);
}

// ─── A vendor's own catalogue ───────────────────────────────────────────────

vendorCatalogRouter.get("/vendor-catalog/:vendorId", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in to view a catalogue." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }
  try {
    const items = ((await kv.getByPrefix(`vendor_catalog:${vendorId}:`)) as any[] || []).filter(Boolean);
    items.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
    return c.json({ success: true, vendorId, items, count: items.length });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not load the catalogue." }, 500);
  }
});

vendorCatalogRouter.post("/vendor-catalog/:vendorId/items", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 200);
    if (!name) return c.json({ success: false, error: "Every catalogue line needs a name." }, 400);

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return c.json({ success: false, error: "Give the line a price." }, 400);
    }

    const now = new Date().toISOString();
    const id = String(body.id || `item_${crypto.randomUUID()}`);
    const existing = (await kv.get(ITEM(vendorId, id))) as any;

    const item = {
      ...(existing || {}),
      id,
      vendorId,
      name,
      // The SKU is the vendor's own. It is never generated: a made-up SKU on a
      // purchase order is what causes a real problem with a real supplier, and
      // the previous pricing route was inventing them.
      sku: String(body.sku ?? existing?.sku ?? "").trim().slice(0, 60),
      category: String(body.category ?? existing?.category ?? "").slice(0, 80),
      unit: String(body.unit ?? existing?.unit ?? "each").slice(0, 24),
      price: Math.round(price * 100) / 100,
      availability: String(body.availability ?? existing?.availability ?? "").slice(0, 80),
      leadTimeDays: Number.isFinite(Number(body.leadTimeDays)) ? Number(body.leadTimeDays) : (existing?.leadTimeDays ?? null),
      isActive: body.isActive === undefined ? (existing?.isActive ?? true) : Boolean(body.isActive),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await kv.set(ITEM(vendorId, id), item);
    return c.json({ success: true, item });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save the line." }, 500);
  }
});

/**
 * POST /vendor-catalog/:vendorId/import — many lines in one request.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE SINGLE-ITEM ROUTE
 *
 * The single route writes one record per HTTP call, which is right for somebody
 * correcting a price and hopeless for a supplier with two thousand lines — that
 * is two thousand requests, each with its own auth round trip. The vendor was
 * therefore expected to type their whole price list by hand, which nobody was
 * ever going to do, so the catalogue stayed empty and the rest of the materials
 * hub had nothing to read.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not trust the rows. Every line goes through the same checks the single
 * route applies — a name, a real price, a SKU that is the vendor's own and never
 * generated — because a bulk route that validates more loosely than its
 * single-item twin is just a way around the validation.
 *
 * It also does not silently drop anything. Every rejected row comes back with
 * its line number and the reason, because a price list that imports 1,830 of
 * 1,842 lines without saying so becomes twelve quotes with a material missing.
 */
const MAX_IMPORT_ROWS = 500;
const MAX_CATALOG_ITEMS = 20000;

vendorCatalogRouter.post("/vendor-catalog/:vendorId/import", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.items) ? body.items : [];
    if (!incoming.length) return c.json({ success: false, error: "No lines were sent." }, 400);
    if (incoming.length > MAX_IMPORT_ROWS) {
      return c.json({
        success: false,
        error: `Send at most ${MAX_IMPORT_ROWS} lines per request.`,
      }, 413);
    }

    // A ceiling on the catalogue as a whole. Import makes it easy to push a
    // very large list, and the search route reads every line in the store.
    const existingAll = ((await kv.getByPrefix(`vendor_catalog:${vendorId}:`)) as any[] || []).filter(Boolean);
    if (existingAll.length + incoming.length > MAX_CATALOG_ITEMS) {
      return c.json({
        success: false,
        error: `That would take your catalogue past ${MAX_CATALOG_ITEMS} lines. Get in touch and we will raise it.`,
      }, 409);
    }

    /**
     * Existing lines by SKU, so a re-import updates prices instead of doubling
     * the catalogue.
     *
     * This is the behaviour a vendor expects and the one that makes the feature
     * usable: a price list is re-sent when prices change, and the second import
     * should move the numbers, not produce two of everything. Lines with no SKU
     * cannot be matched and are always added.
     */
    const bySku = new Map<string, any>();
    for (const item of existingAll) {
      const sku = String(item?.sku || "").trim().toLowerCase();
      if (sku) bySku.set(sku, item);
    }

    const now = new Date().toISOString();
    let added = 0;
    let updated = 0;
    const rejected: Array<{ line: number; reason: string }> = [];

    for (let i = 0; i < incoming.length; i++) {
      const row = incoming[i] || {};
      // The line number the vendor's spreadsheet shows, sent along by the
      // client so a rejection can be pointed at the right row of their file
      // rather than at our position in the batch.
      const line = Number(row.line) || i + 1;

      const name = String(row.name || "").trim().slice(0, 200);
      if (!name) { rejected.push({ line, reason: "No product name." }); continue; }

      const price = Number(row.price);
      if (!Number.isFinite(price) || price < 0) {
        rejected.push({ line, reason: "No usable price." });
        continue;
      }

      const sku = String(row.sku || "").trim().slice(0, 60);
      const existing = sku ? bySku.get(sku.toLowerCase()) : null;
      const id = existing?.id || `item_${crypto.randomUUID()}`;

      const item = {
        ...(existing || {}),
        id,
        vendorId,
        name,
        sku,
        category: String(row.category ?? existing?.category ?? "").slice(0, 80),
        unit: String(row.unit ?? existing?.unit ?? "each").slice(0, 24) || "each",
        price: Math.round(price * 100) / 100,
        availability: String(row.availability ?? existing?.availability ?? "").slice(0, 80),
        leadTimeDays: Number.isFinite(Number(row.leadTimeDays))
          ? Number(row.leadTimeDays)
          : (existing?.leadTimeDays ?? null),
        isActive: existing?.isActive ?? true,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        importedAt: now,
      };

      await kv.set(ITEM(vendorId, id), item);
      if (existing) updated++; else added++;
      // So a duplicate SKU later in the same batch updates the row this one just
      // wrote rather than creating a second.
      if (sku) bySku.set(sku.toLowerCase(), item);
    }

    console.log(`[VendorCatalog] import for ${vendorId}: ${added} added, ${updated} updated, ${rejected.length} rejected`);
    return c.json({
      success: true,
      added,
      updated,
      rejected,
      total: existingAll.length + added,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not import those lines." }, 500);
  }
});

vendorCatalogRouter.delete("/vendor-catalog/:vendorId/items/:itemId", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }
  try {
    await kv.del(ITEM(vendorId, c.req.param("itemId")));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not delete the line." }, 500);
  }
});

// ─── Cross-vendor search, for quoting ───────────────────────────────────────

/**
 * Find real catalogue lines matching a material, across vendors.
 *
 * This is what replaces the invented price comparison. It is available to the
 * construction company — the people building a quote — and returns only lines a
 * vendor actually published.
 *
 * An empty result is the correct answer when no vendor has published a matching
 * line. Returning four plausible-looking vendors instead is how a fabricated
 * price ends up on a customer's quote.
 */
vendorCatalogRouter.get("/vendor-catalog-search", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in to compare vendor pricing." }, 401);
  try {
    const q = String(c.req.query("q") || "").trim().toLowerCase();
    if (q.length < 2) return c.json({ success: true, matches: [], reason: "Search for at least two characters." });

    const all = ((await kv.getByPrefix("vendor_catalog:")) as any[] || []).filter(Boolean);
    const vendors = ((await kv.getByPrefix("vendor:")) as any[] || []).filter(Boolean);
    const nameOf = new Map(vendors.map((v: any) => [String(v.id), String(v.name || "")]));

    const matches = all
      .filter((i: any) => i?.isActive !== false)
      .filter((i: any) => {
        const hay = `${i?.name || ""} ${i?.sku || ""} ${i?.category || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .map((i: any) => ({
        id: i.id,
        vendorId: i.vendorId,
        vendorName: nameOf.get(String(i.vendorId)) || i.vendorId,
        name: i.name,
        sku: i.sku || "",
        unit: i.unit || "each",
        price: Number(i.price || 0),
        availability: i.availability || "",
        leadTimeDays: i.leadTimeDays ?? null,
      }))
      .sort((a, b) => a.price - b.price);

    return c.json({ success: true, matches, count: matches.length });
  } catch (error: any) {
    return c.json({ success: false, matches: [], error: error?.message }, 500);
  }
});

export default vendorCatalogRouter;
