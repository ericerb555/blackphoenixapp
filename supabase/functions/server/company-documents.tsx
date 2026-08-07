/**
 * Company Documents API — licenses, insurance certificates, W-9s, contracts.
 *
 * These are sensitive business records, so unlike image-upload.tsx (which uses a
 * public bucket for logos) this stores everything in a PRIVATE bucket and hands
 * the frontend short-lived signed URLs. Metadata lives in the KV store.
 *
 * ENDPOINTS:
 * - GET    /make-server-3eae23a6/company-documents?companyId=…  → list + signed URLs
 * - POST   /make-server-3eae23a6/company-documents              → multipart { file, companyId, docType?, label?, expiresOn? }
 * - DELETE /make-server-3eae23a6/company-documents/:id
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const companyDocumentsRouter = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BUCKET_NAME = "make-3eae23a6-company-docs";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB — insurance PDFs can be chunky
const SIGNED_URL_TTL = 60 * 60; // 1 hour

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// Created lazily on first upload. Running storage calls at import time slows
// cold-start and can fail the deploy health check.
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: false });
    // A concurrent request may have won the race; that's fine.
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Could not create the company documents bucket: ${error.message}`);
    }
  }
  bucketReady = true;
}

function safeName(name: string): string {
  return String(name || "document")
    .replace(/[^\w.\- ]+/g, "_")
    .trim()
    .slice(0, 120) || "document";
}

companyDocumentsRouter.get("/make-server-3eae23a6/company-documents", async (c) => {
  try {
    const companyId = String(c.req.query("companyId") || "").trim();
    const all = ((await kv.getByPrefix("company_document:")) as any[]) || [];
    const records = companyId
      ? all.filter((doc) => String(doc?.companyId || "") === companyId)
      : all;

    // Sign each stored object so the browser can fetch it from the private bucket.
    const documents = await Promise.all(
      records
        .sort((a, b) => String(b?.uploadedAt || "").localeCompare(String(a?.uploadedAt || "")))
        .map(async (doc) => {
          let url: string | null = null;
          if (doc?.storagePath) {
            const { data, error } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(doc.storagePath, SIGNED_URL_TTL);
            if (error) console.error(`Could not sign ${doc.storagePath}:`, error.message);
            url = data?.signedUrl || null;
          }
          return { ...doc, url };
        }),
    );

    return c.json({ success: true, documents });
  } catch (error: any) {
    console.error("Error listing company documents:", error);
    return c.json({ success: false, error: error?.message || "Unable to list documents." }, 500);
  }
});

companyDocumentsRouter.post("/make-server-3eae23a6/company-documents", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    const companyId = String(form.get("companyId") || "").trim();

    if (!file) return c.json({ success: false, error: "No file was provided." }, 400);
    if (!companyId) return c.json({ success: false, error: "companyId is required." }, 400);
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ success: false, error: `File exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` }, 400);
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return c.json({
        success: false,
        error: `${mime} is not an accepted document type. Upload a PDF, Word document, or image.`,
      }, 400);
    }

    await ensureBucket();

    const id = `doc_${crypto.randomUUID()}`;
    const storagePath = `${companyId}/${id}-${safeName(file.name)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const record = {
      id,
      companyId,
      docType: String(form.get("docType") || "other").trim().slice(0, 60),
      label: String(form.get("label") || file.name).trim().slice(0, 200),
      expiresOn: String(form.get("expiresOn") || "").trim() || null,
      fileName: file.name,
      mimeType: mime,
      sizeBytes: file.size,
      storagePath,
      uploadedAt: new Date().toISOString(),
    };
    await kv.set(`company_document:${id}`, record);

    const { data: signed } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    return c.json({ success: true, document: { ...record, url: signed?.signedUrl || null } }, 201);
  } catch (error: any) {
    console.error("Error uploading company document:", error);
    return c.json({ success: false, error: error?.message || "Upload failed." }, 500);
  }
});

companyDocumentsRouter.delete("/make-server-3eae23a6/company-documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const record = (await kv.get(`company_document:${id}`)) as any;
    if (!record) return c.json({ success: false, error: "Document not found." }, 404);

    if (record.storagePath) {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([record.storagePath]);
      // Losing the stored object but keeping the metadata row would leave a
      // permanently broken entry, so surface the failure instead of ignoring it.
      if (error) throw new Error(`Could not remove the stored file: ${error.message}`);
    }
    await kv.del(`company_document:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting company document:", error);
    return c.json({ success: false, error: error?.message || "Delete failed." }, 500);
  }
});

export { companyDocumentsRouter };
export default companyDocumentsRouter;
