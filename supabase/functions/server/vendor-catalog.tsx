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
import { inspectUrl, safeFetch } from "./outboundGuard.ts";
import { findProductArray, guessFeedMapping, buildFeedRows, missingFeedFields } from "./vendorFeed.ts";
import { mirrorVendorImage } from "./productImages.tsx";
import { proposeMerges, type MatchCandidate } from "./productMatch.ts";

export const vendorCatalogRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const ITEM = (vendorId: string, itemId: string) => `vendor_catalog:${vendorId}:${itemId}`;

/** Resolve the caller, and which vendor they are, by the same rules as /vendor/me. */
async function catalogActor(c: any): Promise<{ email: string; isAdmin: boolean; vendorId: string | null; isVendor: boolean } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  const isAdmin = ["owner", "admin", "master_admin", "management"].includes(role);
  const email = String(user.email || "").toLowerCase();

  // Does this account belong to a vendor at all, whether or not a vendor record
  // has been created for them yet? An account stamped with a vendorId, or whose
  // role says vendor, is a vendor even while unlinked — and unlinked is the
  // state every vendor is in between signing up and being approved.
  const stamped = String(user.app_metadata?.vendorId || user.app_metadata?.vendor_id || "").trim();
  const roleSaysVendor = ["vendor", "supplier", "vendor_admin"].includes(role);

  if (stamped) return { email, isAdmin, vendorId: stamped, isVendor: true };

  const vendors = ((await kv.getByPrefix("vendor:")) as any[] || []).filter(Boolean);
  const match = vendors.find((v: any) =>
    [v?.email, v?.contactEmail, v?.ownerEmail].some((e) => String(e || "").toLowerCase() === email && email),
  );
  return {
    email, isAdmin,
    vendorId: match ? String(match.id || "") : null,
    isVendor: Boolean(match) || roleSaysVendor,
  };
}

/** May this caller touch this vendor's catalogue? */
function mayTouch(who: { isAdmin: boolean; vendorId: string | null }, vendorId: string) {
  return who.isAdmin || (Boolean(who.vendorId) && who.vendorId === vendorId);
}

/**
 * Whose catalogue lines may this caller see across the whole store?
 *
 * The rule this file states at the top — "one vendor seeing another's cost base
 * is the thing tenant isolation exists to prevent" — was true of the write
 * routes and not of the read ones. `/vendor-catalog-search` returned every
 * vendor's prices to any signed-in caller, so a vendor could search and read a
 * competitor's cost base. That is the same commercial information the write
 * routes are careful about, handed over by the route beside them.
 *
 * So: a vendor sees their own lines and nobody else's. Staff and customers see
 * everything, which is the point of the hub — a customer picks a real product at
 * a real price, and that is what makes their quote accurate.
 *
 * WHY `isVendor` EXISTS SEPARATELY FROM `vendorId`
 *
 * The first version of this said `if (who.isAdmin || !who.vendorId) return
 * items` — everyone see-all except a vendor with a resolved id. Signing in as a
 * freshly created vendor account showed the hole immediately: an **unlinked**
 * vendor has `vendorId: null`, fell into the see-all branch, and was handed a
 * competitor's catalogue. Unlinked is the state every vendor is in between
 * signing up and being approved, so the guard was open at exactly the moment it
 * needed to be shut.
 *
 * The test is now "does this account belong to a vendor at all", which is true
 * before the link exists. An unlinked vendor sees nothing, which is correct: no
 * lines are theirs yet.
 */
