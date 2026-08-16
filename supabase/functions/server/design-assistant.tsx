/**
 * design-assistant — someone to ask while the design is open.
 *
 * The design centre could already tell you that a span was too long. What it
 * could not do was answer "why", or "what should I change", or "the inspector
 * wants a lateral connection, where does that go". Those are the questions that
 * actually come up mid-design, and until now the answer was to close the laptop
 * and phone somebody.
 *
 * TWO RULES SHAPE THIS.
 *
 * It never edits the design. It proposes changes, and the proposals come back
 * as structured patches the builder applies or ignores. An assistant that
 * quietly changed a joist size while answering a question about stairs would be
 * unusable in a permit workflow, because the drawing that gets submitted has to
 * be the one that was reviewed.
 *
 * It works from the real numbers. The current model, the site loads, the
 * computed takeoff and every advisory the app has already raised are all sent
 * with the question, so it is reasoning about this deck rather than decks in
 * general. Where the app has already calculated something — a footing size, a
 * load per post — the assistant is told to use that number rather than
 * recomputing it, so the two can never contradict each other on the same page.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const app = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function requireSignedIn(c: any, next: any) {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
  if (!token) return c.json({ error: "Sign in required." }, 401);
  const { data, error } = await service().auth.getUser(token);
  if (error || !data?.user) return c.json({ error: "Sign in required." }, 401);
  await next();
}

app.use("*", requireSignedIn);

const SYSTEM = `You are sitting with a deck builder while they design a deck on screen. You
know framing, the IRC, and AWC DCA 6, and you talk like someone who has built
decks rather than someone reading a code book aloud.

HOW TO ANSWER
Be brief. A builder mid-design wants the answer, then the reason, then nothing
else. Two or three sentences is usually right; use a short list only when the
answer genuinely is a list of steps or parts. Do not restate their question back
to them, do not open with a pleasantry, and do not close by offering further
help.

Give the number, then why it is that number. "Go to 2x10s — at a 12ft span a 2x8
is over the DCA 6 table at 16in centres" beats a paragraph about span theory.

THE NUMBERS IN FRONT OF YOU
The current design, the site loads and everything the app has already computed
are given below. Use those figures. If the app says the load per post is 2,340
lbs, that is the number — do not recompute it and do not offer a different one,
because the builder is looking at both on the same screen and a contradiction
destroys their trust in the whole tool.

WHEN SOMETHING IS MISSING
Ground snow load, frost depth and soil bearing come from the building department
and are frequently blank. If an answer depends on one that is missing, say which
one and that it has to come from the town. Never substitute a typical value —
a plausible number gets believed and then built.

WHEN THEY ARE OUTSIDE THE TABLES
Prescriptive tables cover most residential decks and not all of them. If this
design is past what DCA 6 or the IRC covers, say so plainly and say an engineer
is needed. Do not extend a table by interpolating past its last row.

PROPOSING CHANGES
When the answer implies a change to the design, put it in "changes" so it can be
applied with one press. Only include fields that should actually change. If they
asked a question that needs no change, return an empty array.

Return ONLY a JSON object, no prose outside it and no code fence:
{
  "answer": "your reply, in plain text, using markdown only for lists",
  "changes": [
    { "field": "joistSize", "value": "2x10", "why": "one short sentence" }
  ],
  "needsFromTown": ["ground snow load"],
  "engineerRequired": false
}

Valid fields for "changes": widthFt, depthFt, heightFt, joistSize, joistSpacing,
beamSize, beamPlies, postSize, postSpacingFt, ledgerAttached, cantileverFt,
deckingDirection, guardrail, stairs, stairWidthFt, deckingFinish, railFinish,
innerHandrail.
joistSize and beamSize are one of 2x6, 2x8, 2x10, 2x12. postSize is 4x4 or 6x6.
joistSpacing is 12, 16 or 24. deckingDirection is "parallel" or "perpendicular".`;

/** Everything the model needs to reason about this specific deck. */
function describe(body: any): string {
  const m = body?.model || {};
  const site = body?.site || {};
  const loads = body?.loads || {};
  const bom = body?.takeoff || {};
  const struct = body?.structural || null;
  const advisories: any[] = Array.isArray(body?.advisories) ? body.advisories : [];

  const lines = [
    "THE DESIGN AS IT STANDS",
    `${m.widthFt}ft along the house by ${m.depthFt}ft out, ${m.heightFt}ft above grade.`,
    `${m.joistSize} joists at ${m.joistSpacing}in on centre, spanning ${bom.joistSpanFt}ft.`,
    `(${m.beamPlies}) ${m.beamSize} built-up beam on ${m.postSize} posts at ${m.postSpacingFt}ft centres.`,
    m.ledgerAttached ? "Ledger-attached to the house." : "Free-standing, not ledger-attached.",
    `${m.cantileverFt}ft cantilever past the beam. Decking runs ${m.deckingDirection} to the house.`,
    m.guardrail ? "Guardrail fitted." : "No guardrail.",
    m.stairs ? `Stairs ${m.stairWidthFt}ft wide.` : "No stairs.",
    `Decking finish: ${m.deckingFinish}. Railing: ${m.railFinish}.`,
    "",
    "WHERE IT IS",
    `${site.projectName || "Unnamed"} — ${site.address || "no address"}, ${site.town || "no town"}${site.state ? ", " + site.state : ""}.`,
    "",
    "SITE VALUES FROM THE BUILDING DEPARTMENT",
    loads.groundSnowPsf > 0 ? `Ground snow load: ${loads.groundSnowPsf} psf.` : "Ground snow load: NOT SUPPLIED.",
    loads.frostDepthIn > 0 ? `Frost depth: ${loads.frostDepthIn} in.` : "Frost depth: NOT SUPPLIED.",
    `Soil: ${loads.soil || "unknown"}.`,
    loads.verified ? "These were confirmed against the town." : "These have NOT been confirmed against the town.",
  ];

  if (struct?.computable) {
    lines.push(
      "",
      "WHAT THE APP HAS ALREADY CALCULATED — use these figures, do not recompute",
      `Design live load ${struct.designLivePsf} psf${struct.snowGoverns ? " (snow governs)" : ""}, dead ${struct.deadLoadPsf} psf, total ${struct.totalLoadPsf} psf.`,
      `Tributary area per post ${struct.tributaryAreaSqFt} sq ft, load per post ${struct.postLoadLbs} lbs.`,
      `Soil bearing ${struct.soilPsf} psf, required footing ${struct.roundFootingDiameterIn}in round or ${struct.squareFootingSideIn}in square, minimum depth ${struct.frostDepthIn}in.`,
    );
    if (struct.proposed) {
      lines.push(
        `Proposed footing ${struct.proposed.sizeIn}in ${struct.proposed.shape} at ${struct.proposed.depthIn}in deep — ${struct.proposed.utilizationPct}% utilised, ${struct.proposed.passes ? "ADEQUATE" : "NOT ADEQUATE"}.`,
      );
    }
    if (struct.failures?.length) {
      lines.push("", "BLOCKING PROBLEMS THE APP HAS ALREADY FLAGGED", ...struct.failures.map((f: string) => `· ${f}`));
    }
  } else if (struct) {
    lines.push("", `Structural figures cannot be computed yet: ${(struct.missing || []).join(" and ")} missing.`);
  }

  if (advisories.length) {
    lines.push("", "ADVISORIES ALREADY SHOWING ON SCREEN", ...advisories.map((a: any) => `· ${a.text}`));
  }

  if (bom.deckAreaSqFt) {
    lines.push(
      "",
      "TAKEOFF",
      `${bom.deckAreaSqFt} sq ft. ${bom.joists} joists, ${bom.posts} posts, ${bom.footings} footings, ${bom.deckingBoards} decking boards.`,
    );
  }

  return lines.join("\n");
}

