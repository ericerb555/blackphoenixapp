/**
 * reel-scoreboard — which reel actually worked, and therefore which hook shape
 * to write more of.
 *
 * WHY THIS IS THE MISSING HALF
 *
 * The generator now writes five competing variants per product, one per hook
 * archetype, because nobody can pick the winner in advance. That is the right
 * process — and it is only half of it. The other half is finding out which one
 * won and writing more like it. Without that, five variants is five guesses
 * instead of one, and the archetype list stays a generic list I wrote rather
 * than Eric's own evidence.
 *
 * WHAT LINKS A REEL TO A RESULT
 *
 * Instagram will not tell you that a post was the "warning" archetype — it has
 * never heard of archetypes. So the link is recorded here when the reel is
 * posted, and metrics are attached to it afterwards, from either:
 *
 *   • the Instagram Graph API, for an account that has been connected; or
 *   • typed in by hand, which works for TikTok too and needs no credentials.
 *
 * Manual entry is deliberately first-class. TikTok has no API that would give
 * this, and a scoreboard that only works on one platform would quietly teach
 * the wrong lesson by counting only half the evidence.
 *
 * KV keys:
 *   reel_post:{id}   one posted variant, with whatever metrics are known
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

export const reelScoreboardRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const POST = (id: string) => `reel_post:${id}`;
const IG_TOKEN_KEY = "instagram_token";

/**
 * The current Instagram token, refreshed before it can die.
 *
 * Instagram's long-lived tokens last 60 days and do not auto-renew. A token set
 * once as a secret and never touched again stops working in two months, and the
 * failure is silent — the scoreboard simply stops updating and nobody notices
 * until the numbers look stale.
 *
 * So the token lives in storage rather than only in an environment variable,
 * because an env var cannot rewrite itself. `INSTAGRAM_ACCESS_TOKEN` seeds it
 * the first time; after that the stored copy is authoritative and is refreshed
 * whenever it is within ten days of expiring.
 *
 * Meta requires a token be at least 24 hours old before it can be refreshed, so
 * a just-issued token is used as-is and refreshed on a later call.
 */
async function instagramToken(): Promise<{ token: string | null; note: string }> {
  const seed = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") || "";
  const stored = (await kv.get(IG_TOKEN_KEY)) as any;

  let token = String(stored?.token || seed || "");
  if (!token) return { token: null, note: "" };

  const expiresAt = stored?.expiresAt ? new Date(stored.expiresAt).getTime() : 0;
  const issuedAt = stored?.issuedAt ? new Date(stored.issuedAt).getTime() : 0;
  const now = Date.now();

  const dueForRefresh = expiresAt > 0 && expiresAt - now < 10 * 86400_000;
  const oldEnough = issuedAt === 0 || now - issuedAt > 25 * 3600_000; // Meta wants 24h+
  const noExpiryRecorded = expiresAt === 0; // first use of a seeded token

  if (!dueForRefresh && !noExpiryRecorded) return { token, note: "" };
  if (dueForRefresh && !oldEnough) {
    return { token, note: "Token is near expiry but too newly issued to refresh yet; it will refresh on a later run." };
  }

  try {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", token);
    const r = await fetch(url.toString());
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.access_token) {
      token = String(j.access_token);
      await kv.set(IG_TOKEN_KEY, {
        token,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(now + (Number(j.expires_in) || 60 * 86400) * 1000).toISOString(),
        refreshedAt: new Date().toISOString(),
      });
      return { token, note: "Token refreshed; good for another 60 days." };
    }
    // Refresh failed but the current token may still work — say so rather than
    // dropping it, and let the caller see the reason.
    return { token, note: `Could not refresh the Instagram token: ${j?.error?.message || r.status}. It will stop working when it expires.` };
  } catch (e: any) {
    return { token, note: `Token refresh failed: ${e?.message || e}` };
  }
}

async function actor(c: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error || !user ? null : user;
}

