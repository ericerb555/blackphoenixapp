/**
 * Content Studio — the connective tissue that makes the Content Center one of a
 * kind. Three real, OpenAI-backed capabilities:
 *
 *   • Brand Kit — a single source of truth (voice, audience, colors, rules) that
 *     every other AI generator can read so all output sounds like ONE brand.
 *   • Omnichannel Repurposer — turn one source (blog post, product, idea) into a
 *     full multi-channel content pack in the brand voice.
 *   • Content Planner — generate a dated 30-day content calendar from a goal.
 *
 * Mounted with `app.route("/make-server-3eae23a6", contentStudioRouter)`, so
 * route paths are relative.
 */
import { Hono } from "npm:hono";
import Anthropic from "npm:@anthropic-ai/sdk";
import * as kv from "./kv_store.tsx";

export const contentStudioRouter = new Hono();

const BRAND_KEY = "content_studio:brand_kit";
const PACK_PREFIX = "content_studio:pack:";
const PLAN_KEY = "content_studio:plan";

function id(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ask Claude for JSON. Reels are the one place currently pointed at it: a reel
 * lives or dies on the hook, and the prompt is a long list of rules — distinct
 * archetypes, on-screen text for muted viewers, no invented statistics — which
 * is the kind of brief where following every rule matters more than raw prose.
 *
 * Sampling parameters are rejected outright, so where the OpenAI path uses
 * temperature 0.8 to loosen up, variety here has to come from the named
 * archetypes in the prompt.
 */
async function anthropicJson(system: string, user: string, maxTokens = 2500): Promise<any> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");

  const client = new Anthropic({ apiKey: key });
  const message = await client.messages.create({
    model: Deno.env.get("CONTENT_STUDIO_ANTHROPIC_MODEL") || "claude-opus-5",
    // Thinking counts against this limit, so a budget sized for the JSON alone
    // would truncate the script mid-object. Give the reasoning its own room.
    max_tokens: Math.max(8000, maxTokens * 3),
    output_config: { effort: (Deno.env.get("CONTENT_STUDIO_EFFORT") || "medium") as any },
    system,
    messages: [{ role: "user", content: user }],
  });

  const raw = message.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("")
    .trim();

  // Held to JSON by the prompt rather than a response format, so it will
  // occasionally arrive fenced or wrapped in a sentence. That is a formatting
  // quirk, not a failed generation — recover the object.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : raw;
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  const candidate = first !== -1 && last > first ? body.slice(first, last + 1) : body;

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error("Claude returned an unparseable response.");
  }
}

/**
 * Generate JSON, preferring one provider but never failing the request because
 * of that preference — an unfunded account or a transient outage falls back to
 * the other rather than leaving the operator with nothing.
 *
 * The fallback is reported, not hidden. Silently degrading to a second-choice
 * engine is how this codebase ended up serving stock photos while appearing to
 * generate images; the caller gets `provider` and `fallbackReason` so the
 * substitution is visible in the response.
 */
async function aiJson(
  system: string,
  user: string,
  maxTokens: number,
  prefer: "anthropic" | "openai" = "openai",
): Promise<{ data: any; provider: string; fallbackReason: string | null }> {
  const override = (Deno.env.get("CONTENT_STUDIO_PROVIDER") || "").toLowerCase();
  const first = override === "anthropic" || override === "openai"
    ? (override as "anthropic" | "openai")
    : prefer;

  try {
    const data = first === "anthropic"
      ? await anthropicJson(system, user, maxTokens)
      : await openaiJson(system, user, maxTokens);
    return { data, provider: first, fallbackReason: null };
  } catch (err: any) {
    const second = first === "anthropic" ? "openai" : "anthropic";
    const reason = err?.error?.error?.message || err?.message || String(err);
    console.log(`[Content Studio] ${first} failed (${reason}); falling back to ${second}.`);
    const data = second === "anthropic"
      ? await anthropicJson(system, user, maxTokens)
      : await openaiJson(system, user, maxTokens);
    return { data, provider: second, fallbackReason: `${first}: ${reason}` };
  }
}

async function openaiJson(system: string, user: string, maxTokens = 2500): Promise<any> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("AI generation not configured. Set the OPENAI_API_KEY secret.");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.log(`[Content Studio] OpenAI ${res.status}: ${t.slice(0, 300)}`);
    throw new Error(`OpenAI request failed (HTTP ${res.status}).`);
  }
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || "").trim();
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned an unparseable response.");
  }
}

async function loadBrand(): Promise<any> {
  const raw = await kv.get(BRAND_KEY);
  return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
}

/**
 * Shared brand-voice loader for OTHER generators (SEO Engine, Creative Studio).
 * Returns a compact instruction string, or "" if no brand kit exists, so
 * callers can conditionally fold the brand voice into their prompts.
 */
