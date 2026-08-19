/**
 * Video Studio — Syllaby-style faceless video creator (Path A).
 *
 * REAL, working features backed by OpenAI + Supabase Storage — no mocks:
 *   • Script generation (GPT) → a hook + dated scenes, each with narration,
 *     a visual prompt, and on-screen caption text.
 *   • Scene imagery (DALL·E 3) → vertical/landscape stills persisted to a
 *     private bucket, served via fresh signed URLs.
 *   • Voiceover (OpenAI TTS) → an MP3 per scene (or full script) stored in the
 *     bucket and returned as a signed URL.
 *   • Project persistence in the KV store.
 *
 * Final video assembly (image sequence + Ken-Burns + captions timed to the
 * voiceover) happens in the browser via canvas + MediaRecorder — this
 * environment has no ffmpeg. True AI text-to-video (moving footage) would need
 * a paid provider key (Runway / fal.ai / Replicate) and is intentionally left
 * as a slot-in, reported honestly via /video-studio/status.
 *
 * Mounted with `app.route("/make-server-3eae23a6", videoStudioRouter)`, so
 * route paths here are relative (like creative-studio.tsx).
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

export const videoStudioRouter = new Hono();

const BUCKET = "make-3eae23a6-video";
const PROJECT_PREFIX = "video_project:";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

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
        console.log("[Video Studio] bucket create failed:", error);
      }
    }
  } catch (e) {
    console.log("[Video Studio] ensureBucket error:", e);
  }
}

async function freshUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl || "";
}

function rid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Rough voiceover length so the client can lay out the timeline before the
// audio metadata loads. ~2.6 words/second is a natural narration pace.
function estimateSeconds(text: string): number {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round((words / 2.6) * 10) / 10);
}

// ---------------------------------------------------------------------------
// Capability report — honest about what is and isn't wired.
// ---------------------------------------------------------------------------
videoStudioRouter.get("/video-studio/status", (c) => {
  const openai = Boolean(Deno.env.get("OPENAI_API_KEY"));
  const motionKey =
    Deno.env.get("FAL_KEY") || Deno.env.get("REPLICATE_API_TOKEN") || Deno.env.get("RUNWAY_API_KEY");
  return c.json({
    success: true,
    capabilities: {
      script: { available: openai, provider: openai ? "openai" : null },
      images: { available: openai, provider: openai ? "dall-e-3" : null },
      voiceover: { available: openai, provider: openai ? "openai-tts" : null, voices: OPENAI_VOICES },
      // Faceless assembly is client-side; always available in the browser.
      assembly: { available: true, provider: "browser-canvas" },
      // Path B — moving AI footage — stays disabled until a provider key is set.
      motionVideo: {
        available: Boolean(motionKey),
        provider: motionKey ? "configured" : null,
        needs: "FAL_KEY, REPLICATE_API_TOKEN, or RUNWAY_API_KEY",
      },
    },
  });
});

// ---------------------------------------------------------------------------
// Script — topic → hook + scenes (narration, visual prompt, caption).
// ---------------------------------------------------------------------------
videoStudioRouter.post("/video-studio/script", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return c.json({ success: false, error: "Script generation needs OPENAI_API_KEY." }, 500);
    }
    const body = await c.req.json().catch(() => ({}));
    const topic = String(body.topic || "").trim();
    if (!topic) return c.json({ success: false, error: "A topic or product is required." }, 400);

    const tone = String(body.tone || "energetic, punchy, social-first");
    const platform = String(body.platform || "TikTok / Instagram Reels / YouTube Shorts");
    const sceneCount = Math.min(8, Math.max(3, Number(body.sceneCount) || 5));

    const prompt = `You are a short-form video scriptwriter for faceless social videos.
Topic / product: ${topic}
Platform: ${platform}
Tone: ${tone}
Write a script of exactly ${sceneCount} scenes for a vertical (9:16) faceless video.
Each scene needs: spoken narration (1-2 sentences, natural for TTS), a vivid image
generation prompt describing the visual (no text in the image), short punchy
on-screen caption text (<= 8 words), and a duration in seconds (3-7).
Open with a strong 3-second hook. Return ONLY JSON with this exact shape:
{
  "title": string,
  "hook": string,
  "caption": string,          // the post caption for publishing
  "hashtags": string[],       // 4-8 relevant hashtags, no '#'
  "scenes": [
    { "narration": string, "visualPrompt": string, "onScreenText": string, "seconds": number }
  ]
}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.log("[Video Studio] script gen failed:", err.slice(0, 300));
      return c.json({ success: false, error: `Script generation failed: ${err.slice(0, 300)}` }, 502);
    }
    const data = await resp.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    if (!scenes.length) {
      return c.json({ success: false, error: "The model returned no scenes." }, 502);
    }
    const normalized = scenes.slice(0, sceneCount).map((s: any) => ({
      id: rid(),
      narration: String(s.narration || "").trim(),
      visualPrompt: String(s.visualPrompt || "").trim(),
      onScreenText: String(s.onScreenText || "").trim(),
      seconds: Math.min(7, Math.max(3, Number(s.seconds) || estimateSeconds(s.narration))),
      imagePath: null,
      imageUrl: "",
      audioPath: null,
      audioUrl: "",
    }));

    return c.json({
      success: true,
      script: {
        title: String(parsed.title || topic).trim(),
        hook: String(parsed.hook || "").trim(),
        caption: String(parsed.caption || "").trim(),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: any) => String(h).replace(/^#/, "")) : [],
        scenes: normalized,
      },
    });
  } catch (err) {
    console.log("[Video Studio] script error:", err);
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Scene image — DALL·E 3 still stored in the bucket.
// ---------------------------------------------------------------------------
videoStudioRouter.post("/video-studio/scene-image", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ success: false, error: "Image generation needs OPENAI_API_KEY." }, 500);

    const body = await c.req.json().catch(() => ({}));
    const visualPrompt = String(body.visualPrompt || "").trim();
    if (!visualPrompt) return c.json({ success: false, error: "A visual prompt is required." }, 400);

    const aspect = String(body.aspect || "vertical");
    const size = aspect === "landscape" ? "1792x1024" : aspect === "square" ? "1024x1024" : "1024x1792";
    const style = String(body.style || "cinematic, high detail, vibrant, professional");
    const finalPrompt = `${visualPrompt}. ${style}. No text, no watermark, no logos.`;

    // Model availability differs per account — 'dall-e-3' does not exist on
    // this project, so scene generation failed outright every time. Try the
    // current model first (matching creative-studio.tsx and marketplace.tsx),
    // then fall back. gpt-image-1 uses 1536-wide/tall rather than 1792 and
    // returns b64 without being asked.
    const gptSize = aspect === "landscape" ? "1536x1024" : aspect === "square" ? "1024x1024" : "1024x1536";
    let aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      // Same minimal parameter set verified working in content-studio.
      body: JSON.stringify({ model: "gpt-image-1", prompt: finalPrompt, n: 1, size: gptSize }),
    });
    if (!aiRes.ok) {
      console.log(`[Video Studio] gpt-image-1 unavailable (HTTP ${aiRes.status}), trying dall-e-3`);
      aiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "dall-e-3", prompt: finalPrompt, n: 1, size, response_format: "b64_json" }),
      });
    }
    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.log("[Video Studio] scene image failed:", err.slice(0, 300));
      return c.json({ success: false, error: `Scene image failed: ${err.slice(0, 300)}` }, 502);
    }
    const aiData = await aiRes.json();
    const b64 = aiData?.data?.[0]?.b64_json;
    if (!b64) return c.json({ success: false, error: "AI returned no image data." }, 502);

    await ensureBucket();
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const path = `scenes/${rid()}.png`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) return c.json({ success: false, error: `Could not store image: ${upErr.message}` }, 500);

    return c.json({ success: true, path, url: await freshUrl(path), size });
  } catch (err) {
    console.log("[Video Studio] scene-image error:", err);
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Voiceover — OpenAI TTS → MP3 stored in the bucket.
// ---------------------------------------------------------------------------
/**
 * A reel built from real job photographs.
 *
 * The studio's normal path writes a script and then generates a picture for
 * each scene with DALL·E. For a renovation company that is the wrong way round:
 * there are 35 photographs of actual finished work sitting in storage, and a
 * generated image of a kitchen that does not exist is worse than a photograph
 * of one that does — worse for trust, and worse for the algorithm, which
 * rewards real footage.
 *
 * So this inverts it. The photographs come first and fixed, and the script is
 * written to fit them: the model is told what each photo is and writes narration
 * for that specific image rather than a prompt to invent one. Nothing here calls
 * an image generator at all.
 *
 * Only published photos are eligible. An unpublished photo is one nobody has
 * cleared for the public, and a reel is about as public as it gets.
 */