/**
 * Engagement rate, which is the only figure comparable across posts.
 *
 * Raw likes reward whichever reel happened to be pushed hardest by the platform
 * that week. Interactions divided by the people who actually saw it asks the
 * question that matters: of those reached, how many cared.
 */
function engagementRate(m: any): number | null {
  const reach = Number(m?.reach || m?.views || m?.impressions || 0);
  if (!reach) return null;
  const acted = Number(m?.likes || 0) + Number(m?.comments || 0) + Number(m?.saves || 0) + Number(m?.shares || 0);
  return Number(((acted / reach) * 100).toFixed(2));
}

// ─── Recording a post ───────────────────────────────────────────────────────

reelScoreboardRouter.post("/reel-scoreboard/posts", async (c) => {
  const user = await actor(c);
  if (!user) return c.json({ success: false, error: "Sign in to record a post." }, 401);
  try {
    const b = await c.req.json().catch(() => ({}));
    const archetype = String(b.archetype || "").trim();
    if (!archetype) return c.json({ success: false, error: "Which hook archetype was this?" }, 400);

    const now = new Date().toISOString();
    const id = String(b.id || `post_${crypto.randomUUID()}`);
    const existing = (await kv.get(POST(id))) as any;

    const record = {
      ...(existing || {}),
      id,
      archetype,
      productId: String(b.productId ?? existing?.productId ?? ""),
      productName: String(b.productName ?? existing?.productName ?? ""),
      variantId: String(b.variantId ?? existing?.variantId ?? ""),
      hook: String(b.hook ?? existing?.hook ?? "").slice(0, 200),
      platform: ["instagram", "tiktok", "youtube", "facebook", "other"].includes(String(b.platform))
        ? b.platform : (existing?.platform || "instagram"),
      // Instagram's own id for the post, when known — this is what lets the sync
      // find it later without anyone matching captions by eye.
      mediaId: String(b.mediaId ?? existing?.mediaId ?? ""),
      permalink: String(b.permalink ?? existing?.permalink ?? "").slice(0, 500),
      postedAt: b.postedAt || existing?.postedAt || now,
      metrics: existing?.metrics || null,
      metricsSource: existing?.metricsSource || null,
      ownerEmail: existing?.ownerEmail || String(user.email || "").toLowerCase(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await kv.set(POST(id), record);
    return c.json({ success: true, post: record });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not record the post." }, 500);
  }
});

/** Attach results by hand. Works for TikTok, which has no API that would do it. */
reelScoreboardRouter.patch("/reel-scoreboard/posts/:id/metrics", async (c) => {
  const user = await actor(c);
  if (!user) return c.json({ success: false, error: "Sign in first." }, 401);
  try {
    const post = (await kv.get(POST(c.req.param("id")))) as any;
    if (!post) return c.json({ success: false, error: "That post is not recorded." }, 404);

    const b = await c.req.json().catch(() => ({}));
    const num = (v: any) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : 0);
    const metrics = {
      reach: num(b.reach ?? b.views),
      views: num(b.views ?? b.reach),
      likes: num(b.likes),
      comments: num(b.comments),
      saves: num(b.saves),
      shares: num(b.shares),
    };
    const updated = {
      ...post,
      metrics,
      engagementRate: engagementRate(metrics),
      metricsSource: "manual",
      metricsUpdatedAt: new Date().toISOString(),
    };
    await kv.set(POST(post.id), updated);
    return c.json({ success: true, post: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save the results." }, 500);
  }
});

// ─── Instagram sync ─────────────────────────────────────────────────────────

/**
 * Pull results for posts that carry an Instagram media id.
 *
 * Needs INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ID. Reads only the
 * connected account's own media — the Graph API does not offer anyone else's,
 * and nothing here pretends otherwise.
 */
reelScoreboardRouter.post("/reel-scoreboard/sync-instagram", async (c) => {
  const user = await actor(c);
  if (!user) return c.json({ success: false, error: "Sign in first." }, 401);

  const { token, note: tokenNote } = await instagramToken();
  if (!token) {
    return c.json({
      success: false,
      configured: false,
      error: "Set INSTAGRAM_ACCESS_TOKEN to pull results automatically. Until then, results can be typed in — which is what TikTok needs anyway.",
      synced: 0,
    }, 200);
  }

  try {
    const posts = ((await kv.getByPrefix("reel_post:")) as any[] || [])
      .filter(Boolean)
      .filter((p) => p.platform === "instagram" && p.mediaId);

    let synced = 0;
    const failures: string[] = [];
    for (const p of posts.slice(0, 50)) {
      try {
        const url = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(p.mediaId)}/insights`);
        url.searchParams.set("metric", "reach,likes,comments,saves,shares");
        url.searchParams.set("access_token", token);
        const r = await fetch(url.toString());
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { failures.push(`${p.mediaId}: ${j?.error?.message || r.status}`); continue; }

        const byName: Record<string, number> = {};
        for (const row of (j.data || [])) {
          byName[String(row?.name || "")] = Number(row?.values?.[0]?.value || 0);
        }
        const metrics = {
          reach: byName.reach || 0,
          views: byName.reach || 0,
          likes: byName.likes || 0,
          comments: byName.comments || 0,
          saves: byName.saves || 0,
          shares: byName.shares || 0,
        };
        await kv.set(POST(p.id), {
          ...p, metrics, engagementRate: engagementRate(metrics),
          metricsSource: "instagram", metricsUpdatedAt: new Date().toISOString(),
        });
        synced++;
      } catch (e: any) { failures.push(`${p.mediaId}: ${e?.message || e}`); }
    }
    return c.json({ success: true, synced, considered: posts.length, failures: failures.slice(0, 5), tokenNote });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Instagram sync failed." }, 500);
  }
});

/**
 * Is Instagram connected, and how long has it got?
 *
 * Worth its own route because the failure this guards against is silent. A token
 * that expired three weeks ago looks exactly like an account with no new posts.
 */
reelScoreboardRouter.get("/reel-scoreboard/instagram-status", async (c) => {
  const user = await actor(c);
  if (!user) return c.json({ success: false, error: "Sign in first." }, 401);
  try {
    const seeded = Boolean(Deno.env.get("INSTAGRAM_ACCESS_TOKEN"));
    const stored = (await kv.get(IG_TOKEN_KEY)) as any;
    if (!seeded && !stored?.token) {
      return c.json({
        success: true, connected: false,
        message: "Instagram is not connected. Results can still be typed in, which is what TikTok needs anyway.",
      });
    }

    const { token, note } = await instagramToken();
    if (!token) return c.json({ success: true, connected: false, message: "No usable token." });

    // Ask Instagram who this is. A token that has been revoked will fail here
    // rather than at the next sync, which is the point.
    const r = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
    const j = await r.json().catch(() => ({}));
    const expiresAt = stored?.expiresAt || null;
    const daysLeft = expiresAt ? Math.round((new Date(expiresAt).getTime() - Date.now()) / 86400_000) : null;

    if (!r.ok) {
      return c.json({
        success: true, connected: false,
        error: j?.error?.message || `Instagram rejected the token (${r.status}).`,
        hint: "Tokens last 60 days. If this one lapsed, generate a new one and set INSTAGRAM_ACCESS_TOKEN again.",
      });
    }
    return c.json({
      success: true, connected: true,
      account: { id: j.id, username: j.username },
      expiresAt, daysLeft,
      autoRefresh: "Refreshes automatically when within ten days of expiry.",
      note,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not check Instagram." }, 500);
  }
});

// ─── The scoreboard ─────────────────────────────────────────────────────────

/**
 * Which hook shapes are working, ranked.
 *
 * Only posts with results count. A post with no metrics is not a zero — it is
 * an unknown, and averaging unknowns as zeros would quietly punish whatever was
 * posted most recently.
 */
reelScoreboardRouter.get("/reel-scoreboard", async (c) => {
  const user = await actor(c);
  if (!user) return c.json({ success: false, error: "Sign in to view the scoreboard." }, 401);
  try {
    const all = ((await kv.getByPrefix("reel_post:")) as any[] || []).filter(Boolean);
    const scored = all.filter((p) => p?.metrics && Number(p.metrics.reach || 0) > 0);

    const byArchetype = new Map<string, any>();
    for (const p of scored) {
      const k = String(p.archetype);
      const row = byArchetype.get(k) || { archetype: k, posts: 0, reach: 0, interactions: 0, bestHook: "", bestRate: -1 };
      const m = p.metrics;
      const acted = Number(m.likes || 0) + Number(m.comments || 0) + Number(m.saves || 0) + Number(m.shares || 0);
      row.posts += 1;
      row.reach += Number(m.reach || 0);
      row.interactions += acted;
      const rate = Number(p.engagementRate ?? engagementRate(m) ?? 0);
      if (rate > row.bestRate) { row.bestRate = rate; row.bestHook = String(p.hook || ""); }
      byArchetype.set(k, row);
    }

    const ranking = [...byArchetype.values()]
      .map((r) => ({
        ...r,
        // Pooled, not an average of averages — one post with tiny reach and a
        // freak rate should not outrank a post seen by thousands.
        engagementRate: r.reach > 0 ? Number(((r.interactions / r.reach) * 100).toFixed(2)) : 0,
        bestRate: r.bestRate < 0 ? null : r.bestRate,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);

    return c.json({
      success: true,
      ranking,
      postsRecorded: all.length,
      postsWithResults: scored.length,
      // Stated so nobody reads a ranking built on two posts as settled.
      confidence: scored.length >= 15 ? "reasonable" : scored.length >= 5 ? "early" : "not enough yet",
      note: scored.length < 5
        ? "Fewer than five posts have results. Post the variants and record what happened before trusting any of this."
        : "",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not build the scoreboard." }, 500);
  }
});

/**
 * The winning archetypes, as a prompt fragment.
 *
 * This is what turns the scoreboard from a report into a loop: the generator
 * stops treating all archetypes as equal and leans toward the ones that have
 * actually worked for this account.
 */
export async function winningArchetypesFragment(): Promise<string> {
  try {
    const all = ((await kv.getByPrefix("reel_post:")) as any[] || []).filter(Boolean);
    const scored = all.filter((p) => p?.metrics && Number(p.metrics.reach || 0) > 0);
    if (scored.length < 5) return ""; // too thin to steer by

    const agg = new Map<string, { reach: number; acted: number; posts: number }>();
    for (const p of scored) {
      const m = p.metrics;
      const row = agg.get(String(p.archetype)) || { reach: 0, acted: 0, posts: 0 };
      row.reach += Number(m.reach || 0);
      row.acted += Number(m.likes || 0) + Number(m.comments || 0) + Number(m.saves || 0) + Number(m.shares || 0);
      row.posts += 1;
      agg.set(String(p.archetype), row);
    }
    const ranked = [...agg.entries()]
      .map(([k, v]) => ({ archetype: k, rate: v.reach ? (v.acted / v.reach) * 100 : 0, posts: v.posts }))
      .sort((a, b) => b.rate - a.rate);
    if (!ranked.length) return "";

    return [
      "",
      "WHAT HAS ACTUALLY WORKED FOR THIS ACCOUNT, from posts already published:",
      "",
      ...ranked.map((r) => `  ${r.archetype}: ${r.rate.toFixed(2)}% engagement across ${r.posts} post${r.posts === 1 ? "" : "s"}`),
      "",
      `Put the strongest work into the "${ranked[0].archetype}" variant. Still write`,
      "all of them — the point of a batch is that the audience decides — but this is",
      "the shape that has earned attention here before.",
      "",
    ].join("\n");
  } catch {
    return "";
  }
}

export default reelScoreboardRouter;
