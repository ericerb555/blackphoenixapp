/**
 * Content Management (CMS) - KV-backed persistence for the Content Center.
 *
 * The frontend previously queried Postgres tables (content_pieces, content_templates,
 * content_channels, content_workflows, brand_guidelines, content_distribution,
 * content_approvals) directly. Those tables do not exist in this environment, so all
 * reads/writes silently failed. This router persists the same entities in the KV store
 * and preserves the exact response shapes the frontend hook expects.
 *
 * Mounted at: /make-server-3eae23a6/cms
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ─────────────────────────────────────────────────────────────────────────────
// TENANT BOUNDARY
//
// The content centre is sold as a subscription to other companies, so the rule
// that one tenant cannot see another tenant's content is a product requirement,
// not hygiene. This router previously took the tenant id straight off the query
// string — `?companyId=` — and filtered by it. The filter was correct; its input
// was supplied by the caller. Changing one query parameter read someone else's
// content.
//
// The fix is to stop believing the caller. Which companies a session may touch
// is answered from the database (`companies.user_id`), and any company named in
// a request must be one of those. The parameter is still read, but it can now
// only narrow what the session already has access to — never widen it.
//
// This runs with the service-role key, which bypasses Row Level Security, so
// there is nothing behind this check. It is the boundary.
// ─────────────────────────────────────────────────────────────────────────────

function service() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/** Company ids this request is allowed to touch. Set by the middleware below. */
const ownedBy = (c: any): Set<string> => c.get('ownedCompanies') || new Set<string>();

/**
 * The company a content piece belongs to.
 *
 * Distribution rows and approvals do not carry a company of their own — they
 * point at a content piece, and the piece carries the company. So reaching one
 * of those by id is only permitted if the piece behind it belongs to the caller.
 */
async function companyOfPiece(pieceId: string): Promise<string> {
  if (!pieceId) return '';
  const piece = (await kv.get(`${PIECE}${pieceId}`)) as any;
  return piece?.company_id ? String(piece.company_id) : '';
}

/** True when the caller owns the company that record belongs to. */
const mayTouch = (c: any, companyId: any): boolean =>
  !!companyId && ownedBy(c).has(String(companyId));

app.use('*', async (c, next) => {
  const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return c.json({ error: 'Sign in required.' }, 401);

  const db = service();
  const { data: auth, error: authErr } = await db.auth.getUser(token);
  // The publishable anon key is a valid JWT but not a user token, so it fails
  // here — which is the point. Content is for signed-in people only.
  if (authErr || !auth?.user?.id) return c.json({ error: 'Sign in required.' }, 401);

  const { data: rows, error: coErr } = await db
    .from('companies').select('id').eq('user_id', auth.user.id);
  if (coErr) {
    console.log(`CMS ownership lookup failed: ${coErr.message}`);
    return c.json({ error: 'Could not establish which company you belong to.' }, 500);
  }

  const owned = new Set((rows || []).map((r: any) => String(r.id)));
  c.set('ownedCompanies', owned);

  // Every company named in the request must be one of the caller's. Both places
  // it can arrive are checked: the query string the reads use, and the body the
  // writes use. Hono caches the parsed body, so reading it here does not stop
  // the handler reading it again.
  const named: string[] = [];
  const q = c.req.query('companyId');
  if (q) named.push(String(q));
  if (c.req.method !== 'GET' && c.req.method !== 'DELETE') {
    try {
      const body = await c.req.json();
      const fromBody = body?.company_id ?? body?.companyId;
      if (fromBody) named.push(String(fromBody));
    } catch { /* no body, or not JSON — nothing to check */ }
  }

  for (const id of named) {
    if (!owned.has(id)) {
      console.log(`[cms] refused company ${id} for user ${auth.user.id}`);
      return c.json({ error: 'Not permitted for that company.' }, 403);
    }
  }

  await next();
});

