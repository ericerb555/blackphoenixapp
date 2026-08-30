/**
 * advertising — campaigns, creatives, ad serving and the impression/click counts
 * the advertiser portal reports on.
 *
 * WHY THIS EXISTS
 *
 * There was no advertiser backend at all. Ads lived in `localStorage` under
 * `advertisements`, nothing wrote them (so no advertiser could ever create one),
 * and nothing anywhere recorded an impression or a click. The advertiser portal
 * reported 415K impressions and a 3.0% click-through rate, and both were
 * literals in the component.
 *
 * An advertiser pays for that screen, so the numbers on it have to come from
 * somewhere real.
 *
 * KV keys:
 *   ad_campaign:{id}                campaign, owned by an advertiser email
 *   ad_creative:{id}                one ad, belonging to a campaign
 *   ad_stat:{creativeId}:{date}     daily impression and click counters
 *
 * WHY DAILY COUNTERS RATHER THAN INDIVIDUAL EVENTS
 *
 * A marquee on nineteen surfaces would write millions of rows nobody reads
 * individually. The portal asks "how many, and over what period", which a daily
 * rollup answers exactly, at three orders of magnitude less storage.
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { trustedRole } from "./trustedRole.ts";

export const advertisingRouter = new Hono();

/**
 * A URL we are willing to put in front of somebody else.
 *
 * Anything an advertiser supplies here is rendered in other people's browsers,
 * so the only acceptable schemes are http and https. `javascript:` in a link
 * target is stored cross-site scripting; `data:` in an image is a way to serve
 * arbitrary content from our own origin's context. Both are rejected outright
 * rather than sanitised, because a URL that is not a web address is not a typo
 * to be repaired — it is someone trying something.
 *
 * Returns "" for anything unacceptable, which the callers already treat as
 * "no link", so a rejected value degrades to a plain, unclickable ad.
 */
function safeUrl(raw: unknown): string {
  const value = String(raw ?? "").trim().slice(0, 500);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    // Not parseable as an absolute URL. A relative path is not useful for an
    // outbound ad link, so there is nothing safe to keep.
    return "";
  }
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const CAMPAIGN = (id: string) => `ad_campaign:${id}`;
const CREATIVE = (id: string) => `ad_creative:${id}`;
const STAT = (creativeId: string, date: string) => `ad_stat:${creativeId}:${date}`;

const today = () => new Date().toISOString().slice(0, 10);

/** Who is asking, and are they staff? */
async function actor(c: any): Promise<{ email: string; isAdmin: boolean } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  // Authority comes from app_metadata only — user_metadata is browser-writable.
  const role = trustedRole(user);
  return {
    email: String(user.email || "").toLowerCase(),
    isAdmin: ["owner", "admin", "master_admin", "management"].includes(role),
  };
}

/** An advertiser only ever sees their own campaigns; staff see everything. */
const mine = (rows: any[], who: { email: string; isAdmin: boolean }) =>
  who.isAdmin ? rows : rows.filter((r) => String(r?.advertiserEmail || "").toLowerCase() === who.email);

// ─── Campaigns ──────────────────────────────────────────────────────────────

advertisingRouter.get("/advertising/campaigns", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to view campaigns." }, 401);
  try {
    const all = ((await kv.getByPrefix("ad_campaign:")) as any[] || []).filter(Boolean);
    const rows = mine(all, who).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return c.json({ success: true, campaigns: rows });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not load campaigns." }, 500);
  }
});

advertisingRouter.post("/advertising/campaigns", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to create a campaign." }, 401);
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 160);
    if (!name) return c.json({ success: false, error: "Give the campaign a name." }, 400);

    const now = new Date().toISOString();
    const id = String(body.id || `camp_${crypto.randomUUID()}`);
    const existing = (await kv.get(CAMPAIGN(id))) as any;
    // An advertiser may only edit their own campaign, never adopt someone else's
    // by posting its id back.
    if (existing && !who.isAdmin && String(existing.advertiserEmail || "").toLowerCase() !== who.email) {
      return c.json({ success: false, error: "That campaign belongs to another advertiser." }, 403);
    }

    const campaign = {
      ...(existing || {}),
      id,
      name,
      advertiserEmail: existing?.advertiserEmail || who.email,
      status: ["active", "paused", "draft", "ended"].includes(String(body.status)) ? body.status : (existing?.status || "active"),
      objective: String(body.objective || existing?.objective || "").slice(0, 200),
      startsAt: body.startsAt || existing?.startsAt || now,
      endsAt: body.endsAt ?? existing?.endsAt ?? null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await kv.set(CAMPAIGN(id), campaign);
    return c.json({ success: true, campaign });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save the campaign." }, 500);
  }
});

// ─── Creatives ──────────────────────────────────────────────────────────────

