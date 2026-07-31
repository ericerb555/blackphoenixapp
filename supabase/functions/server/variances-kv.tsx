// Variances API — upload a blank zoning-variance application, have the AI read
// the form and fill it out as the applicant, then save/edit the completed draft.
//
// Flow:
//   POST /variances/scan-fill   -> reads the uploaded form (image or PDF) with
//                                  GPT-4o vision, extracts every field, and fills
//                                  it out using the applicant's context + the
//                                  statutory variance criteria. Original file is
//                                  archived in private Storage.
//   GET  /variances/:email      -> list saved drafts for a requester (newest first)
//   GET  /variances/one/:id     -> fetch one draft
//   PUT  /variances/:id         -> save edits to a draft
//   DELETE /variances/:id       -> remove a draft
//
// Everything is KV-backed and best-effort so the tool works out of the box.
import { Hono } from 'npm:hono';
import OpenAI from 'npm:openai@4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

const variancesRouter = new Hono();

const PREFIX = '/make-server-3eae23a6';
const VAR = (id: string) => `variance:filing:${id}`;
const VAR_PREFIX = 'variance:filing:';
const BUCKET = 'make-3eae23a6-variances';

// Idempotently ensure the private archive bucket exists.
async function ensureBucket(): Promise<ReturnType<typeof createClient> | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: false });
    }
  } catch (err: any) {
    console.log(`[variances] ensureBucket failed: ${err?.message || err}`);
  }
  return supabase;
}

// Decode a data URL (data:<mime>;base64,<payload>) into bytes + mime.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

// Archive the uploaded form and return a signed URL (best-effort).
async function archiveUpload(
  supabase: ReturnType<typeof createClient> | null,
  id: string,
  fileName: string,
  dataUrl: string,
): Promise<{ path: string; signedUrl: string | null } | null> {
  if (!supabase) return null;
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  const safeName = (fileName || 'variance-form').replace(/[^\w.\-]+/g, '_');
  const path = `${id}/${safeName}`;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, decoded.bytes, { contentType: decoded.mime, upsert: true });
    if (error) {
      console.log(`[variances] upload failed: ${error.message}`);
      return null;
    }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
    return { path, signedUrl: signed?.signedUrl || null };
  } catch (err: any) {
    console.log(`[variances] archiveUpload failed: ${err?.message || err}`);
    return null;
  }
}

// Build the OpenAI content part for the uploaded document.
function documentContentPart(dataUrl: string, mime: string, fileName: string): any {
  if (mime.startsWith('image/')) {
    return { type: 'image_url', image_url: { url: dataUrl } };
  }
  // PDFs (and anything non-image) go through the file content part.
  return { type: 'file', file: { filename: fileName || 'variance-form.pdf', file_data: dataUrl } };
}

