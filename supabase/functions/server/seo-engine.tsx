/**
 * AI SEO Engine (GrandRanker-style autopilot)
 *
 * A self-contained module that:
 *   • discovers winnable keywords for a business/niche (AI-scored by ROI),
 *   • writes SEO-optimized articles on demand (with an SEO/GEO score),
 *   • manages a publishing queue/calendar (draft → scheduled → published),
 *   • tracks AI visibility (does the brand appear in AI assistant answers).
 *
 * All AI calls happen server-side via the OPENAI_API_KEY secret, using the same
 * raw-fetch pattern as marketing-assets.tsx. Routes are self-prefixed and the
 * router is mounted with `app.route("/", seoEngineRouter)` in index.tsx.
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { loadBrandContext } from "./content-studio.tsx";

export const seoEngineRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";
const KW_PREFIX = "seo_engine:keyword:";
const ART_PREFIX = "seo_engine:article:";
const VIS_PREFIX = "seo_engine:visibility:";
const SETTINGS_KEY = "seo_engine:settings";

// ---------------------------------------------------------------------------
// OpenAI helper — returns parsed JSON, tolerating accidental markdown fences.
// ---------------------------------------------------------------------------
async function openaiJson(
  system: string,
  user: string,
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("AI generation not configured. Set the OPENAI_API_KEY secret.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.log(`[SEO Engine] OpenAI error ${response.status}: ${errText.slice(0, 300)}`);
    throw new Error(`OpenAI request failed (HTTP ${response.status}).`);
  }

  const data = await response.json();
  const raw = (data.choices?.[0]?.message?.content || "").trim();
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned an unparseable response.");
  }
}

function id(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// HTML → readable text/markdown. The blog stores `body` as plain text rendered
// with whitespace-pre-wrap (no HTML parser), so publishing raw HTML would leak
// tags. Convert the AI article's clean HTML into markdown-ish text that reads
// correctly in both the admin Blog Manager and a plain-text storefront.
// ---------------------------------------------------------------------------
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let s = html;
  // Links: <a href="x">text</a> → [text](x)
  s = s.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  // Headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  // Bold / italic
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  // List items
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  s = s.replace(/<\/(ul|ol)>/gi, "\n");
  // Paragraphs / breaks
  s = s.replace(/<\/p>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // Strip any remaining tags
  s = s.replace(/<[^>]+>/g, "");
  // Decode a few common entities
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
       .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Collapse excess blank lines
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function stripTags(html: string): string {
  return String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Upsert a published blog post from an SEO article, into the SAME store the
 * Blog Manager reads (`blog_post:` KV via the crm-content module). Idempotent:
 * reuses a stable id derived from the article so re-publishing updates in place.
 */
