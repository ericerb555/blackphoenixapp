/**
 * deliverables — buildable plans & renderings attached to a quote.
 *
 * Design Studio produces floor-plan images and photorealistic renderings. This
 * route stores those images in private Supabase Storage and records their
 * metadata on the quote doc, so the crew has concrete plans to build from.
 *
 * Routes (all prefixed /make-server-57095a78):
 *   POST   /quotes/:id/deliverables        body { name, kind, dataUrl }
 *   GET    /quotes/:id/deliverables        → { deliverables:[{..., signedUrl}] }
 *   DELETE /quotes/:id/deliverables/:did
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const deliverablesRouter = new Hono();

deliverablesRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BUCKET_NAME = "make-824f083c-deliverables";

// Idempotently create the private bucket (tolerates the 409 "already exists" race).
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets?.some((b) => b.name === BUCKET_NAME)) return;
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: false });
    if (error && (error as any).statusCode !== "409" && !/already exists/i.test(error.message || "")) {
      console.error(`[Deliverables] Failed to create bucket ${BUCKET_NAME}:`, error);
    }
  } catch (err) {
    console.error("[Deliverables] ensureBucket error:", err);
  }
}
ensureBucket();

// Decode a data URL / base64 string into bytes.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  const contentType = match ? match[1] : "image/png";
  const base64 = match ? match[2] : (dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

function extFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("pdf")) return "pdf";
  return "bin";
}

// ── Attach a plan/rendering to a quote ────────────────────────────────────────
deliverablesRouter.post("/make-server-57095a78/quotes/:id/deliverables", async (c) => {
  try {
    const quoteId = c.req.param("id");
    const body = await c.req.json();
    const name = String(body?.name || "deliverable");
    const kind = ["plan", "rendering", "export", "photo"].includes(body?.kind) ? body.kind : "plan";
    const dataUrl = String(body?.dataUrl || "");
    if (!dataUrl) return c.json({ success: false, error: "dataUrl is required" }, 400);

    const quote = await kv.get(`quote:${quoteId}`);
    if (!quote) return c.json({ success: false, error: `Quote ${quoteId} not found` }, 404);

    await ensureBucket();
    const { bytes, contentType } = decodeDataUrl(dataUrl);
    const did = `D-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const safeName = name.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 60);
    const path = `${quoteId}/${did}-${safeName}.${extFor(contentType)}`;

    const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      console.error("[Deliverables] Upload error:", upErr);
      return c.json({ success: false, error: "Upload failed", details: String(upErr.message || upErr) }, 500);
    }

    const deliverable = { id: did, name, kind, path, contentType, createdAt: new Date().toISOString() };
    const deliverables = Array.isArray(quote.deliverables) ? quote.deliverables : [];
    deliverables.push(deliverable);
    await kv.set(`quote:${quoteId}`, { ...quote, deliverables, updatedAt: new Date().toISOString() });

    const { data: signed } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 86400);
    console.log(`[Deliverables] Saved ${kind} "${name}" to quote ${quoteId}`);
    return c.json({ success: true, deliverable: { ...deliverable, signedUrl: signed?.signedUrl || null } });
  } catch (error) {
    console.error("[Deliverables] Error saving deliverable:", error);
    return c.json({ success: false, error: "Failed to save deliverable", details: String(error) }, 500);
  }
});

// ── List a quote's deliverables (with fresh signed URLs) ──────────────────────
deliverablesRouter.get("/make-server-57095a78/quotes/:id/deliverables", async (c) => {
  try {
    const quoteId = c.req.param("id");
    const quote = await kv.get(`quote:${quoteId}`);
    if (!quote) return c.json({ success: false, error: `Quote ${quoteId} not found` }, 404);
    const deliverables = Array.isArray(quote.deliverables) ? quote.deliverables : [];
    const withUrls = await Promise.all(deliverables.map(async (d: any) => {
      const { data: signed } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(d.path, 86400);
      return { ...d, signedUrl: signed?.signedUrl || null };
    }));
    return c.json({ success: true, deliverables: withUrls });
  } catch (error) {
    console.error("[Deliverables] Error listing deliverables:", error);
    return c.json({ success: false, error: "Failed to list deliverables", details: String(error) }, 500);
  }
});

// ── Remove a deliverable ──────────────────────────────────────────────────────
deliverablesRouter.delete("/make-server-57095a78/quotes/:id/deliverables/:did", async (c) => {
  try {
    const quoteId = c.req.param("id");
    const did = c.req.param("did");
    const quote = await kv.get(`quote:${quoteId}`);
    if (!quote) return c.json({ success: false, error: `Quote ${quoteId} not found` }, 404);
    const deliverables = Array.isArray(quote.deliverables) ? quote.deliverables : [];
    const target = deliverables.find((d: any) => d.id === did);
    if (target) {
      await supabase.storage.from(BUCKET_NAME).remove([target.path]).catch((e) =>
        console.error("[Deliverables] Storage remove error:", e));
    }
    const remaining = deliverables.filter((d: any) => d.id !== did);
    await kv.set(`quote:${quoteId}`, { ...quote, deliverables: remaining, updatedAt: new Date().toISOString() });
    return c.json({ success: true });
  } catch (error) {
    console.error("[Deliverables] Error deleting deliverable:", error);
    return c.json({ success: false, error: "Failed to delete deliverable", details: String(error) }, 500);
  }
});

export default deliverablesRouter;