// ── Key helpers ──────────────────────────────────────────────────────────────
const PIECE = 'cms:piece:';
const TEMPLATE = 'cms:template:';
const CHANNEL = 'cms:channel:';
const WORKFLOW = 'cms:workflow:';
const GUIDELINE = 'cms:guideline:';
const DISTRIBUTION = 'cms:distribution:';
const APPROVAL = 'cms:approval:';

const newId = () => (globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();

// Return only records whose field matches, tolerating missing values.
function filterBy<T extends Record<string, any>>(rows: T[], field: string, value?: string): T[] {
  if (!value) return rows;
  return rows.filter((r) => r?.[field] === value);
}

function sortByDesc<T extends Record<string, any>>(rows: T[], field: string): T[] {
  return [...rows].sort((a, b) => (b?.[field] ?? 0) > (a?.[field] ?? 0) ? 1 : (b?.[field] ?? 0) < (a?.[field] ?? 0) ? -1 : 0);
}

// ── CONTENT PIECES ───────────────────────────────────────────────────────────
app.get('/content-pieces', async (c) => {
  try {
    const companyId = c.req.query('companyId');
    const status = c.req.query('status');
    if (!companyId) return c.json([]);
    let rows = (await kv.getByPrefix(PIECE)) as any[];
    rows = filterBy(rows, 'company_id', companyId);
    rows = filterBy(rows, 'status', status);
    rows.sort((a, b) => (b?.created_at || '').localeCompare(a?.created_at || ''));
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list content-pieces error: ${err}`);
    return c.json({ error: `Failed to list content pieces: ${err}` }, 500);
  }
});

app.get('/content-pieces/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const companyId = c.req.query('companyId');
    const row = (await kv.get(`${PIECE}${id}`)) as any;
    if (!row) return c.json(null);
    // The id alone is not authority to read the piece — the company on the
    // record has to be one of the caller's. companyId, when supplied, may only
    // narrow further.
    if (!mayTouch(c, row.company_id)) return c.json(null);
    if (companyId && row.company_id !== companyId) return c.json(null);
    return c.json(row);
  } catch (err) {
    console.log(`CMS get content-piece error: ${err}`);
    return c.json({ error: `Failed to get content piece: ${err}` }, 500);
  }
});

app.post('/content-pieces', async (c) => {
  try {
    const body = await c.req.json();
    // The middleware refuses a company the caller does not own, but says nothing
    // about a request that names none. Without this, a piece is created with no
    // company and is then unreachable, since every read is scoped to one.
    if (!mayTouch(c, body?.company_id)) {
      return c.json({ error: 'A company you belong to is required.' }, 403);
    }
    const id = body.id || newId();
    const record = {
      total_impressions: 0,
      total_clicks: 0,
      total_engagement: 0,
      total_conversions: 0,
      current_workflow_stage: 1,
      ...body,
      id,
      created_at: body.created_at || now(),
      updated_at: now(),
    };
    await kv.set(`${PIECE}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create content-piece error: ${err}`);
    return c.json({ error: `Failed to create content piece: ${err}` }, 500);
  }
});

app.patch('/content-pieces/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = (await kv.get(`${PIECE}${id}`)) as any;
    if (!existing) return c.json({ error: `Content piece ${id} not found` }, 404);
    if (!mayTouch(c, existing.company_id)) return c.json({ error: 'Not permitted.' }, 403);
    // company_id is fixed at creation. Allowing an update to carry a new one
    // would let a caller move their own piece into someone else's company.
    const record = { ...existing, ...updates, company_id: existing.company_id, id, updated_at: now() };
    await kv.set(`${PIECE}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS update content-piece error: ${err}`);
    return c.json({ error: `Failed to update content piece: ${err}` }, 500);
  }
});

app.delete('/content-pieces/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = (await kv.get(`${PIECE}${id}`)) as any;
    if (!existing) return c.json({ success: true });
    if (!mayTouch(c, existing.company_id)) return c.json({ error: 'Not permitted.' }, 403);
    await kv.del(`${PIECE}${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`CMS delete content-piece error: ${err}`);
    return c.json({ error: `Failed to delete content piece: ${err}` }, 500);
  }
});

// ── TEMPLATES ────────────────────────────────────────────────────────────────
app.get('/templates', async (c) => {
  try {
    const companyId = c.req.query('companyId');
    if (!companyId) return c.json([]);
    let rows = (await kv.getByPrefix(TEMPLATE)) as any[];
    rows = filterBy(rows, 'company_id', companyId).filter((r) => r.is_active !== false);
    rows = sortByDesc(rows, 'usage_count');
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list templates error: ${err}`);
    return c.json({ error: `Failed to list templates: ${err}` }, 500);
  }
});

app.post('/templates', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || newId();
    const record = { usage_count: 0, is_active: true, variables: [], ...body, id, created_at: body.created_at || now(), updated_at: now() };
    await kv.set(`${TEMPLATE}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create template error: ${err}`);
    return c.json({ error: `Failed to create template: ${err}` }, 500);
  }
});

app.post('/templates/:id/increment-usage', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = (await kv.get(`${TEMPLATE}${id}`)) as any;
    if (!existing) return c.json({ success: true });
    if (!mayTouch(c, existing.company_id)) return c.json({ error: 'Not permitted.' }, 403);
    const record = { ...existing, usage_count: (existing.usage_count || 0) + 1, updated_at: now() };
    await kv.set(`${TEMPLATE}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS increment template usage error: ${err}`);
    return c.json({ error: `Failed to increment template usage: ${err}` }, 500);
  }
});

// ── BRAND GUIDELINES ─────────────────────────────────────────────────────────
app.get('/brand-guidelines', async (c) => {
  try {
    const companyId = c.req.query('companyId');
    if (!companyId) return c.json([]);
    let rows = (await kv.getByPrefix(GUIDELINE)) as any[];
    rows = filterBy(rows, 'company_id', companyId).filter((r) => r.is_active !== false);
    rows = sortByDesc(rows, 'priority');
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list brand-guidelines error: ${err}`);
    return c.json({ error: `Failed to list brand guidelines: ${err}` }, 500);
  }
});

