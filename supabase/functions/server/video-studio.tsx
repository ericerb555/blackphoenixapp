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
import { researchPromptFragment, searchTermsFor } from "./reel-research.tsx";
import { winningArchetypesFragment } from "./reel-scoreboard.tsx";

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
 * Look at the job photographs and write down what is actually in them.
 *
 * WHY THIS HAS TO EXIST BEFORE ANY RENOVATION REEL IS WORTH WRITING
 *
 * All 35 published photographs are titled "Recent Project 01" through
 * "Completed Project 12". They were imported from the website in bulk and the
 * titles are sequence numbers, not descriptions. The reel writer is handed that
 * manifest and asked to write narration, which means it is being asked to write
 * about pictures it cannot see and that nothing describes.
 *
 * That is the same failure that produced "toasty rides ahead" for the product
 * reels: a model given no real material writes mood words. The photographs
 * themselves are the most valuable creative asset here — no competitor can
 * obtain them — and they are currently unusable for exactly one reason, which
 * is that nobody has said what is in them.
 *
 * So look. The model already in use can see images. One vision pass turns 35
 * anonymous files into 35 described rooms, and the result is stored back onto
 * the gallery record so it is paid for once rather than on every reel.
 *
 * Nothing is written unless `commit` is true. The default is a dry run that
 * returns what it would save, because this writes to records that back a public
 * page and the output should be read before it lands.
 */
