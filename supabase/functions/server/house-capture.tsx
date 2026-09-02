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
import * as kv from "./kv_store.tsx";
import { trustedRole } from "./trustedRole.ts";
import { reserve, refund } from "./aiSpend.ts";

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
  c.set("actor", data.user);
  await next();
}

app.use("*", requireSignedIn);

/* ───────────────────────── spend ceiling ───────────────────────── */

/**
 * Moved to `aiSpend.ts`.
 *
 * It was written here, worked, and then a second expensive route — the
 * blueprint reader — needed exactly the same thing. Copying it would have left
 * two ceilings to keep in agreement, and the one that drifted would be the one
 * nobody was watching. The keys are unchanged, so live counters carry over.
 */
const reserveImages = (user: any, n: number) => reserve(user, "render", n);
const refundImages = (user: any, n: number) => refund(user, "render", n);

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

/**
 * Objects of exactly known size that somebody can put in a photograph.
 *
 * WHY THIS BEATS WHAT WE DID BEFORE
 *
 * The analysis scaled from assumed standards — "an entry door is 80 inches",
 * "siding courses expose 4 to 8 inches". The assumption is the error. Real
 * entry doors are 78, 80 or 82 inches; that siding range is itself ±30%, and
 * every dimension derived from it inherits that.
 *
 * These do not vary. A sheet of US Letter is 8.5 by 11 inches in every house in
 * the country. Photographed flat against the wall it is a scale reference in the
 * same plane as the thing being measured, which is the only circumstance where
 * a single scale factor is actually valid — the reason a known width at the near
 * corner does not scale the far corner is perspective, and staying in one plane
 * is how that is avoided rather than worked around.
 *
 * Asking a homeowner for a sheet of paper is also a smaller ask than asking for
 * a measurement: nothing to own, nothing to read, nothing to get wrong.
 */
interface ScaleObject { id: string; label: string; longIn: number; shortIn: number; note: string }

const SCALE_OBJECTS: ScaleObject[] = [
  {
    id: "letter", label: "sheet of US Letter paper", longIn: 11, shortIn: 8.5,
    note: "Ordinary printer paper. The best one — large, flat, rectangular and high contrast.",
  },
  {
    id: "a4", label: "sheet of A4 paper", longIn: 11.69, shortIn: 8.27,
    note: "297 by 210 mm.",
  },
  {
    id: "dollar", label: "US dollar bill", longIn: 6.14, shortIn: 2.61,
    note: "Every note is the same size whatever its value. Good for close work.",
  },
  {
    id: "card", label: "credit or bank card", longIn: 3.37, shortIn: 2.125,
    note: "ISO/IEC 7810 ID-1, 85.60 by 53.98 mm, identical worldwide.",
  },
];

/**
 * The scale section of the prompt, built from whatever the customer says they
 * put in the shot.
 *
 * Two planes are kept separate deliberately. A reference taped to the wall
 * scales what is on the wall; one lying on the ground scales the ground. Using
 * one for the other reintroduces exactly the perspective error the reference
 * was there to remove, so the model is told plainly not to.
 */
function scaleSection(refs: Array<{ object: string; placement: string }>): string {
  const known = refs
    .map(r => ({ obj: SCALE_OBJECTS.find(o => o.id === r.object), placement: r.placement }))
    .filter(r => r.obj) as Array<{ obj: ScaleObject; placement: string }>;

  if (!known.length) {
    return `SCALE. Photographs have no inherent scale, and nothing of known size was
placed in these. Derive dimensions only from a reference of known size that you
can actually see, and name it:
  · a standard entry door is 80 inches tall, 36 inches wide
  · a standard exterior step riser is 7 to 7.75 inches
  · lap siding courses expose 4 to 8 inches
  · a concrete block is 8 inches tall, 16 long
  · a brick course with mortar is about 2.67 inches
These are assumptions about typical construction, not measurements of this
house, so mark every dimension you take from them as basis "assumed-standard".
State which reference you used and how confident you are. Perspective, camera
tilt and lens distortion all bias these — assume every number is an estimate to
be checked with a tape.`;
  }

  const lines = known.map(r =>
    `  · A ${r.obj.label} — exactly ${r.obj.longIn} by ${r.obj.shortIn} inches — placed ${
      r.placement === "ground" ? "flat on the ground" : "flat against the wall"
    }. ${r.obj.note}`);

  return `SCALE. Something of known size was deliberately placed in these photographs.

${lines.join("\n")}

FIND IT FIRST, before estimating anything. It is an exact measurement of this
house on this day, and it beats every assumption about typical construction.
Anything you derive from it, mark basis "scale-object" and name which one.

STAY IN ITS PLANE. A reference against the wall scales what is on the wall — the
sill height, the ledger run, window and door sizes. A reference on the ground
scales the ground. Do not use one to measure the other: the whole reason a known
width at the near corner cannot scale the far corner is perspective, and a
reference only escapes that for things at its own depth and orientation.

If you cannot find it, say so in "scaleReference" and fall back to assumptions —
a standard entry door is 80 inches tall, a step riser 7 to 7.75, lap siding
courses expose 4 to 8, a brick course about 2.67. Mark anything from those
"assumed-standard". Never report a number as scale-object when you did not
actually find the object.`;
}