app.post('/brand-guidelines', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || newId();
    const record = { is_active: true, priority: 0, ...body, id, created_at: body.created_at || now(), updated_at: now() };
    await kv.set(`${GUIDELINE}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create brand-guideline error: ${err}`);
    return c.json({ error: `Failed to create brand guideline: ${err}` }, 500);
  }
});

// ── WORKFLOWS ────────────────────────────────────────────────────────────────
app.get('/workflows', async (c) => {
  try {
    const companyId = c.req.query('companyId');
    if (!companyId) return c.json([]);
    let rows = (await kv.getByPrefix(WORKFLOW)) as any[];
    rows = filterBy(rows, 'company_id', companyId).filter((r) => r.is_active !== false);
    rows = sortByDesc(rows, 'is_default');
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list workflows error: ${err}`);
    return c.json({ error: `Failed to list workflows: ${err}` }, 500);
  }
});

app.post('/workflows', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || newId();
    const record = { is_active: true, is_default: false, ...body, id, created_at: body.created_at || now(), updated_at: now() };
    await kv.set(`${WORKFLOW}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create workflow error: ${err}`);
    return c.json({ error: `Failed to create workflow: ${err}` }, 500);
  }
});

// ── CHANNELS ─────────────────────────────────────────────────────────────────
app.get('/channels', async (c) => {
  try {
    const companyId = c.req.query('companyId');
    if (!companyId) return c.json([]);
    let rows = (await kv.getByPrefix(CHANNEL)) as any[];
    rows = filterBy(rows, 'company_id', companyId);
    rows.sort((a, b) => (a?.channel_name || '').localeCompare(b?.channel_name || ''));
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list channels error: ${err}`);
    return c.json({ error: `Failed to list channels: ${err}` }, 500);
  }
});

