/**
 * Reading a subcontractor's quote, however they sent it.
 *
 * WHY A READER RATHER THAN A FORM
 *
 * Because they will not fill in the form. A subcontractor sends a PDF on his
 * own letterhead, or a photograph of something handwritten taken in the van,
 * and a system that requires otherwise gets routed around by email — at which
 * point the numbers live in an inbox and the scope is out of date and lying.
 *
 * So this reads what they actually send: pasted text, a photographed quote, a
 * still from a walkthrough video. The standard form exists for the ones who
 * will use it; this exists for everyone else.
 *
 * WHAT IT WILL NOT DO
 *
 * Write anything. It returns a reading and a set of proposed matches against
 * our scope lines, and the office accepts them. An AI parsing a supplier's PDF
 * and silently putting money into a customer quote is exactly the wrong shape —
 * the failure is a wrong number nobody typed and nobody checked, sitting in
 * front of a customer with our name on it.
 *
 * It also reports what it could not match, in both directions. A line of theirs
 * fitting nothing of ours may be work we forgot to scope; one of ours with
 * nothing against it may be work they have not priced. Both matter more than
 * the total, and both disappear if a reader only reports its successes.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { trustedRole } from "./trustedRole.ts";

const app = new Hono();

const STAFF = new Set([
  "owner", "platform_owner", "business_owner", "admin", "master_admin",
  "super_admin", "superadmin", "management", "staff", "employee",
  "project_manager", "estimator", "office",
]);

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Staff only.
 *
 * A subcontractor's pricing is not something a customer, a tenant or another
 * vendor should be able to read, and this route returns it in structured form.
 */
async function requireStaff(c: any, next: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ error: "Sign in required." }, 401);
  const { data, error } = await service().auth.getUser(token);
  if (error || !data?.user) return c.json({ error: "Sign in required." }, 401);
  const owners = ["ericerb555@proton.me", ...(Deno.env.get("PLATFORM_OWNER_EMAILS") || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean)];
  const isStaff = owners.includes(String(data.user.email || "").toLowerCase())
    || STAFF.has(trustedRole(data.user));
  if (!isStaff) return c.json({ error: "Internal access is required." }, 403);
  c.set("actor", data.user);
  await next();
}

app.use("*", requireStaff);

const MAX_IMAGES = 8;
const MAX_TEXT = 40_000;

function splitDataUri(uri: string): { mediaType: string; base64: string } | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec((uri || "").trim());
  return m ? { mediaType: m[1].toLowerCase(), base64: m[2] } : null;
}

const SYSTEM = `You read subcontractor quotes for a construction company and line
them up against the company's own scope of work.

You are reading a document somebody else wrote, in their own words and their own
order. Your job is to say what it actually says — not to tidy it, not to fill in
what a quote usually contains, and never to invent a number that is not printed.

Rules that matter more than completeness:

1. Copy their wording verbatim into "description". It is what they will argue
   from later, and a paraphrase is a different quote.
2. Only report an amount you can actually see. If a line has no price, report it
   with amount 0 and say so in a note. A guessed number is worse than a gap.
3. "statedTotal" is the total printed on the document. If the lines do not add
   up to it, that is a fact about their quote — report both and do not reconcile
   them.
4. Match a line of theirs to one of ours only when you are confident they are
   the same work. Say why in one short clause. When unsure, leave it unmatched
   and let a person decide — an unmatched line costs somebody thirty seconds, a
   wrong match costs them the difference.
5. Several of their lines may belong to one of ours. That is normal.
6. Report every line of theirs that matched nothing, and every one of ours that
   nothing was priced against.

confidence is 0 to 1 and should be honest. Below 0.7 will not be pre-selected.

Return ONLY JSON:
{
  "vendor": "who sent it, as printed, or empty",
  "statedTotal": number or null,
  "lines": [{ "description": "their words", "amount": 0, "qty": 0, "unit": "", "readConfidence": 0.9 }],
  "matches": [{ "ourLineId": "", "ourDescription": "", "theirIndex": 0, "theirDescription": "", "amount": 0, "confidence": 0.9, "why": "" }],
  "unmatchedTheirs": [0],
  "unmatchedOurs": ["id"],
  "notes": ["anything a person should know before accepting this"]
}`;