videoStudioRouter.post("/video-studio/describe-photos", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ success: false, error: "Describing photos needs OPENAI_API_KEY." }, 500);

    const body = await c.req.json().catch(() => ({}));
    const commit = body.commit === true;
    const redo = body.redo === true;
    const limit = Math.min(Math.max(Number(body.limit) || 40, 1), 40);

    const rows = ((await kv.getByPrefix("gallery:")) as any[] || []).filter(Boolean);
    let photos = rows.filter((p) => p?.published && p?.image);
    // Already-described photos are skipped by default so this can be re-run
    // cheaply after new uploads without paying for the whole library again.
    if (!redo) photos = photos.filter((p) => !p?.vision?.description);
    photos = photos.slice(0, limit);

    if (!photos.length) {
      return c.json({
        success: true, described: 0, committed: false, photos: [],
        note: "Every published photo already has a description. Pass redo:true to rewrite them.",
      });
    }

    // Four per call, not eight. OpenAI fetches every image itself before it can
    // answer, and the library is a mix of ~50KB JPEGs and ~700KB PNGs; eight of
    // the large ones in one request is enough download for its fetcher to give
    // up with "unable to download content before the timeout". Four keeps the
    // worst-case batch under about 3MB, and the calls still run together so the
    // whole library costs one round trip's worth of wall clock rather than 35.
    const BATCH = 4;
    const batches: any[][] = [];
    for (let i = 0; i < photos.length; i += BATCH) batches.push(photos.slice(i, i + BATCH));

    const instruction =
      "These are photographs of completed and in-progress work by a full-service renovation company " +
      "in New Hampshire — kitchens, bathrooms, whole-home remodels, additions, decks and exterior work.\n\n" +
      "For EACH image in order, say what you can actually see. This is going to be used to write video " +
      "narration, so concrete visible detail is the whole point and vagueness is useless.\n\n" +
      "Do not guess at brands, prices, measurements or materials you cannot see. If you cannot tell " +
      "what a room is, say \"unclear\" rather than picking something plausible.\n\n" +
      "Return ONLY JSON: { \"photos\": [ { " +
      "\"room\": string,        // kitchen | bathroom | living | bedroom | exterior | deck | basement | whole-home | unclear\n" +
      "\"stage\": string,       // finished | in-progress | framing | demolition | unclear\n" +
      "\"description\": string, // one sentence, what is visibly there\n" +
      "\"details\": string[],   // 2-5 concrete visible things, e.g. \"shaker cabinets\", \"subway tile backsplash\"\n" +
      "\"standout\": string     // the single most visually striking thing in the frame\n" +
      "} ] } with exactly one entry per image, in the order given.";

    const look = async (batch: any[]): Promise<any[]> => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o", // the mini model's vision is materially worse at this
          messages: [{
            role: "user",
            content: [
              { type: "text", text: instruction },
              ...batch.map((p) => ({ type: "image_url", image_url: { url: p.image, detail: "low" } })),
            ],
          }],
          response_format: { type: "json_object" },
          temperature: 0.2, // describing, not composing
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Vision call failed.");
      let parsed: any = {};
      try { parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
      const out = Array.isArray(parsed.photos) ? parsed.photos : [];
      // Alignment matters more than it looks: these are matched back to photos
      // by position, so a short answer would shift every later description onto
      // the wrong picture. Pad rather than let that happen.
      while (out.length < batch.length) out.push({});
      return out.slice(0, batch.length);
    };

    const results = await Promise.all(
      batches.map(async (batch) => {
        try {
          return await look(batch);
        } catch {
          // One slow image should not cost the other three their descriptions,
          // so fall back to one at a time and keep whatever succeeds. A photo
          // that fails twice comes back blank and is simply skipped on save.
          const one = await Promise.all(
            batch.map(async (p) => {
              try { return (await look([p]))[0] || {}; } catch { return {}; }
            }),
          );
          return one;
        }
      }),
    );

    const seen = results.flat();
    const described = photos.map((p, i) => {
      const v = seen[i] || {};
      return {
        id: p.id,
        title: p.title,
        image: p.image,
        vision: {
          room: String(v.room || "unclear"),
          stage: String(v.stage || "unclear"),
          description: String(v.description || ""),
          details: Array.isArray(v.details) ? v.details.map(String).slice(0, 5) : [],
          standout: String(v.standout || ""),
        },
      };
    });

    if (commit) {
      // Written back onto the existing record, leaving every other field alone,
      // so a photo keeps its title, order and published flag.
      for (const d of described) {
        if (!d.vision.description) continue; // never overwrite with a blank
        const key = `gallery:${d.id}`;
        const existing = (await kv.get(key)) as any;
        if (!existing) continue;
        await kv.set(key, { ...existing, vision: d.vision });
      }
    }

    return c.json({
      success: true,
      described: described.length,
      committed: commit,
      note: commit
        ? "Descriptions saved onto the gallery records."
        : "DRY RUN — nothing was saved. Re-send with commit:true once these read correctly.",
      photos: described,
    });
  } catch (error: any) {
    console.log(`[video-studio] describe-photos failed: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || "Could not describe the photos." }, 500);
  }
});

/**
 * Hook shapes for renovation work, which is a different job from selling a product.
 *
 * The product archetypes do not transfer. A car seat heater is bought on impulse
 * from a stranger; a kitchen is bought after months of thinking, from someone
 * the homeowner has decided to trust. The winning renovation content on TikTok
 * and Instagram reflects that — it is overwhelmingly transformation, process and
 * craft, not persuasion, and the comment sections are people asking how much and
 * whether they work in their area.
 *
 * The other reason these differ: this material is real. There are 35 photographs
 * of jobs this company actually finished, with 13 of them mid-build. Every
 * structure below is built on something the photographs can actually show, which
 * is the opposite of the product problem where the assets were generic and the
 * words had to do all the work.
 */
const RENOVATION_ARCHETYPES: Array<{ key: string; brief: string; examples: string[] }> = [
  {
    key: "before-after",
    brief:
      "Hold on the worst state, then cut to the finished room. The strongest structure this material " +
      "supports and the one to reach for first. The opening line should sit with the bad state, not apologise for it.",
    examples: ["this was the kitchen", "nobody wanted to cook here", "the floor was the good part", "she cried when she saw it"],
  },
  {
    key: "detail",
    brief:
      "Open tight on one piece of craft most people would never notice, then pull out to show the room it sits in. " +
      "Rewards the viewer for looking closely, which is what makes trades content rewatchable.",
    examples: ["look at the tile line", "that seam took an hour", "nobody will ever see this", "the grout is the whole job"],
  },
  {
    key: "process",
    brief:
      "Mid-build. Studs, subfloor, plumbing rough-in. Show what a finished room is hiding. " +
      "Only use this when the photographs are genuinely in-progress.",
    examples: ["under every nice floor", "this is week two", "behind the drywall", "before it looks like anything"],
  },
  {
    key: "problem-found",
    brief:
      "What was discovered once the wall came off. Extremely strong in trades content because every homeowner " +
      "fears it. Only claim what the photograph actually shows — do not invent rot, mould or damage.",
    examples: ["we opened the wall", "someone did this on purpose", "that is not how that goes", "this was holding the ceiling"],
  },
  {
    key: "craft-choice",
    brief:
      "One decision and why it was made that way — a layout, a material, a line. Positions the company as " +
      "thoughtful rather than cheap, which is what wins the higher-value job.",
    examples: ["we moved the sink", "this wall had to go", "why the island faces out", "two inches changed the room"],
  },
  {
    key: "walkthrough",
    brief:
      "A calm tour of the finished space, letting the work speak. No hard sell. Closes on where the company works.",
    examples: ["finished this one friday", "salem, new hampshire", "start to finish, eleven weeks", "the whole first floor"],
  },
];

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

    // The photographs carry descriptions written by the vision pass. Where they
    // do not, the manifest falls back to the title — which for this library is a
    // sequence number like "Recent Project 07", and is the reason the vision
    // pass exists. A model handed only that writes about nothing.
    const describedCount = photos.filter((p) => p?.vision?.description).length;
    const manifest = photos
      .map((p, i) => {
        const v = p?.vision;
        if (!v?.description) return `${i + 1}. "${p.title}" (${p.category || "project"}) — no description available`;
        const bits = [
          `${i + 1}. ${v.room || "room"}, ${v.stage || "unclear stage"} — ${v.description}`,
          v.details?.length ? `   visible: ${v.details.join(", ")}` : "",
          v.standout ? `   most striking: ${v.standout}` : "",
        ].filter(Boolean);
        return bits.join("\n");
      })
      .join("\n");

    // Same reasoning as the product reels: nobody picks the winner in advance,
    // so write several and let the audience choose. Capped at the number of
    // renovation archetypes so no structure gets used twice.
    const variantCount = Math.max(1, Math.min(RENOVATION_ARCHETYPES.length, Number(body.variants) || 3));
    const anyInProgress = photos.some((p) => ["in-progress", "framing", "demolition"].includes(p?.vision?.stage));
    // "process" and "problem-found" both promise mid-build footage. Offering
    // them over a set of finished rooms would invite the model to invent a
    // demolition that no photograph shows.
    const eligible = anyInProgress
      ? RENOVATION_ARCHETYPES
      : RENOVATION_ARCHETYPES.filter((h) => h.key !== "process" && h.key !== "problem-found");
    const chosen = eligible.slice(0, variantCount);

    const prompt = `You are writing short-form video for a real renovation company.

Business: ${business}, a full-service renovation company in Salem, New Hampshire —
kitchens, bathrooms, whole-home remodels, additions and exterior work.
Platform: ${platform}
Tone: ${tone}

These are REAL photographs of this company's own work, in order, with what is
actually visible in each one:
${manifest}

You are writing ${chosen.length} SEPARATE video${chosen.length > 1 ? "s" : ""} over these same
${photos.length} photographs — competing cuts that will all be posted so the audience
can pick the winner. Write one per structure below, and commit fully to each:

${chosen
  .map(
    (h, i) =>
      `${i + 1}. ${h.key} — ${h.brief}\n` +
      `   Opening lines in this shape read like: ${h.examples.map((e) => `"${e}"`).join(", ")}\n` +
      `   Match that register. Do not copy those lines — they are about other jobs.`,
  )
  .join("\n\n")}

RULES, and they matter more than the copy:
- Write ONLY about what the descriptions say is visible. This is real work for
  real customers, and inventing a detail is worse here than anywhere else: it
  misrepresents a finished job to the people who might buy the next one.
- Never claim a measurement, a price, a timeline, a brand or a material that is
  not in the description above.
- The first line has about three seconds. It must say something, not set a mood.
  "beautiful transformation" and "quality craftsmanship" are what everyone else
  writes and they are invisible.
- onScreenText: 8 words maximum. Lower case is fine.

THE ON-SCREEN TEXT IS NOT A LABEL. It is the only channel that works with the
sound off, which is how most of this will be watched, and the beats have to read
as a sequence — each one moving the story on from the last.

  Good, because each beat says something the picture alone does not:
    "this was the bathroom" -> "the floor was rotted" -> "eleven days later"
    "we opened the wall" -> "someone tiled over it" -> "all of it came out"
    "same room, same window" -> "everything else is new"

  Bad, and these are the exact failures to avoid:
    ✗ "#beforeandafter"   — a hashtag is not a caption; it belongs in the post
    ✗ "stunning!"         — an adjective, and the viewer can see it for himself
    ✗ "bright ideas"      — says nothing about this room
    ✗ "elegant entry"     — could caption any photograph ever taken
    ✗ "foundation"        — a one-word label, not a beat

  The test: if the caption would still make sense pasted onto a different
  project's photograph, it is not carrying its weight. Say what is happening in
  THIS picture, or what it cost, or how long it took, or what was found.
- Close by making it easy to ask — where they work, or an invitation to call.
- These must be genuinely different videos, not one reworded. If two could be
  swapped without a viewer noticing, both are wasted.

Return ONLY JSON:
{
  "variants": [               // exactly ${chosen.length}, in the structure order above
    {
      "archetype": string,    // the structure key, echoed back
      "title": string,
      "hook": string,
      "caption": string,
      "hashtags": string[],   // 5-8, no '#', mix broad and local
      "scenes": [ { "narration": string, "onScreenText": string, "seconds": number } ]
    }
  ]
}
One scene per photograph, exactly ${photos.length} scenes per variant, in the order given.
narration: 1-2 sentences, natural read aloud. seconds: between 3 and 6.`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Same reasoning as the product reels: this call writes the words the
        // company is represented by, over photographs of jobs real customers
        // paid for. The mini model is the wrong economy here.
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        // High, because the failure mode of a variant batch is several cuts
        // that say the same thing in different words.
        temperature: 1.0,
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json().catch(() => ({}));
    if (!aiRes.ok) {
      return c.json({ success: false, error: aiJson?.error?.message || "Script generation failed." }, 502);
    }

    let script: any = {};
    try { script = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}"); } catch { script = {}; }
    const rawVariants: any[] = Array.isArray(script.variants) ? script.variants : [];
    if (!rawVariants.length) {
      return c.json({ success: false, error: "The script came back empty. Try again." }, 502);
    }

    const variants = chosen.slice(0, rawVariants.length).map((archetype, v) => {
      const written: any[] = Array.isArray(rawVariants[v]?.scenes) ? rawVariants[v].scenes : [];

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
          onScreenText: String(s.onScreenText || photo.vision?.room || photo.category || photo.title).slice(0, 60),
          seconds: Math.min(Math.max(Number(s.seconds) || 4, 3), 6),
          // Says plainly that no image generator was involved, so a reader of
          // this payload cannot mistake these for generated stills.
          source: "job-photo",
        };
      });

      return {
        id: `${archetype.key}-${photos.length}`,
        archetype: archetype.key,
        archetypeBrief: archetype.brief,
        title: String(rawVariants[v]?.title || `${business} — recent work`),
        hook: String(rawVariants[v]?.hook || ""),
        caption: String(rawVariants[v]?.caption || ""),
        hashtags: Array.isArray(rawVariants[v]?.hashtags) ? rawVariants[v].hashtags.slice(0, 8) : [],
        scenes,
        totalSeconds: scenes.reduce((n, s) => n + s.seconds, 0),
      };
    });

    const first = variants[0];
    return c.json({
      success: true,
      variants,
      photosUsed: photos.length,
      // Surfaced because it silently caps quality: photographs with no
      // description give the writer a sequence number to work from.
      photosDescribed: describedCount,
      photosMissingDescription: photos.length - describedCount,
      inProgressFootageAvailable: anyInProgress,
      howToUse:
        `${variants.length} different cuts of the same job photographs. Post them all across a week, ` +
        "judge on three-second retention rather than likes, and keep the structure that holds people — " +
        "then shoot the next job to suit it.",
      // Variant one repeated flat, so anything expecting one reel keeps working.
      title: first.title,
      hook: first.hook,
      caption: first.caption,
      hashtags: first.hashtags,
      scenes: first.scenes,
      totalSeconds: first.totalSeconds,
    });
  } catch (error: any) {
    console.log(`[video-studio] job reel failed: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || "Could not build the reel." }, 500);
  }
});