app.post('/channels', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || newId();
    const record = { ...body, id, created_at: body.created_at || now(), updated_at: now() };
    await kv.set(`${CHANNEL}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create channel error: ${err}`);
    return c.json({ error: `Failed to create channel: ${err}` }, 500);
  }
});

// ── DISTRIBUTION ─────────────────────────────────────────────────────────────
app.get('/distribution', async (c) => {
  try {
    const contentPieceId = c.req.query('contentPieceId');
    // Without a piece to scope to, filterBy would return every tenant's rows.
    if (!contentPieceId) return c.json([]);
    if (!mayTouch(c, await companyOfPiece(contentPieceId))) return c.json([]);
    let rows = (await kv.getByPrefix(DISTRIBUTION)) as any[];
    rows = filterBy(rows, 'content_piece_id', contentPieceId);
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list distribution error: ${err}`);
    return c.json({ error: `Failed to list distribution: ${err}` }, 500);
  }
});

app.post('/distribution', async (c) => {
  try {
    const body = await c.req.json();
    if (!mayTouch(c, await companyOfPiece(body?.content_piece_id))) {
      return c.json({ error: 'Not permitted.' }, 403);
    }
    const id = body.id || newId();
    const record = { ...body, id, created_at: body.created_at || now(), updated_at: now() };
    await kv.set(`${DISTRIBUTION}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create distribution error: ${err}`);
    return c.json({ error: `Failed to create distribution: ${err}` }, 500);
  }
});

app.patch('/distribution/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = (await kv.get(`${DISTRIBUTION}${id}`)) as any;
    if (!existing) return c.json({ error: `Distribution ${id} not found` }, 404);
    if (!mayTouch(c, await companyOfPiece(existing.content_piece_id))) {
      return c.json({ error: 'Not permitted.' }, 403);
    }
    const record = { ...existing, ...updates, content_piece_id: existing.content_piece_id, id, updated_at: now() };
    await kv.set(`${DISTRIBUTION}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS update distribution error: ${err}`);
    return c.json({ error: `Failed to update distribution: ${err}` }, 500);
  }
});

// ── APPROVALS ────────────────────────────────────────────────────────────────
app.get('/approvals', async (c) => {
  try {
    const contentPieceId = c.req.query('contentPieceId');
    if (!contentPieceId) return c.json([]);
    if (!mayTouch(c, await companyOfPiece(contentPieceId))) return c.json([]);
    let rows = (await kv.getByPrefix(APPROVAL)) as any[];
    rows = filterBy(rows, 'content_piece_id', contentPieceId);
    rows.sort((a, b) => (a?.workflow_stage ?? 0) - (b?.workflow_stage ?? 0));
    return c.json(rows);
  } catch (err) {
    console.log(`CMS list approvals error: ${err}`);
    return c.json({ error: `Failed to list approvals: ${err}` }, 500);
  }
});

app.post('/approvals', async (c) => {
  try {
    const body = await c.req.json();
    if (!mayTouch(c, await companyOfPiece(body?.content_piece_id))) {
      return c.json({ error: 'Not permitted.' }, 403);
    }
    const id = body.id || newId();
    const record = { status: 'pending', ...body, id, created_at: body.created_at || now(), assigned_at: body.assigned_at || now() };
    await kv.set(`${APPROVAL}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS create approval error: ${err}`);
    return c.json({ error: `Failed to create approval: ${err}` }, 500);
  }
});

app.patch('/approvals/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = (await kv.get(`${APPROVAL}${id}`)) as any;
    if (!existing) return c.json({ error: `Approval ${id} not found` }, 404);
    if (!mayTouch(c, await companyOfPiece(existing.content_piece_id))) {
      return c.json({ error: 'Not permitted.' }, 403);
    }
    const record = { ...existing, ...updates, content_piece_id: existing.content_piece_id, id };
    await kv.set(`${APPROVAL}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS update approval error: ${err}`);
    return c.json({ error: `Failed to update approval: ${err}` }, 500);
  }
});

export default app;