app.post("/read", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const text: string = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
    const images: string[] = Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const ourLines: any[] = Array.isArray(body?.ourLines) ? body.ourLines.slice(0, 200) : [];

    if (!text.trim() && !images.length) {
      return c.json({ error: "Attach their quote — a document, a photo of it, or paste the text." }, 400);
    }

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return c.json({ error: "Reading is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);

    const blocks: any[] = [];
    for (const uri of images) {
      const p = splitDataUri(uri);
      if (p) blocks.push({ type: "image", source: { type: "base64", media_type: p.mediaType, data: p.base64 } });
    }

    blocks.push({
      type: "text",
      text: [
        "Our scope lines, which theirs should be matched against:",
        JSON.stringify(ourLines.map((l: any) => ({
          id: String(l.id || ""),
          description: String(l.description || ""),
          trade: String(l.trade || ""),
          phase: String(l.phase || ""),
        })), null, 1),
        "",
        text.trim() ? "Their quote, as text:" : "Their quote is in the attached image(s).",
        text.trim(),
      ].filter(Boolean).join("\n"),
    });

    const client = new Anthropic({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("BID_INTAKE_MODEL") || "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [{ role: "user", content: blocks }],
    });

    const raw = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    // Models sometimes wrap JSON in prose or a fence. Take the outermost object
    // rather than failing on the decoration around it.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return c.json({ error: "That could not be read. Enter it by hand." }, 502);
    }

    let reading: any;
    try {
      reading = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return c.json({ error: "That could not be read. Enter it by hand." }, 502);
    }

    // Shape it defensively. A reading half-returned is worse than a clean
    // refusal, because the half that arrived looks complete.
    const lines = Array.isArray(reading.lines) ? reading.lines : [];
    const matches = (Array.isArray(reading.matches) ? reading.matches : [])
      // Never let a match name one of our lines that does not exist — that would
      // write money onto nothing.
      .filter((m: any) => ourLines.some((l: any) => String(l.id) === String(m.ourLineId)));

    return c.json({
      reading: {
        vendor: String(reading.vendor || ""),
        statedTotal: typeof reading.statedTotal === "number" ? reading.statedTotal : null,
        lines: lines.map((l: any) => ({
          description: String(l.description || "").slice(0, 300),
          amount: Number(l.amount) || 0,
          qty: Number(l.qty) || undefined,
          unit: String(l.unit || "") || undefined,
          readConfidence: Math.min(1, Math.max(0, Number(l.readConfidence) || 0)),
        })),
        matches: matches.map((m: any) => ({
          ourLineId: String(m.ourLineId),
          ourDescription: String(m.ourDescription || ""),
          theirIndex: Number(m.theirIndex) || 0,
          theirDescription: String(m.theirDescription || "").slice(0, 300),
          amount: Number(m.amount) || 0,
          confidence: Math.min(1, Math.max(0, Number(m.confidence) || 0)),
          why: String(m.why || "").slice(0, 200),
        })),
        unmatchedTheirs: Array.isArray(reading.unmatchedTheirs) ? reading.unmatchedTheirs.map(Number) : [],
        unmatchedOurs: Array.isArray(reading.unmatchedOurs) ? reading.unmatchedOurs.map(String) : [],
        notes: Array.isArray(reading.notes) ? reading.notes.map(String).slice(0, 10) : [],
      },
      // Said in the response so it travels with the data rather than living
      // only in whichever screen happens to show it.
      disclaimer:
        "A reading of their document, not their quote. Check the lines against what they "
        + "sent before accepting anything — the original stays attached for that reason.",
    });
  } catch (error: any) {
    return c.json({ error: error?.message || "That could not be read." }, 500);
  }
});

export default app;