function visibleTo(
  who: { isAdmin: boolean; vendorId: string | null; isVendor: boolean },
  items: any[],
): any[] {
  if (who.isAdmin) return items;
  if (who.isVendor) {
    return who.vendorId
      ? items.filter((i: any) => String(i?.vendorId || "") === who.vendorId)
      : [];
  }
  return items;
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

// ─── Products, and the offers against them ──────────────────────────────
//
// THE RULE THIS IMPLEMENTS
//
// The customer picks the product, not the supplier. So the product has to be
// its own record, and a vendor's catalogue line becomes an OFFER against it —
// one supplier's price, availability and lead time for a thing that exists
// independently of them. Which vendor supplies it is resolved later, and can
// change without the customer's choice changing.
//
// WHY THE PREFIX IS NOT `product:`
//
// Because `product:` is the STOREFRONT's. `ecommerce-products` writes there and
// the api-gateway reads it, so a hub product written under that prefix would
// appear in the shop as merchandise. Two different things called a product,
// and only the key tells them apart.
//
// IMPORTING NEVER MERGES
//
// Every catalogue line gets its OWN product, one offer each. Deciding that two
// vendors' lines are the same product happens later and only with a person's
// tick — see the merge routes below and `productMatch.ts`. SKUs do not match
// across suppliers, and a wrong match prices a customer's job against a
// different item, silently. A guess made here would be buried under everything
// built on top of it.

const PRODUCT = (productId: string) => `hub_product:${productId}`;

/**
 * The product a catalogue line belongs to, created if it does not exist yet.
 *
 * WHY A ONE-OFFER PRODUCT STILL FOLLOWS ITS LINE
 *
 * While a product has a single offer it is that line and nothing else, so a
 * vendor fixing a typo in their own product name should be seen. The moment a
 * second offer is attached the name freezes, because one supplier renaming
 * their line must not rewrite what every other supplier is offering. Building
 * the frozen behaviour in now means merging does not change how this behaves
 * later — it just stops the sync.
 */
async function ensureProductForLine(
  item: any,
  now: string,
  /**
   * The vendor's `imageResync` choice, read once per request rather than per
   * row. Their setting, not our policy — see vendor_settings.
   */
  resync: string = "url-change",
): Promise<string> {
  const existingId = String(item.productId || '').trim();
  if (existingId) {
    const product = (await kv.get(PRODUCT(existingId))) as any;
    if (product) {
      const soleOffer =
        Number(product.offerCount || 1) <= 1 &&
        product.origin?.vendorId === item.vendorId &&
        product.origin?.itemId === item.id;
      if (soleOffer) {
        const moved =
          product.name !== item.name ||
          product.category !== item.category ||
          product.unit !== item.unit;
        if (moved) {
          await kv.set(PRODUCT(existingId), {
            ...product,
            name: item.name,
            category: item.category,
            unit: item.unit,
            updatedAt: now,
          });
        }
      }
      await queueImage(existingId, item, resync, now);
      return existingId;
    }
    // The pointer outlived the record. Fall through and make a new one rather
    // than leaving a line pointing at nothing.
  }

  const productId = `prd_${crypto.randomUUID()}`;
  await kv.set(PRODUCT(productId), {
    id: productId,
    name: item.name,
    category: item.category,
    unit: item.unit,
    // Reserved for the merge step. Manufacturer and part number are the only
    // fields two suppliers can be expected to agree on, so they are the key
    // matching will use — declared now, empty, rather than bolted on after
    // there are records without them.
    brand: '',
    mpn: '',
    // Mirrored copies, each remembering whose image it is — because display is
    // gated on THAT vendor's consent, and a product can eventually carry offers
    // from several vendors.
    images: [] as any[],
    // An address waiting to be fetched. Kept on the product rather than fetched
    // during the import: a 500-line price list would otherwise mean 500
    // outbound requests and 500 storage writes inside one invocation, which is
    // how an import times out half-done. `POST /catalog-products/mirror-images`
    // works through these in bounded batches, the same shape as the importer
    // itself posting in batches of 500.
    imagePending: null as any,
    offerCount: 1,
    // Which line brought this product into existence. Not an ownership claim —
    // it is what lets a sole offer keep its name in step with its line.
    origin: { vendorId: item.vendorId, itemId: item.id },
    createdAt: now,
    updatedAt: now,
  });
  await queueImage(productId, item, resync, now);
  return productId;
}

/**
 * Decide whether this line's image address is worth fetching, and queue it.
 *
 * The three answers come from the vendor's own settings screen:
 *
 *   never        the first image imported is kept; later ones are ignored
 *   url-change   re-fetch only when the address is different from last time
 *   every-sync   re-fetch on every import
 *
 * "url-change" is the default and the honest caveat is that a vendor who
 * replaces a photograph at the SAME address never gets the new one — which is
 * exactly why the other two options exist and why the vendor picks.
 */
async function queueImage(productId: string, item: any, resync: string, now: string): Promise<void> {
  const source = String(item.image || "").trim();
  if (!source) return;

  const product = (await kv.get(PRODUCT(productId))) as any;
  if (!product) return;

  const stored: any[] = Array.isArray(product.images) ? product.images : [];
  const already = stored.find((i) => i && i.sourceUrl === source);

  if (resync === "never" && stored.length) return;
  if (resync === "url-change" && already) return;
  if (product.imagePending?.sourceUrl === source) return; // already waiting

  await kv.set(PRODUCT(productId), {
    ...product,
    imagePending: { sourceUrl: source, vendorId: item.vendorId, queuedAt: now },
    updatedAt: now,
  });
}

/** A vendor's chosen re-sync behaviour, defaulted the same way the settings do. */
async function resyncSettingFor(vendorId: string): Promise<string> {
  const settings = (await kv.get(`vendor_settings:${vendorId}`)) as any;
  const v = String(settings?.options?.imageResync || "");
  return ["url-change", "every-sync", "never"].includes(v) ? v : "url-change";
}

/**
 * The cheapest offer, and why a vendor is not told one.
 *
 * Staff and customers see every offer — that is the point of the hub, and it is
 * what makes a comparison mean anything. A vendor sees only their own, so a
 * "cheapest" computed from what they can see would always be their own price
 * and would read as a claim that they are the cheapest. Computing it from all
 * offers instead would hand them a competitor's number. Neither is acceptable,
 * so a vendor is told nothing.
 */
function cheapestOf(offers: any[]): any | null {
  const live = offers.filter((o) => o && o.isActive !== false && Number.isFinite(Number(o.price)));
  if (!live.length) return null;
  return live.reduce((best, o) => (Number(o.price) < Number(best.price) ? o : best));
}

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
      // The vendor's address for the photograph. Never the photograph — the
      // server fetches it, checks the bytes and keeps its own copy.
      image: String(body.image ?? existing?.image ?? "").trim().slice(0, 2000),
      isActive: body.isActive === undefined ? (existing?.isActive ?? true) : Boolean(body.isActive),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    // A line is an offer, and an offer is against a product. Linking here rather
    // than in a later pass means there is never a catalogue line without one.
    item.productId = await ensureProductForLine(item, now, await resyncSettingFor(vendorId));
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

/**
 * Write catalogue lines, wherever they came from.
 *
 * Lifted out of the CSV import route so the API feed lands through exactly the
 * same code. Two importers would be two sets of validation rules, two ideas
 * about what a duplicate SKU means and two catalogue ceilings, and the one that
 * drifted would be the one nobody was watching.
 *
 * `limitBatch` is false for a feed: the per-request cap exists because the
 * browser posts in batches of 500, and a sync is not a request from a browser.
 * The whole-catalogue ceiling still applies to both.
 */
async function importCatalogRows(
  vendorId: string,
  incoming: any[],
  limitBatch = true,
): Promise<{ added: number; updated: number; rejected: Array<{ line: number; reason: string }>; total: number; error?: string }> {
  const empty = { added: 0, updated: 0, rejected: [] as Array<{ line: number; reason: string }>, total: 0 };
  if (!incoming.length) return { ...empty, error: "No lines were sent." };
  if (limitBatch && incoming.length > MAX_IMPORT_ROWS) {
    return { ...empty, error: `Send at most ${MAX_IMPORT_ROWS} lines per request.` };
  }

  // A ceiling on the catalogue as a whole. Import makes it easy to push a very
  // large list, and the search route reads every line in the store.
  const existingAll = ((await kv.getByPrefix(`vendor_catalog:${vendorId}:`)) as any[] || []).filter(Boolean);
  if (existingAll.length + incoming.length > MAX_CATALOG_ITEMS) {
    return {
      ...empty,
      error: `That would take the catalogue past ${MAX_CATALOG_ITEMS} lines. Get in touch and we will raise it.`,
    };
  }

  /**
   * Existing lines by SKU, so a re-import updates prices instead of doubling
   * the catalogue. A price list is re-sent when prices change, and the second
   * import should move the numbers, not produce two of everything. Lines with
   * no SKU cannot be matched and are always added.
   */
  const bySku = new Map<string, any>();
  for (const item of existingAll) {
    const sku = String(item?.sku || "").trim().toLowerCase();
    if (sku) bySku.set(sku, item);
  }

  const now = new Date().toISOString();
  // Once per import rather than once per row: it is the same vendor throughout.
  const resync = await resyncSettingFor(vendorId);
  let added = 0;
  let updated = 0;
  const rejected: Array<{ line: number; reason: string }> = [];

  for (let i = 0; i < incoming.length; i++) {
    const row = incoming[i] || {};
    // The position the vendor's own file or feed shows, sent along so a
    // rejection points at their row rather than at our place in the batch.
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
      image: String(row.image ?? existing?.image ?? "").trim().slice(0, 2000),
      isActive: existing?.isActive ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      importedAt: now,
    };

    (item as any).productId = await ensureProductForLine(item, now, resync);
    await kv.set(ITEM(vendorId, id), item);
    if (existing) updated++; else added++;
    // So a duplicate SKU later in the same batch updates the row this one just
    // wrote rather than creating a second.
    if (sku) bySku.set(sku.toLowerCase(), item);
  }

  console.log(`[VendorCatalog] import for ${vendorId}: ${added} added, ${updated} updated, ${rejected.length} rejected`);
  return { added, updated, rejected, total: existingAll.length + added };
}

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
    const outcome = await importCatalogRows(vendorId, incoming);
    if (outcome.error) {
      // 413 for a batch that is too large, 409 for a catalogue that is full,
      // 400 for an empty request — the same codes this route always returned.
      const status = outcome.error.includes("at most") ? 413
        : outcome.error.includes("past") ? 409 : 400;
      return c.json({ success: false, error: outcome.error }, status);
    }
    return c.json({
      success: true,
      added: outcome.added,
      updated: outcome.updated,
      rejected: outcome.rejected,
      total: outcome.total,
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

    const matches = visibleTo(who, all)
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

/**
 * GET /vendor-catalog-all — every catalogue line the caller may see.
 *
 * WHY BROWSE AND NOT ONLY SEARCH
 *
 * `/vendor-catalog-search` needs two characters before it answers, which is
 * right for a lookup and useless for a hub — the materials centre opens on a
 * grid of what exists, filtered by category, and there is no query to give it.
 * Without this it had nothing to open on, which is why it was serving a
 * hardcoded list out of localStorage instead.
 *
 * Capped, and it says when it has capped. A materials hub silently showing the
 * first thousand of four thousand lines is a buyer concluding we do not stock
 * something we stock.
 */
const MAX_BROWSE = 2000;

vendorCatalogRouter.get("/vendor-catalog-all", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in to browse materials.", items: [] }, 401);
  try {
    const category = String(c.req.query("category") || "").trim().toLowerCase();

    const all = ((await kv.getByPrefix("vendor_catalog:")) as any[] || []).filter(Boolean);
    const vendors = ((await kv.getByPrefix("vendor:")) as any[] || []).filter(Boolean);
    const nameOf = new Map(vendors.map((v: any) => [String(v.id), String(v.name || "")]));

    let rows = visibleTo(who, all).filter((i: any) => i?.isActive !== false);
    if (category) {
      rows = rows.filter((i: any) => String(i?.category || "").toLowerCase() === category);
    }

    const total = rows.length;
    const truncated = total > MAX_BROWSE;
    const items = rows
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || "")))
      .slice(0, MAX_BROWSE)
      .map((i: any) => ({
        id: i.id,
        vendorId: i.vendorId,
        vendorName: nameOf.get(String(i.vendorId)) || i.vendorId,
        name: i.name,
        sku: i.sku || "",
        category: i.category || "",
        unit: i.unit || "each",
        price: Number(i.price || 0),
        availability: i.availability || "",
        leadTimeDays: i.leadTimeDays ?? null,
        updatedAt: i.updatedAt || i.createdAt || null,
      }));

    // The categories actually present, so the hub's filters describe what is
    // there rather than a fixed list somebody typed once.
    const categories = Array.from(
      new Set(rows.map((i: any) => String(i?.category || "").trim()).filter(Boolean)),
    ).sort();

    return c.json({ success: true, items, total, truncated, categories });
  } catch (error: any) {
    return c.json({ success: false, items: [], error: error?.message }, 500);
  }
});