/**
 * The hook shapes that actually win in short-form, as a fixed list.
 *
 * Not invented here. These are the recurring structures behind the top-performing
 * entries in TikTok's Creative Center and Meta's public ad library — the same
 * swipe file every serious operator keeps. Naming them explicitly is the point:
 * a model asked for "five variants" writes five paraphrases of one idea, which
 * makes the test worthless. Asked for one variant per named structure, it has to
 * genuinely change its approach.
 *
 * Deliberately absent: social proof ("sold out three times", "10,000 reviews").
 * It is one of the strongest hooks in the real world and we cannot use it,
 * because we do not hold those numbers and inventing them is the exact thing we
 * stripped out of the product data.
 *
 * WHY EACH ONE CARRIES EXAMPLES
 *
 * The first version of this named the archetypes and described each in a
 * sentence, and the output was weak in a specific, diagnosable way: "cold seat
 * blues?", "toasty rides ahead". Generic ad copy, and one variant — the pattern
 * interrupt — opened on a soft question, which is the opposite of the structure
 * it was asked for.
 *
 * A described adjective is not a target. "Punchy, three to six words" is
 * satisfied by rhyming filler. Shown four lines that actually work, a model
 * writes toward them instead. These examples are patterns, not quotations, and
 * none names a real brand or cites a number we do not hold.
 */