export async function loadBrandContext(): Promise<string> {
  try {
    const b = await loadBrand();
    if (!b || !Object.keys(b).length) return "";
    return brandContext(b);
  } catch {
    return "";
  }
}

/**
 * Visual brand directive for image generators (Creative Studio) — references the
 * brand palette + mood. Returns "" when no usable brand info exists.
 */
export async function loadBrandVisual(): Promise<string> {
  try {
    const b = await loadBrand();
    if (!b || !Object.keys(b).length) return "";
    const parts: string[] = [];
    if (b.primaryColor) parts.push(`primary brand color ${b.primaryColor}`);
    if (b.accentColor) parts.push(`accent color ${b.accentColor}`);
    if (!parts.length && !b.voice) return "";
    const palette = parts.length ? `Use a palette built around ${parts.join(" and ")}.` : "";
    const mood = b.voice ? ` Match this brand mood: ${b.voice}.` : "";
    return `${palette}${mood}`.trim();
  } catch {
    return "";
  }
}

/**
 * Lightweight "is a brand kit configured?" check for frontends that want to warn
 * when the kit is empty. Returns { configured, brandName }.
 */
export async function brandKitStatus(): Promise<{ configured: boolean; brandName: string }> {
  try {
    const b = await loadBrand();
    const meaningful = b && Object.keys(b).some((k) => k !== "updatedAt" && b[k] && (!Array.isArray(b[k]) || b[k].length));
    return { configured: Boolean(meaningful), brandName: String(b?.brandName || "") };
  } catch {
    return { configured: false, brandName: "" };
  }
}

