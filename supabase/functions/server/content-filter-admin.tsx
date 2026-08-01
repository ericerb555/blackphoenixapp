/**
 * content-filter-admin.tsx — owner controls for the adult-content filter.
 *
 * Lets the store owner:
 *   - see whether the adult filter is ON/OFF and toggle it,
 *   - review the quarantine of products the filter blocked from auto-posting,
 *   - move a blocked product into the live store (allow-list it), or
 *   - dismiss a blocked product for good.
 *
 * All routes are admin-only.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";
import {
  CONTENT_FILTER_CONFIG_KEY,
  BLOCKED_PRODUCT_PREFIX,
  isFilterEnabled,
  setFilterEnabled,
  allowProductId,
} from "./content-filter.tsx";
import { invalidateProductsCache } from "./ecommerce-products.tsx";

const contentFilterRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

async function requireAdmin(c: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user }, error } = await supabase.auth.getUser(accessToken ?? "");
  if (error || !user?.id) return { ok: false, error: `Authorization error in content filter admin: ${error?.message || "no user"}`, status: 401 };
  const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
  const role = perms?.role || user.user_metadata?.role;
  if (role !== "admin" && role !== "owner" && role !== "super_admin") {
    return { ok: false, error: "Administrator access is required to manage the content filter.", status: 403 };
  }
  return { ok: true };
}

/** GET current filter config. */
contentFilterRouter.get(`${PREFIX}/content-filter/config`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  try {
    const enabled = await isFilterEnabled();
    return c.json({ success: true, enabled });
  } catch (err) {
    console.log(`[content-filter-admin] config GET error: ${err}`);
    return c.json({ success: false, error: `Failed to read content filter config: ${err}` }, 500);
  }
});

/** POST toggle filter { enabled: boolean }. */
contentFilterRouter.post(`${PREFIX}/content-filter/config`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  try {
    const body = await c.req.json().catch(() => ({} as any));
    await setFilterEnabled(body.enabled !== false);
    return c.json({ success: true, enabled: await isFilterEnabled() });
  } catch (err) {
    console.log(`[content-filter-admin] config POST error: ${err}`);
    return c.json({ success: false, error: `Failed to update content filter config: ${err}` }, 500);
  }
});

/** GET quarantined (blocked) products, newest first. */
contentFilterRouter.get(`${PREFIX}/content-filter/blocked`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  try {
    const blocked = ((await kv.getByPrefix(BLOCKED_PRODUCT_PREFIX)) || []) as any[];
    blocked.sort((a, b) => String(b?.blockedAt || "").localeCompare(String(a?.blockedAt || "")));
    return c.json({ success: true, blocked });
  } catch (err) {
    console.log(`[content-filter-admin] blocked GET error: ${err}`);
    return c.json({ success: false, error: `Failed to list blocked products: ${err}` }, 500);
  }
});

/** POST allow a blocked product into the store. */
contentFilterRouter.post(`${PREFIX}/content-filter/blocked/:id/allow`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  try {
    const id = c.req.param("id");
    const record = (await kv.get(`${BLOCKED_PRODUCT_PREFIX}${id}`)) as any;
    if (!record) return c.json({ success: false, error: `Blocked product ${id} not found.` }, 404);
    // Strip quarantine metadata and publish into the store.
    const { blockedAt, ...storeProduct } = record;
    await kv.set(`product_${id}`, storeProduct);
    await allowProductId(String(id));
    await kv.del(`${BLOCKED_PRODUCT_PREFIX}${id}`);
    invalidateProductsCache();
    return c.json({ success: true, product: storeProduct });
  } catch (err) {
    console.log(`[content-filter-admin] allow error: ${err}`);
    return c.json({ success: false, error: `Failed to move blocked product into store: ${err}` }, 500);
  }
});

/** DELETE dismiss a blocked product permanently. */
contentFilterRouter.delete(`${PREFIX}/content-filter/blocked/:id`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  try {
    const id = c.req.param("id");
    await kv.del(`${BLOCKED_PRODUCT_PREFIX}${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[content-filter-admin] dismiss error: ${err}`);
    return c.json({ success: false, error: `Failed to dismiss blocked product: ${err}` }, 500);
  }
});

export default contentFilterRouter;