const HOOK_ARCHETYPES: Array<{ key: string; brief: string; examples: string[] }> = [
  {
    key: "problem",
    brief: "Open on the annoyance the viewer already lives with. Name it so precisely they feel caught.",
    examples: ["my back hated this chair", "3pm and already wrecked", "every winter. every morning.", "why is it always tangled"],
  },
  {
    key: "result",
    brief: "Open on the after. Show the finished state first and let the video explain itself backwards.",
    examples: ["this used to be carpet", "took twenty minutes total", "same room. one afternoon.", "that's it. that's the whole fix."],
  },
  {
    key: "interrupt",
    brief:
      "Open on something that does not parse for a beat — an odd angle, an unexpected use, a wrong-looking frame. " +
      "A question is NOT a pattern interrupt. The line must land as a statement that briefly makes no sense.",
    examples: ["i put it in the freezer", "this is not a lamp", "wrong way round on purpose", "yes, that goes there"],
  },
  {
    key: "warning",
    brief: "Open by telling them to stop doing the thing they are doing. Corrective, not scolding.",
    examples: ["stop doing this to your car", "you're washing it wrong", "throw this one away", "take it out of your cart"],
  },
  {
    key: "curiosity",
    brief: "Open on the part nobody mentions. Withhold the payoff for one beat, then deliver it.",
    examples: ["nobody mentions the third one", "the part they don't show", "there's a reason it's cheap", "wait for the second one"],
  },
  {
    key: "comparison",
    brief: "Open against whatever they are using now. The contrast carries the argument.",
    examples: ["mine's on the left", "same job, one costs more", "yours vs this", "i owned both. one stayed."],
  },
  {
    key: "demonstration",
    brief: "No preamble at all. Open mid-action with the thing already working. Text stays minimal — the picture argues.",
    examples: ["watch", "no cuts", "one take, start to finish", "still going"],
  },
  {
    key: "confession",
    brief: "Open on honest scepticism — 'I did not think this would work' — then show what changed it.",
    examples: ["i thought this was a scam", "returned it. bought it again.", "i owe this thing an apology", "was ready to hate it"],
  },
];