function brandContext(b: any): string {
  if (!b || !Object.keys(b).length) return "No brand kit set; use a clean, professional, confident tone.";
  return [
    b.brandName ? `Brand: ${b.brandName}.` : "",
    b.mission ? `Mission: ${b.mission}.` : "",
    b.voice ? `Voice/tone: ${b.voice}.` : "",
    b.audience ? `Audience: ${b.audience}.` : "",
    b.keywords ? `Themes/keywords: ${b.keywords}.` : "",
    Array.isArray(b.dos) && b.dos.length ? `Always: ${b.dos.join("; ")}.` : "",
    Array.isArray(b.donts) && b.donts.length ? `Never: ${b.donts.join("; ")}.` : "",
  ].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Brand Kit
// ---------------------------------------------------------------------------
contentStudioRouter.get("/content-studio/brand-kit", async (c) => {
  try {
    const brand = await loadBrand();
    return c.json({ success: true, brandKit: brand });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

contentStudioRouter.put("/content-studio/brand-kit", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const current = await loadBrand();
    const brandKit = { ...current, ...body, updatedAt: new Date().toISOString() };
    await kv.set(BRAND_KEY, JSON.stringify(brandKit));
    return c.json({ success: true, brandKit });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Omnichannel Repurposer
// Body: { source, channels?: string[] }
// ---------------------------------------------------------------------------
const ALL_CHANNELS = ["x_thread", "linkedin", "instagram", "email", "youtube", "tiktok", "facebook"];
const CHANNEL_SPEC: Record<string, string> = {
  x_thread: "an X/Twitter thread of 4-6 tweets (array of strings, each <=280 chars, first is a strong hook)",
  linkedin: "a LinkedIn post (professional, 1-3 short paragraphs, ends with a question or CTA)",
  instagram: "an Instagram caption (punchy hook, line breaks, 5-8 relevant hashtags at the end)",
  email: "a marketing email (subject line + body); return { subject, body }",
  youtube: "a YouTube video description (2-3 paragraphs + 5 timestamps-style bullet chapters)",
  tiktok: "a short TikTok/Reels script (hook, 3-5 beats, on-screen text cues)",
  facebook: "a Facebook post (friendly, community tone, 1-2 short paragraphs + CTA)",
};

contentStudioRouter.post("/content-studio/repurpose", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const source = String(body.source || "").trim();
    if (!source) return c.json({ success: false, error: "Provide source content to repurpose." }, 400);
    const channels: string[] = Array.isArray(body.channels) && body.channels.length
      ? body.channels.filter((ch: string) => ALL_CHANNELS.includes(ch))
      : ALL_CHANNELS;

    const brand = await loadBrand();
    const specs = channels.map((ch) => `- "${ch}": ${CHANNEL_SPEC[ch]}`).join("\n");
    const system =
      "You are an expert multi-channel content strategist. Repurpose one source into platform-native content. " +
      `Brand context: ${brandContext(brand)} Return ONLY JSON.`;
    const user =
      `Source content to repurpose:\n"""${source.slice(0, 6000)}"""\n\n` +
      `Produce a JSON object with a key for each requested channel:\n${specs}\n\n` +
      `For "x_thread" the value is an array of strings. For "email" the value is { "subject": string, "body": string }. ` +
      `All others are a single string. Keep it in the brand voice.`;

    const result = await openaiJson(system, user, 3000);
    const pack = {
      id: id("pack_"),
      source: source.slice(0, 500),
      channels,
      content: result,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`${PACK_PREFIX}${pack.id}`, pack);
    return c.json({ success: true, pack });
  } catch (error) {
    console.log(`[Content Studio] repurpose error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

contentStudioRouter.get("/content-studio/packs", async (c) => {
  try {
    const rows = await kv.getByPrefix(PACK_PREFIX);
    const packs = (rows || [])
      .map((r: any) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return c.json({ success: true, packs });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

contentStudioRouter.delete("/content-studio/packs/:pid", async (c) => {
  try {
    await kv.del(`${PACK_PREFIX}${c.req.param("pid")}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Content Planner — dated 30-day calendar from a goal.
// Body: { goal, days?, channels? }
// ---------------------------------------------------------------------------
contentStudioRouter.post("/content-studio/plan", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const goal = String(body.goal || "").trim();
    if (!goal) return c.json({ success: false, error: "Describe your goal to build a plan." }, 400);
    const days = Math.min(60, Math.max(7, Number(body.days) || 30));

    const brand = await loadBrand();
    const system =
      "You are a content marketing planner. Build a practical, varied posting calendar. " +
      `Brand context: ${brandContext(brand)} Return ONLY JSON.`;
    const user =
      `Goal: ${goal}\nDuration: ${days} days.\n\n` +
      `Return JSON: { "items": [ { "day": number (1-${days}), "channel": string, "format": string, ` +
      `"title": string, "hook": string, "notes": string } ] }. Vary channels and formats. ` +
      `Aim for roughly one item per day, front-loading high-impact ideas.`;

    const result = await openaiJson(system, user, 3500);
    const items = Array.isArray(result?.items) ? result.items : [];
    const startDate = new Date();
    const dated = items.map((it: any) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + (Math.max(1, Number(it.day) || 1) - 1));
      return {
        day: Number(it.day) || 1,
        date: d.toISOString().split("T")[0],
        channel: String(it.channel || "blog"),
        format: String(it.format || "post"),
        title: String(it.title || ""),
        hook: String(it.hook || ""),
        notes: String(it.notes || ""),
      };
    });
    const plan = { goal, days, items: dated, createdAt: new Date().toISOString() };
    await kv.set(PLAN_KEY, JSON.stringify(plan));
    return c.json({ success: true, plan });
  } catch (error) {
    console.log(`[Content Studio] plan error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

contentStudioRouter.get("/content-studio/plan", async (c) => {
  try {
    const raw = await kv.get(PLAN_KEY);
    return c.json({ success: true, plan: raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Compose — generate a single platform-native social post in the brand voice,
// with a real, model-scored brand-compliance check. Powers the AI Content
// Studio 'create' tab (no client-side mock generation).
// Body: { topic|brief, platform?, tone?, includeHashtags?, contentType?, context? }
// ---------------------------------------------------------------------------
const PLATFORM_SPEC: Record<string, string> = {
  instagram: "Instagram: engaging first line hook, line breaks, up to ~15 relevant hashtags, emoji-friendly.",
  facebook: "Facebook: conversational, community tone, a clear CTA, few hashtags.",
  linkedin: "LinkedIn: professional, value-first, insight-led, minimal hashtags (3-5), no fluff.",
  twitter: "Twitter/X: punchy, under 280 characters, 1-3 hashtags, strong hook.",
  youtube: "YouTube: a compelling video title + description with keywords and chapters-style structure.",
  tiktok: "TikTok: trend-aware, energetic, short hook-driven caption, 3-6 hashtags.",

  // Long-form and direct formats. Without these, anything that is not a social
  // post fell through to the Instagram spec — so a blog article or a customer
  // email came back as an emoji-heavy caption with fifteen hashtags. The
  // Content Center's generator asks for blog, email and ad copy, so those
  // formats need to be described rather than approximated.
  blog: "Blog article: a clear headline followed by structured long-form prose with " +
    "subheadings, short paragraphs, and a natural keyword-rich style for SEO. " +
    "No hashtags, no emoji clutter. Open with the reader's problem and close with a call to action.",
  email: "Email: begin with a subject line on its own first line, then a greeting, " +
    "scannable short paragraphs and bullets, one clear call to action, and a sign-off. " +
    "No hashtags. Plain, direct, professional — it is going to an inbox, not a feed.",
  ad: "Paid advertisement: a short attention-grabbing headline, one or two lines of " +
    "benefit-led body copy, and an explicit call to action. Tight and punchy — " +
    "every word earns its place. No long paragraphs.",
};

contentStudioRouter.post("/content-studio/compose", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const topic = String(body.topic || body.brief || "").trim();
    if (!topic) return c.json({ success: false, error: "A topic or brief is required." }, 400);

    const platform = String(body.platform || "instagram").toLowerCase();
    const spec = PLATFORM_SPEC[platform] || PLATFORM_SPEC.instagram;
    const tone = String(body.tone || "professional and friendly");
    const includeHashtags = body.includeHashtags !== false;
    const contentType = String(body.contentType || "post");
    const context = String(body.context || "").trim();

    const brandVoice = await loadBrandContext();

    const system = [
      "You are an expert social media copywriter and brand-compliance reviewer.",
      "Write a platform-native piece of content, then honestly grade it for brand compliance.",
      brandVoice ? `Brand voice & guidelines to follow strictly:\n${brandVoice}` : "",
      `Target platform — ${spec}`,
      `Content type: ${contentType}. Desired tone: ${tone}.`,
      "Return STRICT JSON with keys: title (string), caption (string), " +
        "hashtags (string[] — omit the leading # or include it, be consistent), " +
        "complianceScore (integer 0-100 reflecting how well it matches the brand voice/guidelines), " +
        "complianceIssues (string[] — concrete, actionable issues; empty if none).",
    ].filter(Boolean).join("\n\n");

    const user = [
      `Topic / brief: ${topic}`,
      context ? `Draft/base content to refine (keep the substance, elevate the writing):\n${context}` : "",
      includeHashtags ? "Include relevant hashtags." : "Do NOT include any hashtags.",
    ].filter(Boolean).join("\n\n");

    const result = await openaiJson(system, user, 1200);

    const hashtags = Array.isArray(result.hashtags)
      ? result.hashtags.map((h: any) => String(h)).filter(Boolean)
      : [];
    let score = Number(result.complianceScore);
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, Math.round(score)));

    return c.json({
      success: true,
      title: String(result.title || topic),
      caption: String(result.caption || ""),
      hashtags: includeHashtags ? hashtags : [],
      complianceScore: score,
      complianceIssues: Array.isArray(result.complianceIssues)
        ? result.complianceIssues.map((i: any) => String(i)).filter(Boolean)
        : [],
      usedBrandKit: Boolean(brandVoice),
    });
  } catch (error) {
    console.log("[Content Studio] compose error:", error);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Recreate-script — real AI-generated recreation copy for the Creator Studio
// (Video Recreation Engine). Takes a product + chosen style/platform + optional
// reference/brief and returns platform-native copy in the brand voice.
// Body: { productName, category, description, price, originalPrice?, videoStyle,
//         platform, brief?, reference? }
// ---------------------------------------------------------------------------
contentStudioRouter.post("/content-studio/recreate-script", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const productName = String(body.productName || "").trim();
    if (!productName) return c.json({ success: false, error: "productName is required." }, 400);

    const category = String(body.category || "product");
    const description = String(body.description || "");
    const price = body.price;
    const originalPrice = body.originalPrice;
    const videoStyle = String(body.videoStyle || "problem-solution");
    const platform = String(body.platform || "instagram").toLowerCase();
    const brief = String(body.brief || "").trim();
    const reference = String(body.reference || "").trim();

    const brandVoice = await loadBrandContext();

    const system = [
      "You are an expert short-form video scriptwriter and DTC ad copywriter.",
      "Recreate a marketing script for the user's OWN product, inspired by the",
      "STRUCTURE and STRATEGY of a reference (never copying its wording).",
      brandVoice ? `Brand voice & guidelines to follow strictly:\n${brandVoice}` : "",
      `Chosen narrative style: ${videoStyle}. Primary platform: ${platform}.`,
      "Return STRICT JSON with keys: hook (string), problemStatement (string), " +
        "productIntro (string), keyBenefits (string[] of 3-4), socialProof (string), " +
        "callToAction (string), hashtags (string[]), title (string), description (string), " +
        "captions (object with instagram, tiktok, facebook, youtube string values).",
    ].filter(Boolean).join("\n\n");

    const user = [
      `Product: ${productName}`,
      `Category: ${category}`,
      description ? `Description: ${description}` : "",
      price != null ? `Price: $${price}${originalPrice != null ? ` (was $${originalPrice})` : ""}` : "",
      brief ? `Creator brief / angle: ${brief}` : "",
      reference ? `Reference being recreated (structure inspiration only): ${reference}` : "",
    ].filter(Boolean).join("\n");

    const result = await openaiJson(system, user, 1600);
    const captions = result.captions && typeof result.captions === "object" ? result.captions : {};

    return c.json({
      success: true,
      script: {
        hook: String(result.hook || ""),
        problemStatement: String(result.problemStatement || ""),
        productIntro: String(result.productIntro || ""),
        keyBenefits: Array.isArray(result.keyBenefits) ? result.keyBenefits.map((b: any) => String(b)) : [],
        socialProof: String(result.socialProof || ""),
        callToAction: String(result.callToAction || ""),
        hashtags: Array.isArray(result.hashtags) ? result.hashtags.map((h: any) => String(h)) : [],
        title: String(result.title || productName),
        description: String(result.description || description),
        captions: {
          instagram: String(captions.instagram || ""),
          tiktok: String(captions.tiktok || ""),
          facebook: String(captions.facebook || ""),
          youtube: String(captions.youtube || ""),
        },
      },
      usedBrandKit: Boolean(brandVoice),
    });
  } catch (error) {
    console.log("[Content Studio] recreate-script error:", error);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// CONTENT PACKAGE — one call, one publishable asset set.
//
// /compose answers "write me a caption". Real content work needs more than one
// option and more than one artefact: a marketer wants distinct angles to choose
// between, the same idea sized for each channel it will run on, the SEO fields
// a CMS demands, and art direction that matches. Assembling that meant four
// round trips through four different screens, so in practice people shipped the
// first draft of one thing.
//
// Deliberate choices here:
//
//   • All variants are produced in ONE model call rather than N parallel calls.
//     The model can then make them genuinely different from each other — a
//     proof angle, a pain angle, a story angle — instead of returning three
//     rewordings of the same sentence, which is what independent calls at
//     temperature 0.8 actually give you.
//   • Every variant carries a `rationale` and an honest `score`, and the model
//     nominates a `bestVariantIndex` with reasoning. A recommendation you can
//     argue with beats a silent pick.
//   • Image generation is opt-in and non-fatal. DALL-E is slow and metered, so
//     a failed or skipped image never costs you the copy — the prompt is always
//     returned so the visual can be made later.
// ---------------------------------------------------------------------------

const PACKAGE_MAX_VARIANTS = 5;

contentStudioRouter.post("/content-studio/package", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const topic = String(body.topic || body.brief || "").trim();
    if (!topic) return c.json({ success: false, error: "A topic or brief is required." }, 400);

    const platforms: string[] = Array.isArray(body.platforms) && body.platforms.length
      ? body.platforms.map((p: any) => String(p).toLowerCase()).filter((p: string) => PLATFORM_SPEC[p])
      : ["instagram"];
    if (!platforms.length) {
      return c.json({
        success: false,
        error: `No supported platform requested. Supported: ${Object.keys(PLATFORM_SPEC).join(", ")}.`,
      }, 400);
    }

    const variantCount = Math.max(1, Math.min(PACKAGE_MAX_VARIANTS, Number(body.variants) || 3));
    const tone = String(body.tone || "professional and friendly");
    const audience = String(body.audience || "").trim();
    const context = String(body.context || "").trim();
    const wantImage = body.withImage === true;

    const brandVoice = await loadBrandContext();

    const system = [
      "You are a senior content strategist and copywriter producing a publishable content package.",
      brandVoice ? `Brand voice & guidelines to follow strictly:\n${brandVoice}` : "",
      audience ? `Primary audience: ${audience}.` : "",
      `Desired tone: ${tone}.`,
      "",
      "Produce DISTINCT angles, not paraphrases. Each variant must take a genuinely different " +
        "approach — for example one led by proof or numbers, one by the reader's pain, one by a " +
        "short story or example. If two variants could be swapped without a reader noticing, you " +
        "have failed the brief.",
      "",
      // Hashtags were being written into the body AND returned in the array, so
      // any caller rendering both — the obvious thing to do — published them
      // twice. The body must be publishable exactly as written.
      "NEVER put hashtags inside `body`. Hashtags belong only in the `hashtags` array. " +
        "`body` must be publishable verbatim, with no trailing tag block.",
      "",
      // A tone of "plain-spoken, no marketing fluff" was returning "where dreams
      // meet reality" and "#MahoganyMagic". Tone has to be enforced, not hinted.
      `The requested tone is: ${tone}. Obey it literally. If the tone rules out marketing ` +
        "language, then do not use it anywhere — not in the body, not in the title, not in the " +
        "hashtags. Words like 'magic', 'dreams', 'bliss', 'transform your space' and " +
        "'where X meets Y' are marketing filler; use them only if the requested tone clearly " +
        "invites them.",
      "",
      "Do not promise media that may not exist — no 'swipe through', 'watch the video' or " +
        "'link in bio' unless the brief says those exist.",
      "",
      "Score honestly against the brief AND the tone. A variant that ignores the requested tone " +
        "cannot score above 70, and the tone miss must be listed in issues. A score above 90 " +
        "should be rare and earned. List concrete, actionable issues rather than praise.",
      "",
      "Platform requirements to honour exactly:",
      ...platforms.map((p) => `- ${p}: ${PLATFORM_SPEC[p]}`),
      "",
      "Return STRICT JSON with keys:",
      "  variants: array of exactly " + variantCount + " objects, each with " +
        "{ angle (short label), rationale (why this angle suits the brief), " +
        "score (integer 0-100), issues (string[]), " +
        "channels: { <platform>: { title, body, hashtags (string[]) } } } " +
        "— channels MUST contain an entry for every requested platform.",
      "  bestVariantIndex: integer index into variants.",
      "  bestVariantReason: string, one sentence.",
      "  seo: { title (<=60 chars), metaDescription (<=155 chars), slug (kebab-case), keywords (string[]) }.",
      "  imagePrompt: a single vivid art-direction prompt for the hero visual. " +
        "Describe subject, composition, lighting and mood. No text or logos in the image.",
    ].filter(Boolean).join("\n");

    const user = [
      `Topic / brief: ${topic}`,
      context ? `Additional context:\n${context}` : "",
      `Platforms: ${platforms.join(", ")}`,
    ].filter(Boolean).join("\n\n");

    // Scale the budget with the work asked for, or long packages get truncated
    // mid-JSON and fail to parse.
    const budget = Math.min(8000, 1200 + variantCount * platforms.length * 420);
    const result = await openaiJson(system, user, budget);

    const rawVariants = Array.isArray(result.variants) ? result.variants : [];
    if (!rawVariants.length) {
      return c.json({ success: false, error: "The model returned no variants." }, 502);
    }

    const variants = rawVariants.slice(0, variantCount).map((v: any, i: number) => {
      const channels: Record<string, any> = {};
      for (const p of platforms) {
        const ch = v?.channels?.[p] || {};

        // Belt and braces on the "no hashtags in body" rule. The prompt asks for
        // it, but a caller rendering body + hashtags must never double-post
        // them, so strip any trailing tag block the model still emits rather
        // than trusting instruction-following.
        let body = String(ch.body || "").replace(/\s*(?:^|\n)\s*(?:#[\wÀ-ɏ]+\s*){2,}$/u, "").trimEnd();

        const tags = Array.isArray(ch.hashtags)
          ? ch.hashtags.map((h: any) => String(h).trim().replace(/^#+/, "")).filter(Boolean)
          : [];

        channels[p] = {
          title: String(ch.title || ""),
          body,
          // Normalised without the leading '#' so callers can render them
          // consistently; the model was inconsistent about including it.
          hashtags: tags,
          // Surfaced so a caller can flag a channel the model skipped rather
          // than rendering an empty card with no explanation.
          // Checked against the cleaned body: a channel whose only content was
          // a hashtag block is empty in practice, and should be reported as
          // missing rather than rendered as a blank card.
          missing: !body,
        };
      }
      let score = Number(v?.score);
      if (!Number.isFinite(score)) score = 0;
      return {
        index: i,
        angle: String(v?.angle || `Variant ${i + 1}`),
        rationale: String(v?.rationale || ""),
        score: Math.max(0, Math.min(100, Math.round(score))),
        issues: Array.isArray(v?.issues) ? v.issues.map((s: any) => String(s)) : [],
        channels,
      };
    });

    let bestIndex = Number(result.bestVariantIndex);
    if (!Number.isInteger(bestIndex) || bestIndex < 0 || bestIndex >= variants.length) {
      // Fall back to the highest score rather than silently defaulting to 0.
      bestIndex = variants.reduce((b: number, v: any, i: number, a: any[]) => (v.score > a[b].score ? i : b), 0);
    }

    const seo = result.seo || {};
    const imagePrompt = String(result.imagePrompt || "").trim();

    // Image is a bonus, never a blocker.
    let imageBase64: string | null = null;
    let imageError: string | null = null;
    if (wantImage && imagePrompt) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) {
        imageError = "OPENAI_API_KEY is not set.";
      } else {
        try {
          // Reuse the same visual brand directive Creative Studio feeds its
          // image generator, so a package hero looks like the rest of the brand.
          const visual = await loadBrandVisual().catch(() => "");
          const prompt = [imagePrompt, visual, "No text, words or logos anywhere in the image."]
            .filter(Boolean).join(" ");
          const wide = platforms.includes("blog");

          // Image model availability differs per account, and the older
          // dall-e-3-only parameters (`style`, `response_format`) are rejected
          // outright by the current endpoint. Verified against this project:
          // sending `style` returns "Unknown parameter: 'style'", and after
          // removing it, "The model 'dall-e-3' does not exist" — so the
          // hardcoded model was wrong too.
          //
          // Try the current model first and fall back, sending only parameters
          // both accept. OPENAI_IMAGE_MODEL overrides the list entirely.
          const forced = Deno.env.get("OPENAI_IMAGE_MODEL");
          const candidates = forced ? [forced] : ["gpt-image-1", "dall-e-3"];
          const sizeFor = (model: string) =>
            wide ? (model === "dall-e-3" ? "1792x1024" : "1536x1024") : "1024x1024";

          const failures: string[] = [];
          for (const model of candidates) {
            const res = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model, prompt, n: 1, size: sizeFor(model) }),
            });
            if (res.ok) {
              const data = await res.json();
              imageBase64 = data?.data?.[0]?.b64_json || null;
              if (imageBase64) break;
              failures.push(`${model}: returned no image data`);
              continue;
            }
            const detail = await res.text().catch(() => "");
            let msg = "";
            try { msg = JSON.parse(detail)?.error?.message || ""; } catch { /* not JSON */ }
            failures.push(`${model}: ${msg || `HTTP ${res.status}`}`);
            console.log(`[Content Studio] image ${model} ${res.status}: ${detail.slice(0, 300)}`);
          }

          // Surface the provider's own message rather than a bare status code —
          // a status alone sent me digging through function logs to find a
          // rejected parameter.
          if (!imageBase64) imageError = `No image model available — ${failures.join("; ")}`;
        } catch (err: any) {
          imageError = String(err?.message || err);
          console.log(`[Content Studio] image failed: ${imageError}`);
        }
      }
    }

    return c.json({
      success: true,
      topic,
      platforms,
      variants,
      bestVariantIndex: bestIndex,
      bestVariantReason: String(result.bestVariantReason || ""),
      seo: {
        title: String(seo.title || ""),
        metaDescription: String(seo.metaDescription || ""),
        slug: String(seo.slug || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        keywords: Array.isArray(seo.keywords) ? seo.keywords.map((k: any) => String(k)) : [],
      },
      imagePrompt,
      image: imageBase64 ? `data:image/png;base64,${imageBase64}` : null,
      imageError,
    });
  } catch (error) {
    console.log(`[Content Studio] package error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

// ---------------------------------------------------------------------------
// REEL — hooks first, then the structure that keeps people watching.
//
// /recreate-script returns one hook and a linear script. The hook is the single
// biggest lever on a short-form video — almost all the drop-off happens in the
// first two seconds — so being handed exactly one, with no way to compare, is
// the weakest part of that flow. Same fix as the content package: generate
// several deliberately different hooks in ONE call so the model has to make
// them distinct, score them, and say which it would run.
//
// The rest of what this returns is not decoration. Each field maps to something
// that measurably affects reach on Reels/TikTok/Shorts:
//
//   onScreenText   most short-form is watched muted; a beat with no text is a
//                  beat most viewers experience as silence
//   openLoop       a question posed early and paid off late is what carries
//                  someone past the 3-second cliff
//   loopBack       an ending that runs into the opening frame earns replays,
//                  and replays count as watch time
//   commentBait    comments weigh heavily in distribution; a real question
//                  beats "thoughts?"
//   retentionRisks the model naming where it expects to lose people is more
//                  useful than a score claiming it won't
//
// HONESTY: there is no virality score here on purpose. Nothing predicts a hit,
// and a confident number would be invented. What this does is force the
// structural choices that give a video its best chance, and say plainly where
// it is weak.
// ---------------------------------------------------------------------------

const REEL_MAX_HOOKS = 6;

contentStudioRouter.post("/content-studio/reel", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const subject = String(body.subject || body.productName || body.topic || "").trim();
    if (!subject) {
      return c.json({ success: false, error: "A subject (or productName) is required." }, 400);
    }

    const platform = String(body.platform || "tiktok").toLowerCase();
    const hookCount = Math.max(2, Math.min(REEL_MAX_HOOKS, Number(body.hooks) || 4));
    const seconds = Math.max(10, Math.min(90, Number(body.seconds) || 30));
    const audience = String(body.audience || "").trim();
    const tone = String(body.tone || "direct and energetic").trim();
    const context = String(body.context || body.description || "").trim();
    const offer = String(body.offer || "").trim();

    const brandVoice = await loadBrandContext();

    // Named hook archetypes, because "write different hooks" reliably returns
    // the same interrogative opener reworded. Forcing one archetype per hook is
    // what actually produces variety.
    const ARCHETYPES = [
      "contrarian — challenge something the audience believes",
      "demonstration — lead with the visible result, no preamble",
      "specific-number — a concrete figure that is hard to scroll past",
      "callout — name the exact person this is for",
      "mistake — the thing they are getting wrong right now",
      "story-open — drop into the middle of a moment",
    ].slice(0, hookCount);

    const system = [
      "You are a short-form video strategist who has shipped hundreds of Reels, TikToks and Shorts.",
      brandVoice ? `Brand voice & guidelines to follow strictly:\n${brandVoice}` : "",
      audience ? `Audience: ${audience}.` : "",
      `Tone: ${tone}. Platform: ${platform}. Target length: about ${seconds} seconds.`,
      "",
      "HOOKS. Write exactly " + hookCount + " hooks, each using a DIFFERENT archetype, in this order:",
      ...ARCHETYPES.map((a, i) => `  ${i + 1}. ${a}`),
      "A hook is one or two spoken lines that fit in the first 2 seconds. No preamble, no " +
        "'in this video', no greeting. If two hooks could be swapped without changing the " +
        "opening frame, you have failed.",
      "",
      "Score each hook 0-100 on SCROLL-STOP POWER only — how likely a stranger mid-scroll is to " +
        "stop. Be harsh: most hooks are 60-75. Above 85 must be genuinely arresting. Say in " +
        "`why` what specifically earns or loses the score.",
      "",
      "SCRIPT. Build the beat sheet around your strongest hook. Every beat needs onScreenText, " +
        "because most viewers watch muted — that text is what they actually read. Keep it short " +
        "enough to read at a glance.",
      "",
      "Never invent statistics, medical claims, or named testimonials presented as real people.",
      "If you write a testimonial, mark it clearly as a placeholder to be replaced with a real one.",
      "",
      "Return STRICT JSON with keys:",
      "  hooks: array of " + hookCount + " objects { archetype, line, why, score (0-100), " +
        "firstFrame (what is literally on screen as it is said) }",
      "  bestHookIndex: integer, bestHookReason: string",
      "  beats: array of { label, startSec, endSec, voiceover, onScreenText, bRoll }",
      "  openLoop: the question posed early that is only answered near the end",
      "  loopBack: how the final line runs back into the first frame so it replays cleanly",
      "  commentBait: one genuine question worth answering in the comments",
      "  soundNote: what kind of audio or trend to pair with this, and why",
      "  retentionRisks: string[] — where you expect to lose viewers, and the fix",
      "  caption: platform-native caption. NO hashtags inside it.",
      "  hashtags: string[]",
    ].filter(Boolean).join("\n");

    const user = [
      `Subject: ${subject}`,
      context ? `Details: ${context}` : "",
      offer ? `Offer to land: ${offer}` : "",
    ].filter(Boolean).join("\n\n");

    const { data: result, provider: writtenBy, fallbackReason } = await aiJson(
      system,
      user,
      Math.min(6000, 1800 + hookCount * 380),
      "anthropic",
    );

    const hooks = (Array.isArray(result.hooks) ? result.hooks : [])
      .slice(0, hookCount)
      .map((h: any, i: number) => {
        let score = Number(h?.score);
        if (!Number.isFinite(score)) score = 0;
        return {
          index: i,
          archetype: String(h?.archetype || ARCHETYPES[i] || "").split("—")[0].trim(),
          line: String(h?.line || ""),
          why: String(h?.why || ""),
          firstFrame: String(h?.firstFrame || ""),
          score: Math.max(0, Math.min(100, Math.round(score))),
        };
      })
      .filter((h: any) => h.line);

    if (!hooks.length) {
      return c.json({ success: false, error: "The model returned no usable hooks." }, 502);
    }

    let bestHookIndex = Number(result.bestHookIndex);
    if (!Number.isInteger(bestHookIndex) || bestHookIndex < 0 || bestHookIndex >= hooks.length) {
      bestHookIndex = hooks.reduce((b: number, h: any, i: number, a: any[]) => (h.score > a[b].score ? i : b), 0);
    }

    const beats = (Array.isArray(result.beats) ? result.beats : []).map((b: any, i: number) => ({
      index: i,
      label: String(b?.label || `Beat ${i + 1}`),
      startSec: Number(b?.startSec) || 0,
      endSec: Number(b?.endSec) || 0,
      voiceover: String(b?.voiceover || ""),
      onScreenText: String(b?.onScreenText || ""),
      bRoll: String(b?.bRoll || ""),
      // Surfaced rather than silently tolerated: a beat with no on-screen text
      // is invisible to a muted viewer, which is most of them.
      missingOnScreenText: !String(b?.onScreenText || "").trim(),
    }));

    return c.json({
      success: true,
      subject,
      platform,
      targetSeconds: seconds,
      // Which model wrote this, and — when the preferred one could not be
      // reached — why. Surfaced rather than swallowed so a script produced by
      // the fallback is never mistaken for one produced by the first choice.
      writtenBy,
      fallbackReason,
      hooks,
      bestHookIndex,
      bestHookReason: String(result.bestHookReason || ""),
      beats,
      openLoop: String(result.openLoop || ""),
      loopBack: String(result.loopBack || ""),
      commentBait: String(result.commentBait || ""),
      soundNote: String(result.soundNote || ""),
      retentionRisks: Array.isArray(result.retentionRisks) ? result.retentionRisks.map((s: any) => String(s)) : [],
      // Caption is sanitised the same way the package is: tags live in their own
      // array so a caller rendering both cannot double-post them.
      caption: String(result.caption || "").replace(/\s*(?:^|\n)\s*(?:#[\wÀ-ɏ]+\s*){2,}$/u, "").trimEnd(),
      hashtags: Array.isArray(result.hashtags)
        ? result.hashtags.map((h: any) => String(h).trim().replace(/^#+/, "")).filter(Boolean)
        : [],
    });
  } catch (error) {
    console.log(`[Content Studio] reel error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

export default contentStudioRouter;