advertisingRouter.get("/advertising/creatives", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to view creatives." }, 401);
  try {
    const all = ((await kv.getByPrefix("ad_creative:")) as any[] || []).filter(Boolean);
    return c.json({ success: true, creatives: mine(all, who) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not load creatives." }, 500);
  }
});

advertisingRouter.post("/advertising/creatives", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to create an ad." }, 401);
  try {
    const body = await c.req.json().catch(() => ({}));
    const title = String(body.title || "").trim().slice(0, 120);
    if (!title) return c.json({ success: false, error: "Give the ad a title." }, 400);

    const campaignId = String(body.campaignId || "").trim();
    if (campaignId) {
      const campaign = (await kv.get(CAMPAIGN(campaignId))) as any;
      if (!campaign) return c.json({ success: false, error: "That campaign does not exist." }, 404);
      if (!who.isAdmin && String(campaign.advertiserEmail || "").toLowerCase() !== who.email) {
        return c.json({ success: false, error: "That campaign belongs to another advertiser." }, 403);
      }
    }

    const now = new Date().toISOString();
    const id = String(body.id || `crea_${crypto.randomUUID()}`);
    const existing = (await kv.get(CREATIVE(id))) as any;
    if (existing && !who.isAdmin && String(existing.advertiserEmail || "").toLowerCase() !== who.email) {
      return c.json({ success: false, error: "That ad belongs to another advertiser." }, 403);
    }

    const creative = {
      ...(existing || {}),
      id,
      campaignId: campaignId || existing?.campaignId || null,
      advertiserEmail: existing?.advertiserEmail || who.email,
      title,
      content: String(body.content ?? existing?.content ?? "").slice(0, 300),
      // Both of these are supplied by an advertiser and then rendered in other
      // people's browsers — the marquee strip puts the link straight into an
      // href on nineteen surfaces, including the public store. A length cap is
      // not validation: `javascript:alert(document.cookie)` is well under 500
      // characters, and stored in this field it would run for every visitor who
      // clicked the ad. Restricted to http and https here, on the server, where
      // an advertiser cannot skip it.
      linkUrl: safeUrl(body.linkUrl ?? existing?.linkUrl),
      imageUrl: safeUrl(body.imageUrl ?? existing?.imageUrl),
      // Where it is allowed to appear. `marquee` is the strip the platform
      // already renders on nineteen surfaces.
      placement: ["marquee", "banner", "reel"].includes(String(body.placement)) ? body.placement : (existing?.placement || "marquee"),
      isActive: body.isActive === undefined ? (existing?.isActive ?? true) : Boolean(body.isActive),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await kv.set(CREATIVE(id), creative);
    return c.json({ success: true, creative });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save the ad." }, 500);
  }
});

advertisingRouter.delete("/advertising/creatives/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  try {
    const creative = (await kv.get(CREATIVE(c.req.param("id")))) as any;
    if (!creative) return c.json({ success: false, error: "Ad not found." }, 404);
    if (!who.isAdmin && String(creative.advertiserEmail || "").toLowerCase() !== who.email) {
      return c.json({ success: false, error: "That ad belongs to another advertiser." }, 403);
    }
    await kv.del(CREATIVE(creative.id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not delete the ad." }, 500);
  }
});

// ─── Serving ────────────────────────────────────────────────────────────────

/**
 * The ads to show right now.
 *
 * Deliberately unauthenticated: ads are shown to every visitor including
 * signed-out ones, and requiring a session would mean the marquee renders
 * nothing on the public site — which is where advertising is worth most.
 *
 * Only fields needed to render and to attribute are returned; an advertiser's
 * email, budget and campaign settings are not public.
 */
advertisingRouter.get("/advertising/serve", async (c) => {
  try {
    const placement = String(c.req.query("placement") || "marquee");
    const limit = Math.min(Math.max(Number(c.req.query("limit")) || 12, 1), 24);
    const now = Date.now();

    const creatives = ((await kv.getByPrefix("ad_creative:")) as any[] || []).filter(Boolean);
    const campaigns = ((await kv.getByPrefix("ad_campaign:")) as any[] || []).filter(Boolean);
    const byCampaign = new Map(campaigns.map((x: any) => [String(x.id), x]));

    const live = creatives.filter((cr: any) => {
      if (!cr?.isActive) return false;
      if (String(cr.placement || "marquee") !== placement) return false;
      if (!cr.campaignId) return true; // a standalone ad runs until switched off
      const camp = byCampaign.get(String(cr.campaignId));
      if (!camp || camp.status !== "active") return false;
      if (camp.startsAt && new Date(camp.startsAt).getTime() > now) return false;
      if (camp.endsAt && new Date(camp.endsAt).getTime() < now) return false;
      return true;
    });

    return c.json({
      success: true,
      ads: live.slice(0, limit).map((cr: any) => ({
        id: cr.id,
        campaignId: cr.campaignId || null,
        title: cr.title,
        content: cr.content,
        // Sanitised again on the way out, not only on the way in. This is the
        // route that hands a URL to every visitor's browser including
        // signed-out ones, and any record written before the write-side check
        // existed has never been through it. Validating only on write would
        // leave those already stored to keep being served.
        linkUrl: safeUrl(cr.linkUrl),
        imageUrl: safeUrl(cr.imageUrl),
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, ads: [], error: error?.message }, 500);
  }
});

// ─── Events ─────────────────────────────────────────────────────────────────

/**
 * Record impressions and clicks.
 *
 * Also unauthenticated, for the same reason serving is. Two things keep the
 * numbers from becoming nonsense:
 *
 *   • Only ids that correspond to a real creative are counted, so a made-up id
 *     writes nothing.
 *   • The batch is capped, and each creative counts at most once per request.
 *
 * The honest limitation: this trusts the client to report a render. A determined
 * party could inflate a number. That is true of every browser-side ad counter
 * that is not behind a paid verification service, and it is worth knowing before
 * anyone is billed on these figures — but it is a very long way better than the
 * literal 415,000 that was on the screen before.
 */
advertisingRouter.post("/advertising/events", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const events = Array.isArray(body.events) ? body.events.slice(0, 40) : [];
    if (!events.length) return c.json({ success: true, recorded: 0 });

    // One count per creative per request, per kind.
    const wanted = new Map<string, { impressions: number; clicks: number }>();
    for (const e of events) {
      const id = String(e?.creativeId || "").trim();
      const kind = String(e?.kind || "").toLowerCase();
      if (!id || !["impression", "click"].includes(kind)) continue;
      const row = wanted.get(id) || { impressions: 0, clicks: 0 };
      if (kind === "impression") row.impressions = 1; else row.clicks = 1;
      wanted.set(id, row);
    }
    if (!wanted.size) return c.json({ success: true, recorded: 0 });

    const date = today();
    let recorded = 0;
    for (const [creativeId, counts] of wanted) {
      const creative = (await kv.get(CREATIVE(creativeId))) as any;
      if (!creative) continue; // unknown id records nothing
      const key = STAT(creativeId, date);
      const prior = ((await kv.get(key)) as any) || { creativeId, date, impressions: 0, clicks: 0 };
      await kv.set(key, {
        ...prior,
        creativeId,
        campaignId: creative.campaignId || null,
        advertiserEmail: creative.advertiserEmail || null,
        date,
        impressions: Number(prior.impressions || 0) + counts.impressions,
        clicks: Number(prior.clicks || 0) + counts.clicks,
        updatedAt: new Date().toISOString(),
      });
      recorded += counts.impressions + counts.clicks;
    }
    return c.json({ success: true, recorded });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not record events." }, 500);
  }
});

// ─── Stats ──────────────────────────────────────────────────────────────────

/** What the advertiser portal reports: real counts, and nothing that is not. */
advertisingRouter.get("/advertising/stats", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to view performance." }, 401);
  try {
    const days = Math.min(Math.max(Number(c.req.query("days")) || 30, 1), 365);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const creatives = mine(((await kv.getByPrefix("ad_creative:")) as any[] || []).filter(Boolean), who);
    const ownIds = new Set(creatives.map((x: any) => String(x.id)));

    const stats = ((await kv.getByPrefix("ad_stat:")) as any[] || [])
      .filter(Boolean)
      .filter((s: any) => ownIds.has(String(s.creativeId)) && String(s.date || "") >= since);

    let impressions = 0, clicks = 0;
    const byDay = new Map<string, { date: string; impressions: number; clicks: number }>();
    const byCreative = new Map<string, { creativeId: string; title: string; impressions: number; clicks: number }>();

    for (const s of stats) {
      const i = Number(s.impressions || 0), k = Number(s.clicks || 0);
      impressions += i; clicks += k;
      const d = byDay.get(s.date) || { date: s.date, impressions: 0, clicks: 0 };
      d.impressions += i; d.clicks += k; byDay.set(s.date, d);
      const title = creatives.find((x: any) => String(x.id) === String(s.creativeId))?.title || s.creativeId;
      const cr = byCreative.get(s.creativeId) || { creativeId: s.creativeId, title, impressions: 0, clicks: 0 };
      cr.impressions += i; cr.clicks += k; byCreative.set(s.creativeId, cr);
    }

    return c.json({
      success: true,
      // Conversions and return on spend are deliberately absent. Both need to
      // know a click led to a purchase, and nothing attributes a sale back to an
      // ad. An invented figure on a screen an advertiser renews a contract on is
      // worse than no figure at all.
      summary: {
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        activeCreatives: creatives.filter((x: any) => x.isActive).length,
        totalCreatives: creatives.length,
        days,
      },
      byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      byCreative: [...byCreative.values()].sort((a, b) => b.impressions - a.impressions),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not load performance." }, 500);
  }
});

export default advertisingRouter;