const ANALYSIS_SYSTEM = `You are a deck builder standing in the customer's yard looking at their house,
deciding how a deck attaches to it. You are reading photographs, so you can see
what is there but you cannot measure anything directly.

Report only what is visible. If something is not in frame or is ambiguous, say
so — "not visible" is a useful answer and a guess is not. A wrong siding call
sends the crew with the wrong flashing; a wrong sill height builds a deck that
steps up into the door.

__SCALE_SECTION__

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
    "sillBasis": "scale-object | assumed-standard | not-visible",
    "sillConfidence": "high | medium | low",
    "rimJoistVisible": true,
    "rimJoistNote": "what the band/rim area looks like — this is what a ledger bolts to",
    "ledgerRunFeet": 0,
    "ledgerRunReference": "what you scaled it from",
    "ledgerRunBasis": "scale-object | assumed-standard | not-visible",
    "ledgerRunConfidence": "high | medium | low"
  },
  "scaleReference": {
    "found": false,
    "which": "which of the placed objects you found, if any",
    "where": "on the wall | on the ground | not found",
    "note": "how well it read — flat and square to camera, or angled and small"
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
    "dropBasis": "scale-object | assumed-standard | not-visible",
    "dropConfidence": "high | medium | low"
  },
  "suggested": {
    "deckHeightFt": 0,
    "widthFt": 0,
    "depthFt": 0,
    "ledgerAttached": true,
    "why": "one or two sentences on why these numbers, in a builder's voice"
  },
  "existingDeck": {
    "present": false,
    "wallDescription": "which wall it is on, if there is one",
    "widthFt": 0,
    "depthFt": 0,
    "sizeReference": "what you scaled it from",
    "condition": "what the decking, framing, posts and railing look like",
    "salvageable": "what could be reused, if anything — usually nothing structural"
  },
  "cautions": ["things that would change the price or the permit"],
  "notVisible": ["what a photo could not show that still has to be checked on site"]
}

EXISTING DECK. Most of this company's work is replacing something, not building
on bare ground. If a deck is already there, it is the most useful thing in the
photograph: it shows exactly where the new one goes and roughly how big it was.
Report it whenever you can see one, measure it the same way you measure anything
else — by naming your scale reference — and note its condition, because a
tear-out is a real line on the quote.`;

/** The system prompt for one request, with its scale section spliced in. */
/**
 * Reading the whole outside of the house, rather than the one wall a deck
 * attaches to.
 *
 * A DIFFERENT JOB FROM THE DECK READ
 *
 * The deck analysis studies a single facade in depth — sill height, rim joist,
 * what a ledger can bolt to. A siding takeoff needs the opposite shape of
 * answer: every wall, roughly, with its area and its openings, because siding is
 * sold by the square across the whole building. Asking one prompt to do both
 * produces a worse version of each.
 *
 * WHY IT REPORTS PER WALL RATHER THAN A TOTAL
 *
 * A single "about 1,100 square feet" cannot be checked. Wall by wall, somebody
 * standing in the yard can see that the back was called 32 feet when it is 28
 * and fix that one number. It also lets the takeoff mark each wall separately,
 * so measuring one of them upgrades that wall alone rather than the whole thing
 * staying an estimate.
 */
const SIDING_SYSTEM = `You are an estimator standing outside a house working out what it would take
to re-side it. You are reading photographs, so you can see what is there but you
cannot measure anything directly.

Report only walls you can actually see. A wall that is not in frame is not a
guess to be made — leave it out and say so. Four confident walls beat six with
two invented.

__SCALE_SECTION__

MEASURING A WALL. Give its length along the ground and its height from grade to
the eave. If it has a gable, give the rise of the triangle ABOVE the eave
separately — do not roll it into the height, because a gable is half the area of
the rectangle under it and folding the two together overstates a cape or a
colonial by several squares.

OPENINGS. Count the windows and doors on each wall and give a typical size. They
matter twice over: the big ones come off the area, and every one of them needs
trim around it.

Return ONLY a JSON object, no prose and no code fence:
{
  "house": {
    "storeys": 1,
    "sidingType": "vinyl lap | wood clapboard | fiber cement | brick | stucco | stone | shingle | board and batten | unknown",
    "sidingColor": "plain language",
    "sidingCondition": "what the existing siding looks like — this is a tear-off unless it is being sided over",
    "outsideCorners": 4,
    "insideCorners": 0
  },
  "elevations": [
    {
      "label": "front | back | left | right, or plain language",
      "widthFt": 0,
      "heightToEaveFt": 0,
      "gableRiseFt": 0,
      "storeys": 1,
      "openings": { "count": 0, "typicalWidthFt": 3, "typicalHeightFt": 4 },
      "basis": "scale-object | assumed-standard | not-visible",
      "reference": "what you scaled it from",
      "confidence": "high | medium | low"
    }
  ],
  "notVisible": ["walls or details a photo could not show, which still have to be measured"],
  "cautions": ["things that would change the price — second storey, steep grade, obstructions"]
}

Every number here is an estimate to be checked with a tape before material is
ordered. Say so honestly in confidence rather than rounding your uncertainty
away.`;

export type CaptureSubject = "deck-wall" | "siding";

/**
 * The system prompt for one request.
 *
 * One composer, two subjects. The scale section is shared because a known-size
 * object works identically whichever question is being asked of the photograph.
 */