videoStudioRouter.post("/video-studio/job-reel", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ success: false, error: "Script generation needs OPENAI_API_KEY." }, 500);

    const body = await c.req.json().catch(() => ({}));
    const wanted: string[] = Array.isArray(body.photoIds) ? body.photoIds.map(String) : [];
    const category = String(body.category || "").trim();
    const tone = String(body.tone || "warm, confident, local tradesman — not salesy");
    const platform = String(body.platform || "Instagram Reels / TikTok");
    const business = String(body.business || "Black Phoenix Builds");

    // Read the gallery directly rather than over HTTP: this runs inside the
    // same function, and a self-call would need a token it does not have.
    const rows = ((await kv.getByPrefix("gallery:")) as any[] || []).filter(Boolean);
    let photos = rows.filter((p) => p?.published && p?.image);

    if (wanted.length) {
      const order = new Map(wanted.map((id, i) => [id, i]));
      photos = photos.filter((p) => order.has(p.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    } else if (category) {
      photos = photos.filter((p) => String(p.category) === category);
    }

    // Six is about twenty-five seconds at four seconds a photo, which is where
    // short-form retention falls away.
    photos = photos.slice(0, Math.min(Math.max(Number(body.max) || 6, 3), 8));

    if (!photos.length) {
      return c.json({
        success: false,
        error: "No published job photos to build a reel from. Publish some in Job Photos first.",
      }, 400);
    }

    const manifest = photos
      .map((p, i) => `${i + 1}. "${p.title}" (${p.category || "project"})`)
      .join("\n");

    const prompt = `You are writing a short-form video for a real renovation company.

Business: ${business}, a full-service renovation company in Salem, New Hampshire —
kitchens, bathrooms, whole-home remodels, additions and exterior work.
Platform: ${platform}
Tone: ${tone}

These are REAL photographs of this company's completed work, in order:
${manifest}

Write narration for each photograph, in order — one scene per photograph, exactly
${photos.length} scenes. You are describing real work this company did, so do not
invent details you cannot see in a title: talk about craft, process, and what a
homeowner gets, rather than claiming specific materials or measurements.

Open with a hook in the first three seconds. Close by inviting a call.

Return ONLY JSON with this exact shape:
{
  "title": string,
  "hook": string,
  "caption": string,
  "hashtags": string[],
  "scenes": [
    { "narration": string, "onScreenText": string, "seconds": number }
  ]
}
narration: 1-2 sentences, natural read aloud. onScreenText: <= 8 words.
seconds: between 3 and 6.`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });
    const aiJson = await aiRes.json().catch(() => ({}));
    if (!aiRes.ok) {
      return c.json({ success: false, error: aiJson?.error?.message || "Script generation failed." }, 502);
    }

    let script: any = {};
    try { script = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}"); } catch { script = {}; }
    const written: any[] = Array.isArray(script.scenes) ? script.scenes : [];

    // The photographs are the fixed part. If the model returns too few scenes
    // the photo still gets shown with its own title rather than being dropped —
    // losing a real photograph to a short script would be the wrong trade.
    const scenes = photos.map((photo, i) => {
      const s = written[i] || {};
      return {
        imageUrl: photo.image,
        photoId: photo.id,
        photoTitle: photo.title,
        narration: String(s.narration || `${photo.title}. Another finished project by ${business}.`),
        onScreenText: String(s.onScreenText || photo.category || photo.title).slice(0, 60),
        seconds: Math.min(Math.max(Number(s.seconds) || 4, 3), 6),
        // Says plainly that no image generator was involved, so a reader of
        // this payload cannot mistake these for generated stills.
        source: "job-photo",
      };
    });

    return c.json({
      success: true,
      title: String(script.title || `${business} — recent work`),
      hook: String(script.hook || ""),
      caption: String(script.caption || ""),
      hashtags: Array.isArray(script.hashtags) ? script.hashtags.slice(0, 8) : [],
      scenes,
      totalSeconds: scenes.reduce((n, s) => n + s.seconds, 0),
      photosUsed: scenes.length,
    });
  } catch (error: any) {
    console.log(`[video-studio] job reel failed: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || "Could not build the reel." }, 500);
  }
});

/** The published job photos a reel can be built from, newest categories first. */
videoStudioRouter.get("/video-studio/job-photos", async (c) => {
  try {
    const rows = ((await kv.getByPrefix("gallery:")) as any[] || []).filter(Boolean);
    const photos = rows
      .filter((p) => p?.published && p?.image)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((p) => ({ id: p.id, title: p.title, category: p.category, image: p.image }));
    const categories = [...new Set(photos.map((p) => p.category).filter(Boolean))];
    return c.json({ success: true, photos, categories, total: photos.length });
  } catch (error: any) {
    return c.json({ success: false, photos: [], categories: [], error: error?.message }, 500);
  }
});

videoStudioRouter.post("/video-studio/voiceover", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ success: false, error: "Voiceover needs OPENAI_API_KEY." }, 500);

    const body = await c.req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    if (!text) return c.json({ success: false, error: "Narration text is required." }, 400);
    const voice = OPENAI_VOICES.includes(String(body.voice)) ? String(body.voice) : "nova";

    const aiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice, input: text, response_format: "mp3" }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.log("[Video Studio] tts failed:", err.slice(0, 300));
      return c.json({ success: false, error: `Voiceover failed: ${err.slice(0, 300)}` }, 502);
    }
    const buf = new Uint8Array(await aiRes.arrayBuffer());

    await ensureBucket();
    const path = `audio/${rid()}.mp3`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (upErr) return c.json({ success: false, error: `Could not store audio: ${upErr.message}` }, 500);

    return c.json({ success: true, path, url: await freshUrl(path), estSeconds: estimateSeconds(text), voice });
  } catch (err) {
    console.log("[Video Studio] voiceover error:", err);
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Project persistence.
// ---------------------------------------------------------------------------
videoStudioRouter.post("/video-studio/projects", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const id = String(body.id || rid());
    const project = {
      id,
      title: String(body.title || "Untitled video"),
      topic: String(body.topic || ""),
      voice: String(body.voice || "nova"),
      aspect: String(body.aspect || "vertical"),
      caption: String(body.caption || ""),
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      scenes: Array.isArray(body.scenes) ? body.scenes : [],
      updatedAt: new Date().toISOString(),
      createdAt: String(body.createdAt || new Date().toISOString()),
    };
    await kv.set(`${PROJECT_PREFIX}${id}`, project);
    return c.json({ success: true, project });
  } catch (err) {
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

videoStudioRouter.get("/video-studio/projects", async (c) => {
  try {
    const rows = await kv.getByPrefix(PROJECT_PREFIX);
    const projects = (rows || [])
      .map((r: any) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    // Refresh signed URLs for scene assets so playback never 404s.
    const withUrls = await Promise.all(
      projects.map(async (p: any) => ({
        ...p,
        scenes: await Promise.all(
          (p.scenes || []).map(async (s: any) => ({
            ...s,
            imageUrl: s.imagePath ? await freshUrl(s.imagePath) : "",
            audioUrl: s.audioPath ? await freshUrl(s.audioPath) : "",
          })),
        ),
      })),
    );
    return c.json({ success: true, projects: withUrls });
  } catch (err) {
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

videoStudioRouter.delete("/video-studio/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const raw = await kv.get(`${PROJECT_PREFIX}${id}`);
    const project = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (project?.scenes) {
      const paths = project.scenes.flatMap((s: any) => [s.imagePath, s.audioPath].filter(Boolean));
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
    }
    await kv.del(`${PROJECT_PREFIX}${id}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

export default videoStudioRouter;
