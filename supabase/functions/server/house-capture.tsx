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
const MAX_IMAGES = 12;

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
    const prompt = renderPrompt(deck, house, extra);

    // Extra views of the same house. One photograph shows one wall from one
    // angle, and the model has to invent everything it cannot see — which is
    // where a render starts disagreeing with the actual house. Given the side
    // elevation and a closer shot of the siding it has the real thing to work
    // from instead.
    const references: string[] = Array.isArray(body?.references)
      ? body.references.slice(0, MAX_IMAGES - 1)
      : [];

    const blobFor = (uri: string) => {
      const p = splitDataUri(uri);
      if (!p) return null;
      return new Blob([base64ToBytes(p.base64)], { type: p.mediaType });
    };

    const primary = new Blob([base64ToBytes(parts.base64)], { type: parts.mediaType });

    const buildForm = (multi: boolean) => {
      const form = new FormData();
      form.append("model", "gpt-image-1");
      if (multi) {
        // First image is the one being rendered onto; the rest are reference.
        form.append("image[]", primary, `house.${ext}`);
        references.forEach((uri, i) => {
          const b = blobFor(uri);
          if (b) form.append("image[]", b, `reference-${i}.jpg`);
        });
      } else {
        form.append("image", primary, `house.${ext}`);
      }
      form.append("prompt", multi
        ? `${prompt}\n\nThe FIRST image is the photograph to render. The remaining images are more views of the SAME house — use them to get the siding, trim, roof, windows and proportions right, but do not change the camera position or composition of the first image.`
        : prompt);
      form.append("size", "1536x1024");
      form.append("quality", "high");
      form.append("input_fidelity", "high");
      return form;
    };

    const call = (multi: boolean) => fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: buildForm(multi),
    });

    let res = await call(references.length > 0);

    // If the multi-image form is rejected, fall back to the single-image call
    // rather than failing. A render from one photo is worth far more than an
    // error message, and this path already worked.
    if (!res.ok && references.length > 0) {
      const detail = await res.text();
      console.log(`[house] multi-image render failed ${res.status}, retrying with one: ${detail.slice(0, 200)}`);
      res = await call(false);
    }

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
    const finish: string = typeof body?.finish === "string" ? body.finish.slice(0, 200) : "";

    // Time of day does most of the work in an exterior render, so each preset
    // sets the light, the sky and what the surroundings are doing — not just a
    // colour grade over the same picture.
    const LIGHTING: Record<string, string> = {
      afternoon:
        "Late afternoon, sun low and warm at about 15 degrees off the horizon behind the camera's " +
        "shoulder. Long soft shadows raking across the lawn, warm light on the siding, deep blue " +
        "sky with a few high clouds. Golden-hour colour temperature around 4000K.",
      midday:
        "Late morning, high clear sun, neutral daylight around 5600K. Short crisp shadows, a bright " +
        "blue sky with scattered cumulus. Colours read true, which is what a material sample needs.",
      dusk:
        "Blue hour, ten minutes after sunset. Deep indigo sky with a warm band still on the horizon. " +
        "The deck is lit by its own lighting: warm recessed lights in the stair risers, low post-cap " +
        "lights along the railing, and warm interior light spilling out through the door. The lit " +
        "deck is the brightest thing in the frame and everything else falls off into blue.",
      overcast:
        "Bright overcast, the whole sky acting as a softbox. No cast shadows, only soft contact " +
        "occlusion. Even, slightly cool light that shows the decking colour and texture honestly.",
      autumn:
        "Mid-autumn afternoon. Low warm sun, trees turned to orange and deep red, a scatter of fallen " +
        "leaves on the lawn and a few on the deck. Long shadows and a slightly hazy warm atmosphere.",
    };

    const prompt = [
      `Convert this 3D CAD viewport into a photorealistic architectural exterior visualization —`,
      `the standard of image an architectural rendering studio delivers to a client, of the kind`,
      `produced by Lumion, Enscape or V-Ray. It must be indistinguishable from a photograph.`,
      ``,
      `HOLD THE GEOMETRY EXACTLY. This is a render of a specific structure, not an interpretation.`,
      `Same camera position, same lens, same composition, same proportions. The deck stays ${w} feet`,
      `along the house by ${d} feet out, ${h} feet above grade. Keep every post, joist and beam where`,
      `it is. Keep the railing layout, the stair position, and the break in the railing at the top of`,
      `the stairs. Keep the house wall, its door and its roof line. Do not move, resize, restyle, add`,
      `or remove any part of the structure or the building.`,
      ``,
      finish ? `MATERIALS — the customer has specified ${finish}. Render exactly that: correct colour,`
        : `MATERIALS — render the decking and railing exactly as coloured in the source image:`,
      `correct sheen, correct amount of grain. A composite board is uniform and low-sheen; a PVC board`,
      `has almost no grain; sawn cedar and pressure-treated pine vary strongly board to board. Show`,
      `the gaps between deck boards, softened board edges, hidden or countersunk fasteners, and the`,
      `slight unevenness of a real installed surface.`,
      ``,
      `LIGHTING — ${LIGHTING[style] || LIGHTING.afternoon}`,
      ``,
      `RENDERING — full global illumination with colour bleeding from the lawn onto the underside of`,
      `the deck. Ambient occlusion where posts meet the ground, in the framing bays, under the stair`,
      `treads and in every inside corner. Physically correct reflections and specular response per`,
      `material. Subtle atmospheric perspective with distance.`,
      ``,
      `SETTING — put the deck on a real property. Mown lawn with visible depth and individual blades`,
      `near the camera, mature planting beds against the foundation, shrubs and a tree in the middle`,
      `distance casting dappled light, a neighbouring roofline barely visible beyond. Natural`,
      `imperfection everywhere: nothing perfectly clean, nothing perfectly straight.`,
      ``,
      `CAMERA — shot on a full-frame body at 35mm, f/5.6, from tripod height. Verticals perfectly`,
      `parallel with no keystoning or fisheye. Mild depth of field with the deck sharp. Natural`,
      `photographic dynamic range: real highlight rolloff, open shadows, no HDR halos, no oversharp`,
      `edges, no CGI plastic sheen.`,
      ``,
      `Absolutely no people, no text, no logos, no watermark, no dimension lines, no annotations, and`,
      `no trace of the CAD viewport — no gridlines, no gizmos, no flat-shaded polygons.`,
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

const SKETCH_SYSTEM = `You are reading a builder's hand-drawn framing sketch and turning it into a
structural model. Treat it as a drawing to be transcribed, not a design to be
improved: report what is on the paper.

Sketches are dimensioned inconsistently. Some numbers are written on the drawing,
some are implied by a note ("2x10 @ 16"), and some are simply not there. For
every value say which of those it was. A dimension you inferred from the
proportions of a hand sketch is worthless — hand sketches are not to scale — so
if a number is not written down or stated in a note, mark it as not given rather
than estimating it from the geometry.

Read for:
  · overall width along the house and depth out from it
  · joist size and spacing, and which way the joists run
  · beam size, how many plies, and where it sits relative to the outer edge
  · post size, how many, and their spacing
  · whether it is ledger-attached to the house or free-standing
  · cantilever past the beam, if any
  · stairs — width, and which side they come off
  · guardrail, and any note about the infill
  · blocking, hangers, fasteners or any other note written on the drawing

Return ONLY a JSON object, no prose and no code fence:
{
  "model": {
    "widthFt": null, "depthFt": null, "heightFt": null,
    "joistSize": null, "joistSpacing": null,
    "beamSize": null, "beamPlies": null,
    "postSize": null, "postSpacingFt": null,
    "ledgerAttached": null, "cantileverFt": null,
    "deckingDirection": null,
    "guardrail": null, "stairs": null, "stairWidthFt": null
  },
  "sources": { "<field>": "written | noted | not given" },
  "confidence": { "<field>": "high | medium | low" },
  "notesOnDrawing": ["any text written on the sketch, transcribed"],
  "couldNotRead": ["what was illegible, ambiguous or missing"],
  "conflicts": ["anywhere the drawing contradicts itself"],
  "summary": "two or three sentences describing the structure as drawn"
}

joistSize, beamSize must be one of 2x6, 2x8, 2x10, 2x12. postSize must be 4x4 or
6x6. joistSpacing must be 12, 16 or 24. deckingDirection is "parallel" when the
boards run along the house or "perpendicular" when they run out from it. Use null
for anything not given — never a plausible default.`;

/**
 * Read a hand-drawn framing sketch.
 *
 * The honest scope: this transcribes a drawing into the model, it does not
 * guarantee an exact reproduction. A hand sketch is not to scale, so anything
 * not written down cannot be recovered from it — which is why every field comes
 * back with whether it was written on the paper, implied by a note, or absent,
 * and why nothing is applied until someone has looked at it.
 */
app.post("/read-sketch", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const images: string[] = Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const note: string = typeof body?.note === "string" ? body.note.slice(0, 800) : "";

    if (!images.length) return c.json({ error: "Add a photo of the sketch." }, 400);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return c.json({ error: "Sketch reading is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);

    const blocks: any[] = [];
    for (const uri of images) {
      const parts = splitDataUri(uri);
      if (!parts) continue;
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: parts.mediaType, data: parts.base64 },
      });
    }
    if (!blocks.length) return c.json({ error: "That image could not be read. Try a JPEG or PNG." }, 400);

    blocks.push({
      type: "text",
      text: [
        `${blocks.length} image${blocks.length > 1 ? "s" : ""} of a hand-drawn framing sketch.`,
        note ? `What the builder said about it: ${note}` : "",
        "Transcribe it as JSON.",
      ].filter(Boolean).join("\n\n"),
    });

    const client = new Anthropic({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("HOUSE_CAPTURE_MODEL") || "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SKETCH_SYSTEM,
      messages: [{ role: "user", content: blocks }],
    });

    const raw = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text = fenced ? fenced[1].trim() : raw;
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    const candidate = first !== -1 && last > first ? text.slice(first, last + 1) : text;

    let parsed: any;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      return c.json({ error: "The reading came back unreadable. Try a clearer photo." }, 502);
    }

    return c.json({ sketch: parsed });
  } catch (err: any) {
    console.log(`[house] read-sketch failed: ${err?.message || err}`);
    return c.json({ error: `Could not read that sketch: ${err?.message || err}` }, 500);
  }
});

export default app;