// ── Scan + fill ─────────────────────────────────────────────────────────────
variancesRouter.post(`${PREFIX}/variances/scan-fill`, async (c) => {
  try {
    const body = await c.req.json();
    const dataUrl = String(body.fileDataUrl || '');
    const fileName = String(body.fileName || 'variance-form');
    const applicant = body.applicant || {};
    const email = String(applicant.email || body.email || '').trim().toLowerCase();
    const address = String(body.address || '').trim();

    if (!dataUrl) return c.json({ error: 'Please upload the variance application document.' }, 400);
    const decoded = decodeDataUrl(dataUrl);
    if (!decoded) return c.json({ error: 'The uploaded file could not be read. Please re-upload a PDF or image.' }, 400);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ error: 'AI is not configured (missing OPENAI_API_KEY).' }, 500);
    const openai = new OpenAI({ apiKey });

    const id = crypto.randomUUID();
    const supabase = await ensureBucket();
    const archived = await archiveUpload(supabase, id, fileName, dataUrl);

    const context = `APPLICANT & PROJECT CONTEXT (use this to fill the form as if the applicant were completing it):
- Applicant name: ${applicant.name || '(not provided — infer a placeholder like "[Applicant Name]")'}
- Applicant email: ${applicant.email || '(not provided)'}
- Applicant phone: ${applicant.phone || '(not provided)'}
- Applicant mailing address: ${applicant.mailingAddress || '(not provided)'}
- Property / subject address: ${address || '(not provided)'}
- Parcel / map & lot: ${body.parcelId || '(not provided — leave blank or note as needed)'}
- Current zoning district: ${body.currentZoning || '(unknown — infer typical for the area)'}
- Type of variance sought: ${body.varianceType || '(area/dimensional or use — infer from the relief requested)'}
- Relief requested / what they want to do: ${body.reliefRequested || body.projectDescription || '(not provided)'}
- Additional project details: ${body.projectDescription || '(none)'}`;

    const system = `You are an experienced land-use and zoning consultant who prepares zoning Board of Adjustment / Zoning Board of Appeals variance applications for New Hampshire and Massachusetts. You are given an image or PDF of a BLANK variance application form and the applicant's context. Your job is to READ every field, question, and section on the form and FILL IT OUT completely and professionally as if you were the applicant's representative.

CRITICAL RULES:
- Reproduce the form's actual field labels and section headings as printed on the document — do not invent a generic form.
- Fill every field with the best answer from the provided context. Where a specific fact is unknown, insert a clearly bracketed placeholder like "[TO CONFIRM: lot size]" rather than fabricating a precise figure.
- Variance applications hinge on statutory criteria. For New Hampshire (RSA 674:33) address all five: (1) the variance will not be contrary to the public interest; (2) the spirit of the ordinance is observed; (3) substantial justice is done; (4) the values of surrounding properties will not be diminished; (5) literal enforcement of the ordinance would result in unnecessary hardship. For Massachusetts (M.G.L. c. 40A §10) address: soil/shape/topography conditions, substantial hardship, and no substantial detriment to the public good / zoning intent. Write persuasive, specific draft narratives for each criterion that the form requires.
- Detect the jurisdiction/board name from the form if printed.
- Output ONLY valid JSON matching the requested schema.`;

    const user = [
      { type: 'text', text: `${context}\n\nRead the attached blank variance application form and fill it out. Return JSON with EXACTLY this shape:\n{\n  "formTitle": string,\n  "jurisdiction": string,\n  "boardName": string,\n  "varianceType": string,\n  "sections": [ { "heading": string, "fields": [ { "label": string, "value": string, "sourceNote": string } ] } ],\n  "statutoryCriteria": [ { "criterion": string, "response": string } ],\n  "attachmentsNeeded": string[],\n  "missingInfo": string[],\n  "filingNotes": string\n}\n\n- "sections" must mirror the real sections/fields printed on the form.\n- "statutoryCriteria" holds the drafted legal justifications.\n- "missingInfo" lists any fields you had to bracket as TO CONFIRM so the applicant knows what to supply.\n- Output ONLY the JSON object.` },
      documentContentPart(dataUrl, decoded.mime, fileName),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user as any },
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let filled: any;
    try {
      filled = JSON.parse(raw);
    } catch (parseErr) {
      console.log(`[variances] failed to parse model JSON: ${parseErr}. Raw: ${raw.slice(0, 500)}`);
      return c.json({ error: 'The AI returned an unexpected format. Please try again.' }, 502);
    }

    const now = new Date().toISOString();
    const record = {
      id,
      email,
      address,
      applicant,
      file_name: fileName,
      file_path: archived?.path || null,
      file_url: archived?.signedUrl || null,
      file_mime: decoded.mime,
      inputs: {
        varianceType: body.varianceType || '',
        currentZoning: body.currentZoning || '',
        parcelId: body.parcelId || '',
        reliefRequested: body.reliefRequested || '',
        projectDescription: body.projectDescription || '',
      },
      filled,
      status: 'draft',
      created_at: now,
      updated_at: now,
    };
    await kv.set(VAR(id), record);

    return c.json({ success: true, filing: record }, 201);
  } catch (error: any) {
    console.log(`[variances] scan-fill error: ${error?.message || error}`);
    return c.json({ error: `Failed to scan and fill the variance form: ${error?.message || error}` }, 500);
  }
});

// ── List / fetch / update / delete ──────────────────────────────────────────
variancesRouter.get(`${PREFIX}/variances/one/:id`, async (c) => {
  try {
    const filing = await kv.get(VAR(c.req.param('id')));
    if (!filing) return c.json({ error: 'Variance filing not found' }, 404);
    return c.json({ success: true, filing });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch variance filing: ${error?.message || error}` }, 500);
  }
});

variancesRouter.get(`${PREFIX}/variances/:email`, async (c) => {
  try {
    const email = (c.req.param('email') || '').toLowerCase();
    const all = ((await kv.getByPrefix(VAR_PREFIX)) || []) as any[];
    const filings = all
      .filter((f) => (f.email || '') === email)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return c.json({ success: true, filings });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch variance filings: ${error?.message || error}` }, 500);
  }
});

variancesRouter.put(`${PREFIX}/variances/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(VAR(id));
    if (!existing) return c.json({ error: 'Variance filing not found' }, 404);
    const body = await c.req.json();
    // Only the editable payload is merged; identity/archive fields are preserved.
    const record = {
      ...existing,
      ...(body.filled !== undefined ? { filled: body.filled } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.applicant !== undefined ? { applicant: body.applicant } : {}),
      id,
      updated_at: new Date().toISOString(),
    };
    await kv.set(VAR(id), record);
    return c.json({ success: true, filing: record });
  } catch (error: any) {
    return c.json({ error: `Failed to update variance filing: ${error?.message || error}` }, 500);
  }
});

variancesRouter.delete(`${PREFIX}/variances/:id`, async (c) => {
  try {
    await kv.del(VAR(c.req.param('id')));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: `Failed to delete variance filing: ${error?.message || error}` }, 500);
  }
});

export default variancesRouter;