app.post("/ask", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const question = String(body?.question || "").trim().slice(0, 2000);
    const history: any[] = Array.isArray(body?.history) ? body.history.slice(-8) : [];

    if (!question) return c.json({ error: "Ask a question." }, 400);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return c.json({ error: "The assistant is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);

    const client = new Anthropic({ apiKey: key });

    const messages = [
      ...history
        .filter((h: any) => h?.role === "user" || h?.role === "assistant")
        .map((h: any) => ({ role: h.role, content: String(h.content || "").slice(0, 4000) })),
      { role: "user" as const, content: `${describe(body)}\n\n---\n\nTHEIR QUESTION\n${question}` },
    ];

    const message = await client.messages.create({
      model: Deno.env.get("DESIGN_ASSISTANT_MODEL") || "claude-opus-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages,
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
      // A well-formed sentence that failed to be JSON is still a useful answer;
      // losing it to a parse error would be the worse outcome.
      parsed = { answer: raw, changes: [], needsFromTown: [], engineerRequired: false };
    }

    return c.json({
      answer: String(parsed.answer || "").trim() || "No answer came back — try asking again.",
      changes: Array.isArray(parsed.changes) ? parsed.changes.slice(0, 8) : [],
      needsFromTown: Array.isArray(parsed.needsFromTown) ? parsed.needsFromTown : [],
      engineerRequired: !!parsed.engineerRequired,
    });
  } catch (err: any) {
    console.log(`[design-assistant] ask failed: ${err?.message || err}`);
    return c.json({ error: `Could not answer that: ${err?.message || err}` }, 500);
  }
});

export default app;