async function publishArticleToBlog(article: any): Promise<string> {
  const body = htmlToMarkdown(article.contentHtml || "");
  const words = body.split(/\s+/).filter(Boolean).length;
  const blogId = article.blogPostId || `post-seo-${article.id}`;
  const todayIso = new Date().toISOString().split("T")[0];

  // Preserve views/createdAt if the post already exists.
  let existing: any = null;
  try {
    const raw = await kv.get(`blog_post:${blogId}`);
    if (raw) existing = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch { /* new post */ }

  const post = {
    id: blogId,
    title: article.title || article.keyword,
    slug: article.slug || String(article.title || article.keyword).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    excerpt: article.metaDescription || stripTags(article.contentHtml).slice(0, 160),
    body,
    author: "AI SEO Engine",
    status: "published",
    tags: Array.isArray(article.keywords) ? article.keywords : [article.keyword],
    category: "SEO",
    coverImage: existing?.coverImage || "",
    publishedAt: existing?.publishedAt || todayIso,
    createdAt: existing?.createdAt || todayIso,
    readTime: Math.max(1, Math.round(words / 200)),
    seoTitle: article.metaTitle || article.title || article.keyword,
    seoDescription: article.metaDescription || "",
    views: existing?.views || 0,
    source: "seo-engine",
  };
  await kv.set(`blog_post:${blogId}`, post);
  return blogId;
}

// ---------------------------------------------------------------------------
// Settings (business profile that drives keyword + content generation)
// ---------------------------------------------------------------------------
seoEngineRouter.get(`${PREFIX}/seo-engine/settings`, async (c) => {
  try {
    const raw = await kv.get(SETTINGS_KEY);
    const settings = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {
      business: "",
      website: "",
      niche: "",
      audience: "",
      brandName: "",
      autopilot: false,
      articlesPerDay: 1,
    };
    return c.json({ success: true, settings });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.put(`${PREFIX}/seo-engine/settings`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const raw = await kv.get(SETTINGS_KEY);
    const current = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
    const settings = { ...current, ...body, updatedAt: new Date().toISOString() };
    await kv.set(SETTINGS_KEY, JSON.stringify(settings));
    return c.json({ success: true, settings });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Keyword discovery
// ---------------------------------------------------------------------------
seoEngineRouter.post(`${PREFIX}/seo-engine/keywords/discover`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const business = String(body.business || "").trim();
    const niche = String(body.niche || "").trim();
    const website = String(body.website || "").trim();
    const audience = String(body.audience || "").trim();
    const count = Math.min(50, Math.max(5, Number(body.count) || 20));
    if (!business && !niche) {
      return c.json({ success: false, error: "Provide a business description or niche to discover keywords." }, 400);
    }

    const system =
      "You are an expert SEO strategist. Find winnable, high-intent keywords a small business can realistically rank for. " +
      "Return ONLY JSON.";
    const user =
      `Business: ${business || niche}\nNiche: ${niche}\nWebsite: ${website}\nAudience: ${audience}\n\n` +
      `Return a JSON object: { "keywords": [ { "keyword": string, "intent": "informational"|"commercial"|"transactional"|"navigational", ` +
      `"volume": number (est. monthly searches), "difficulty": number (0-100), "roiScore": number (0-100, higher = more winnable + valuable), ` +
      `"rationale": string } ] }. Give exactly ${count} keywords, sorted by roiScore descending. Favor low-difficulty, high-intent buyer keywords.`;

    const result = await openaiJson(system, user, { maxTokens: 2500, temperature: 0.6 });
    const list = Array.isArray(result?.keywords) ? result.keywords : [];

    const now = new Date().toISOString();
    const saved: any[] = [];
    const writes: Promise<void>[] = [];
    for (const k of list) {
      const rec = {
        id: id("kw_"),
        keyword: String(k.keyword || "").trim(),
        intent: String(k.intent || "informational"),
        volume: Number(k.volume) || 0,
        difficulty: Number(k.difficulty) || 0,
        roiScore: Number(k.roiScore) || 0,
        rationale: String(k.rationale || ""),
        status: "new", // new | queued | written
        createdAt: now,
      };
      if (!rec.keyword) continue;
      saved.push(rec);
      writes.push(kv.set(`${KW_PREFIX}${rec.id}`, JSON.stringify(rec)));
    }
    await Promise.all(writes);
    saved.sort((a, b) => b.roiScore - a.roiScore);
    return c.json({ success: true, keywords: saved, count: saved.length });
  } catch (error) {
    console.log(`[SEO Engine] keyword discover error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.get(`${PREFIX}/seo-engine/keywords`, async (c) => {
  try {
    const rows = await kv.getByPrefix(KW_PREFIX);
    const keywords = (rows || [])
      .map((r: any) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a: any, b: any) => (b.roiScore || 0) - (a.roiScore || 0));
    return c.json({ success: true, keywords });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.delete(`${PREFIX}/seo-engine/keywords/:kid`, async (c) => {
  try {
    await kv.del(`${KW_PREFIX}${c.req.param("kid")}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Article generation
// ---------------------------------------------------------------------------
seoEngineRouter.post(`${PREFIX}/seo-engine/articles/generate`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const keyword = String(body.keyword || "").trim();
    if (!keyword) return c.json({ success: false, error: "A target keyword is required." }, 400);

    const settingsRaw = await kv.get(SETTINGS_KEY);
    const settings = settingsRaw ? (typeof settingsRaw === "string" ? JSON.parse(settingsRaw) : settingsRaw) : {};
    const brand = String(body.brand || settings.brandName || settings.business || "");
    const website = String(body.website || settings.website || "");
    const words = Math.min(3000, Math.max(600, Number(body.words) || 1500));

    // Apply Brand Kit (opt-in, defaults on) so articles match the brand voice.
    const useBrandKit = body.useBrandKit !== false;
    const brandVoice = useBrandKit ? await loadBrandContext() : "";

    const system =
      "You are an expert SEO content writer optimizing for both Google rankings and AI-assistant citations (GEO). " +
      "Write comprehensive, genuinely useful articles. Return ONLY JSON." +
      (brandVoice ? ` Follow this brand identity in voice and framing: ${brandVoice}` : "");
    const user =
      `Write an SEO article targeting the keyword: "${keyword}".\n` +
      `Brand to weave in naturally (optional promotion): ${brand || "none"}\nWebsite: ${website}\n` +
      `Target length: ~${words} words.\n\n` +
      `Return JSON: { "title": string, "slug": string, "metaTitle": string (<=60 chars), ` +
      `"metaDescription": string (<=155 chars), "keywords": string[], "headings": string[] (H2/H3 outline), ` +
      `"contentHtml": string (full article as clean HTML with <h2>/<p>/<ul>), ` +
      `"internalLinkSuggestions": string[], "seoScore": number (0-100), "geoScore": number (0-100), ` +
      `"scoreNotes": string }. Make contentHtml the complete article.`;

    const result = await openaiJson(system, user, { maxTokens: 4000, temperature: 0.75 });
    const now = new Date().toISOString();
    const article = {
      id: id("art_"),
      keyword,
      title: String(result.title || keyword),
      slug: String(result.slug || keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")),
      metaTitle: String(result.metaTitle || result.title || keyword),
      metaDescription: String(result.metaDescription || ""),
      keywords: Array.isArray(result.keywords) ? result.keywords.map(String) : [keyword],
      headings: Array.isArray(result.headings) ? result.headings.map(String) : [],
      contentHtml: String(result.contentHtml || ""),
      internalLinkSuggestions: Array.isArray(result.internalLinkSuggestions) ? result.internalLinkSuggestions.map(String) : [],
      seoScore: Number(result.seoScore) || 0,
      geoScore: Number(result.geoScore) || 0,
      scoreNotes: String(result.scoreNotes || ""),
      status: "draft", // draft | scheduled | published
      scheduledFor: body.scheduledFor || null,
      publishedAt: null,
      usedBrandKit: Boolean(brandVoice),
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(`${ART_PREFIX}${article.id}`, JSON.stringify(article));
    return c.json({ success: true, article });
  } catch (error) {
    console.log(`[SEO Engine] article generate error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.get(`${PREFIX}/seo-engine/articles`, async (c) => {
  try {
    const rows = await kv.getByPrefix(ART_PREFIX);
    const articles = (rows || [])
      .map((r: any) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return c.json({ success: true, articles });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.get(`${PREFIX}/seo-engine/articles/:aid`, async (c) => {
  try {
    const raw = await kv.get(`${ART_PREFIX}${c.req.param("aid")}`);
    if (!raw) return c.json({ success: false, error: "Article not found." }, 404);
    return c.json({ success: true, article: typeof raw === "string" ? JSON.parse(raw) : raw });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.put(`${PREFIX}/seo-engine/articles/:aid`, async (c) => {
  try {
    const aid = c.req.param("aid");
    const raw = await kv.get(`${ART_PREFIX}${aid}`);
    if (!raw) return c.json({ success: false, error: "Article not found." }, 404);
    const current = typeof raw === "string" ? JSON.parse(raw) : raw;
    const body = await c.req.json().catch(() => ({}));

    // Publishing transition stamps publishedAt.
    if (body.status === "published" && current.status !== "published") {
      body.publishedAt = new Date().toISOString();
    }
    let updated = { ...current, ...body, id: aid, updatedAt: new Date().toISOString() };

    // Wire-through: when an article becomes published, push it into the store's
    // blog (Blog Manager reads `blog_post:`), so publishing actually creates a
    // live post rather than only flipping a status flag.
    if (updated.status === "published") {
      try {
        const blogPostId = await publishArticleToBlog(updated);
        updated = { ...updated, blogPostId };
      } catch (e) {
        console.log(`[SEO Engine] blog publish failed for ${aid}: ${e}`);
        // Don't fail the whole request — surface it so the UI can note it.
        updated = { ...updated, blogPublishError: String((e as any)?.message || e) };
      }
    } else if (current.status === "published" && updated.status !== "published" && current.blogPostId) {
      // Unpublishing: flip the linked blog post back to draft so it leaves the
      // live storefront without deleting the content.
      try {
        const raw = await kv.get(`blog_post:${current.blogPostId}`);
        if (raw) {
          const bp = typeof raw === "string" ? JSON.parse(raw) : raw;
          bp.status = "draft";
          await kv.set(`blog_post:${current.blogPostId}`, bp);
        }
      } catch (e) {
        console.log(`[SEO Engine] blog unpublish failed for ${aid}: ${e}`);
      }
    }

    await kv.set(`${ART_PREFIX}${aid}`, JSON.stringify(updated));
    return c.json({ success: true, article: updated });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.delete(`${PREFIX}/seo-engine/articles/:aid`, async (c) => {
  try {
    const aid = c.req.param("aid");
    // Remove the linked blog post too, so a deleted article doesn't leave an
    // orphaned live post on the storefront.
    try {
      const raw = await kv.get(`${ART_PREFIX}${aid}`);
      const art = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
      if (art?.blogPostId) await kv.del(`blog_post:${art.blogPostId}`);
    } catch { /* best-effort */ }
    await kv.del(`${ART_PREFIX}${aid}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// AI visibility tracking — does the brand get cited by AI assistants?
// ---------------------------------------------------------------------------
seoEngineRouter.post(`${PREFIX}/seo-engine/visibility/check`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const settingsRaw = await kv.get(SETTINGS_KEY);
    const settings = settingsRaw ? (typeof settingsRaw === "string" ? JSON.parse(settingsRaw) : settingsRaw) : {};
    const brand = String(body.brand || settings.brandName || settings.business || "").trim();
    const query = String(body.query || "").trim();
    if (!brand || !query) {
      return c.json({ success: false, error: "Both a brand and a query are required." }, 400);
    }

    // We probe an OpenAI model directly (a real, checkable signal for the
    // ChatGPT/GPT family). Other assistants are estimated by the same model,
    // clearly labeled as estimates.
    const system =
      "You answer as a helpful AI assistant would, then honestly self-assess brand mentions. Return ONLY JSON.";
    const user =
      `A user asks: "${query}".\nFirst, answer as you normally would.\n` +
      `Then assess whether the brand "${brand}" is mentioned or cited in that answer, and estimate how likely each major ` +
      `AI assistant (ChatGPT, Gemini, Perplexity, Claude, Copilot) would mention "${brand}" for this query.\n` +
      `Return JSON: { "answer": string, "mentionedByYou": boolean, "assistants": { "chatgpt": number, "gemini": number, ` +
      `"perplexity": number, "claude": number, "copilot": number } (0-100 likelihood each), "recommendation": string }.`;

    const result = await openaiJson(system, user, { maxTokens: 1200, temperature: 0.4 });
    const now = new Date().toISOString();
    const record = {
      id: id("vis_"),
      brand,
      query,
      mentionedByYou: Boolean(result.mentionedByYou),
      assistants: {
        chatgpt: Number(result?.assistants?.chatgpt) || 0,
        gemini: Number(result?.assistants?.gemini) || 0,
        perplexity: Number(result?.assistants?.perplexity) || 0,
        claude: Number(result?.assistants?.claude) || 0,
        copilot: Number(result?.assistants?.copilot) || 0,
      },
      answer: String(result.answer || ""),
      recommendation: String(result.recommendation || ""),
      checkedAt: now,
    };
    await kv.set(`${VIS_PREFIX}${record.id}`, JSON.stringify(record));
    return c.json({ success: true, result: record });
  } catch (error) {
    console.log(`[SEO Engine] visibility check error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

seoEngineRouter.get(`${PREFIX}/seo-engine/visibility`, async (c) => {
  try {
    const rows = await kv.getByPrefix(VIS_PREFIX);
    const checks = (rows || [])
      .map((r: any) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a: any, b: any) => String(b.checkedAt).localeCompare(String(a.checkedAt)));
    return c.json({ success: true, checks });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Dashboard overview
// ---------------------------------------------------------------------------
seoEngineRouter.get(`${PREFIX}/seo-engine/overview`, async (c) => {
  try {
    const [kwRows, artRows, visRows] = await Promise.all([
      kv.getByPrefix(KW_PREFIX),
      kv.getByPrefix(ART_PREFIX),
      kv.getByPrefix(VIS_PREFIX),
    ]);
    const keywords = (kwRows || []).map((r: any) => (typeof r === "string" ? JSON.parse(r) : r));
    const articles = (artRows || []).map((r: any) => (typeof r === "string" ? JSON.parse(r) : r));
    const checks = (visRows || []).map((r: any) => (typeof r === "string" ? JSON.parse(r) : r));

    const published = articles.filter((a: any) => a.status === "published");
    const scheduled = articles.filter((a: any) => a.status === "scheduled");
    const drafts = articles.filter((a: any) => a.status === "draft");
    const avgSeo = articles.length
      ? Math.round(articles.reduce((s: number, a: any) => s + (Number(a.seoScore) || 0), 0) / articles.length)
      : 0;
    const latestVis = checks.sort((a: any, b: any) => String(b.checkedAt).localeCompare(String(a.checkedAt)))[0];

    return c.json({
      success: true,
      overview: {
        keywordCount: keywords.length,
        winnableKeywords: keywords.filter((k: any) => (k.difficulty || 100) <= 40).length,
        articleCount: articles.length,
        published: published.length,
        scheduled: scheduled.length,
        drafts: drafts.length,
        avgSeoScore: avgSeo,
        visibilityChecks: checks.length,
        latestVisibility: latestVis || null,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

export default seoEngineRouter;