// ─── A vendor's own API feed ─────────────────────────────────────────────────
//
// A vendor registers the endpoint their system serves a catalogue from, and we
// pull it. Three things make that safe enough to do:
//
//   1. The credential lives here, not in their browser. It used to be typed
//      into a form backed by `localStorage`, which meant a live production API
//      key sat in plaintext on a machine we do not control, was lost when they
//      cleared it, and was never seen by anything that could use it.
//
//   2. The credential is never sent back. Saving it returns only whether one is
//      set. A key that can be read back is a key that leaks through any screen
//      that shows it, and there is no reason for this one to ever leave again.
//
//   3. The URL goes through `outboundGuard`. We are being asked to fetch an
//      address a stranger chose, from inside our own network, which is exactly
//      server-side request forgery — see that file for what it refuses and,
//      just as importantly, what it cannot check.

const FEED = (vendorId: string) => `vendor_feed:${vendorId}`;

/** What comes back to the browser. Deliberately not the key. */
function publicFeed(feed: any) {
  if (!feed) return null;
  const { apiKey: _secret, ...rest } = feed;
  return { ...rest, hasKey: Boolean(feed.apiKey) };
}

vendorCatalogRouter.get("/vendor-catalog/:vendorId/feed", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }
  const feed = await kv.get(FEED(vendorId));
  return c.json({ success: true, feed: publicFeed(feed) });
});

