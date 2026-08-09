/**
 * Creative Studio — Higgsfield-style AI creative suite.
 *
 * REAL, working features backed by OpenAI + Supabase Storage:
 *   • Image generation (DALL·E 3) → persisted to a private bucket, served via
 *     fresh signed URLs so the gallery never breaks (unlike ephemeral hosted URLs).
 *   • Viral presets — curated one-click style/VFX prompt templates.
 *   • Asset gallery — KV-persisted metadata, regenerated signed URLs on list.
 *
 * Provider-gated features (video / audio generation) report availability
 * honestly via /creative-studio/status: OpenAI cannot do text-to-video or music,
 * so those stay disabled until a provider key (fal.ai / Replicate / Runway /
 * ElevenLabs) is configured. No mock output is ever returned.
 *
 * Mounted with `app.route("/make-server-3eae23a6", creativeStudioRouter)`, so
 * route paths here are relative (like marketing-assets.tsx).
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { loadBrandVisual } from "./content-studio.tsx";

export const creativeStudioRouter = new Hono();

const BUCKET = "make-3eae23a6-creative";
const ASSET_PREFIX = "creative_asset:";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function ensureBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
      if (error && (error as any).statusCode !== "409" && !/already exists/i.test(error.message || "")) {
        console.log("[Creative Studio] bucket create failed:", error);
      }
    }
  } catch (e) {
    console.log("[Creative Studio] ensureBucket error:", e);
  }
}

async function freshUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl || "";
}

// ---------------------------------------------------------------------------
// Viral presets — each augments the user's prompt with a tuned style directive.
// ---------------------------------------------------------------------------
interface Preset {
  id: string;
  name: string;
  emoji: string;
  category: string;
  suffix: string; // appended to the user's subject prompt
}

const PRESETS: Preset[] = [
  { id: "explosion", name: "Explosion", emoji: "💥", category: "VFX", suffix: "cinematic explosion behind the subject, fiery blast, dramatic sparks and debris, high-contrast action-movie lighting, hyper-detailed" },
  { id: "bullet-time", name: "Bullet Time", emoji: "🕶️", category: "VFX", suffix: "bullet-time frozen-motion effect, 360 camera orbit look, motion streaks, dramatic slow-motion action, cinematic" },
  { id: "earth-zoom", name: "Earth Zoom", emoji: "🌍", category: "Camera", suffix: "extreme earth-zoom-out perspective, from ground level rising to orbital view, dramatic scale, satellite realism" },
  { id: "comic", name: "Comic", emoji: "🦸", category: "Style", suffix: "bold comic-book illustration, halftone shading, heavy ink outlines, dynamic panel energy, saturated colors" },
  { id: "ink-riot", name: "Ink Riot", emoji: "🖋️", category: "Style", suffix: "explosive ink-splatter art, flowing black-and-color ink, high energy, abstract splashes, dramatic negative space" },
  { id: "fairytale", name: "Fairytale Castle", emoji: "🏰", category: "Scene", suffix: "dreamy fairytale castle scene, magical golden-hour lighting, whimsical, storybook cinematic fantasy" },
  { id: "cyberpunk", name: "Cyberpunk", emoji: "🌆", category: "Style", suffix: "neon cyberpunk aesthetic, rain-soaked city, glowing signage, moody teal-and-magenta lighting, cinematic sci-fi" },
  { id: "particles", name: "Particles", emoji: "✨", category: "VFX", suffix: "swirling glowing particle field around the subject, magical energy dust, bokeh light motes, ethereal" },
  { id: "product-hero", name: "Product Hero", emoji: "📦", category: "Marketing", suffix: "premium product hero shot, studio softbox lighting, clean gradient backdrop, crisp reflections, e-commerce ready, no text" },
  { id: "portrait", name: "Cinematic Portrait", emoji: "🎬", category: "Style", suffix: "cinematic portrait, shallow depth of field, film-grain, dramatic rim lighting, editorial magazine quality" },
];

creativeStudioRouter.get("/creative-studio/presets", (c) => {
  return c.json({ success: true, presets: PRESETS });
});

// ---------------------------------------------------------------------------
// Provider status — what can actually generate right now.
// ---------------------------------------------------------------------------
creativeStudioRouter.get("/creative-studio/status", (c) => {
  const hasOpenAI = Boolean(Deno.env.get("OPENAI_API_KEY"));
  // Honest capability report. Video/audio need a dedicated provider key.
  const videoKey = Deno.env.get("FAL_KEY") || Deno.env.get("REPLICATE_API_TOKEN") || Deno.env.get("RUNWAY_API_KEY");
  const audioKey = Deno.env.get("ELEVENLABS_API_KEY") || Deno.env.get("FAL_KEY");
  return c.json({
    success: true,
    capabilities: {
      image: { available: hasOpenAI, provider: hasOpenAI ? "OpenAI DALL·E 3" : null },
      video: {
        available: Boolean(videoKey),
        provider: videoKey ? "configured" : null,
        needs: "FAL_KEY, REPLICATE_API_TOKEN, or RUNWAY_API_KEY",
      },
      audio: {
        available: Boolean(audioKey),
        provider: audioKey ? "configured" : null,
        needs: "ELEVENLABS_API_KEY or FAL_KEY",
      },
    },
  });
});

// ---------------------------------------------------------------------------
// Image generation → persist to Storage → save gallery metadata.
// Body: { prompt, presetId?, size?, quality? }
// ---------------------------------------------------------------------------
creativeStudioRouter.post("/creative-studio/generate", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return c.json({ success: false, error: "Image generation is not configured (OPENAI_API_KEY missing)." }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const subject = String(body.prompt || "").trim();
    if (!subject) return c.json({ success: false, error: "A prompt is required." }, 400);

    const preset = body.presetId ? PRESETS.find((p) => p.id === body.presetId) : undefined;
    // Apply Brand Kit (opt-in via useBrandKit) so imagery uses the brand palette.
    const brandStyle = body.useBrandKit ? await loadBrandVisual() : "";
    const QUALITY_DIRECTIVE =
      "Masterpiece, award-winning, ultra-detailed, professional studio-grade lighting, high dynamic range, crisp focus, cohesive color grading, clean composition. No watermark, no logo, no gibberish text.";
    const finalPrompt = [subject, preset ? preset.suffix : "", brandStyle, QUALITY_DIRECTIVE].filter(Boolean).join(". ");

    const sizeIn = String(body.size || "1024x1024");
    const size = ["1024x1024", "1792x1024", "1024x1792"].includes(sizeIn) ? sizeIn : "1024x1024";
    const quality = body.quality === "hd" ? "hd" : "standard";
    const wantHd = quality === "hd";
    const gptSize = size === "1792x1024" ? "1536x1024" : size === "1024x1792" ? "1024x1536" : "1024x1024";

    // Top-tier: gpt-image-1 (highest fidelity) first, fall back to DALL·E 3 HD/vivid.
    async function genImage(): Promise<{ b64: string; revised: string }> {
      const primary = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt: finalPrompt, n: 1, size: gptSize, quality: wantHd ? "high" : "medium" }),
      });
      if (primary.ok) {
        const d = await primary.json();
        const b = d?.data?.[0]?.b64_json;
        if (b) return { b64: b, revised: d?.data?.[0]?.revised_prompt || finalPrompt };
      } else {
        console.log("[Creative Studio] gpt-image-1 failed, falling back to dall-e-3 HD:", (await primary.text()).slice(0, 300));
      }
      const fb = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "dall-e-3", prompt: finalPrompt, n: 1, size, quality: "hd", style: "vivid", response_format: "b64_json" }),
      });
      if (!fb.ok) throw new Error((await fb.text()).slice(0, 300));
      const d = await fb.json();
      const b = d?.data?.[0]?.b64_json;
      if (!b) throw new Error("AI returned no image data.");
      return { b64: b, revised: d?.data?.[0]?.revised_prompt || finalPrompt };
    }

    let b64: string, revisedPrompt: string;
    try {
      const out = await genImage();
      b64 = out.b64;
      revisedPrompt = out.revised;
    } catch (err) {
      console.log("[Creative Studio] image gen failed:", String(err).slice(0, 300));
      return c.json({ success: false, error: `Image generation failed: ${String(err).slice(0, 300)}` }, 502);
    }

    await ensureBucket();
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const assetId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const path = `images/${assetId}.png`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.log("[Creative Studio] upload failed:", upErr);
      return c.json({ success: false, error: `Could not store the generated image: ${upErr.message}` }, 500);
    }

    const url = await freshUrl(path);
    const asset = {
      id: assetId,
      type: "image",
      path,
      prompt: subject,
      finalPrompt,
      revisedPrompt,
      presetId: preset?.id || null,
      presetName: preset?.name || null,
      usedBrandKit: Boolean(brandStyle),
      size,
      quality,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`${ASSET_PREFIX}${assetId}`, asset);

    return c.json({ success: true, asset: { ...asset, url } });
  } catch (err) {
    console.log("[Creative Studio] generate error:", err);
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Gallery — list assets with fresh signed URLs.
// ---------------------------------------------------------------------------
creativeStudioRouter.get("/creative-studio/assets", async (c) => {
  try {
    const rows = await kv.getByPrefix(ASSET_PREFIX);
    const assets = (rows || [])
      .map((r: any) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    // Regenerate signed URLs so nothing 404s after the old TTL lapses.
    const withUrls = await Promise.all(
      assets.map(async (a: any) => ({ ...a, url: a.path ? await freshUrl(a.path) : "" })),
    );
    return c.json({ success: true, assets: withUrls });
  } catch (err) {
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

creativeStudioRouter.delete("/creative-studio/assets/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const raw = await kv.get(`${ASSET_PREFIX}${id}`);
    const asset = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (asset?.path) {
      await supabase.storage.from(BUCKET).remove([asset.path]).catch(() => {});
    }
    await kv.del(`${ASSET_PREFIX}${id}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

export default creativeStudioRouter;
