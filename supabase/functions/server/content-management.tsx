/**
 * Content Management (CMS) - KV-backed persistence for the Content Center.
 *
 * The frontend previously queried Postgres tables (content_pieces, content_templates,
 * content_channels, content_workflows, brand_guidelines, content_distribution,
 * content_approvals) directly. Those tables do not exist in this environment, so all
 * reads/writes silently failed. This router persists the same entities in the KV store
 * and preserves the exact response shapes the frontend hook expects.
 *
 * Mounted at: /make-server-57095a78/cms
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

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
    const record = { ...existing, ...updates, id, updated_at: now() };
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
    const record = { ...existing, ...updates, id, updated_at: now() };
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
    const record = { ...existing, ...updates, id };
    await kv.set(`${APPROVAL}${id}`, record);
    return c.json(record);
  } catch (err) {
    console.log(`CMS update approval error: ${err}`);
    return c.json({ error: `Failed to update approval: ${err}` }, 500);
  }
});

export default app;