vendorCatalogRouter.put("/vendor-catalog/:vendorId/feed", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }
  try {
    const body = await c.req.json().catch(() => ({}));
    const existing = (await kv.get(FEED(vendorId))) as any;

    const endpoint = String(body.endpoint || "").trim();
    if (endpoint) {
      const verdict = inspectUrl(endpoint);
      if (!verdict.ok) return c.json({ success: false, error: verdict.reason }, 400);
    }

    const authStyle = ["bearer", "header", "query"].includes(String(body.authStyle || ""))
      ? String(body.authStyle) : "bearer";

    // Where we POST a purchase order. Separate from the catalogue endpoint
    // because reading a price list and receiving an order are different things
    // in every system that has both, and validated the same way.
    const orderEndpoint = String(body.orderEndpoint || "").trim();
    if (orderEndpoint) {
      const ov = inspectUrl(orderEndpoint);
      if (!ov.ok) return c.json({ success: false, error: `Order endpoint: ${ov.reason}` }, 400);
    }

    const feed = {
      vendorId,
      endpoint,
      orderEndpoint,
      authStyle,
      // The header or query parameter the key travels in, for vendors who do not
      // use a bearer token.
      authName: String(body.authName || existing?.authName || "X-API-Key").slice(0, 64),
      // An empty key on an update means "leave it alone", never "clear it" —
      // otherwise saving any other field from a screen that cannot read the key
      // would wipe it.
      apiKey: body.apiKey ? String(body.apiKey) : (existing?.apiKey || ""),
      mapping: body.mapping && typeof body.mapping === "object" ? body.mapping : (existing?.mapping || {}),
      arrayPath: String(body.arrayPath ?? existing?.arrayPath ?? "").slice(0, 120),
      enabled: body.enabled === undefined ? Boolean(existing?.enabled) : Boolean(body.enabled),
      lastSyncAt: existing?.lastSyncAt || null,
      lastSyncSummary: existing?.lastSyncSummary || null,
      updatedAt: new Date().toISOString(),
      updatedBy: who.email,
    };
    await kv.set(FEED(vendorId), feed);
    return c.json({ success: true, feed: publicFeed(feed) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save those settings." }, 500);
  }
});

/**
 * POST /vendor-catalog/:vendorId/feed/test — fetch it and say what came back.
 *
 * Reports honestly rather than "connected": how many products were found, where
 * in the response they were, what the mapping guessed, and how many rows would
 * be rejected. A test that only says OK is a test that tells you nothing about
 * whether the sync will produce a usable catalogue.
 */
vendorCatalogRouter.post("/vendor-catalog/:vendorId/feed/test", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }

  const feed = (await kv.get(FEED(vendorId))) as any;
  if (!feed?.endpoint) return c.json({ success: false, error: "No endpoint has been set yet." }, 400);

  const result = await fetchVendorFeed(feed);
  if (!result.ok) return c.json({ success: false, error: result.error }, 400);

  let parsed: any;
  try { parsed = JSON.parse(result.body || ""); }
  catch { return c.json({ success: false, error: "That endpoint did not return JSON." }, 400); }

  const found = findProductArray(parsed);
  if (!found) {
    return c.json({
      success: false,
      error: "No list of products was found in the response. Check the endpoint returns the catalogue itself.",
    }, 400);
  }

  const mapping = Object.keys(feed.mapping || {}).length ? feed.mapping : guessFeedMapping(found.rows);
  const built = buildFeedRows(found.rows, mapping);

  return c.json({
    success: true,
    status: result.status,
    productsFound: found.rows.length,
    foundAt: found.path,
    mapping,
    missing: missingFeedFields(mapping),
    usable: built.rows.length,
    rejected: built.rejected.slice(0, 20),
    rejectedTotal: built.rejected.length,
    duplicates: built.duplicates,
    sample: built.rows.slice(0, 5),
    // Said out loud when the runtime would not let us resolve the hostname, so
    // nobody assumes a check happened that did not.
    dnsChecked: result.dnsChecked !== false,
  });
});

/**
 * POST /vendor-catalog/:vendorId/feed/sync — pull it in for real.
 *
 * Writes through exactly the same code the CSV import uses, so validation, the
 * update-by-SKU rule and the ceiling on catalogue size are shared rather than
 * reimplemented for feeds and left to drift.
 */
vendorCatalogRouter.post("/vendor-catalog/:vendorId/feed/sync", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "That catalogue belongs to another vendor." }, 403);
  }

  const feed = (await kv.get(FEED(vendorId))) as any;
  if (!feed?.endpoint) return c.json({ success: false, error: "No endpoint has been set yet." }, 400);
  if (missingFeedFields(feed.mapping || {}).length) {
    return c.json({ success: false, error: "Match the name and price fields before syncing." }, 400);
  }

  const result = await fetchVendorFeed(feed);
  if (!result.ok) return c.json({ success: false, error: result.error }, 400);

  let parsed: any;
  try { parsed = JSON.parse(result.body || ""); }
  catch { return c.json({ success: false, error: "That endpoint did not return JSON." }, 400); }

  const found = findProductArray(parsed);
  if (!found) return c.json({ success: false, error: "No list of products was found in the response." }, 400);

  const built = buildFeedRows(found.rows, feed.mapping);
  const outcome = await importCatalogRows(vendorId, built.rows, false);

  const summary = {
    at: new Date().toISOString(),
    productsFound: found.rows.length,
    added: outcome.added,
    updated: outcome.updated,
    rejected: [...built.rejected, ...outcome.rejected].length,
    duplicates: built.duplicates,
    error: outcome.error || null,
  };
  await kv.set(FEED(vendorId), { ...feed, lastSyncAt: summary.at, lastSyncSummary: summary });

  if (outcome.error) return c.json({ success: false, error: outcome.error, summary }, 409);
  return c.json({
    success: true,
    ...summary,
    rejectedDetail: [...built.rejected, ...outcome.rejected].slice(0, 20),
  });
});

