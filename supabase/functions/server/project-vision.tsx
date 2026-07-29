/**
 * project-vision — turns job-site PHOTOS/VIDEO FRAMES into a real quote.
 *
 * The Change Order Camera app captures photos of a project. This route sends
 * those frames to OpenAI GPT-4o Vision and gets back a structured scope of work
 * with materials and labor, ready to drop straight into the quote builder.
 *
 * POST /make-server-3eae23a6/project-vision/analyze
 *   body: { images: string[] (base64, no data: prefix), notes?: string, serviceType?: string }
 *   → { success, analysis: { summary, scope[], materials[], labor[], laborHours, materialsCost, laborCost, estimatedCost } }
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";

const projectVisionRouter = new Hono();

projectVisionRouter.use("*", cors({
  origin: "*",
  allowMethods: ["POST", "GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

function buildPrompt(notes: string, serviceType: string): string {
  return `You are an expert construction estimator with 30+ years of field experience.
Analyze these on-site project PHOTOS and produce a realistic quote for the work needed.

${serviceType ? `Job type hint: ${serviceType}\n` : ""}${notes ? `Field notes from the crew: ${notes}\n` : ""}
Look carefully at what is actually visible: damage, materials, dimensions you can infer,
fixtures, finishes, and the scope of work implied. Use current (2025/2026) mid-range
market pricing. Include a 10-15% material waste factor. Assume standard crew labor rates.

Return ONLY valid JSON (no markdown fences, no prose) in EXACTLY this shape:
{
  "summary": "<one-paragraph description of the work you see and recommend>",
  "scope": ["<discrete task 1>", "<task 2>", "..."],
  "materials": [
    { "name": "<material>", "quantity": <number>, "unit": "<each|sq ft|linear ft|gallon|sheet|box>", "unitCost": <number>, "totalCost": <number> }
  ],
  "labor": [
    { "role": "<trade/role>", "hours": <number>, "hourlyRate": <number>, "totalCost": <number> }
  ],
  "laborHours": <total labor hours across all roles>,
  "materialsCost": <sum of material totalCost>,
  "laborCost": <sum of labor totalCost>,
  "estimatedCost": <materialsCost + laborCost>,
  "confidence": "<low|medium|high>",
  "assumptions": ["<assumption 1>", "..."]
}
If the photos are unclear, make conservative professional assumptions and note them in "assumptions".`;
}

function coerceNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalize whatever the model returns into a safe, consistent shape.
function normalizeAnalysis(a: any) {
  const materials = Array.isArray(a?.materials) ? a.materials.map((m: any) => {
    const quantity = coerceNumber(m.quantity) || 1;
    const unitCost = coerceNumber(m.unitCost);
    const totalCost = coerceNumber(m.totalCost) || quantity * unitCost;
    return { name: String(m.name || "Material"), quantity, unit: String(m.unit || "each"), unitCost, totalCost };
  }) : [];
  const labor = Array.isArray(a?.labor) ? a.labor.map((l: any) => {
    const hours = coerceNumber(l.hours);
    const hourlyRate = coerceNumber(l.hourlyRate) || 75;
    const totalCost = coerceNumber(l.totalCost) || hours * hourlyRate;
    return { role: String(l.role || "Labor"), hours, hourlyRate, totalCost };
  }) : [];
  const materialsCost = coerceNumber(a?.materialsCost) || materials.reduce((s, m) => s + m.totalCost, 0);
  const laborCost = coerceNumber(a?.laborCost) || labor.reduce((s, l) => s + l.totalCost, 0);
  const laborHours = coerceNumber(a?.laborHours) || labor.reduce((s, l) => s + l.hours, 0);
  return {
    summary: String(a?.summary || ""),
    scope: Array.isArray(a?.scope) ? a.scope.map(String) : [],
    materials,
    labor,
    laborHours,
    materialsCost,
    laborCost,
    estimatedCost: coerceNumber(a?.estimatedCost) || materialsCost + laborCost,
    confidence: ["low", "medium", "high"].includes(a?.confidence) ? a.confidence : "medium",
    assumptions: Array.isArray(a?.assumptions) ? a.assumptions.map(String) : [],
  };
}

projectVisionRouter.post("/make-server-3eae23a6/project-vision/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const images: string[] = Array.isArray(body?.images) ? body.images : [];
    const notes = String(body?.notes || "");
    const serviceType = String(body?.serviceType || "");

    if (images.length === 0) {
      return c.json({ success: false, error: "At least one image is required." }, 400);
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("[ProjectVision] OPENAI_API_KEY not configured");
      return c.json({ success: false, error: "AI vision service is not configured (missing OPENAI_API_KEY)." }, 500);
    }

    // Cap the number of images we send to keep the request sane/affordable.
    const imageContent = images.slice(0, 6).map((b64) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "high" },
    }));

    console.log(`[ProjectVision] Analyzing ${imageContent.length} image(s) via GPT-4o Vision`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert construction estimator. You output only valid JSON." },
          { role: "user", content: [{ type: "text", text: buildPrompt(notes, serviceType) }, ...imageContent] },
        ],
        max_tokens: 3000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ProjectVision] OpenAI API error:", errText);
      return c.json({ success: false, error: "AI vision request failed.", details: errText }, 502);
    }

    const aiResponse = await response.json();
    const text = aiResponse?.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[1] : text);
    } catch (parseErr) {
      console.error("[ProjectVision] Failed to parse AI JSON:", parseErr, "raw:", text);
      return c.json({ success: false, error: "AI returned an unreadable response. Please try again." }, 502);
    }

    const analysis = normalizeAnalysis(parsed);
    console.log(`[ProjectVision] Done — ${analysis.materials.length} materials, ${analysis.labor.length} labor lines, est $${analysis.estimatedCost}`);

    return c.json({
      success: true,
      analysis,
      metadata: {
        imageCount: imageContent.length,
        analyzedAt: new Date().toISOString(),
        tokensUsed: aiResponse?.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error("[ProjectVision] Error during analysis:", error);
    return c.json({ success: false, error: "Failed to analyze project photos.", details: String(error) }, 500);
  }
});

projectVisionRouter.get("/make-server-3eae23a6/project-vision/test", (c) =>
  c.json({ success: true, message: "Project Vision API is running", timestamp: new Date().toISOString() }));

export default projectVisionRouter;