/**
 * Lines the model actually produced before it was shown examples, kept as
 * negative exemplars.
 *
 * Naming the failure is worth more than another adjective, because every one of
 * these satisfies "punchy, three to six words" and none of them would stop a
 * thumb. Left verbatim on purpose — if the copy regresses, it regresses to
 * roughly these, and they are the fastest way to recognise it.
 */
const WEAK_HOOK_EXAMPLES = [
  "cold seat blues?",
  "toasty rides ahead",
  "snug in a car seat?",
  "warming magic?",
];

/**
 * A product reel built to be watched, not to describe a product.
 *
 * WHAT ACTUALLY DECIDES WHETHER ONE OF THESE WORKS
 *
 * Three things, in this order, and only the first two are code:
 *
 * 1. **Real product images, cut fast.** Every product here ships with 6 to 17
 *    supplier photographs — angles, details, in-use shots. Generating a picture
 *    of a product that already has seventeen of its own was always the wrong
 *    trade: a generated approximation of a thing someone is about to buy reads
 *    as fake, and it is fake. Nothing here calls an image generator.
 *
 * 2. **The first second.** Short-form is decided before most viewers have
 *    understood what they are looking at, so the script is built hook-first and
 *    the hook is a pattern interrupt or a result — never "check out this
 *    product". Beats run about 1.2 seconds, not the 4-6 a narrated explainer
 *    uses; momentum is most of retention.
 *
 * 3. **The sound, which cannot be automated.** Trending audio is the single
 *    largest algorithmic lever on TikTok and Reels, and there is no lawful API
 *    that hands you the current trending sounds — the licence lives inside the
 *    apps. So these are written to work SILENT, with the message carried by
 *    on-screen text, and the audio added in the native app at post time. That
 *    is what people who do this for a living actually do.
 *
 * A synthetic voiceover is offered but off by default, and that is deliberate:
 * on TikTok a TTS voice reads as an advert, and an advert gets scrolled. The
 * caption channel outperforms it.
 *
 * WHY THIS RETURNS SEVERAL REELS AND NOT ONE
 *
 * Because nobody can pick the winner in advance, and pretending otherwise is the
 * single biggest difference between how we were working and how a store that
 * sells at volume works. The operators worth copying cut ten to thirty creatives
 * per product and expect two to five percent of them to land; the winner is
 * found by posting, not by judgement. Returning one reel bet the whole product
 * on one guess.
 *
 * The marginal cost of this is close to zero — same photographs, same single
 * model call — so the only thing that made it a one-reel endpoint was habit.
 *
 * Variants differ in two dimensions, not one:
 *   • the hook structure, drawn one-per-variant from HOOK_ARCHETYPES, and
 *   • the opening frame, rotated so each variant stops the scroll on a
 *     different photograph. First frame is a large share of whether a reel is
 *     watched at all, so varying copy while every variant opens on the same
 *     image would be testing half the thing.
 */