/** Fetch the feed with whatever authentication the vendor configured. */
async function fetchVendorFeed(feed: any) {
  const headers: Record<string, string> = {};
  let url = feed.endpoint;

  if (feed.apiKey) {
    if (feed.authStyle === "bearer") headers.Authorization = `Bearer ${feed.apiKey}`;
    else if (feed.authStyle === "header") headers[feed.authName || "X-API-Key"] = feed.apiKey;
    else if (feed.authStyle === "query") {
      const u = new URL(url);
      u.searchParams.set(feed.authName || "api_key", feed.apiKey);
      url = u.toString();
    }
  }
  return await safeFetch(url, { headers });
}

// ─── A vendor's own settings: what they permit, and what they prefer ────
//
// WHY THIS IS NOT ONE SETTINGS OBJECT OF BOOLEANS
//
// Three different kinds of thing get called a "setting" and only one of them
// belongs to the vendor to choose freely.
//
//   RULES    the platform sets and a vendor cannot change, because they protect
//            somebody else: file types, size caps, the SSRF guard on a URL they
//            supply, tenant isolation, content filtering. Those are not in this
//            record at all. A setting a vendor can use to affect another party
//            is a vulnerability with a friendly label.
//
//   CONSENTS the vendor grants explicitly. The default is NOT GRANTED and it is
//            stamped by the server with who granted it, when, and against which
//            version of the terms. Permission that defaulted to yes is not
//            permission, and a consent with no record of what was agreed cannot
//            be produced later, which is the entire reason to keep one.
//
//   OPTIONS  the vendor chooses, each with a safe default, because most vendors
//            will import a catalogue once and never open this screen again.
//
// KV key: vendor_settings:{vendorId} — per tenant by nature, which is why it is
// not part of portal_global_settings:default.

const SETTINGS = (vendorId: string) => `vendor_settings:${vendorId}`;

/**
 * The version of the display terms a consent is recorded against.
 *
 * Bump this when the wording of what the vendor is agreeing to changes. Existing
 * consents keep the version they were granted under, so it stays answerable
 * which text somebody actually accepted rather than which text is current.
 */
const IMAGE_TERMS_VERSION = "2026-09-09";

/**
 * Permission is asked per surface because these are genuinely different asks.
 * A photograph on a quote sent to one customer is not the same as one on a
 * public storefront, and a vendor may reasonably permit one and refuse the
 * other.
 */
const IMAGE_SURFACES = ["designCentre", "quotes", "storefront"] as const;

/** Options, with their permitted values. Anything else is refused, not coerced. */
const OPTION_VALUES: Record<string, readonly string[]> = {
  // How often a vendor's product images are re-fetched from their feed.
  imageResync: ["url-change", "every-sync", "never"],
  // What a product with no image does in the customer's product picker.
  productsWithoutImages: ["placeholder", "hide"],
};

const OPTION_DEFAULTS: Record<string, string> = {
  imageResync: "url-change",
  productsWithoutImages: "placeholder",
};

interface ConsentRecord {
  granted: boolean;
  grantedAt: string | null;
  grantedBy: string | null;
  termsVersion: string | null;
  revokedAt: string | null;
}

const blankConsent = (): ConsentRecord => ({
  granted: false, grantedAt: null, grantedBy: null, termsVersion: null, revokedAt: null,
});

function defaultSettings(vendorId: string) {
  const imageDisplay: Record<string, ConsentRecord> = {};
  for (const surface of IMAGE_SURFACES) imageDisplay[surface] = blankConsent();
  return {
    vendorId,
    imageDisplay,
    options: { ...OPTION_DEFAULTS },
    updatedAt: null as string | null,
    updatedBy: null as string | null,
  };
}

/** Fill in anything a stored record predates, so a new field is never undefined. */
function withDefaults(vendorId: string, stored: any) {
  const base = defaultSettings(vendorId);
  if (!stored || typeof stored !== "object") return base;
  const imageDisplay: Record<string, ConsentRecord> = {};
  for (const surface of IMAGE_SURFACES) {
    const c = stored.imageDisplay?.[surface];
    imageDisplay[surface] = c && typeof c === "object" ? { ...blankConsent(), ...c } : blankConsent();
  }
  const options: Record<string, string> = { ...OPTION_DEFAULTS };
  for (const [key, allowed] of Object.entries(OPTION_VALUES)) {
    const v = stored.options?.[key];
    if (typeof v === "string" && allowed.includes(v)) options[key] = v;
  }
  return { ...base, ...stored, vendorId, imageDisplay, options };
}

vendorCatalogRouter.get("/vendor-settings/:vendorId", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in to view these settings." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "Those settings belong to another vendor." }, 403);
  }
  try {
    const stored = await kv.get(SETTINGS(vendorId));
    return c.json({
      success: true,
      settings: withDefaults(vendorId, stored),
      termsVersion: IMAGE_TERMS_VERSION,
      surfaces: IMAGE_SURFACES,
      optionValues: OPTION_VALUES,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not load the settings." }, 500);
  }
});

/**
 * Record consents and options.
 *
 * The client sends only what it is allowed to decide: a boolean per surface and
 * a chosen value per option. Everything that makes the record evidence — who,
 * when, and which terms version — is stamped HERE from the resolved caller and
 * the server clock. A consent whose timestamp and signatory arrived in the
 * request body is a consent the signatory wrote themselves.
 */
