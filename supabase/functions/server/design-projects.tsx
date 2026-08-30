/**
 * Design Projects — server-side persistence & versioning for Design Studio Pro.
 *
 * Floor plans were previously stored only in the browser's localStorage, which
 * meant a project could not follow a user across devices and had no history. This
 * module persists each project in the KV store and captures an immutable snapshot
 * (a "version") on every save, so users can browse and restore prior states.
 *
 * KV layout:
 *   design_project:{ownerKey}:{id}          → current project record (source of truth)
 *   design_version:{id}:{versionId}         → an immutable snapshot of the project
 *
 * ownerKey isolates projects per user (e.g. "customer_user-123"). It is derived
 * on the frontend from the same UserContext used by userStorageManager.
 *
 * Routes are registered with full "/make-server-3eae23a6/design-projects" prefixes
 * and the router is mounted at "/" in index.tsx (same convention as plansRouter).
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const designProjectsRouter = new Hono();

designProjectsRouter.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const PROJECT_PREFIX = (ownerKey: string) => `design_project:${ownerKey}:`;
const PROJECT_KEY = (ownerKey: string, id: string) => `design_project:${ownerKey}:${id}`;
const VERSION_PREFIX = (id: string) => `design_version:${id}:`;
const VERSION_KEY = (id: string, versionId: string) => `design_version:${id}:${versionId}`;

const MAX_VERSIONS = 30; // keep the most recent N snapshots per project

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function normalizeOwner(c: any): string {
  const owner = (c.req.query('owner') || '').trim();
  return owner || 'shared';
}

/** Strip the heavy `floors`/`elements` payload for list responses. */
function summarize(p: any) {
  const floorCount = Array.isArray(p.floors) ? p.floors.length : 0;
  const elementCount = Array.isArray(p.floors)
    ? p.floors.reduce((s: number, f: any) => s + (Array.isArray(f.elements) ? f.elements.length : 0), 0)
    : (Array.isArray(p.elements) ? p.elements.length : 0);
  return {
    id: p.id,
    name: p.name || 'Untitled Project',
    ownerKey: p.ownerKey,
    quoteId: p.quoteId || null,
    version: p.version || 1,
    floorCount,
    elementCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    /**
     * A slim slice of meta, so a list can be filtered and labelled.
     *
     * The full meta is deliberately not returned — for a floor plan it carries
     * the whole element tree and would make listing enormous. But stripping it
     * entirely broke every caller that filters by project kind or shows who a
     * project belongs to: the deck designer filtered on meta.kind and therefore
     * matched nothing, so its Open list was always empty. These few fields are
     * what a list needs and nothing more; opening a project still fetches the
     * whole record by id.
     */
    meta: p.meta
      ? {
        kind: p.meta.kind ?? null,
        customerId: p.meta.customerId ?? '',
        customerName: p.meta.customerName ?? '',
        jobId: p.meta.jobId ?? '',
        site: p.meta.site
          ? {
            projectName: p.meta.site.projectName ?? '',
            address: p.meta.site.address ?? '',
            town: p.meta.site.town ?? '',
            state: p.meta.site.state ?? '',
          }
          : null,
      }
      : null,
  };
}

/**
 * Mark any quote made from an earlier version of this design as behind it.
 *
 * WHY HERE, AND WHY AT THIS MOMENT
 *
 * Staleness is computed once, by the thing that causes it, at the instant it
 * becomes true. The alternative is every screen that shows a quote loading the
 * design as well and comparing — which is the same question asked in four
 * places, answered four ways, and wrong wherever somebody forgot to ask.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not touch the money. A quote that is behind its design still says
 * exactly what it said when it was sent, because somebody may already have been
 * shown that figure. Re-pricing is a decision, not a consequence of nudging a
 * joist spacing — Eric's words: the quote will need adjusting after adjustments
 * if necessary. This only makes "if necessary" visible.
 */
