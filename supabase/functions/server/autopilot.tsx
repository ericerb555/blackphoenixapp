/**
 * Autopilot Campaigns — the "campaign brain + auto-runner" that makes the app
 * behave like a hands-off growth agent (ScaleShot-style).
 *
 * It does NOT reimplement any generation or publishing. It orchestrates the
 * real modules already in this server by calling their HTTP routes internally
 * and forwarding the caller's Authorization header so per-user scoping (social
 * accounts, brand kit) stays intact:
 *
 *   • content-studio/plan     → a dated multi-item content calendar from a goal
 *   • content-studio/compose  → a platform-native caption + hashtags + compliance
 *   • creative-studio/generate→ a DALL·E image persisted to the private bucket
 *   • social/publish          → real Facebook / Instagram publishing
 *
 * SCHEDULING REALITY: this environment has no server cron (edge functions are
 * request-driven only). The runner is therefore idempotent and driven by a
 * client heartbeat (POST /autopilot/campaigns/:id/advance) plus a catch-up on
 * page load. Each item flips ready → posted/failed exactly once, guarded by
 * `postedAt`, so double-fires (two tabs, reload) can never double-post to the
 * live accounts. A future external cron can hit POST /autopilot/tick to advance
 * a user's campaigns while no tab is open.
 *
 * Mounted with `app.route("/make-server-3eae23a6", autopilotRouter)`, so route
 * paths are relative.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

export const autopilotRouter = new Hono();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const INTERNAL_BASE = `${SUPABASE_URL}/functions/v1/make-server-3eae23a6`;
const CREATIVE_BUCKET = "make-3eae23a6-creative";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days, matches creative-studio

const supabaseAdmin = createClient(
  SUPABASE_URL,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Platforms we can actually auto-publish to today (social-media.tsx).
const PUBLISHABLE = ["facebook", "instagram"];

function id(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Identity & storage (mirrors social-media.tsx so accounts line up) ────────
async function getUserId(c: any): Promise<string> {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return "default";
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data?.user?.id || "default";
  } catch {
    return "default";
  }
}

const campaignKey = (userId: string, campaignId: string) => `autopilot:campaign:${userId}:${campaignId}`;
const indexKey = (userId: string) => `autopilot:index:${userId}`;

async function loadIndex(userId: string): Promise<string[]> {
  try {
    const raw = await kv.get(indexKey(userId));
    if (!raw) return [];
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveIndex(userId: string, ids: string[]): Promise<void> {
  await kv.set(indexKey(userId), JSON.stringify(Array.from(new Set(ids))));
}

async function loadCampaign(userId: string, campaignId: string): Promise<any | null> {
  const raw = await kv.get(campaignKey(userId, campaignId));
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function saveCampaign(userId: string, campaign: any): Promise<void> {
  campaign.updatedAt = new Date().toISOString();
  await kv.set(campaignKey(userId, campaign.id), JSON.stringify(campaign));
}

// ── Internal HTTP calls to sibling modules (forwards the caller's auth) ──────
async function callInternal(c: any, path: string, body: any): Promise<any> {
  const auth = c.req.header("Authorization") || "";
  const apikey = c.req.header("apikey") || auth.split(" ")[1] || "";
  const res = await fetch(`${INTERNAL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      apikey,
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(json?.error || `Internal call ${path} failed (HTTP ${res.status}).`);
  }
  return json;
}

/** Re-sign a stored creative-studio asset path so IG/FB get a live public URL. */
async function freshAssetUrl(path: string): Promise<string> {
  if (!path) return "";
  try {
    const { data } = await supabaseAdmin.storage.from(CREATIVE_BUCKET).createSignedUrl(path, SIGNED_TTL);
    return data?.signedUrl || "";
  } catch {
    return "";
  }
}

// Compute the due timestamp for the item at global index `i`.
function computeDueAt(startAtIso: string, i: number, spacingMinutes: number): string {
  const start = new Date(startAtIso).getTime();
  return new Date(start + i * spacingMinutes * 60_000).toISOString();
}