vendorCatalogRouter.put("/vendor-settings/:vendorId", async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const vendorId = c.req.param("vendorId");
  if (!mayTouch(who, vendorId)) {
    return c.json({ success: false, error: "Those settings belong to another vendor." }, 403);
  }

  let body: any;
  try { body = await c.req.json(); }
  catch { return c.json({ success: false, error: "Send a JSON body." }, 400); }

  const now = new Date().toISOString();
  const current = withDefaults(vendorId, await kv.get(SETTINGS(vendorId)));

  // Consents. Only a change is stamped, so re-saving the form does not rewrite
  // the date somebody actually agreed on.
  const imageDisplay: Record<string, ConsentRecord> = { ...current.imageDisplay };
  for (const surface of IMAGE_SURFACES) {
    const asked = body?.imageDisplay?.[surface];
    if (typeof asked !== "boolean") continue;
    const was = imageDisplay[surface];
    if (asked === was.granted) continue;
    imageDisplay[surface] = asked
      ? { granted: true, grantedAt: now, grantedBy: who.email, termsVersion: IMAGE_TERMS_VERSION, revokedAt: null }
      : { ...was, granted: false, revokedAt: now };
  }

  // Options. An unrecognised value is refused rather than quietly replaced with
  // the default, because silently ignoring a choice is worse than rejecting it.
  const options: Record<string, string> = { ...current.options };
  for (const [key, allowed] of Object.entries(OPTION_VALUES)) {
    const asked = body?.options?.[key];
    if (asked === undefined) continue;
    if (typeof asked !== "string" || !allowed.includes(asked)) {
      return c.json({ success: false, error: `${key} must be one of: ${allowed.join(", ")}.` }, 400);
    }
    options[key] = asked;
  }

  const next = { ...current, vendorId, imageDisplay, options, updatedAt: now, updatedBy: who.email };
  try {
    await kv.set(SETTINGS(vendorId), next);
    return c.json({ success: true, settings: next, termsVersion: IMAGE_TERMS_VERSION });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save the settings." }, 500);
  }
});

// ─── Reading products, and the offers under them ────────────────────────
//
// Offers carry a vendor's price, which is commercial information: one vendor
// reading another's cost base is what tenant isolation exists to prevent. So
// every route here runs the offers through `visibleTo`, the same rule the
// catalogue search uses, rather than inventing a second answer to the same
// question.
//
// The supplier's identity is returned to STAFF only. The customer picks the
// product, not the supplier — naming the vendor on a product they are choosing
// invites a conversation about suppliers that is not theirs to have, and the
// resolution happens at quote time anyway.

/** Load every offer once, grouped by the product it is against. */
async function offersByProduct(): Promise<Map<string, any[]>> {
  const all = ((await kv.getByPrefix('vendor_catalog:')) as any[] || []).filter(Boolean);
  const byProduct = new Map<string, any[]>();
  for (const offer of all) {
    const key = String(offer?.productId || '');
    if (!key) continue;
    const list = byProduct.get(key);
    if (list) list.push(offer); else byProduct.set(key, [offer]);
  }
  return byProduct;
}

/** What a caller is allowed to be told about the cheapest way to buy this. */
function cheapestFor(who: any, offers: any[]) {
  // A vendor sees only their own offer, so any 'cheapest' shown to them is
  // either their own price dressed as a comparison or somebody else's price
  // leaked. See the note on cheapestOf.
  if (!who.isAdmin && who.isVendor) return null;
  const best = cheapestOf(offers);
  if (!best) return null;
  return {
    price: best.price,
    unit: best.unit,
    leadTimeDays: best.leadTimeDays ?? null,
    availability: best.availability || '',
    ...(who.isAdmin ? { vendorId: best.vendorId, sku: best.sku } : {}),
  };
}

vendorCatalogRouter.get('/catalog-products', async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: 'Sign in to browse products.' }, 401);
  try {
    const q = String(c.req.query('q') || '').trim().toLowerCase();
    const category = String(c.req.query('category') || '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 200, 1), 1000);

    // Which surface the images are being asked for. Defaulted to the design
    // centre, the screen that reads this; an unrecognised value shows nothing,
    // which is the fail-closed answer rather than a silent fall back to "all".
    const surface = String(c.req.query('surface') || 'designCentre');
    const may = await consentCache();

    const products = ((await kv.getByPrefix('hub_product:')) as any[] || []).filter(Boolean);
    const byProduct = await offersByProduct();

    const rows = [];
    for (const product of products) {
      if (product?.mergedInto) continue; // absorbed; its offers live on the survivor
      if (q && !String(product.name || '').toLowerCase().includes(q)) continue;
      if (category && String(product.category || '').toLowerCase() !== category) continue;
      const mine = visibleTo(who, byProduct.get(String(product.id)) || []);
      rows.push({
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        brand: product.brand || '',
        images: await permittedImages(product, surface, may),
        offerCount: mine.length,
        cheapest: cheapestFor(who, mine),
      });
    }
    rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return c.json({ success: true, products: rows.slice(0, limit), count: rows.length });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not load products.' }, 500);
  }
});

/**
 * Link every catalogue line that predates the product record.
 *
 * Idempotent on purpose: a line that already has a product is skipped, so
 * running it twice does not produce two products for one line. Staff only —
 * it walks every vendor's catalogue, which is not a vendor's business.
 *
 * Each line gets its OWN product. Nothing is merged, because nothing here is
 * in a position to know that two lines are the same thing.
 */
vendorCatalogRouter.post('/catalog-products/backfill', async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: 'Sign in first.' }, 401);
  if (!who.isAdmin) {
    return c.json({ success: false, error: 'Company access is required for this.' }, 403);
  }
  try {
    const all = ((await kv.getByPrefix('vendor_catalog:')) as any[] || []).filter(Boolean);
    const lines = all.filter((x) => x && x.id && x.vendorId && x.name !== undefined);
    const now = new Date().toISOString();
    let linked = 0;
    let alreadyLinked = 0;
    for (const line of lines) {
      if (String(line.productId || '').trim()) { alreadyLinked++; continue; }
      const productId = await ensureProductForLine(line, now);
      await kv.set(ITEM(String(line.vendorId), String(line.id)), { ...line, productId, updatedAt: now });
      linked++;
    }
    return c.json({ success: true, scanned: lines.length, linked, alreadyLinked });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Backfill failed.' }, 500);
  }
});