async function markQuotesStale(designId: string, version: number): Promise<number> {
  if (!designId) return 0;
  try {
    const quotes: any[] = (await kv.getByPrefix('quote:')) || [];
    let marked = 0;
    for (const q of quotes) {
      if (!q || String(q.designId || '') !== String(designId)) continue;
      // A quote with no recorded version predates this being tracked, or was
      // made from a design that had never been saved. Leaving it alone is
      // right: claiming it is out of date would be a guess, and a false alarm
      // on a quote already in front of a customer is worse than saying nothing.
      //
      // Tested as a number rather than coerced, because `Number(null)` is 0 —
      // finite, smaller than every real version, and therefore a quote with no
      // version would be flagged stale by every save forever.
      const from = q.designVersion;
      if (typeof from !== 'number' || !Number.isFinite(from) || from >= version) continue;
      if (q.designStale === true) continue;
      const at = new Date().toISOString();
      await kv.set(`quote:${q.id}`, { ...q, designStale: true, designStaleAt: at });
      marked++;

      // The board keeps its own copy of the quote, and the board is what
      // somebody scans before ringing a customer. Flagging the quote record
      // alone would leave the warning in the one place nobody was looking.
      const jobId = String(q.workRequestId || '');
      if (!jobId) continue;
      try {
        const item: any = await kv.get(`pipeline_${jobId}`);
        if (item?.quote && String(item.quote.id || '') === String(q.id)) {
          await kv.set(`pipeline_${jobId}`, {
            ...item,
            quote: { ...item.quote, designStale: true, designStaleAt: at },
          });
        }
      } catch { /* the quote record still carries the flag */ }
    }
    return marked;
  } catch (error) {
    // A quote that fails to be flagged is a missing warning, not a broken save.
    console.log(`[DesignProjects] Could not flag quotes for ${designId}: ${error}`);
    return 0;
  }
}

/** Persist a snapshot and prune old ones beyond MAX_VERSIONS. */
async function snapshot(id: string, project: any, note: string) {
  const versionId = genId('V');
  const now = new Date().toISOString();
  const record = {
    versionId,
    projectId: id,
    version: project.version,
    note,
    createdAt: now,
    // Deep-ish copy so the snapshot is independent of the live record.
    data: JSON.parse(JSON.stringify({
      name: project.name,
      floors: project.floors ?? null,
      elements: project.elements ?? null,
      layers: project.layers ?? null,
      meta: project.meta ?? null,
    })),
  };
  await kv.set(VERSION_KEY(id, versionId), record);

  // Prune: keep newest MAX_VERSIONS.
  try {
    const versions: any[] = (await kv.getByPrefix(VERSION_PREFIX(id))) || [];
    if (versions.length > MAX_VERSIONS) {
      versions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      const stale = versions.slice(MAX_VERSIONS);
      await Promise.all(stale.map(v => kv.del(VERSION_KEY(id, v.versionId))));
    }
  } catch (e) {
    console.log('[DesignProjects] Version prune skipped:', (e as any)?.message || e);
  }

  return versionId;
}

// ─── routes ───────────────────────────────────────────────────────────────────

designProjectsRouter.get('/make-server-3eae23a6/design-projects/test', (c) =>
  c.json({ success: true, message: 'Design Projects service running', timestamp: new Date().toISOString() }),
);

/**
 * POST /design-projects — create OR upsert a project, capturing a version snapshot.
 * Body: { id?, name, ownerKey, floors?, elements?, layers?, quoteId?, note? }
 */
designProjectsRouter.post('/make-server-3eae23a6/design-projects', async (c) => {
  try {
    const body = await c.req.json();
    const ownerKey = (body.ownerKey || 'shared').trim();
    const now = new Date().toISOString();
    const id = body.id || genId('DPRJ');

    const existing = await kv.get(PROJECT_KEY(ownerKey, id));
    const version = existing ? (Number(existing.version) || 1) + 1 : 1;

    const project = {
      id,
      ownerKey,
      name: body.name || existing?.name || 'Untitled Project',
      floors: body.floors ?? existing?.floors ?? null,
      elements: body.elements ?? existing?.elements ?? null,
      layers: body.layers ?? existing?.layers ?? null,
      quoteId: body.quoteId ?? existing?.quoteId ?? null,
      meta: body.meta ?? existing?.meta ?? null,
      version,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await kv.set(PROJECT_KEY(ownerKey, id), project);
    const versionId = await snapshot(id, project, body.note || (existing ? 'Auto-saved' : 'Created'));

    const staleQuotes = await markQuotesStale(id, version);

    console.log(`[DesignProjects] Saved ${id} (v${version}) for ${ownerKey}${staleQuotes ? ` — ${staleQuotes} quote(s) now behind the design` : ''}`);
    return c.json({ success: true, project, versionId, staleQuotes });
  } catch (error: any) {
    console.error('[DesignProjects] Save error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to save project' }, 500);
  }
});

