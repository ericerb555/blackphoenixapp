/**
 * house-capture — read the existing house from photos, and show the deck on it.
 *
 * Two jobs that are deliberately kept apart, because confusing them is how a
 * wrong number reaches a building department:
 *
 *   /analyze  reads photos of the house and reports what is there — siding
 *             type, door sill height, wall obstructions, roof overhang. These
 *             drive real decisions: siding decides the flashing and the lag
 *             length, the sill decides the deck height, a meter or hose bib in
 *             the ledger run decides where the deck can go at all.
 *
 *   /render   paints the proposed deck onto the customer's actual photo. This
 *             is a sales image. It is not measured, not to scale, and never
 *             goes in a permit set — the three.js views do that.
 *
 * A photograph has no scale of its own. Every dimension here is inferred from a
 * reference of known size in the frame (an entry door is 80" tall, a step is
 * 7ish, siding courses run 4"–8"), so every dimension comes back marked as an
 * estimate with the reference that produced it and a confidence. The client is
 * required to surface both. Nothing from a photo is allowed to look like a
 * measurement, because someone will build off it.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const app = new Hono();

const BUCKET = "make-3eae23a6-house";

/** Largest edge we accept; the client downsizes before sending. */
const MAX_IMAGES = 6;

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function requireSignedIn(c: any, next: any) {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
  if (!token) return c.json({ error: "Sign in required." }, 401);
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data?.user) return c.json({ error: "Sign in required." }, 401);
  c.set("userId", data.user.id);
  await next();
}

app.use("*", requireSignedIn);

/** Split a data URI into the parts the APIs want. Returns null if unusable. */
function splitDataUri(uri: string): { mediaType: string; base64: string } | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec((uri || "").trim());
  if (!m) return null;
  return { mediaType: m[1].toLowerCase(), base64: m[2] };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function putAsset(bytes: Uint8Array, ext: string, contentType: string): Promise<string | null> {
  try {
    const sb = serviceClient();
    const { data } = await sb.storage.listBuckets();
    if (!(data || []).some((b: any) => b.name === BUCKET)) {
      await sb.storage.createBucket(BUCKET, { public: false });
    }
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
    if (error) { console.log(`[house] upload failed: ${error.message}`); return null; }
    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl || null;
  } catch (err) {
    console.log(`[house] store failed: ${err}`);
    return null;
  }
}

const ANALYSIS_SYSTEM = `You are a deck builder standing in the customer's yard looking at their house,
deciding how a deck attaches to it. You are reading photographs, so you can see
what is there but you cannot measure anything directly.

Report only what is visible. If something is not in frame or is ambiguous, say
so — "not visible" is a useful answer and a guess is not. A wrong siding call
sends the crew with the wrong flashing; a wrong sill height builds a deck that
steps up into the door.

SCALE. Photographs have no inherent scale. Derive dimensions only from a
reference of known size that you can actually see, and name it:
  · a standard entry door is 80 inches tall, 36 inches wide
  · a standard exterior step riser is 7 to 7.75 inches
  · lap siding courses expose 4 to 8 inches
  · a concrete block is 8 inches tall, 16 long
  · a brick course with mortar is about 2.67 inches
State which reference you used for each dimension and how confident you are.
Perspective, camera tilt and lens distortion all bias these — assume every
number you give is an estimate to be checked with a tape.

Return ONLY a JSON object, no prose and no code fence:
{
  "house": {
    "style": "e.g. raised ranch, colonial, cape",
    "stories": 1,
    "sidingType": "vinyl lap | wood clapboard | fiber cement | brick | stucco | stone | shingle | board and batten | unknown",
    "sidingColor": "plain language",
    "sidingColorHex": "#RRGGBB",
    "trimColor": "plain language",
    "trimColorHex": "#RRGGBB",
    "roofColor": "plain language",
    "foundation": "poured concrete | block | brick | slab | unknown"
  },
  "attachment": {
    "wallDescription": "which wall the deck would attach to, as seen",
    "doorPresent": true,
    "doorType": "slider | french | entry | none visible",
    "sillHeightInches": 0,
    "sillReference": "what you scaled it from",
    "sillConfidence": "high | medium | low",
    "rimJoistVisible": true,
    "rimJoistNote": "what the band/rim area looks like — this is what a ledger bolts to",
    "ledgerRunFeet": 0,
    "ledgerRunReference": "what you scaled it from",
    "ledgerRunConfidence": "high | medium | low"
  },
  "obstructions": [
    { "item": "hose bib | electric meter | gas meter | dryer vent | AC condenser | window well | basement window | light | outlet | downspout",
      "where": "plain language position on the wall",
      "impact": "what it does to the deck or the ledger" }
  ],
  "grade": {
    "slope": "flat | gentle | steep | not visible",
    "note": "what the ground does under the proposed deck",
    "dropAcrossDeckInches": 0,
    "dropConfidence": "high | medium | low"
  },
  "suggested": {
    "deckHeightFt": 0,
    "widthFt": 0,
    "depthFt": 0,
    "ledgerAttached": true,
    "why": "one or two sentences on why these numbers, in a builder's voice"
  },
  "cautions": ["things that would change the price or the permit"],
  "notVisible": ["what a photo could not show that still has to be checked on site"]
}`;

