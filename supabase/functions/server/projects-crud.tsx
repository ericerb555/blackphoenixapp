import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { requireStaffOn } from "./requireStaff.ts";

// Project CRUD, KV-backed.
// Frontend contract lives in src/app/lib/services/projectService.ts:
//   GET    /make-server-3eae23a6/projects            -> Project[]  (filters via query)
//   GET    /make-server-3eae23a6/projects/stats       -> stats object
//   GET    /make-server-3eae23a6/projects/:id          -> Project
//   POST   /make-server-3eae23a6/projects            -> Project
//   PUT    /make-server-3eae23a6/projects/:id          -> Project
//   DELETE /make-server-3eae23a6/projects/:id          -> { success }
const projectsRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";
const KEY = (id: string) => `project:${id}`;

/**
 * STAFF ONLY, ALL SIX ROUTES. Added 2026-11-17.
 *
 * This module had no authorisation of any kind, and `/projects` is on no
 * public, admin or middleware list — so every route was tier "user": any
 * account with a session, which here means every customer, tenant, vendor and
 * subcontractor. `GET /projects` returned every project on the platform,
 * `PUT /projects/:id` took the id from the path and spread the body over the
 * record, and `DELETE /projects/:id` removed it.
 *
 * The only consumer is `pages/ProjectsNew.tsx`, which hides its write controls
 * behind `isAdmin` from `useAuth()`. That is the exact thing Eric asked about
 * at the start of this work — "hiding a button is not security" — and it was
 * literally true here: the buttons were hidden and the routes were open.
 *
 * `requireStaffOn` rather than a bare `use('*', requireStaff)`. This router is
 * mounted at `/`, so a `use('*')` on it runs on every request the server
 * receives; `requireStaffOn` checks the path first and stands aside for
 * everything that is not ours. `requireStaff.ts` records the deploy where that
 * distinction took the whole API staff-only.
 */
projectsRouter.use('*', requireStaffOn([`${PREFIX}/projects`]));

async function listProjects(): Promise<any[]> {
  return ((await kv.getByPrefix("project:")) || []) as any[];
}

// NOTE: /projects/stats must be declared before /projects/:id so it is not
// captured by the :id param route.
projectsRouter.get(`${PREFIX}/projects/stats`, async (c) => {
  try {
    const projects = await listProjects();
    const sum = (field: string) =>
      projects.reduce((acc, p) => acc + (Number(p[field]) || 0), 0);
    const stats = {
      total: projects.length,
      pending: projects.filter((p) => p.status === "pending").length,
      in_progress: projects.filter((p) => p.status === "in_progress").length,
      completed: projects.filter((p) => p.status === "completed").length,
      on_hold: projects.filter((p) => p.status === "on_hold").length,
      cancelled: projects.filter((p) => p.status === "cancelled").length,
      urgent: projects.filter((p) => p.priority === "urgent").length,
      totalEstimatedRevenue: sum("estimated_cost"),
      totalActualRevenue: sum("actual_cost"),
    };
    return c.json(stats);
  } catch (error: any) {
    console.log(`Error computing project stats: ${error?.message || error}`);
    return c.json({ error: `Failed to compute project stats: ${error?.message || error}` }, 500);
  }
});

projectsRouter.get(`${PREFIX}/projects`, async (c) => {
  try {
    let projects = await listProjects();
    const { status, priority, assigned_to, customer_id, search } = c.req.query();
    if (status) projects = projects.filter((p) => p.status === status);
    if (priority) projects = projects.filter((p) => p.priority === priority);
    if (assigned_to) projects = projects.filter((p) => p.assigned_to === assigned_to);
    if (customer_id) projects = projects.filter((p) => p.customer_id === customer_id);
    if (search) {
      const s = search.toLowerCase();
      projects = projects.filter(
        (p) =>
          (p.title || p.name || "").toLowerCase().includes(s) ||
          (p.description || "").toLowerCase().includes(s) ||
          (p.project_number || "").toLowerCase().includes(s),
      );
    }
    projects.sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    return c.json(projects);
  } catch (error: any) {
    console.log(`Error listing projects: ${error?.message || error}`);
    return c.json({ error: `Failed to list projects: ${error?.message || error}` }, 500);
  }
});

projectsRouter.get(`${PREFIX}/projects/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(KEY(id));
    if (!project) return c.json({ error: `Project ${id} not found` }, 404);
    return c.json(project);
  } catch (error: any) {
    console.log(`Error fetching project: ${error?.message || error}`);
    return c.json({ error: `Failed to fetch project: ${error?.message || error}` }, 500);
  }
});

projectsRouter.post(`${PREFIX}/projects`, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = body.id || crypto.randomUUID();
    const project = {
      ...body,
      id,
      status: body.status || "pending",
      created_at: body.created_at || now,
      updated_at: now,
    };
    await kv.set(KEY(id), project);
    return c.json(project);
  } catch (error: any) {
    console.log(`Error creating project: ${error?.message || error}`);
    return c.json({ error: `Failed to create project: ${error?.message || error}` }, 500);
  }
});

projectsRouter.put(`${PREFIX}/projects/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(KEY(id));
    if (!existing) return c.json({ error: `Project ${id} not found` }, 404);
    const updates = await c.req.json();
    const project = { ...existing, ...updates, id, updated_at: new Date().toISOString() };
    await kv.set(KEY(id), project);
    return c.json(project);
  } catch (error: any) {
    console.log(`Error updating project: ${error?.message || error}`);
    return c.json({ error: `Failed to update project: ${error?.message || error}` }, 500);
  }
});

projectsRouter.delete(`${PREFIX}/projects/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(KEY(id));
    return c.json({ success: true });
  } catch (error: any) {
    console.log(`Error deleting project: ${error?.message || error}`);
    return c.json({ error: `Failed to delete project: ${error?.message || error}` }, 500);
  }
});

export default projectsRouter;