/**
 * GET /design-projects?owner=... — list a user's projects (summaries only).
 */
designProjectsRouter.get('/make-server-3eae23a6/design-projects', async (c) => {
  try {
    const ownerKey = normalizeOwner(c);
    let projects: any[] = (await kv.getByPrefix(PROJECT_PREFIX(ownerKey))) || [];
    projects.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return c.json({ success: true, count: projects.length, projects: projects.map(summarize) });
  } catch (error: any) {
    console.error('[DesignProjects] List error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to list projects', projects: [] }, 500);
  }
});

/**
 * GET /design-projects/:id?owner=... — full project + its version history (metadata).
 */
designProjectsRouter.get('/make-server-3eae23a6/design-projects/:id', async (c) => {
  try {
    const ownerKey = normalizeOwner(c);
    const id = c.req.param('id');
    const project = await kv.get(PROJECT_KEY(ownerKey, id));
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const versions: any[] = (await kv.getByPrefix(VERSION_PREFIX(id))) || [];
    versions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const history = versions.map(v => ({
      versionId: v.versionId,
      version: v.version,
      note: v.note,
      createdAt: v.createdAt,
    }));

    return c.json({ success: true, project, versions: history });
  } catch (error: any) {
    console.error('[DesignProjects] Get error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to get project' }, 500);
  }
});

/**
 * GET /design-projects/:id/versions/:versionId — fetch a specific snapshot's data.
 */
designProjectsRouter.get('/make-server-3eae23a6/design-projects/:id/versions/:versionId', async (c) => {
  try {
    const id = c.req.param('id');
    const versionId = c.req.param('versionId');
    const version = await kv.get(VERSION_KEY(id, versionId));
    if (!version) return c.json({ success: false, error: 'Version not found' }, 404);
    return c.json({ success: true, version });
  } catch (error: any) {
    console.error('[DesignProjects] Get version error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to get version' }, 500);
  }
});

/**
 * POST /design-projects/:id/restore — restore a version as the current project.
 * Body: { ownerKey, versionId }. Restoring itself creates a new version.
 */
designProjectsRouter.post('/make-server-3eae23a6/design-projects/:id/restore', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const ownerKey = (body.ownerKey || 'shared').trim();
    const versionId = body.versionId;

    const project = await kv.get(PROJECT_KEY(ownerKey, id));
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const version = await kv.get(VERSION_KEY(id, versionId));
    if (!version) return c.json({ success: false, error: 'Version not found' }, 404);

    const now = new Date().toISOString();
    project.floors = version.data.floors ?? project.floors;
    project.elements = version.data.elements ?? project.elements;
    project.layers = version.data.layers ?? project.layers;
    project.name = version.data.name ?? project.name;
    project.version = (Number(project.version) || 1) + 1;
    project.updatedAt = now;

    await kv.set(PROJECT_KEY(ownerKey, id), project);
    const newVersionId = await snapshot(id, project, `Restored from v${version.version}`);

    return c.json({ success: true, project, versionId: newVersionId });
  } catch (error: any) {
    console.error('[DesignProjects] Restore error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to restore version' }, 500);
  }
});

/**
 * DELETE /design-projects/:id?owner=... — remove a project and all its versions.
 */
designProjectsRouter.delete('/make-server-3eae23a6/design-projects/:id', async (c) => {
  try {
    const ownerKey = normalizeOwner(c);
    const id = c.req.param('id');
    await kv.del(PROJECT_KEY(ownerKey, id));
    const versions: any[] = (await kv.getByPrefix(VERSION_PREFIX(id))) || [];
    await Promise.all(versions.map(v => kv.del(VERSION_KEY(id, v.versionId))));
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[DesignProjects] Delete error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to delete project' }, 500);
  }
});

export default designProjectsRouter;
