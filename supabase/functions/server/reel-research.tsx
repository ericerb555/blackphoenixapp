/**
 * reel-research — find short-form videos that are actually working for a product,
 * so a reel can be written against a proven pattern instead of an invented one.
 *
 * WHY THIS EXISTS
 *
 * The reel generator writes hooks against a fixed list of archetypes. That was a
 * real improvement on nothing, but the archetypes are static and generic, and it
 * showed: captions came back as "round elegance" and "frosted mystery" — the
 * model had adjectives *about* being concrete and no concrete pattern to copy.
 *
 * A title that pulled two million views on this exact product is that pattern,
 * with a real number attached.
 *
 * WHY YOUTUBE AND NOTHING ELSE
 *
 * It is the only source with an official, free API that a US business may use
 * commercially and that reports genuine view counts:
 *
 *   • TikTok Creative Center — the best material, and no API at all. Programmatic
 *     access means scraping or a paid third party.
 *   • Meta Ad Library API — outside the EU and UK it returns political and
 *     social-issue ads only. Nothing for a renovation company in New Hampshire.
 *   • YouTube Data API v3 — free, 10,000 units a day, real view counts.
 *
 * WHAT IS DELIBERATELY NOT DONE
 *
 * No video is downloaded and no footage is reused; that is infringement whatever
 * wrapper it wears. What is taken is the *structure* — the shape of a hook, the
 * length that works, the language that earned the views. Structure is not
 * protectable, and copying it is what a swipe file has always been.
 *
 * QUOTA, WHICH IS THE REAL CONSTRAINT
 *
 * A search costs 100 of the 10,000 daily units and a videos.list costs 1, so one
 * research call is ~101 units and the day holds about 98 of them. Results are
 * cached for a day per query, because burning a hundredth of the daily allowance
 * to ask the same question twice would be careless.
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

export const reelResearchRouter = new Hono();

const CACHE = (q: string) => `reel_research:${q}`;
const CACHE_HOURS = 24;

/**
 * Turn a supplier's catalogue name into something a person would search.
 *
 * "Graphite Car Seat Heating Pad" returns **nothing** on YouTube. Nobody titles
 * a video that way — it is dropship SEO, written to match a filter, not speech.
 * Drop the leading colour and it returns ten results.
 *
 * So the noise words come off: colours, materials, and the marketing adjectives
 * that pad every catalogue listing. What is left is the noun phrase somebody
 * would actually type.
 */
const NOISE = new Set([
  // colours
  "graphite", "black", "white", "grey", "gray", "navy", "burgundy", "beige", "khaki", "ivory",
  "silver", "golden", "gold", "rose", "pink", "blue", "green", "red", "brown", "purple",
  // materials and finishes that rarely help a search
  "velvet", "satin", "jacquard", "polyester", "synthetic", "faux", "pu", "pvc",
  // catalogue marketing
  "premium", "luxury", "professional", "portable", "multifunctional", "multifunction",
  "upgraded", "new", "hot", "selling", "best", "universal", "adjustable", "foldable",
  "creative", "fashionable", "fashion", "stylish", "elegant", "high-end", "quality",
  "durable", "practical", "convenient", "household", "home", "outdoor", "indoor",
  "mens", "womens", "men", "women", "unisex", "large", "small", "mini",
]);

/** Search terms to try, best first. */
export function searchTermsFor(productName: string, category?: string): string[] {
  const words = String(productName || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const cleaned = words.filter((w) => !NOISE.has(w) && w.length > 1);
  const tries: string[] = [];

  if (cleaned.length >= 2) tries.push(cleaned.join(" "));
  // The tail of a product name is usually the thing itself — "…Car Seat Heating
  // Pad" — while the head is adjectives. If the full cleaned phrase finds
  // nothing, the last few words usually do.
  if (cleaned.length > 3) tries.push(cleaned.slice(-3).join(" "));
  if (cleaned.length > 2) tries.push(cleaned.slice(-2).join(" "));
  if (category) tries.push(String(category).toLowerCase());

  // De-duplicate while keeping order, and never try something too short to mean
  // anything.
  return [...new Set(tries)].filter((t) => t.length >= 4).slice(0, 3);
}

/** ISO 8601 duration (PT1M30S) to seconds. */
function durationSeconds(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ""));
  if (!m) return 0;
  return (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) + (Number(m[3] || 0) * 60) + Number(m[4] || 0);
}

