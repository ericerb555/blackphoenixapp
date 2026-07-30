import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

// Company service-catalog CRUD, KV-backed.
// Frontend contract lives in src/app/lib/services/serviceManager.ts:
//   GET    /make-server-3eae23a6/services          -> Service[]
//   POST   /make-server-3eae23a6/services          -> Service
//   GET    /make-server-3eae23a6/services/:id       -> Service
//   PUT    /make-server-3eae23a6/services/:id       -> Service
const servicesRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";
const KEY = (id: string) => `service:${id}`;

servicesRouter.get(`${PREFIX}/services`, async (c) => {
  try {
    const services = (await kv.getByPrefix("service:")) || [];
    return c.json(services);
  } catch (error: any) {
    console.log(`Error listing services: ${error?.message || error}`);
    return c.json({ error: `Failed to list services: ${error?.message || error}` }, 500);
  }
});

servicesRouter.get(`${PREFIX}/services/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const service = await kv.get(KEY(id));
    if (!service) return c.json({ error: `Service ${id} not found` }, 404);
    return c.json(service);
  } catch (error: any) {
    console.log(`Error fetching service: ${error?.message || error}`);
    return c.json({ error: `Failed to fetch service: ${error?.message || error}` }, 500);
  }
});

servicesRouter.post(`${PREFIX}/services`, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = body.id || crypto.randomUUID();
    const service = {
      ...body,
      id,
      created_at: body.created_at || now,
      updated_at: now,
    };
    await kv.set(KEY(id), service);
    return c.json(service);
  } catch (error: any) {
    console.log(`Error creating service: ${error?.message || error}`);
    return c.json({ error: `Failed to create service: ${error?.message || error}` }, 500);
  }
});

servicesRouter.put(`${PREFIX}/services/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(KEY(id));
    if (!existing) return c.json({ error: `Service ${id} not found` }, 404);
    const updates = await c.req.json();
    const service = {
      ...existing,
      ...updates,
      id,
      updated_at: new Date().toISOString(),
    };
    await kv.set(KEY(id), service);
    return c.json(service);
  } catch (error: any) {
    console.log(`Error updating service: ${error?.message || error}`);
    return c.json({ error: `Failed to update service: ${error?.message || error}` }, 500);
  }
});

export default servicesRouter;
