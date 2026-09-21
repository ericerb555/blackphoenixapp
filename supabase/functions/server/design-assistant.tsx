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
 * computed takeoff, every advisory the app has already raised and the building
 * itself are all sent with the question, so it is reasoning about this job
 * rather than about construction in general. Where the app has already
 * calculated something — a footing size, a load per post — the assistant is
 * told to use that number rather than recomputing it, so the two can never
 * contradict each other on the same page.
 *
 * This file is the route. The prompt it sends lives in `assistantPrompt.ts`,
 * which has no Hono import and can therefore be unit-tested; see the note at
 * the top of that file for why that mattered enough to split them.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { readTrade, systemFor, describe, CHANGE_FIELDS } from "./assistantPrompt.ts";

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

app.post("/ask", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const question = String(body?.question || "").trim().slice(0, 2000);
    const history: any[] = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const trade = readTrade(body?.trade);

    if (!question) return c.json({ error: "Ask a question." }, 400);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return c.json({ error: "The assistant is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);

    const client = new (await import('npm:@anthropic-ai/sdk')).default({ apiKey: key });

    const messages = [
      ...history
        .filter((h: any) => h?.role === "user" || h?.role === "assistant")
        .map((h: any) => ({ role: h.role, content: String(h.content || "").slice(0, 4000) })),
      { role: "user" as const, content: `${describe(body, trade)}\n\n---\n\nTHEIR QUESTION\n${question}` },
    ];

    const message = await client.messages.create({
      model: Deno.env.get("DESIGN_ASSISTANT_MODEL") || "claude-opus-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      system: systemFor(trade),
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

    /**
     * Proposals are dropped for any trade with nothing to apply them to.
     *
     * The prompt already says to return none, and a prompt is a request rather
     * than a guarantee. The client turns each proposal into an Apply button
     * that patches the deck model, so a stray `joistSize` returned during a
     * bathroom question would render a button that silently edits a deck
     * nobody is looking at. Enforced here because this is the side that knows.
     */
    const applicable = Object.prototype.hasOwnProperty.call(CHANGE_FIELDS, trade);

    return c.json({
      answer: String(parsed.answer || "").trim() || "No answer came back — try asking again.",
      changes: applicable && Array.isArray(parsed.changes) ? parsed.changes.slice(0, 8) : [],
      needsFromTown: Array.isArray(parsed.needsFromTown) ? parsed.needsFromTown : [],
      engineerRequired: !!parsed.engineerRequired,
      trade,
    });
  } catch (err: any) {
    console.log(`[design-assistant] ask failed: ${err?.message || err}`);
    return c.json({ error: `Could not answer that: ${err?.message || err}` }, 500);
  }
});

export default app;
