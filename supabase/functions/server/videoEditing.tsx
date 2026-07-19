/**
 * videoEditing — produces AI-generated video editing suggestions.
 *
 * The client extracts real metadata from the uploaded clip (duration, size,
 * aspect ratio, name) and sends it here. We ask OpenAI to return a concrete,
 * structured editing plan (trim points, effects, transitions) scaled to the
 * actual clip duration, replacing the previous hardcoded "demo mode" mock.
 *
 * If OpenAI is unavailable we deterministically derive a plan from the real
 * duration rather than returning a fixed fake — the output still reflects the
 * actual clip.
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";

const videoEditingRouter = new Hono();
const PREFIX = "/make-server-57095a78";

videoEditingRouter.use("*", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

/** Deterministic plan derived from real clip duration (fallback + shape guarantee). */
function derivePlan(duration: number, name: string) {
  const d = Number.isFinite(duration) && duration > 0 ? duration : 30;
  const seg = d / 3;
  const trimPoints = [
    { id: 1, start: 0, end: Math.round(seg * 10) / 10, reason: "Opening hook — retain viewer attention" },
    { id: 2, start: Math.round(seg * 10) / 10, end: Math.round(seg * 2 * 10) / 10, reason: "Core message segment" },
    { id: 3, start: Math.round(seg * 2 * 10) / 10, end: Math.round(d * 10) / 10, reason: "Call to action / close" },
  ];
  const effects = [
    { id: 1, type: "fade", start: 0, end: Math.min(2, d * 0.05), intensity: 0.8 },
    { id: 2, type: "colorBoost", start: seg, end: seg * 2, intensity: 1.15 },
    { id: 3, type: "fade", start: Math.max(0, d - 2), end: d, intensity: 0.8 },
  ];
  const transitions = [
    { id: 1, type: "crossfade", between: [0, 1], duration: 1 },
    { id: 2, type: "crossfade", between: [1, 2], duration: 1 },
  ];
  return { trimPoints, effects, transitions, source: "derived", clip: { name, duration: d } };
}

videoEditingRouter.post(`${PREFIX}/video/ai-edit`, async (c) => {
  let meta: any = {};
  try {
    meta = await c.req.json();
  } catch {
    meta = {};
  }
  const duration = Number(meta?.duration) || 0;
  const name = String(meta?.name || "clip.mp4");
  const width = Number(meta?.width) || 0;
  const height = Number(meta?.height) || 0;
  const sizeBytes = Number(meta?.size) || 0;

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return c.json({ success: true, ...derivePlan(duration, name) });
  }

  try {
    const aspect = width && height ? (width / height).toFixed(2) : "unknown";
    const prompt = `You are a professional video editor. Given this clip metadata, produce a concrete editing plan.
Clip name: ${name}
Duration: ${duration} seconds
Resolution: ${width}x${height} (aspect ${aspect})
File size: ${(sizeBytes / 1048576).toFixed(1)} MB

Return ONLY JSON with this exact shape (times in seconds, never exceeding the duration):
{
  "trimPoints": [{"id": number, "start": number, "end": number, "reason": string}],
  "effects": [{"id": number, "type": "fade"|"colorBoost"|"sharpen"|"stabilize", "start": number, "end": number, "intensity": number}],
  "transitions": [{"id": number, "type": "crossfade"|"cut"|"wipe", "between": [number, number], "duration": number}]
}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[VideoEditing] OpenAI error:", resp.status, errText);
      return c.json({ success: true, ...derivePlan(duration, name) });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;

    if (!parsed || !Array.isArray(parsed.trimPoints)) {
      return c.json({ success: true, ...derivePlan(duration, name) });
    }

    return c.json({
      success: true,
      trimPoints: parsed.trimPoints,
      effects: parsed.effects || [],
      transitions: parsed.transitions || [],
      source: "openai",
      clip: { name, duration },
    });
  } catch (error) {
    console.error("[VideoEditing] Error generating AI plan:", error);
    return c.json({ success: true, ...derivePlan(duration, name) });
  }
});

export default videoEditingRouter;