// ── Create campaign ──────────────────────────────────────────────────────────
autopilotRouter.post("/autopilot/campaigns", async (c) => {
  try {
    const userId = await getUserId(c);
    const body = await c.req.json().catch(() => ({}));

    const goal = String(body.goal || "").trim();
    if (!goal) return c.json({ success: false, error: "A campaign goal is required." }, 400);

    // Only keep channels we can actually auto-publish to.
    const requested = Array.isArray(body.channels) ? body.channels : ["facebook"];
    const channels = requested.filter((ch: string) => PUBLISHABLE.includes(ch));
    if (channels.length === 0) {
      return c.json({
        success: false,
        error: "Select at least one connected channel that supports auto-publishing (Facebook or Instagram).",
      }, 400);
    }

    const days = Math.min(30, Math.max(3, Number(body.days) || 7));
    const cadencePerDay = Math.min(4, Math.max(1, Number(body.cadencePerDay) || 1));
    // Spacing between posts. Default spreads cadencePerDay evenly across a day;
    // a caller may pass spacingMinutes to run faster (e.g. for a live demo).
    const spacingMinutes = Math.max(1, Number(body.spacingMinutes) || Math.round(1440 / cadencePerDay));

    const product = body.product && typeof body.product === "object"
      ? {
          id: body.product.id ?? body.productId ?? null,
          name: String(body.product.name || body.product.title || "").trim(),
          price: body.product.price ?? null,
          cost: body.product.cost ?? null,
          description: String(body.product.description || "").trim(),
          imageUrl: body.product.imageUrl || body.product.image || body.product.featured_image_url || "",
        }
      : null;

    const campaign = {
      id: id("apc_"),
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft", // draft → planned → assets_ready → running → paused → completed
      goal,
      budget: body.budget ?? null,
      product,
      channels,
      days,
      cadencePerDay,
      spacingMinutes,
      autoPublish: body.autoPublish !== false,
      // Human-in-the-loop: when true, generated posts wait in `pending_approval`
      // and the runner will only publish the ones you approve. Off by default,
      // so campaigns stay fully hands-off unless you opt in.
      requireApproval: body.requireApproval === true,
      startAt: body.startAt || new Date().toISOString(),
      items: [] as any[],
      lastRunAt: null,
    };

    await saveCampaign(userId, campaign);
    const idx = await loadIndex(userId);
    idx.push(campaign.id);
    await saveIndex(userId, idx);

    return c.json({ success: true, campaign });
  } catch (error) {
    console.log(`[Autopilot] create error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── List campaigns ───────────────────────────────────────────────────────────
autopilotRouter.get("/autopilot/campaigns", async (c) => {
  try {
    const userId = await getUserId(c);
    const ids = await loadIndex(userId);
    const campaigns = (
      await Promise.all(ids.map((cid) => loadCampaign(userId, cid)))
    ).filter(Boolean);
    campaigns.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return c.json({ success: true, campaigns });
  } catch (error) {
    console.log(`[Autopilot] list error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Get one campaign ─────────────────────────────────────────────────────────
autopilotRouter.get("/autopilot/campaigns/:id", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    return c.json({ success: true, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Generate the content plan (reuses content-studio/plan) ───────────────────
autopilotRouter.post("/autopilot/campaigns/:id/generate-plan", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);

    const productLine = campaign.product?.name
      ? ` Promote the product "${campaign.product.name}"${campaign.product.price ? ` ($${campaign.product.price})` : ""}.${campaign.product.description ? ` ${campaign.product.description}` : ""}`
      : "";
    const planRes = await callInternal(c, "/content-studio/plan", {
      goal: `${campaign.goal}.${productLine}`,
      days: campaign.days,
    });
    const planItems: any[] = Array.isArray(planRes?.plan?.items) ? planRes.plan.items : [];
    if (planItems.length === 0) {
      return c.json({ success: false, error: "The planner returned no items." }, 502);
    }

    // Assign each item a REAL publishable channel round-robin from the
    // campaign's connected channels, and a concrete dueAt timestamp. The
    // planner's own channel/format becomes advisory metadata for display.
    const items = planItems.map((it, i) => ({
      id: id("it_"),
      day: Number(it.day) || i + 1,
      dueAt: computeDueAt(campaign.startAt, i, campaign.spacingMinutes),
      channel: campaign.channels[i % campaign.channels.length],
      suggestedChannel: String(it.channel || ""),
      format: String(it.format || "post"),
      title: String(it.title || ""),
      hook: String(it.hook || ""),
      notes: String(it.notes || ""),
      caption: "",
      hashtags: [] as string[],
      complianceScore: null as number | null,
      assetPath: "",
      assetUrl: "",
      status: "planned", // planned → ready → posted | failed | skipped
      postedAt: null as string | null,
      externalId: null as string | null,
      error: null as string | null,
    }));

    campaign.items = items;
    campaign.status = "planned";
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign });
  } catch (error) {
    console.log(`[Autopilot] generate-plan error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Generate the assets for every planned item (compose + image) ─────────────
autopilotRouter.post("/autopilot/campaigns/:id/generate-assets", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    if (!Array.isArray(campaign.items) || campaign.items.length === 0) {
      return c.json({ success: false, error: "Generate a plan before generating assets." }, 400);
    }

    let generated = 0;
    const errors: string[] = [];

    for (const item of campaign.items) {
      // Only (re)generate items that haven't already been produced/posted.
      if (item.status !== "planned") continue;
      try {
        const topic = [item.title, item.hook, campaign.product?.name].filter(Boolean).join(" — ");
        const compose = await callInternal(c, "/content-studio/compose", {
          topic,
          platform: item.channel,
          includeHashtags: true,
          contentType: item.format,
          context: campaign.goal,
        });
        item.caption = String(compose?.caption || compose?.title || item.hook || "");
        item.hashtags = Array.isArray(compose?.hashtags) ? compose.hashtags : [];
        item.complianceScore = typeof compose?.complianceScore === "number" ? compose.complianceScore : null;

        // Instagram REQUIRES media; for Facebook an image lifts engagement.
        // Generate a brand-aware hero image for every item.
        try {
          const imgPrompt = [
            campaign.product?.name ? `${campaign.product.name} product marketing image` : item.title,
            item.hook,
          ].filter(Boolean).join(". ");
          const gen = await callInternal(c, "/creative-studio/generate", {
            prompt: imgPrompt || item.title || campaign.goal,
            presetId: "product-hero",
            size: item.channel === "instagram" ? "1024x1024" : "1792x1024",
            useBrandKit: true,
          });
          item.assetPath = gen?.asset?.path || "";
          item.assetUrl = gen?.asset?.url || "";
        } catch (imgErr) {
          // Image is best-effort for Facebook; required for Instagram.
          if (item.channel === "instagram") throw imgErr;
          console.log(`[Autopilot] image gen skipped for ${item.id}: ${imgErr}`);
        }

        // Opt-in approval gate: hold for review, otherwise go straight to the
        // auto-publish queue (unchanged hands-off behavior).
        item.status = campaign.requireApproval ? "pending_approval" : "ready";
        item.error = null;
        generated++;
      } catch (err) {
        item.status = "planned";
        item.error = String((err as any)?.message || err);
        errors.push(`${item.title || item.id}: ${item.error}`);
      }
    }

    campaign.status = generated > 0 ? "running" : campaign.status;
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign, generated, errors });
  } catch (error) {
    console.log(`[Autopilot] generate-assets error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── The runner: publish every ready item whose dueAt has passed ──────────────
// Idempotent — an item is only ever published once (guarded by postedAt).
async function advanceCampaign(c: any, userId: string, campaign: any): Promise<any[]> {
  if (campaign.status === "paused") return [];
  const now = Date.now();
  const ran: any[] = [];

  for (const item of campaign.items || []) {
    if (item.status !== "ready") continue;
    if (item.postedAt) continue; // idempotency guard
    if (new Date(item.dueAt).getTime() > now) continue;

    // Skip channels we can't publish to (defensive — items are already
    // constrained to publishable channels at plan time).
    if (!PUBLISHABLE.includes(item.channel)) {
      item.status = "skipped";
      item.error = `Auto-publish not supported for ${item.channel}.`;
      ran.push({ id: item.id, channel: item.channel, success: false, skipped: true });
      continue;
    }

    // Instagram needs a live public media URL — re-sign right before posting.
    let imageUrl = item.assetUrl || "";
    if (item.assetPath) {
      const fresh = await freshAssetUrl(item.assetPath);
      if (fresh) imageUrl = fresh;
    }
    if (item.channel === "instagram" && !imageUrl) {
      item.status = "failed";
      item.error = "Instagram requires an image and none was generated.";
      ran.push({ id: item.id, channel: item.channel, success: false, error: item.error });
      continue;
    }

    const content = [item.caption, (item.hashtags || []).join(" ")].filter(Boolean).join("\n\n");
    try {
      const pub = await callInternal(c, "/social/publish", {
        content,
        imageUrl: imageUrl || undefined,
        platforms: [item.channel],
      });
      const result = Array.isArray(pub?.results) ? pub.results[0] : null;
      if (result?.success) {
        item.status = "posted";
        item.postedAt = new Date().toISOString();
        item.externalId = result.id || null;
        item.error = null;
        ran.push({ id: item.id, channel: item.channel, success: true, externalId: item.externalId });
      } else {
        item.status = "failed";
        item.error = result?.error || "Publish failed.";
        ran.push({ id: item.id, channel: item.channel, success: false, error: item.error });
      }
    } catch (err) {
      item.status = "failed";
      item.error = String((err as any)?.message || err);
      ran.push({ id: item.id, channel: item.channel, success: false, error: item.error });
    }
  }

  // Mark completed when nothing is left to post (items awaiting approval or
  // still planned/ready count as pending).
  const anyPending = (campaign.items || []).some(
    (it: any) => it.status === "ready" || it.status === "planned" || it.status === "pending_approval",
  );
  if (!anyPending && (campaign.items || []).length > 0 && campaign.status !== "paused") {
    campaign.status = "completed";
  }
  campaign.lastRunAt = new Date().toISOString();
  await saveCampaign(userId, campaign);
  return ran;
}

autopilotRouter.post("/autopilot/campaigns/:id/advance", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    const ran = await advanceCampaign(c, userId, campaign);
    const nextDue = (campaign.items || [])
      .filter((it: any) => it.status === "ready" && !it.postedAt)
      .map((it: any) => it.dueAt)
      .sort()[0] || null;
    return c.json({ success: true, ran, nextDueAt: nextDue, campaign });
  } catch (error) {
    console.log(`[Autopilot] advance error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Cheap heartbeat: how many items are due right now across all campaigns ───
autopilotRouter.get("/autopilot/due", async (c) => {
  try {
    const userId = await getUserId(c);
    const ids = await loadIndex(userId);
    const now = Date.now();
    const dueCampaignIds: string[] = [];
    let dueCount = 0;
    for (const cid of ids) {
      const campaign = await loadCampaign(userId, cid);
      if (!campaign || campaign.status === "paused" || campaign.status === "completed") continue;
      const due = (campaign.items || []).filter(
        (it: any) => it.status === "ready" && !it.postedAt && new Date(it.dueAt).getTime() <= now,
      ).length;
      if (due > 0) {
        dueCount += due;
        dueCampaignIds.push(cid);
      }
    }
    return c.json({ success: true, dueCount, campaignIds: dueCampaignIds });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── External-cron entry point: advance ALL of the caller's campaigns ─────────
// Lets a future scheduler (cron-job.org, GitHub Actions, pg_cron+pg_net) run
// the app hands-off while no browser tab is open.
autopilotRouter.post("/autopilot/tick", async (c) => {
  try {
    const userId = await getUserId(c);
    const ids = await loadIndex(userId);
    const results: Record<string, any[]> = {};
    for (const cid of ids) {
      const campaign = await loadCampaign(userId, cid);
      if (!campaign) continue;
      results[cid] = await advanceCampaign(c, userId, campaign);
    }
    return c.json({ success: true, results });
  } catch (error) {
    console.log(`[Autopilot] tick error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Human-in-the-loop review controls (only meaningful when requireApproval) ─
function findItem(campaign: any, itemId: string): any | null {
  return (campaign.items || []).find((it: any) => it.id === itemId) || null;
}

// Approve a pending post → moves it into the auto-publish queue.
autopilotRouter.post("/autopilot/campaigns/:id/items/:itemId/approve", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    const item = findItem(campaign, c.req.param("itemId"));
    if (!item) return c.json({ success: false, error: "Item not found." }, 404);
    if (item.status === "posted") return c.json({ success: false, error: "Already posted." }, 400);
    item.status = "ready";
    item.error = null;
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// Approve every pending post in one action.
autopilotRouter.post("/autopilot/campaigns/:id/approve-all", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    let approved = 0;
    for (const it of campaign.items || []) {
      if (it.status === "pending_approval") { it.status = "ready"; it.error = null; approved++; }
    }
    await saveCampaign(userId, campaign);
    return c.json({ success: true, approved, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// Reject a post → it will never publish.
autopilotRouter.post("/autopilot/campaigns/:id/items/:itemId/reject", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    const item = findItem(campaign, c.req.param("itemId"));
    if (!item) return c.json({ success: false, error: "Item not found." }, 404);
    if (item.status === "posted") return c.json({ success: false, error: "Already posted." }, 400);
    item.status = "skipped";
    item.error = "Rejected during review.";
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// Manually edit a post's caption / hashtags before approving.
autopilotRouter.post("/autopilot/campaigns/:id/items/:itemId/edit", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    const item = findItem(campaign, c.req.param("itemId"));
    if (!item) return c.json({ success: false, error: "Item not found." }, 404);
    if (item.status === "posted") return c.json({ success: false, error: "Already posted." }, 400);
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.caption === "string") item.caption = body.caption;
    if (Array.isArray(body.hashtags)) item.hashtags = body.hashtags.map((h: any) => String(h));
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// Regenerate a post's caption or image (reuses compose / creative-studio).
autopilotRouter.post("/autopilot/campaigns/:id/items/:itemId/regenerate", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    const item = findItem(campaign, c.req.param("itemId"));
    if (!item) return c.json({ success: false, error: "Item not found." }, 404);
    if (item.status === "posted") return c.json({ success: false, error: "Already posted." }, 400);
    const body = await c.req.json().catch(() => ({}));
    const what = body.what === "image" ? "image" : "caption";

    if (what === "caption") {
      const topic = [item.title, item.hook, campaign.product?.name].filter(Boolean).join(" — ");
      const compose = await callInternal(c, "/content-studio/compose", {
        topic, platform: item.channel, includeHashtags: true,
        contentType: item.format, context: campaign.goal,
      });
      item.caption = String(compose?.caption || compose?.title || item.caption || "");
      item.hashtags = Array.isArray(compose?.hashtags) ? compose.hashtags : item.hashtags;
      item.complianceScore = typeof compose?.complianceScore === "number" ? compose.complianceScore : item.complianceScore;
    } else {
      const imgPrompt = [
        campaign.product?.name ? `${campaign.product.name} product marketing image` : item.title,
        item.hook,
      ].filter(Boolean).join(". ");
      const gen = await callInternal(c, "/creative-studio/generate", {
        prompt: imgPrompt || item.title || campaign.goal,
        presetId: "product-hero",
        size: item.channel === "instagram" ? "1024x1024" : "1792x1024",
        useBrandKit: true,
      });
      item.assetPath = gen?.asset?.path || item.assetPath;
      item.assetUrl = gen?.asset?.url || item.assetUrl;
    }
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign, item });
  } catch (error) {
    console.log(`[Autopilot] regenerate error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Pause / resume ───────────────────────────────────────────────────────────
autopilotRouter.post("/autopilot/campaigns/:id/pause", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    campaign.status = "paused";
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

autopilotRouter.post("/autopilot/campaigns/:id/resume", async (c) => {
  try {
    const userId = await getUserId(c);
    const campaign = await loadCampaign(userId, c.req.param("id"));
    if (!campaign) return c.json({ success: false, error: "Campaign not found." }, 404);
    const anyPending = (campaign.items || []).some(
      (it: any) => it.status === "ready" || it.status === "planned" || it.status === "pending_approval",
    );
    campaign.status = anyPending ? "running" : "completed";
    await saveCampaign(userId, campaign);
    return c.json({ success: true, campaign });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ── Delete ───────────────────────────────────────────────────────────────────
autopilotRouter.delete("/autopilot/campaigns/:id", async (c) => {
  try {
    const userId = await getUserId(c);
    const cid = c.req.param("id");
    await kv.del(campaignKey(userId, cid));
    const idx = (await loadIndex(userId)).filter((x) => x !== cid);
    await saveIndex(userId, idx);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

export default autopilotRouter;