/**
 * Read the house from one or more photos.
 *
 * Several frames of the same house from different angles read far better than
 * one, which is why the client offers to pull frames out of a walk-around
 * video: parallax is most of what makes a sill height guessable at all.
 */
app.post("/analyze", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const images: string[] = Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const note: string = typeof body?.note === "string" ? body.note.slice(0, 800) : "";

    if (!images.length) return c.json({ error: "Add at least one photo of the house." }, 400);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return c.json({ error: "Photo analysis is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);

    const blocks: any[] = [];
    for (const uri of images) {
      const parts = splitDataUri(uri);
      if (!parts) continue;
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: parts.mediaType, data: parts.base64 },
      });
    }
    if (!blocks.length) return c.json({ error: "Those images could not be read. Try a JPEG or PNG." }, 400);

    blocks.push({
      type: "text",
      text: [
        `${blocks.length} photo${blocks.length > 1 ? "s" : ""} of the same house.`,
        note ? `What the customer said: ${note}` : "",
        "Read the wall a deck would attach to and report it as JSON.",
      ].filter(Boolean).join("\n\n"),
    });

    const client = new Anthropic({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("HOUSE_CAPTURE_MODEL") || "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: ANALYSIS_SYSTEM,
      messages: [{ role: "user", content: blocks }],
    });

    const raw = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const bodyText = fenced ? fenced[1].trim() : raw;
    const first = bodyText.indexOf("{");
    const last = bodyText.lastIndexOf("}");
    const candidate = first !== -1 && last > first ? bodyText.slice(first, last + 1) : bodyText;

    let parsed: any;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      return c.json({ error: "The analysis came back unreadable. Try again, or use fewer photos." }, 502);
    }

    return c.json({ analysis: parsed, frames: blocks.length - 1 });
  } catch (err: any) {
    console.log(`[house] analyze failed: ${err?.message || err}`);
    return c.json({ error: `Could not read those photos: ${err?.message || err}` }, 500);
  }
});

/** Describe the deck to an image model in the words a photographer would use. */
function renderPrompt(deck: any, house: any, extra: string): string {
  const w = Number(deck?.widthFt) || 16;
  const d = Number(deck?.depthFt) || 12;
  const h = Number(deck?.heightFt) || 3;
  const railing = deck?.railingStyle || "black aluminum";
  const decking = deck?.deckingMaterial || "grey composite";
  const stairs = deck?.stairs === false ? "no stairs" : "a set of stairs down to grade with matching railing";
  const siding = house?.sidingType && house.sidingType !== "unknown" ? house.sidingType : "the existing siding";

  return [
    `Photorealistic architectural visualization. Keep this exact photograph of the house — same camera position,`,
    `same lens, same daylight, same shadows, same ${siding}, same trim, same roof, same landscaping and background.`,
    `Change nothing about the house itself.`,
    ``,
    `Add a newly built residential deck attached to the wall where the door is:`,
    `· about ${w} feet wide along the house and ${d} feet out from it`,
    `· deck surface about ${h} feet above the ground, so you can see the framing and posts underneath`,
    `· ${decking} deck boards running in neat parallel courses`,
    `· ${railing} railing at 36 inches with evenly spaced balusters`,
    `· pressure treated posts on concrete footings, with visible beam and joists under the deck`,
    `· ${stairs}`,
    extra ? `· ${extra}` : ``,
    ``,
    `The deck must sit correctly in the scene: perspective matching the house, contact shadows on the ground,`,
    `the deck surface just below the door threshold, and the railing occluding what is behind it.`,
    `No people, no furniture, no text, no watermark. Clean new construction on a real property.`,
  ].filter(Boolean).join("\n");
}

/**
 * Paint the proposed deck onto the customer's own photo.
 *
 * Uses the image edit endpoint rather than plain generation so the result is
 * their house rather than a house — which is the entire point of taking the
 * photo. The caller is told plainly, in the response, that this is not a
 * measured drawing.
 */