/**
 * Which images a caller may be shown, and where.
 *
 * Display is gated on the CONSENT THE SUPPLYING VENDOR GRANTED, per surface.
 * A vendor who permitted their photography on quotes and refused it on the
 * public storefront gets exactly that, and the check happens on the server
 * where it cannot be skipped by a screen that forgot to ask.
 *
 * It fails closed. No settings record, no consent recorded, an unrecognised
 * surface — all of those mean the image is withheld. A picture shown without
 * permission is not a cosmetic mistake; it is somebody else's property on our
 * customer's document.
 */
const IMAGE_SURFACE_NAMES = ["designCentre", "quotes", "storefront"];

async function consentCache(): Promise<(vendorId: string, surface: string) => Promise<boolean>> {
  const seen = new Map<string, any>();
  return async (vendorId: string, surface: string) => {
    if (!IMAGE_SURFACE_NAMES.includes(surface)) return false;
    if (!vendorId) return false;
    if (!seen.has(vendorId)) {
      seen.set(vendorId, (await kv.get(`vendor_settings:${vendorId}`)) || null);
    }
    const settings = seen.get(vendorId);
    return settings?.imageDisplay?.[surface]?.granted === true;
  };
}

/** Strip any image the supplying vendor has not permitted on this surface. */
async function permittedImages(
  product: any,
  surface: string,
  may: (vendorId: string, surface: string) => Promise<boolean>,
): Promise<string[]> {
  const stored: any[] = Array.isArray(product?.images) ? product.images : [];
  const out: string[] = [];
  for (const image of stored) {
    if (!image?.url) continue;
    if (await may(String(image.vendorId || ''), surface)) out.push(String(image.url));
  }
  return out;
}

/**
 * Fetch the queued images, a bounded batch at a time.
 *
 * WHY THIS IS A ROUTE AND NOT PART OF THE IMPORT
 *
 * A 500-line price list carries up to 500 image addresses. Fetching them during
 * the import means 500 outbound requests and 500 storage writes inside one
 * function invocation, which is how an import times out half-done and leaves
 * nobody able to say what landed. The importer already posts in batches; this
 * is the same idea for the slow half of the work.
 *
 * A vendor may process their own; staff may process anyone's. The reply says how
 * many remain, so a caller knows to come back.
 */
