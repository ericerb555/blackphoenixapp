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
import * as kv from "./kv_store.tsx";

export const contentStudioRouter = new Hono();

const BRAND_KEY = "content_studio:brand_kit";
const PACK_PREFIX = "content_studio:pack:";
const PLAN_KEY = "content_studio:plan";

function id(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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

export default contentStudioRouter;