/**
 * Find what is working for a search term.
 *
 * Ranked by views per day, not raw views. A three-year-old video with 900,000
 * views is a worse guide than a three-week-old one with 200,000 — the second is
 * what is working *now*, and the first may be working for reasons that have
 * nothing to do with the product.
 */
reelResearchRouter.get("/reel-research", async (c) => {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) {
    return c.json({
      success: false,
      configured: false,
      // Said precisely, because the whole feature is one secret away.
      error: "Set YOUTUBE_API_KEY to research what is working. It is free — a Google Cloud project with the YouTube Data API v3 enabled gives 10,000 units a day, about 98 searches.",
      examples: [],
    }, 200);
  }

  const q = String(c.req.query("q") || "").trim();
  if (q.length < 3) return c.json({ success: false, error: "Search for at least three characters.", examples: [] }, 400);

  const shortOnly = c.req.query("shortOnly") !== "false";

  try {
    const cacheKey = CACHE(`${q.toLowerCase()}:${shortOnly}`);
    const cached = (await kv.get(cacheKey)) as any;
    if (cached && Date.now() - new Date(cached.cachedAt).getTime() < CACHE_HOURS * 3600_000) {
      return c.json({ ...cached, cached: true });
    }

    // 100 quota units. The expensive call, hence the cache.
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("key", key);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "25");
    searchUrl.searchParams.set("order", "viewCount");
    // Last 18 months. Older than that and the format itself has usually moved on.
    searchUrl.searchParams.set("publishedAfter", new Date(Date.now() - 550 * 86400_000).toISOString());
    if (shortOnly) searchUrl.searchParams.set("videoDuration", "short"); // under 4 minutes
    searchUrl.searchParams.set("q", q);

    const sRes = await fetch(searchUrl.toString());
    const sJson = await sRes.json().catch(() => ({}));
    if (!sRes.ok) {
      const reason = sJson?.error?.errors?.[0]?.reason || "";
      return c.json({
        success: false,
        error: reason === "quotaExceeded"
          ? "The day's YouTube quota is used up. It resets at midnight Pacific."
          : (sJson?.error?.message || "YouTube search failed."),
        examples: [],
      }, 502);
    }

    const ids = (sJson.items || []).map((i: any) => i?.id?.videoId).filter(Boolean);
    if (!ids.length) return c.json({ success: true, query: q, examples: [], reason: "Nothing found for that search." });

    // 1 quota unit for the whole batch — this is where the real numbers live.
    const vidUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    vidUrl.searchParams.set("key", key);
    vidUrl.searchParams.set("part", "snippet,statistics,contentDetails");
    vidUrl.searchParams.set("id", ids.slice(0, 50).join(","));

    const vRes = await fetch(vidUrl.toString());
    const vJson = await vRes.json().catch(() => ({}));
    if (!vRes.ok) return c.json({ success: false, error: vJson?.error?.message || "Could not read video statistics.", examples: [] }, 502);

    const now = Date.now();
    const scored = (vJson.items || []).map((v: any) => {
      const views = Number(v?.statistics?.viewCount || 0);
      const published = new Date(v?.snippet?.publishedAt || 0).getTime();
      const ageDays = Math.max(1, (now - published) / 86400_000);
      const seconds = durationSeconds(v?.contentDetails?.duration);
      return {
        id: v.id,
        title: String(v?.snippet?.title || ""),
        channel: String(v?.snippet?.channelTitle || ""),
        views,
        likes: Number(v?.statistics?.likeCount || 0),
        // The ranking signal: what is working now, not what worked once.
        viewsPerDay: Math.round(views / ageDays),
        seconds,
        publishedAt: v?.snippet?.publishedAt || null,
        url: `https://www.youtube.com/watch?v=${v.id}`,
      };
    })
      // A 3-minute review is not the format being written here.
      .filter((v: any) => !shortOnly || (v.seconds > 0 && v.seconds <= 90));

    // ── Relevance, which YouTube's own ranking will not give you ─────────────
    //
    // Searching "car seat heater" returned "Volvo just reinvented the seatbelt"
    // at 8.8 million views as the top result. It matches on "seat" and it is a
    // car, and it is useless as a pattern for a $15 heating pad — but it is the
    // highest views-per-day in the set, so it would have dominated the prompt.
    //
    // A title has to carry at least one of the distinctive words from the query,
    // ignoring the ones that match half of YouTube.
    const STOP = new Set(["the", "and", "for", "with", "your", "car", "auto", "best", "new", "pro", "kit", "set"]);
    const terms = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
    const relevant = terms.length
      ? scored.filter((v: any) => {
          const title = v.title.toLowerCase();
          return terms.some((t) => title.includes(t));
        })
      : scored;

    // ── And drop the runaway outlier ────────────────────────────────────────
    //
    // One video an order of magnitude beyond the rest is usually viral for a
    // reason that has nothing to do with the product, and it drags the whole
    // sample. Judged against the median rather than the mean, which the outlier
    // would itself distort.
    const pool = relevant.length >= 3 ? relevant : scored;
    const perDay = [...pool].map((v: any) => v.viewsPerDay).sort((a, b) => a - b);
    const median = perDay[Math.floor(perDay.length / 2)] || 0;
    const examples = pool
      .filter((v: any) => median === 0 || v.viewsPerDay <= median * 12)
      .sort((a: any, b: any) => b.viewsPerDay - a.viewsPerDay)
      .slice(0, 10);

    const payload = {
      success: true,
      query: q,
      examples,
      // Stated so a caller can judge how much weight the sample deserves.
      totalViewsInSample: examples.reduce((s: number, v: any) => s + v.views, 0),
      medianSeconds: examples.length
        ? [...examples].sort((a, b) => a.seconds - b.seconds)[Math.floor(examples.length / 2)].seconds
        : null,
      cachedAt: new Date().toISOString(),
      quotaNote: "About 101 of 10,000 daily units. Cached for 24 hours per query.",
    };
    await kv.set(cacheKey, payload);
    return c.json({ ...payload, cached: false });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Research failed.", examples: [] }, 500);
  }
});

/**
 * The research, folded into a prompt fragment.
 *
 * Kept here rather than in the reel route so there is one place that decides how
 * a real example is described to the model — and one place to change when it
 * turns out the description is what needed changing.
 */
export function researchPromptFragment(examples: any[]): string {
  if (!examples?.length) return "";
  const top = examples.slice(0, 6);
  return [
    "",
    "WHAT IS ACTUALLY WORKING FOR THIS PRODUCT RIGHT NOW.",
    "",
    "These are real short videos about this product or a close relative, with",
    "their real view counts, ranked by views per day so recent winners are not",
    "buried under old evergreens:",
    "",
    ...top.map((v) =>
      `  ${v.views.toLocaleString()} views (${v.viewsPerDay.toLocaleString()}/day, ${v.seconds}s) — "${v.title}"`,
    ),
    "",
    "Study the TITLES. They are the hooks that earned those numbers: what they",
    "lead with, what they withhold, how specific they are, whether they promise a",
    "result or name a problem. Write hooks that work the way these work.",
    "",
    "Do NOT copy any of these titles, and do not claim anything they claim about",
    `a different product. Match the pattern, not the words. The median length here`,
    `is a useful signal about how long this format runs.`,
    "",
  ].join("\n");
}

export default reelResearchRouter;