app.post("/render", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const photo: string = typeof body?.photo === "string" ? body.photo : "";
    const deck = body?.deck || {};
    const house = body?.house || {};
    const extra: string = typeof body?.extra === "string" ? body.extra.slice(0, 400) : "";

    const parts = splitDataUri(photo);
    if (!parts) return c.json({ error: "Pick a photo of the house to render onto." }, 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "Rendering is not configured. Set the OPENAI_API_KEY secret." }, 503);

    const ext = parts.mediaType.includes("png") ? "png" : "jpg";
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("image", new Blob([base64ToBytes(parts.base64)], { type: parts.mediaType }), `house.${ext}`);
    form.append("prompt", renderPrompt(deck, house, extra));
    form.append("size", "1536x1024");
    form.append("quality", "high");
    form.append("input_fidelity", "high");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`[house] render failed ${res.status}: ${detail.slice(0, 400)}`);
      return c.json({ error: `Render failed (${res.status}). ${detail.slice(0, 200)}` }, 502);
    }

    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return c.json({ error: "The render came back empty." }, 502);

    const url = await putAsset(base64ToBytes(b64), "png", "image/png");
    if (!url) return c.json({ error: "The render was made but could not be stored." }, 500);

    return c.json({
      url,
      // Said in the payload, not only in the UI, so anything that consumes this
      // endpoint later still carries the caveat with the image.
      disclaimer: "Artist's impression for discussion. Not to scale and not a construction document — the permit set uses the measured drawings.",
    });
  } catch (err: any) {
    console.log(`[house] render error: ${err?.message || err}`);
    return c.json({ error: `Render failed: ${err?.message || err}` }, 500);
  }
});

/**
 * Turn the measured 3D view into a photorealistic render.
 *
 * This exists because of a real limit rather than a missing setting. The 3D
 * view is WebGL running live in a browser at sixty frames a second; the
 * renderings people mean when they say "make it look real" are offline
 * path-traced images that take minutes a frame in Lumion or V-Ray. No amount of
 * tuning closes that gap in a viewport, because the gap is global illumination,
 * scanned materials and real vegetation — not settings.
 *
 * So the viewport stays the fast, measured, orbitable thing that the permit
 * drawings come off, and this takes a frame from it and does the offline pass.
 * The prompt is written to hold the geometry still and change only the
 * rendering: same camera, same proportions, same railing and stair layout. What
 * comes back is a presentation image, and it is labelled as one.
 */
app.post("/photoreal", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const shot: string = typeof body?.shot === "string" ? body.shot : "";
    const deck = body?.deck || {};
    const style: string = typeof body?.style === "string" ? body.style.slice(0, 300) : "";

    const parts = splitDataUri(shot);
    if (!parts) return c.json({ error: "Nothing captured from the 3D view to render." }, 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "Rendering is not configured. Set the OPENAI_API_KEY secret." }, 503);

    const w = Number(deck?.widthFt) || 16;
    const d = Number(deck?.depthFt) || 12;
    const h = Number(deck?.heightFt) || 3;

    const prompt = [
      `Turn this 3D model view into a photorealistic architectural visualization, of the quality`,
      `an architecture studio would put in a client presentation.`,
      ``,
      `HOLD THE GEOMETRY EXACTLY. Same camera angle, same lens, same composition. The deck stays`,
      `${w} feet along the house by ${d} feet out, ${h} feet above grade. Keep the railing exactly`,
      `where it is, keep the stairway in the same position with the same opening in the guard, keep`,
      `the post positions, the joist and beam layout, and the roof and door on the house. Do not`,
      `move, resize, add or remove any part of the structure.`,
      ``,
      `CHANGE ONLY THE RENDERING QUALITY:`,
      `· real pressure-treated and composite timber with grain, subtle colour variation board to`,
      `  board, softened edges and visible fasteners`,
      `· true late-afternoon sunlight with warm directional light, long soft shadows, and bounced`,
      `  light filling the underside of the deck`,
      `· global illumination and ambient occlusion in the corners, under the framing and where the`,
      `  posts meet the ground`,
      `· real lawn with depth and individual blades near the camera, natural planting beds and`,
      `  shrubs at the foundation, a mature tree casting dappled light`,
      `· photographic depth of field, slight atmospheric haze at distance, realistic sky with cloud`,
      `· crisp material detail on the siding, glass in the door reflecting the sky and the yard`,
      style ? `· ${style}` : ``,
      ``,
      `Shot as architectural photography: tripod height, verticals parallel, no fisheye. No people,`,
      `no text, no watermark, no dimension lines, no CAD overlay.`,
    ].filter(Boolean).join("\n");

    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("image", new Blob([base64ToBytes(parts.base64)], { type: parts.mediaType }), "view.png");
    form.append("prompt", prompt);
    form.append("size", "1536x1024");
    form.append("quality", "high");
    // Keeps the structure from drifting while the materials and light change.
    form.append("input_fidelity", "high");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`[house] photoreal failed ${res.status}: ${detail.slice(0, 400)}`);
      return c.json({ error: `Render failed (${res.status}). ${detail.slice(0, 200)}` }, 502);
    }

    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return c.json({ error: "The render came back empty." }, 502);

    const url = await putAsset(base64ToBytes(b64), "png", "image/png");
    if (!url) return c.json({ error: "The render was made but could not be stored." }, 500);

    return c.json({
      url,
      disclaimer: "Presentation render. The measured drawings are the permit set — this is the same deck, rendered.",
    });
  } catch (err: any) {
    console.log(`[house] photoreal error: ${err?.message || err}`);
    return c.json({ error: `Render failed: ${err?.message || err}` }, 500);
  }
});

export default app;
