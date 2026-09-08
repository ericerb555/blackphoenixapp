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

    const feed = {
      vendorId,
      endpoint,
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

export default vendorCatalogRouter;
