// Store Content API Routes
// Connects the Content Center to the storefront in two directions:
//   1. Product Reels — short product videos shown on the public store. Managed in
//      the Content Center, displayed to shoppers. (content -> store)
//   2. Product Posts — posts composed FROM live store products, then pushed out
//      to email/social. Stored so the Content Center keeps a record. (store -> content -> out)
//
// KV storage (no schema changes):
//   reel:{id}        -> { id, title, videoUrl, posterUrl, productId, productName, ctaText, active, order, createdAt }
//   store_post:{id}  -> { id, title, body, productIds, channels, status, createdAt }
import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

export const storeContentRouter = new Hono();

const REEL_PREFIX = 'reel:';
const POST_PREFIX = 'store_post:';

// Short-lived cache + single-flight for the reel scan. The public storefront
// polls /reels frequently; without this each poll re-scans the shared KV table,
// which was contributing to Postgres statement timeouts under load. Writes bust it.
let reelsCache: { at: number; data: any[] } | null = null;
let reelsInFlight: Promise<any[]> | null = null;
const REELS_CACHE_TTL_MS = 20_000;
function invalidateReelsCache() { reelsCache = null; }
async function loadReels(): Promise<any[]> {
  if (reelsCache && Date.now() - reelsCache.at < REELS_CACHE_TTL_MS) return reelsCache.data;
  if (reelsInFlight) return reelsInFlight;
  reelsInFlight = (async () => {
    try {
      const data = ((await kv.getByPrefix(REEL_PREFIX)) || []).filter(Boolean);
      reelsCache = { at: Date.now(), data };
      return data;
    } finally {
      reelsInFlight = null;
    }
  })();
  return reelsInFlight;
}

// Verify the caller is an authenticated admin/owner for write operations.
async function requireAdmin(c: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return { ok: false, error: 'Missing Authorization token' };
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return { ok: false, error: 'Invalid or expired session' };
    const role = (user.app_metadata?.role || user.app_metadata?.accountType || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const isOwner =
      ['admin', 'owner', 'master_admin', 'super_admin', 'management'].includes(role) ||
      email === 'ericerb555@proton.me';
    if (!isOwner) return { ok: false, error: 'Admin privileges required' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Auth check failed: ${e}` };
  }
}

// ── REELS ────────────────────────────────────────────────────────────────

// Public: active reels for the storefront (sorted by order then newest).
storeContentRouter.get('/reels', async (c) => {
  try {
    const reels = (await loadReels()).filter((r: any) => r && r.active !== false);
    reels.sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    return c.json({ success: true, reels });
  } catch (error) {
    console.error('[StoreContent] Failed to list reels:', error);
    return c.json({ success: false, error: `Failed to list reels: ${error}` }, 500);
  }
});

// Admin: every reel including inactive ones.
storeContentRouter.get('/reels/all', async (c) => {
  const auth = await requireAdmin(c);
  if (!auth.ok) return c.json({ success: false, error: auth.error }, 401);
  try {
    const reels = (await loadReels()).slice();
    reels.sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    return c.json({ success: true, reels });
  } catch (error) {
    console.error('[StoreContent] Failed to list all reels:', error);
    return c.json({ success: false, error: `Failed to list reels: ${error}` }, 500);
  }
});

// Admin: create or update a reel.
storeContentRouter.post('/reels', async (c) => {
  const auth = await requireAdmin(c);
  if (!auth.ok) return c.json({ success: false, error: auth.error }, 401);
  try {
    const body = await c.req.json();
    const { id, title, videoUrl, posterUrl, productId, productName, ctaText, active, order } = body || {};
    if (!videoUrl) return c.json({ success: false, error: 'videoUrl is required' }, 400);
    const reelId = id || `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const existing = id ? await kv.get(`${REEL_PREFIX}${id}`) : null;
    const record = {
      id: reelId,
      title: title || existing?.title || 'Untitled reel',
      videoUrl,
      posterUrl: posterUrl || existing?.posterUrl || '',
      productId: productId ?? existing?.productId ?? null,
      productName: productName ?? existing?.productName ?? '',
      ctaText: ctaText || existing?.ctaText || 'Shop now',
      active: active !== undefined ? !!active : (existing?.active ?? true),
      order: order ?? existing?.order ?? 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await kv.set(`${REEL_PREFIX}${reelId}`, record);
    invalidateReelsCache();
    return c.json({ success: true, reel: record });
  } catch (error) {
    console.error('[StoreContent] Failed to save reel:', error);
    return c.json({ success: false, error: `Failed to save reel: ${error}` }, 500);
  }
});

storeContentRouter.delete('/reels/:id', async (c) => {
  const auth = await requireAdmin(c);
  if (!auth.ok) return c.json({ success: false, error: auth.error }, 401);
  try {
    await kv.del(`${REEL_PREFIX}${c.req.param('id')}`);
    invalidateReelsCache();
    return c.json({ success: true });
  } catch (error) {
    console.error('[StoreContent] Failed to delete reel:', error);
    return c.json({ success: false, error: `Failed to delete reel: ${error}` }, 500);
  }
});

// ── PRODUCT POSTS ──────────────────────────────────────────────────────────

// Admin: list composed posts.
storeContentRouter.get('/posts', async (c) => {
  const auth = await requireAdmin(c);
  if (!auth.ok) return c.json({ success: false, error: auth.error }, 401);
  try {
    const posts = ((await kv.getByPrefix(POST_PREFIX)) || []).filter(Boolean);
    posts.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return c.json({ success: true, posts });
  } catch (error) {
    console.error('[StoreContent] Failed to list posts:', error);
    return c.json({ success: false, error: `Failed to list posts: ${error}` }, 500);
  }
});

// Admin: save a post composed from store products (record of what was pushed out).
storeContentRouter.post('/posts', async (c) => {
  const auth = await requireAdmin(c);
  if (!auth.ok) return c.json({ success: false, error: auth.error }, 401);
  try {
    const body = await c.req.json();
    const { id, title, postBody, productIds, channels, status } = body || {};
    const postId = id || `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: postId,
      title: title || 'Untitled post',
      body: postBody || '',
      productIds: Array.isArray(productIds) ? productIds : [],
      channels: Array.isArray(channels) ? channels : [],
      status: status || 'draft',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`${POST_PREFIX}${postId}`, record);
    return c.json({ success: true, post: record });
  } catch (error) {
    console.error('[StoreContent] Failed to save post:', error);
    return c.json({ success: false, error: `Failed to save post: ${error}` }, 500);
  }
});

storeContentRouter.delete('/posts/:id', async (c) => {
  const auth = await requireAdmin(c);
  if (!auth.ok) return c.json({ success: false, error: auth.error }, 401);
  try {
    await kv.del(`${POST_PREFIX}${c.req.param('id')}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('[StoreContent] Failed to delete post:', error);
    return c.json({ success: false, error: `Failed to delete post: ${error}` }, 500);
  }
});