vendorCatalogRouter.post('/catalog-products/mirror-images', async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: 'Sign in first.' }, 401);
  // Neither staff nor a vendor has anything to process here. Without this they
  // fall through to an empty batch and get `success: true`, which is harmless
  // and still the wrong answer — a caller with no business calling a route
  // should be refused rather than quietly handed a no-op.
  if (!who.isAdmin && !who.isVendor) {
    return c.json({ success: false, error: 'Only a vendor or company staff can do this.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number((body as any).limit) || 10, 1), 25);

  try {
    const products = ((await kv.getByPrefix('hub_product:')) as any[] || []).filter(Boolean);
    const waiting = products.filter((p) => p?.imagePending?.sourceUrl && p?.imagePending?.vendorId);

    // A vendor works only through their own images. Their catalogue, their
    // supplied addresses, their storage namespace.
    const mine = who.isAdmin
      ? waiting
      : waiting.filter((p) => who.vendorId && p.imagePending.vendorId === who.vendorId);

    const batch = mine.slice(0, limit);
    let stored = 0;
    const failed: Array<{ productId: string; reason: string }> = [];

    for (const product of batch) {
      const { sourceUrl, vendorId } = product.imagePending;
      const result = await mirrorVendorImage(String(vendorId), String(sourceUrl));
      const now = new Date().toISOString();

      if (result.error || !result.image) {
        // The address is cleared either way. Leaving a failing one queued means
        // every later run retries it forever and never reaches the rest.
        // What went wrong is kept ON the product so somebody can see why a
        // picture is missing rather than guessing.
        failed.push({ productId: String(product.id), reason: result.error || 'Unknown failure.' });
        await kv.set(PRODUCT(String(product.id)), {
          ...product,
          imagePending: null,
          imageError: { sourceUrl, reason: result.error || 'Unknown failure.', at: now },
          updatedAt: now,
        });
        continue;
      }

      // Replace any earlier copy from the same source, so a re-sync updates
      // rather than accumulating near-duplicates of one photograph.
      const kept: any[] = (Array.isArray(product.images) ? product.images : [])
        .filter((i: any) => i && i.sourceUrl !== sourceUrl);

      await kv.set(PRODUCT(String(product.id)), {
        ...product,
        images: [...kept, result.image],
        imagePending: null,
        imageError: null,
        updatedAt: now,
      });
      stored++;
    }

    return c.json({
      success: true,
      stored,
      failed,
      remaining: Math.max(0, mine.length - batch.length),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not fetch the images.' }, 500);
  }
});

// ─── Merging two suppliers' lines into one product ───────────────────────
//
// The whole point of the hub is that a customer picks a product and the cheapest
// supplier is resolved underneath, and that only means anything once two
// vendors' lines can be recognised as the same product.
//
// Nothing here decides that. `productMatch` proposes with a confidence and a
// reason; a person ticks it; this applies what was ticked. A wrong merge puts
// one supplier's price against another supplier's product, so the job is quoted
// from an item nobody will deliver — and the number looks exactly like a right
// one, which is why no amount of confidence justifies applying it unasked.

/** Products a person may usefully be asked about, with their offers' SKUs. */
async function mergeCandidates(): Promise<MatchCandidate[]> {
  const products = ((await kv.getByPrefix('hub_product:')) as any[] || []).filter(Boolean);
  const byProduct = await offersByProduct();
  const out: MatchCandidate[] = [];
  for (const product of products) {
    // A tombstone is a product that has already been absorbed. It is kept so the
    // merge stays reversible and so old references still resolve, and it is not
    // a thing to merge again.
    if (product?.mergedInto) continue;
    const offers = byProduct.get(String(product.id)) || [];
    out.push({
      productId: String(product.id),
      name: String(product.name || ''),
      unit: String(product.unit || ''),
      category: String(product.category || ''),
      skus: offers.map((o: any) => String(o?.sku || '')).filter(Boolean),
      vendorIds: [...new Set(offers.map((o: any) => String(o?.vendorId || '')).filter(Boolean))],
    });
  }
  return out;
}

/**
 * What a person should be asked about, strongest first.
 *
 * Staff only. It reads every vendor's catalogue to build the pairs, which is not
 * a vendor's business, and merging changes what every customer sees.
 */
vendorCatalogRouter.get('/catalog-products/merge-proposals', async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: 'Sign in first.' }, 401);
  if (!who.isAdmin) return c.json({ success: false, error: 'Company access is required for this.' }, 403);

  try {
    const candidates = await mergeCandidates();
    const byId = new Map(candidates.map((x) => [x.productId, x]));
    const proposals = proposeMerges(candidates);

    // Each side is returned in full, because the reviewer is being asked to
    // judge whether these are the same thing and cannot do that from two ids.
    return c.json({
      success: true,
      productCount: candidates.length,
      proposals: proposals.map((prop) => ({
        ...prop,
        left: byId.get(prop.a) || null,
        right: byId.get(prop.b) || null,
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not work out the proposals.' }, 500);
  }
});

/**
 * Apply one merge that a person ticked.
 *
 * `keep` survives and `absorb` becomes a tombstone pointing at it. The offers
 * are repointed rather than copied, so no price is duplicated and nothing has to
 * be kept in step afterwards.
 *
 * IT IS REVERSIBLE ON PURPOSE
 *
 * The absorbed product is not deleted: the record stays, holding what it was and
 * what it was merged into. A merge is a judgement about the world, judgements
 * are sometimes wrong, and the difference between a mistake and a disaster is
 * whether the original is still there.
 */
vendorCatalogRouter.post('/catalog-products/merge', async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: 'Sign in first.' }, 401);
  if (!who.isAdmin) return c.json({ success: false, error: 'Company access is required for this.' }, 403);

  const body = await c.req.json().catch(() => ({}));
  const keepId = String((body as any).keep || '').trim();
  const absorbId = String((body as any).absorb || '').trim();
  if (!keepId || !absorbId) return c.json({ success: false, error: 'Send both keep and absorb.' }, 400);
  if (keepId === absorbId) return c.json({ success: false, error: 'Those are the same product.' }, 400);

  try {
    const keep = (await kv.get(PRODUCT(keepId))) as any;
    const absorb = (await kv.get(PRODUCT(absorbId))) as any;
    if (!keep || !absorb) return c.json({ success: false, error: 'One of those products no longer exists.' }, 404);
    if (keep.mergedInto || absorb.mergedInto) {
      return c.json({ success: false, error: 'One of those has already been merged.' }, 409);
    }

    const now = new Date().toISOString();

    // Repoint the absorbed product's offers.
    const all = ((await kv.getByPrefix('vendor_catalog:')) as any[] || []).filter(Boolean);
    const moving = all.filter((o) => String(o?.productId || '') === absorbId);
    for (const offer of moving) {
      await kv.set(ITEM(String(offer.vendorId), String(offer.id)), {
        ...offer, productId: keepId, updatedAt: now,
      });
    }

    // Combine the pictures, keeping each one's provenance — display is gated on
    // the consent of whichever vendor supplied it, and after a merge that is
    // genuinely more than one vendor.
    const keepImages: any[] = Array.isArray(keep.images) ? keep.images : [];
    const extraImages: any[] = (Array.isArray(absorb.images) ? absorb.images : [])
      .filter((i: any) => i?.url && !keepImages.some((k: any) => k?.sourceUrl === i.sourceUrl));

    const staying = all.filter((o) => String(o?.productId || '') === keepId).length + moving.length;

    await kv.set(PRODUCT(keepId), {
      ...keep,
      images: [...keepImages, ...extraImages],
      offerCount: staying,
      mergedFrom: [
        ...(Array.isArray(keep.mergedFrom) ? keep.mergedFrom : []),
        { productId: absorbId, name: absorb.name, offersMoved: moving.length, at: now, by: who.email },
      ],
      updatedAt: now,
    });

    // The tombstone. Keeps what it was, so this can be undone.
    await kv.set(PRODUCT(absorbId), {
      id: absorbId,
      mergedInto: keepId,
      mergedAt: now,
      mergedBy: who.email,
      wasProduct: absorb,
    });

    return c.json({ success: true, keep: keepId, absorbed: absorbId, offersMoved: moving.length, offerCount: staying });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not merge those products.' }, 500);
  }
});

vendorCatalogRouter.get('/catalog-products/:productId', async (c) => {
  const who = await catalogActor(c);
  if (!who) return c.json({ success: false, error: 'Sign in to view a product.' }, 401);
  const productId = c.req.param('productId');
  try {
    const product = (await kv.get(PRODUCT(productId))) as any;
    if (!product) return c.json({ success: false, error: 'No such product.' }, 404);
    // A merged product is not gone, and it is not this product either. Say where
    // it went rather than serving a record with no offers under it.
    if (product.mergedInto) {
      return c.json({ success: false, error: 'That product was merged.', mergedInto: product.mergedInto }, 410);
    }
    const surface = String(c.req.query('surface') || 'designCentre');
    const may = await consentCache();
    const images = await permittedImages(product, surface, may);
    const all = ((await kv.getByPrefix('vendor_catalog:')) as any[] || []).filter(Boolean);
    const mine = visibleTo(who, all.filter((o) => String(o?.productId || '') === productId));
    // Staff get the offers themselves. Everybody else gets the count and the
    // cheapest way to buy it, which is what a product page is actually for.
    return c.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        brand: product.brand || '',
        mpn: product.mpn || '',
        images,
        // Said out loud so a missing picture is diagnosable rather than a
        // mystery: there is an image, and this surface may not show it.
        imagesWithheld: Math.max(0, (Array.isArray(product.images) ? product.images.length : 0) - images.length),
      },
      offerCount: mine.length,
      cheapest: cheapestFor(who, mine),
      offers: who.isAdmin || who.isVendor ? mine : undefined,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not load the product.' }, 500);
  }
});

export default vendorCatalogRouter;