videoStudioRouter.post("/video-studio/product-reel", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ success: false, error: "Script generation needs OPENAI_API_KEY." }, 500);

    const body = await c.req.json().catch(() => ({}));
    const productId = String(body.productId || "").trim();
    const angle = String(body.angle || "auto");

    const all = ((await kv.getByPrefix("product_")) as any[] || []).filter(Boolean);
    const product = productId
      ? all.find((p) => String(p.id) === productId || String(p.sku) === productId)
      // No product named: take the one with the most imagery, since a reel is
      // only as good as the number of beats it can cut.
      : all.sort((a, b) =>
          (Array.isArray(b.images) ? b.images.length : 0) - (Array.isArray(a.images) ? a.images.length : 0),
        )[0];

    if (!product) return c.json({ success: false, error: "No product found." }, 404);

    const images: string[] = [
      ...(product.primaryImage ? [product.primaryImage] : []),
      ...(Array.isArray(product.images) ? product.images : []),
    ].filter((u) => typeof u === "string" && /^https?:\/\//.test(u));

    const unique = [...new Set(images)];
    if (unique.length < 3) {
      return c.json({
        success: false,
        error: `"${product.name}" has only ${unique.length} usable image(s). A reel needs at least 3.`,
      }, 400);
    }

    // Eight beats at ~1.2s is roughly ten seconds — long enough to land a hook,
    // a benefit and a price, short enough to be rewatched, and a rewatch counts
    // for more than a view.
    const beats = unique.slice(0, Math.min(Math.max(Number(body.beats) || 8, 4), 12));
    const price = Number(product.price) || Number(product.retailPrice) || 0;

    // Five is the default because it is enough to be a real test and still one
    // model call. Capped at the number of archetypes — asking for more would
    // start repeating structures, which is the paraphrase problem again.
    const variantCount = Math.max(1, Math.min(HOOK_ARCHETYPES.length, Number(body.variants) || 5));
    // An explicit angle means the caller wants that one structure, so honour it
    // and stop leading the list with something they did not ask for.
    const chosen = angle !== "auto" && HOOK_ARCHETYPES.some((h) => h.key === angle)
      ? [
          HOOK_ARCHETYPES.find((h) => h.key === angle)!,
          ...HOOK_ARCHETYPES.filter((h) => h.key !== angle),
        ].slice(0, variantCount)
      : HOOK_ARCHETYPES.slice(0, variantCount);

    // What is actually working for this product right now, if a YouTube key is
    // configured. Best-effort: research is a sharpener, not a dependency, and a
    // failed lookup must never cost somebody their reel.
    let research: any[] = [];
    let researchQuery = "";
    try {
      if (Deno.env.get("YOUTUBE_API_KEY")) {
        // A catalogue name is not a search. "Graphite Car Seat Heating Pad"
        // returns nothing; "car seat heating pad" returns ten. Try the cleaned
        // phrase, then progressively shorter tails.
        for (const term of searchTermsFor(product.name, product.category)) {
          const cacheKey = `reel_research:${term}:true`;
          const cached = (await kv.get(cacheKey)) as any;
          if (cached) {
            // Cached misses count. Without this, a product nobody films would
            // burn 100 quota units on every single reel.
            if (cached.examples?.length) { research = cached.examples; researchQuery = term; break; }
            continue;
          }
          const url = new URL(`${Deno.env.get("SUPABASE_URL")}/functions/v1/make-server-3eae23a6/reel-research`);
          url.searchParams.set("q", term);
          const r = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          });
          const j = await r.json().catch(() => ({}));
          if (Array.isArray(j?.examples) && j.examples.length) { research = j.examples; researchQuery = term; break; }
        }
      }
    } catch { /* the reel is written either way */ }

    // What has actually worked for this account before. Empty until five posts
    // carry results — a ranking built on two would steer by noise.
    const proven = await winningArchetypesFragment();

    const prompt = `You write short-form product videos that people actually watch to the end.
${researchPromptFragment(research)}${proven}

Product: ${product.name}
Category: ${product.category || "general"}
${price ? `Price: $${price.toFixed(2)}` : ""}
${product.description ? `Description: ${String(product.description).slice(0, 400)}` : ""}
Beats available: ${beats.length} (one real product photo each, ~1.2 seconds per beat)

You are writing ${chosen.length} SEPARATE video${chosen.length > 1 ? "s" : ""} for this product — competing
creatives that will all be posted so the audience can pick the winner. Write one
per hook structure below, in this order, and commit fully to each structure:

${chosen
  .map(
    (h, i) =>
      `${i + 1}. ${h.key} — ${h.brief}\n` +
      `   Hook lines in this shape read like: ${h.examples.map((e) => `"${e}"`).join(", ")}\n` +
      `   Match that register. Do not copy those lines — they are about other products.`,
  )
  .join("\n\n")}

These must be genuinely different videos, not one video reworded. If two of them
could be swapped without a viewer noticing, both are wasted. Different structure,
different first line, different thing being argued.

WHAT A WEAK HOOK LOOKS LIKE, so you can recognise it in your own draft:
${WEAK_HOOK_EXAMPLES.map((e) => `  ✗ "${e}"`).join("\n")}
Every one of those is short and on-topic and would still be scrolled past. They
fail for three reasons worth checking your own lines against:
  - they rhyme or alliterate instead of saying something ("cold seat blues");
  - they describe a mood rather than a moment ("toasty rides ahead");
  - they ask a soft question where the structure needed a statement.
A hook that could sit on any product in the category is not a hook. If your line
would still make sense with a different product dropped into it, rewrite it.

RULES, and they matter more than the copy:
- The video will most likely be watched WITH THE SOUND OFF at first. Every idea
  must land as on-screen text. Do not rely on narration to carry meaning.
- Beat 1 is the hook and has about 1.2 seconds. Make it a pattern interrupt, a
  problem someone recognises, or the result. Never "check out this product" and
  never the product's name alone.
- On-screen text: 3-6 words per beat. Lower case is fine. No hashtags.

  The beats have to read as a sequence, each one moving on from the last. This
  is the only channel that works with the sound off, which is how most of it
  gets watched.

    Good, because each beat adds something the picture does not:
      "my hands were freezing" -> "every single morning" -> "35 seconds now"
      "i almost returned it" -> "then i read the manual" -> "wrong plug"

    Bad, and these are the actual failures to avoid:
      ✗ "toasty rides ahead"  — a mood, not a moment
      ✗ "warming magic?"      — vague, and a question where a statement was needed
      ✗ "cold seat blues?"    — rhyming filler that says nothing
      ✗ "premium quality"     — could caption any product ever made

  The test: if the line would still make sense pasted onto a different product,
  it is not carrying its weight.
- Do not invent specifications, materials, certifications or claims that are not
  in the description. Say what it does for someone, not what it is made of.
- No fake urgency, no invented discounts, no "limited stock".
- The last beat is a soft call to action.

Return ONLY JSON:
{
  "variants": [               // exactly ${chosen.length}, in the hook order given above
    {
      "archetype": string,    // the hook key from the list, echoed back
      "hookStyle": string,    // how you applied it here, one short sentence
      "beats": [ { "onScreenText": string, "narration": string } ],  // exactly ${beats.length}
      "caption": string,      // the post caption, 1-2 lines, conversational
      "hashtags": string[],   // 5-8, no '#', mix broad and specific
      "soundSuggestion": string  // the KIND of trending audio that suits THIS variant
    }
  ]
}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Not the mini model, and the exception is deliberate. Everywhere else
        // in this file the model is summarising or restructuring text somebody
        // else wrote; here it is writing the words the product is actually sold
        // with. That is the wrong place to save a fraction of a cent — the
        // expensive part of this pipeline is the time spent posting the results
        // and waiting to see which one lands.
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        // High, because the failure mode of a variant batch is five scripts
        // that say the same thing in different words.
        temperature: 1.0,
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json().catch(() => ({}));
    if (!aiRes.ok) {
      return c.json({ success: false, error: aiJson?.error?.message || "Script generation failed." }, 502);
    }

    let script: any = {};
    try { script = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}"); } catch { script = {}; }
    const rawVariants: any[] = Array.isArray(script.variants) ? script.variants : [];
    if (!rawVariants.length) {
      return c.json({ success: false, error: "The script came back empty. Try again." }, 502);
    }

    const audioNote = (suggestion: string) => ({
      // Said out loud in the payload so nobody ships these silent by accident
      // and concludes the format does not work.
      voiceover: false,
      reason:
        "Built to work with the sound off. A synthetic voiceover reads as an advert on TikTok and Reels; " +
        "on-screen text plus trending audio consistently outperforms it.",
      suggestion: suggestion || "Something upbeat and current for this category.",
      action:
        "Add a trending sound in the TikTok or Instagram app when you post. No API can supply trending " +
        "audio legally — the licence only exists inside the apps — so this is the one step that stays manual.",
    });

    const variants = chosen.slice(0, rawVariants.length).map((archetype, v) => {
      const written: any[] = Array.isArray(rawVariants[v]?.beats) ? rawVariants[v].beats : [];

      // Each variant opens on a different photograph. The rest follow in the
      // supplier's own order, which is usually strongest-first — a full shuffle
      // would trade a real gain in first-frame variety for an incoherent edit.
      const opener = beats[v % beats.length];
      const ordered = [opener, ...beats.filter((u) => u !== opener)];

      const scenes = ordered.map((imageUrl, i) => {
        const b = written[i] || {};
        return {
          imageUrl,
          // The hook gets a beat and a half. Everything after it moves.
          seconds: i === 0 ? 1.8 : 1.2,
          onScreenText: String(b.onScreenText || "").slice(0, 60),
          narration: String(b.narration || ""),
          source: "supplier-photo",
        };
      });

      return {
        id: `${product.id || product.sku}-${archetype.key}`,
        archetype: archetype.key,
        archetypeBrief: archetype.brief,
        hookStyle: String(rawVariants[v]?.hookStyle || ""),
        scenes,
        caption: String(rawVariants[v]?.caption || ""),
        hashtags: Array.isArray(rawVariants[v]?.hashtags) ? rawVariants[v].hashtags.slice(0, 8) : [],
        totalSeconds: Number(scenes.reduce((n, s) => n + s.seconds, 0).toFixed(1)),
        audio: audioNote(String(rawVariants[v]?.soundSuggestion || "")),
      };
    });

    const first = variants[0];
    return c.json({
      success: true,
      product: { id: product.id || product.sku, name: product.name, price, category: product.category },
      variants,
      imagesAvailable: unique.length,
      // Surfaced so the caller can see whether these hooks were written against
      // real winners or against the static archetypes alone.
      researchedAgainst: research.length
        ? { query: researchQuery, count: research.length, topTitle: research[0]?.title || "", totalViews: research.reduce((s: number, v: any) => s + Number(v.views || 0), 0) }
        : null,
      // Post all of them and let the audience choose. Stated in the payload
      // because the instinct is to pick a favourite and post one, and picking a
      // favourite is exactly what this endpoint exists to stop.
      howToUse:
        `${variants.length} competing creatives from the same photographs. Post them all, a day or two ` +
        "apart, with different sounds. Judge on three-second retention first — not likes — and kill the " +
        "weak ones early. Expect one or two to carry the product and the rest to do nothing; that is the " +
        "normal shape of this, not a failure.",
      // Variant one repeated flat, so anything expecting a single reel keeps working.
      hookStyle: first.hookStyle,
      scenes: first.scenes,
      caption: first.caption,
      hashtags: first.hashtags,
      totalSeconds: first.totalSeconds,
      audio: first.audio,
    });
  } catch (error: any) {
    console.log(`[video-studio] product reel failed: ${error?.message || error}`);
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