export function analysisSystem(
  refs: Array<{ object: string; placement: string }>,
  subject: CaptureSubject = "deck-wall",
): string {
  const base = subject === "siding" ? SIDING_SYSTEM : ANALYSIS_SYSTEM;
  return base.replace("__SCALE_SECTION__", scaleSection(refs));
}

export function readSubject(raw: unknown): CaptureSubject {
  return String(raw ?? "") === "siding" ? "siding" : "deck-wall";
}

/** What the client says was put in the shot, kept to things we actually know. */
export function readScaleRefs(raw: unknown): Array<{ object: string; placement: string }> {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Array<{ object: string; placement: string }> = [];
  for (const r of raw.slice(0, 4)) {
    const object = String((r as any)?.object || "").trim();
    if (!SCALE_OBJECTS.some(o => o.id === object)) continue;
    const placement = String((r as any)?.placement || "wall").trim() === "ground" ? "ground" : "wall";
    // One reference per plane. Two sheets on the same wall add nothing and give
    // the model a chance to pick the one further from what it is measuring.
    const key = `${object}:${placement}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ object, placement });
  }
  return out;
}

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
    const scaleRefs = readScaleRefs(body?.scaleRefs);
    const subject = readSubject(body?.subject);

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
        scaleRefs.length
          ? `Something of known size was placed in these photographs — find it before you estimate anything.`
          : "",
        subject === "siding"
          ? "Read every wall you can see and report them as JSON."
          : "Read the wall a deck would attach to and report it as JSON.",
      ].filter(Boolean).join("\n\n"),
    });

    const client = new Anthropic({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("HOUSE_CAPTURE_MODEL") || "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: analysisSystem(scaleRefs, subject),
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

/**
 * Where does the deck go?
 *
 * This used to be one hardcoded sentence — "attached to the wall where the door
 * is" — which is why decks came back on the wrong side of the house. A house has
 * a front door, a slider, usually a garage and often a bulkhead, so that phrase
 * left the image model to pick whichever door was most visually obvious, and it
 * picks the front.
 *
 * Meanwhile `/analyze` was already reporting `attachment.wallDescription` —
 * "which wall the deck would attach to, as seen" — and the client was dropping
 * it before calling render. The answer existed and was being thrown away.
 *
 * Three sources, most trustworthy first: what the operator typed (they are
 * standing in the yard), what the analysis read off the photographs, and
 * failing both, an honest admission that we do not know rather than a guess
 * dressed as an instruction.
 */
function placementLines(attachment: any, existing: any): string[] {
  const stated = String(attachment?.wallOverride || "").trim();
  const read = String(attachment?.wallDescription || "").trim();
  const door = String(attachment?.doorType || "").trim().toLowerCase();
  const doorPhrase = door && door !== "none visible" ? `the ${door} door` : "the door";

  // Replacing something is the strongest placement signal there is: the old
  // deck's own footprint is visible in the photograph, so there is nothing left
  // to infer. This is also the common case for a renovation company.
  if (existing?.replacing) {
    const size = Number(existing?.widthFt) > 0 && Number(existing?.depthFt) > 0
      ? ` The existing deck is roughly ${existing.widthFt} by ${existing.depthFt} feet.`
      : "";
    return [
      `This is a REPLACEMENT. The photograph shows an existing deck.${size}`,
      `Demolish and remove that existing deck completely — its decking, railing, framing, posts and stairs —`,
      `and build the new deck in exactly the same position, attached to the same wall, in the same footprint.`,
      stated ? `The wall is ${stated}.` : ``,
      `Do not leave any part of the old deck in the image, and do not place the new deck anywhere else on the house.`,
    ].filter(Boolean);
  }

  if (stated) {
    return [`Build the deck attached to ${stated}. Do not place it on any other wall of the house.`];
  }
  if (read) {
    // Only name the door when the wall description has not already named one,
    // so this does not come out as "the rear wall with the sliding door — the
    // wall with the slider door".
    const alreadySaysDoor = /\bdoor|slider|french|entry\b/i.test(read);
    const suffix = alreadySaysDoor ? "" : ` — the wall with ${doorPhrase}`;
    return [`Build the deck attached to ${read}${suffix}. Do not place it on any other wall.`];
  }
  return [
    `Build the deck attached to the wall with ${doorPhrase} that faces the back garden, not the street-facing front entrance.`,
  ];
}

/** Describe the deck to an image model in the words a photographer would use. */
/**
 * Which parts of the deck description the builder has already spoken about.
 *
 * WHY REMOVING BEATS OVERRIDING
 *
 * Telling an image model that a later line "overrides" an earlier one does not
 * work, and it fails worst on exactly the instructions people actually type.
 * Ask for "no stairs" and the prompt still carries a line reading "a set of
 * stairs down to grade with matching railing" four lines above it. The model
 * has one concrete visual description and one negation, and negations are the
 * weakest thing you can hand it — so it draws the stairs.
 *
 * So the competing line is deleted rather than contradicted. If the builder has
 * said anything about the stairs, the generated stairs line does not go in the
 * prompt at all, and their sentence is the only thing in there on the subject.
 * That is deterministic: it does not depend on the model choosing correctly
 * between two instructions, because it only ever sees one.
 *
 * Matching is deliberately generous. A false positive drops a generated default
 * and leaves the builder's own words — which is the safe direction. A false
 * negative leaves the contradiction in, which is the bug this exists to fix.
 */
export function topicsSpokenFor(extra: string): Set<string> {
  const t = String(extra || '').toLowerCase();
  const out = new Set<string>();
  if (!t.trim()) return out;

  const has = (...words: string[]) => words.some(w => t.includes(w));

  if (has('stair', 'step', 'tread', 'riser')) out.add('stairs');
  if (has('rail', 'baluster', 'spindle', 'picket', 'handrail', 'glass panel', 'cable')) out.add('railing');
  if (has('board', 'decking', 'composite', 'cedar', 'trex', 'azek', 'pvc', 'mahogany', 'ipe', 'pressure treated deck')) out.add('decking');
  if (has('wide', 'width', 'deep', 'depth', 'feet', 'foot', 'ft', 'bigger', 'smaller', 'size')) out.add('size');
  if (has('high', 'height', 'grade level', 'ground level', 'raised', 'lower it', 'higher')) out.add('height');
  if (has('post', 'footing', 'skirt', 'lattice', 'framing', 'beam', 'joist', 'underneath', 'under the deck')) out.add('understructure');

  return out;
}

function renderPrompt(deck: any, house: any, attachment: any, existing: any, extra: string): string {
  const w = Number(deck?.widthFt) || 16;
  const d = Number(deck?.depthFt) || 12;
  const h = Number(deck?.heightFt) || 3;
  const railing = deck?.railingStyle || "black aluminum";
  const decking = deck?.deckingMaterial || "grey composite";
  const stairs = deck?.stairs === false ? "no stairs" : "a set of stairs down to grade with matching railing";
  const siding = house?.sidingType && house.sidingType !== "unknown" ? house.sidingType : "the existing siding";

  // "Change nothing" cannot stand unqualified on a replacement — the old deck
  // is the one thing that must change, and an unqualified instruction to leave
  // the scene alone is why renders came back with two decks in them.
  const preserve = existing?.replacing
    ? `Change nothing about the house itself. The ONLY thing removed from the scene is the old deck.`
    : `Change nothing about the house itself.`;

  const spoken = topicsSpokenFor(extra);

  return [
    `Photorealistic architectural visualization. Keep this exact photograph of the house — same camera position,`,
    `same lens, same daylight, same shadows, same ${siding}, same trim, same roof, same landscaping and background.`,
    preserve,
    ``,
    ...placementLines(attachment, existing),
    ``,
    `The new deck:`,
    // Each of these is dropped when the builder has already said something on
    // the subject, so their sentence is the only instruction the model gets
    // about it. See topicsSpokenFor.
    spoken.has('size') ? `` : `· about ${w} feet wide along the house and ${d} feet out from it`,
    spoken.has('height') ? `` : `· deck surface about ${h} feet above the ground, so you can see the framing and posts underneath`,
    spoken.has('decking') ? `` : `· ${decking} deck boards running in neat parallel courses`,
    spoken.has('railing') ? `` : `· ${railing} railing at 36 inches with evenly spaced balusters`,
    spoken.has('understructure') ? `` : `· pressure treated posts on concrete footings, with visible beam and joists under the deck`,
    spoken.has('stairs') ? `` : `· ${stairs}`,
    ``,
    `The deck must sit correctly in the scene: perspective matching the house, contact shadows on the ground,`,
    `the deck surface just below the door threshold, and the railing occluding what is behind it.`,
    `No people, no furniture, no text, no watermark. Clean new construction on a real property.`,

    // The operator's own words go LAST and are marked as overriding.
    //
    // They used to be one bullet in the middle of the list above, with the same
    // weight as every generated line. So "no stairs" sat directly under a
    // generated line asking for stairs, and the picture followed whichever it
    // liked. The person typing this is standing in the yard looking at the
    // house; the generated lines are inferences. When they disagree, the person
    // wins.
    ...(extra ? [
      ``,
      // Stated twice, and the second time as a rule about the whole image.
      // Anything the builder has spoken about has already had its competing
      // line removed above, so this is not resolving a contradiction — it is
      // the only instruction on the subject, repeated for weight.
      `The builder, who is standing at this house, has asked specifically for:`,
      extra,
      ``,
      `Follow that exactly. It describes what is actually wanted here and takes`,
      `precedence over any general expectation of what a deck looks like.`,
      ...(spoken.size
        ? [`Draw only what is described there regarding the ${[...spoken].join(', ')}.`]
        : []),
    ] : []),
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

type PaintResult =
  | { ok: true; b64: string }
  | { ok: false; error: string; status: number };

/**
 * One deck, painted onto one photograph.
 *
 * Extracted so that rendering a single concept and rendering three looks side
 * by side go down exactly the same path. Two copies of this would drift, and
 * the failure would be three images that do not match each other — which is the
 * one thing a set of options must never do.
 */
async function paintDeck(opts: {
  parts: { mediaType: string; base64: string };
  references: string[];
  prompt: string;
  key: string;
  /**
   * A PNG the same size as the photograph, transparent exactly where the model
   * is allowed to paint and opaque everywhere else.
   *
   * WHY THIS IS THE ONLY THING THAT ACTUALLY FIXES PLACEMENT
   *
   * The prompt has been telling the model "build it on the back wall" and "do
   * not place the new deck anywhere else on the house" for a while, and decks
   * kept appearing on the wrong elevation. Words cannot point at pixels. A
   * photograph of a house has several walls and no labels, so "the back wall"
   * is a description the model has to resolve against the image, and it
   * resolves it wrong often enough to be useless.
   *
   * A mask is not a request. Pixels outside it are returned untouched, so the
   * deck cannot appear anywhere else — not because the model agreed, but
   * because it was never able to.
   */
  mask?: string;
}): Promise<PaintResult> {
  const { parts, references, prompt, key, mask } = opts;
  const ext = parts.mediaType.includes("png") ? "png" : "jpg";

  const blobFor = (uri: string) => {
    const p = splitDataUri(uri);
    if (!p) return null;
    return new Blob([base64ToBytes(p.base64)], { type: p.mediaType });
  };

  const primary = new Blob([base64ToBytes(parts.base64)], { type: parts.mediaType });

  const maskBlob = (() => {
    if (!mask) return null;
    const p = splitDataUri(mask);
    if (!p) return null;
    return new Blob([base64ToBytes(p.base64)], { type: "image/png" });
  })();

  const buildForm = (multi: boolean) => {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    // A mask applies to one image. Reference views would make the edit
    // ambiguous about which image the mask belongs to, so the caller gets
    // precise placement OR extra reference views, and placement wins.
    if (maskBlob) form.append("mask", maskBlob, "mask.png");
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

  let res = await call(references.length > 0 && !maskBlob);

  // If the multi-image form is rejected, fall back to the single-image call
  // rather than failing. A render from one photo is worth far more than an
  // error message, and this path already worked.
  if (!res.ok && references.length > 0 && !maskBlob) {
    const detail = await res.text();
    console.log(`[house] multi-image render failed ${res.status}, retrying with one: ${detail.slice(0, 200)}`);
    res = await call(false);
  }

  if (!res.ok) {
    const detail = await res.text();
    console.log(`[house] render failed ${res.status}: ${detail.slice(0, 400)}`);
    return { ok: false, error: `Render failed (${res.status}). ${detail.slice(0, 200)}`, status: 502 };
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) return { ok: false, error: "The render came back empty.", status: 502 };
  return { ok: true, b64 };
}

app.post("/render", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const photo: string = typeof body?.photo === "string" ? body.photo : "";
    const deck = body?.deck || {};
    const house = body?.house || {};
    // The wall the analysis read, plus anything the operator typed over it.
    // Trimmed to a sane length because it goes straight into a prompt.
    const attachment = {
      wallDescription: String(body?.attachment?.wallDescription || "").slice(0, 200),
      wallOverride: String(body?.attachment?.wallOverride || "").slice(0, 200),
      doorType: String(body?.attachment?.doorType || "").slice(0, 60),
    };
    const existing = {
      replacing: body?.existing?.replacing === true,
      widthFt: Number(body?.existing?.widthFt) || 0,
      depthFt: Number(body?.existing?.depthFt) || 0,
    };
    const extra: string = typeof body?.extra === "string" ? body.extra.slice(0, 1500) : "";
    // Where on the photograph the change is allowed to happen.
    const mask: string = typeof body?.mask === "string" ? body.mask : "";

    const parts = splitDataUri(photo);
    if (!parts) return c.json({ error: "Pick a photo of the house to render onto." }, 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "Rendering is not configured. Set the OPENAI_API_KEY secret." }, 503);

    const prompt = renderPrompt(deck, house, attachment, existing, extra);

    // Extra views of the same house. One photograph shows one wall from one
    // angle, and the model has to invent everything it cannot see — which is
    // where a render starts disagreeing with the actual house. Given the side
    // elevation and a closer shot of the siding it has the real thing to work
    // from instead.
    const references: string[] = Array.isArray(body?.references)
      ? body.references.slice(0, MAX_IMAGES - 1)
      : [];

    const actor = c.get("actor");
    const refused = await reserveImages(actor, 1);
    if (refused) return c.json(refused, 429);

    const shot = await paintDeck({ parts, references, prompt, key, mask });
    if (!shot.ok) {
      await refundImages(actor, 1);
      return c.json({ error: shot.error }, shot.status as any);
    }

    const url = await putAsset(base64ToBytes(shot.b64), "png", "image/png");
    if (!url) {
      await refundImages(actor, 1);
      return c.json({ error: "The render was made but could not be stored." }, 500);
    }

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
 * The photoreal pass over a composite that already contains the geometry.
 *
 * WHY THIS EXISTS BESIDE /render RATHER THAN REPLACING IT
 *
 * /render describes a deck in words and asks for a picture of one. That is a
 * fresh roll of the dice every time — words cannot measure sixteen feet, and
 * the deck kept landing on a different wall. This route is given the deck
 * already in the right place, rendered from the model somebody drew, and asked
 * only to make it photographic.
 *
 * The image model stops being an architect. It cannot get the size wrong
 * because it is not choosing the size.
 *
 * THE CONSTRAINTS ARE BUILT HERE, NOT ACCEPTED FROM THE CLIENT
 *
 * The client has its own copy of this wording so it can show the operator what
 * will be sent, and that copy is the tested one. But the sentences that stop
 * the model moving things are assembled on the server, because a prompt that
 * arrives over the wire is a prompt somebody can shorten — and a shortened one
 * produces exactly the wandering deck this route was built to end.
 */
function photorealPrompt(opts: {
  material?: string; railing?: string; timeOfDay?: string; extra?: string;
}): string {
  const lines = [
    "This photograph already contains a 3D render of a deck composited onto it.",
    "The deck geometry is correct and measured. Your only job is to make it look photographic.",
    "",
    "DO NOT change the shape, size, position, angle or proportions of anything.",
    "DO NOT move, add or remove any post, board, step, railing or structural member.",
    "DO NOT alter the house, the roof, the siding, the windows, the sky or the ground.",
    "DO NOT reframe, crop, straighten or recompose the image.",
    "",
    "DO give the deck realistic material and surface texture.",
    "DO match the lighting direction, colour temperature and contrast of the photograph.",
    "DO add a natural contact shadow where the structure meets the ground.",
    "DO soften the composited edges so it sits in the scene rather than on top of it.",
  ];
  if (opts.material) lines.push(`Decking material: ${opts.material}.`);
  if (opts.railing) lines.push(`Railing: ${opts.railing}.`);
  if (opts.timeOfDay) lines.push(`Match the light to: ${opts.timeOfDay}.`);
  if (opts.extra) lines.push("", `Also: ${opts.extra}`);
  lines.push("", "If you are unsure whether a change is allowed, do not make it.");
  return lines.join("\n");
}

app.post("/photoreal", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const composite: string = typeof body?.composite === "string" ? body.composite : "";
    const mask: string = typeof body?.mask === "string" ? body.mask : "";

    const parts = splitDataUri(composite);
    if (!parts) {
      return c.json({ error: "Nothing to render. Composite the deck onto the photograph first." }, 400);
    }
    // Without the mask this becomes an unconstrained edit of the whole
    // photograph, which is the failure mode the pipeline exists to remove. It
    // is refused rather than quietly downgraded.
    if (!mask) {
      return c.json({
        error: "No mask. Rendering without one lets the model repaint the house, which is the "
          + "thing this pipeline exists to prevent.",
      }, 400);
    }

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "Rendering is not configured. Set the OPENAI_API_KEY secret." }, 503);

    const prompt = photorealPrompt({
      material: String(body?.material || "").slice(0, 120) || undefined,
      railing: String(body?.railing || "").slice(0, 120) || undefined,
      timeOfDay: String(body?.timeOfDay || "").slice(0, 120) || undefined,
      extra: String(body?.extra || "").slice(0, 800) || undefined,
    });

    const actor = c.get("actor");
    const refused = await reserveImages(actor, 1);
    if (refused) return c.json(refused, 429);

    // No reference views on purpose: a mask applies to one image, and precise
    // placement is the entire point of this route.
    const shot = await paintDeck({ parts, references: [], prompt, key, mask });
    if (!shot.ok) {
      await refundImages(actor, 1);
      // Narrowed by hand. This project's server config runs with
      // strictNullChecks off, which switches off discriminated-union narrowing
      // on a boolean, so `shot.error` after `if (!shot.ok)` does not typecheck.
      // The other callers of paintDeck carry that as a standing finding; this
      // one is written to avoid adding to it.
      const failed = shot as Extract<PaintResult, { ok: false }>;
      return c.json({ error: failed.error }, failed.status as any);
    }

    const done = shot as Extract<PaintResult, { ok: true }>;
    const url = await putAsset(base64ToBytes(done.b64), "png", "image/png");
    if (!url) {
      await refundImages(actor, 1);
      return c.json({ error: "The render was made but could not be stored." }, 500);
    }

    return c.json({
      url,
      prompt,
      disclaimer:
        "The geometry in this image came from the measured model, not from the image generator. "
        + "Lighting and materials are an artist's impression; the dimensions are the design. "
        + "The permit set still uses the drawings.",
    });
  } catch (err: any) {
    console.log(`[house] photoreal error: ${err?.message || err}`);
    return c.json({ error: `Render failed: ${err?.message || err}` }, 500);
  }
});

/** Three images is enough to sell from and cheap enough to run twice. */
const MAX_LOOKS = 3;

/**
 * The same deck, on the same wall, in a few different finishes.
 *
 * WHAT MAKES THIS SELL RATHER THAN CONFUSE
 *
 * Everything except the finishes is held still — same photograph, same wall,
 * same size, same stairs. A customer comparing three images should be deciding
 * between materials, not trying to work out what else moved. That is why the
 * placement and replacement instructions come from the same `renderPrompt` the
 * single render uses, with only the deck's finish fields varying per look.
 *
 * WHY EACH ONE CARRIES ITS DECK BACK
 *
 * The caller gets the exact deck each image represents, so choosing a look can
 * update the model and let the quote follow. An image a customer picks that the
 * estimate then contradicts is worse than no image at all.
 *
 * COST
 *
 * Each look is its own `gpt-image-1` call at high quality, so three looks cost
 * three renders. That is why this is a separate endpoint and a separate button
 * rather than something the ordinary render quietly does.
 */
/**
 * The customer's own room, with different floors in it.
 *
 * WHY IT SHARES THE MACHINERY AND NOT THE PROMPT
 *
 * The image call, the storage, the signed URLs and — most importantly — the
 * spend ceiling are all the same as the deck looks, so they are reused. What is
 * different is what the model is asked for, and that difference is the whole
 * job: a deck is added to a scene, whereas a floor replaces the one surface the
 * camera is looking across at a shallow angle. Sharing a prompt between the two
 * would produce a worse version of each.
 *
 * WHY THE CEILING MATTERS MORE HERE THAN ANYWHERE
 *
 * This is meant to be reached by customers from their own portal, which makes
 * it the first render button in this app that somebody outside the company can
 * press. `reserveImages` counts against their account and refuses past their
 * allowance, exactly as it does for staff — and a set is reserved as a block,
 * because half a set of options is not worth showing anyone.
 */
/**
 * Show a homeowner what they are imagining, on their own house.
 *
 * WHY THIS IS DELIBERATELY NOT THE DESIGN CENTRE'S RENDER
 *
 * The staff render paints a deck that has been designed — it knows the width,
 * the height, the railing and the decking, because a model exists. This one has
 * none of that. A customer types "what would a pergola look like over the
 * patio" and there is no model, no measurement and no quote behind it.
 *
 * So it is honest about being a picture. It changes only what was asked for,
 * preserves the house exactly, and everything it returns is labelled as an idea
 * rather than a proposal. A homeowner who believes a render is a promise is a
 * dispute at handover, and the render is far more persuasive than any small
 * print underneath it.
 *
 * The spend ceiling above applies unchanged: ten images per account, counted on
 * the server against the verified token. Browsing is unbounded by nature and
 * each image costs real money.
 */
app.post("/imagine", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const photo: string = typeof body?.photo === "string" ? body.photo : "";
    const wish: string = typeof body?.wish === "string" ? body.wish.slice(0, 500) : "";
    const mask: string = typeof body?.mask === "string" ? body.mask : "";

    if (!wish.trim()) return c.json({ error: "Tell us what you would like to see." }, 400);

    const parts = splitDataUri(photo);
    if (!parts) return c.json({ error: "Pick a photo of your home first." }, 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "This is not switched on yet." }, 503);

    const actor = c.get("actor");
    const refused = await reserveImages(actor, 1);
    if (refused) return c.json(refused, 429);

    // Preserve everything, change one thing. The instruction is stated twice
    // because "keep the house the same" is the half people notice missing — a
    // picture of somebody else's house with your deck on it sells nothing.
    const prompt = [
      `Photorealistic. Keep this exact photograph — same camera position, same lens,`,
      `same daylight and shadows, same house, same trim, same roof, same landscaping`,
      `and background. Change nothing except what is described below.`,
      ``,
      `What to change:`,
      wish,
      ``,
      `Everything else in the photograph must come back exactly as it is now.`,
      `No people, no text, no watermark. Keep it plausible for this property —`,
      `nothing that could not actually be built here.`,
    ].join("\n");

    const shot = await paintDeck({ parts, references: [], prompt, key, mask });
    if (!shot.ok) {
      await refundImages(actor, 1);
      return c.json({ error: shot.error }, shot.status as any);
    }

    const url = await putAsset(base64ToBytes(shot.b64), "png", "image/png");
    if (!url) {
      await refundImages(actor, 1);
      return c.json({ error: "It was made but could not be saved. Try again." }, 502);
    }

    return c.json({
      url,
      wish,
      // Carried in the response rather than left to the client, so the caveat
      // travels with the image wherever it is shown or forwarded.
      disclaimer:
        "An idea, not a plan. This is an illustration of what you asked for, not a "
        + "design, a measurement or a price — what can actually be built here depends "
        + "on the structure, the site and your town.",
    });
  } catch (error: any) {
    return c.json({ error: error?.message || "That did not work." }, 500);
  }
});

app.post("/floor-looks", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const photo: string = typeof body?.photo === "string" ? body.photo : "";
    const note: string = typeof body?.note === "string" ? body.note.slice(0, 300) : "";

    // Each look arrives already described. The wording is built on the client
    // from the finish catalogue the takeoff prices from, so a floor can never
    // be rendered that the estimate cannot then produce.
    const looks: any[] = Array.isArray(body?.looks) ? body.looks.slice(0, MAX_LOOKS) : [];
    if (!looks.length) return c.json({ error: "No floors were asked for." }, 400);

    const parts = splitDataUri(photo);
    if (!parts) return c.json({ error: "Take a photo of the room first." }, 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "Rendering is not configured. Set the OPENAI_API_KEY secret." }, 503);

    const actor = c.get("actor");
    const refused = await reserveImages(actor, looks.length);
    if (refused) return c.json(refused, 429);

    const settled = await Promise.all(looks.map(async (look: any) => {
      const prompt = String(look?.prompt || "").slice(0, 4000);
      if (!prompt) return { id: look?.id, name: look?.name, error: "That floor had no description." };

      // No reference images: a second photograph of a different room would pull
      // the render towards that room rather than this one.
      const shot = await paintDeck({ parts, references: [], prompt, key });
      if (!shot.ok) return { id: look?.id, name: look?.name, error: shot.error };

      const url = await putAsset(base64ToBytes(shot.b64), "png", "image/png");
      if (!url) return { id: look?.id, name: look?.name, error: "Rendered but could not be stored." };

      return { id: look?.id, name: look?.name, pitch: look?.pitch, material: look?.material, url };
    }));

    const ok = settled.filter((r: any) => r.url);
    if (ok.length < looks.length) await refundImages(actor, looks.length - ok.length);
    if (!ok.length) {
      return c.json({ error: settled[0]?.error || "None of the floors could be rendered." }, 502);
    }

    return c.json({
      looks: settled,
      rendered: ok.length,
      failed: settled.length - ok.length,
      // Said in the payload so it travels with the image wherever it is shown.
      disclaimer: "A visualisation of your own room, not a photograph of the finished floor. Colour and grain vary between batches — ask for a sample before deciding.",
    });
  } catch (err: any) {
    console.log(`[house] floor-looks error: ${err?.message || err}`);
    return c.json({ error: `Could not render those floors: ${err?.message || err}` }, 500);
  }
});

app.post("/looks", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const photo: string = typeof body?.photo === "string" ? body.photo : "";
    const house = body?.house || {};
    const attachment = {
      wallDescription: String(body?.attachment?.wallDescription || "").slice(0, 200),
      wallOverride: String(body?.attachment?.wallOverride || "").slice(0, 200),
      doorType: String(body?.attachment?.doorType || "").slice(0, 60),
    };
    const existing = {
      replacing: body?.existing?.replacing === true,
      widthFt: Number(body?.existing?.widthFt) || 0,
      depthFt: Number(body?.existing?.depthFt) || 0,
    };
    const extra: string = typeof body?.extra === "string" ? body.extra.slice(0, 1500) : "";

    // Each look arrives as a fully resolved deck plus the words describing its
    // finishes. The words are built on the client from the same finish tables
    // the 3D view uses, so a render can never show a colour the model does not
    // also hold.
    const looks: any[] = Array.isArray(body?.looks) ? body.looks.slice(0, MAX_LOOKS) : [];
    if (!looks.length) return c.json({ error: "No looks were asked for." }, 400);

    const parts = splitDataUri(photo);
    if (!parts) return c.json({ error: "Pick a photo of the house to render onto." }, 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return c.json({ error: "Rendering is not configured. Set the OPENAI_API_KEY secret." }, 503);

    const references: string[] = Array.isArray(body?.references)
      ? body.references.slice(0, MAX_IMAGES - 1)
      : [];

    // A set of looks is one image per look, so it costs what it costs. Reserved
    // as a block: half a set is not worth showing anyone, so it is better to
    // refuse the whole thing than to render two and run dry on the third.
    const actor = c.get("actor");
    const refused = await reserveImages(actor, looks.length);
    if (refused) return c.json(refused, 429);

    // Run them together — three sequential high-quality renders is a long wait
    // in front of a customer, and they do not depend on one another.
    const settled = await Promise.all(looks.map(async (look: any) => {
      const deck = look?.deck || {};
      const appearance = [
        look?.appearance?.decking ? `· ${look.appearance.decking}` : "",
        look?.appearance?.railing ? `· ${look.appearance.railing}` : "",
      ].filter(Boolean).join("\n");

      const prompt = renderPrompt(deck, house, attachment, existing,
        [extra, appearance].filter(Boolean).join("\n"));

      const shot = await paintDeck({ parts, references, prompt, key });
      if (!shot.ok) return { id: look?.id, name: look?.name, error: shot.error };

      const url = await putAsset(base64ToBytes(shot.b64), "png", "image/png");
      if (!url) return { id: look?.id, name: look?.name, error: "Rendered but could not be stored." };

      return { id: look?.id, name: look?.name, pitch: look?.pitch, caption: look?.caption, deck, url };
    }));

    const ok = settled.filter((r: any) => r.url);
    // Give back whatever did not become an image.
    if (ok.length < looks.length) await refundImages(actor, looks.length - ok.length);
    // A partial set is still worth showing — two good images beat an error —
    // but the caller is told which ones failed rather than being handed a
    // shorter list and left to wonder.
    if (!ok.length) {
      return c.json({ error: settled[0]?.error || "None of the looks could be rendered." }, 502);
    }

    return c.json({
      looks: settled,
      rendered: ok.length,
      failed: settled.length - ok.length,
      disclaimer: "Artist's impressions for discussion. Not to scale and not construction documents — the permit set uses the measured drawings.",
    });
  } catch (err: any) {
    console.log(`[house] looks error: ${err?.message || err}`);
    return c.json({ error: `Looks failed: ${err?.message || err}` }, 500);
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

    // Costs an image like any other render, so it comes out of the same
    // allowance. Leaving one paid route uncounted would make the ceiling
    // decorative.
    const actor = c.get("actor");
    const refused = await reserveImages(actor, 1);
    if (refused) return c.json(refused, 429);

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.log(`[house] photoreal failed ${res.status}: ${detail.slice(0, 400)}`);
      await refundImages(actor, 1);
      return c.json({ error: `Render failed (${res.status}). ${detail.slice(0, 200)}` }, 502);
    }

    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      await refundImages(actor, 1);
      return c.json({ error: "The render came back empty." }, 502);
    }

    const url = await putAsset(base64ToBytes(b64), "png", "image/png");
    if (!url) {
      await refundImages(actor, 1);
      return c.json({ error: "The render was made but could not be stored." }, 500);
    }

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
