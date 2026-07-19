import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// Investment opportunities are stored one-per-key under this prefix. They are
// business-wide (shown to all prospective investors), so they use a shared
// (non-user-scoped) key. Fields are stored in the snake_case shape the client
// sends and expects back.
const PREFIX = "investment_opp:";

// GET all opportunities
router.get("/make-server-57095a78/investments/opportunities", async (c) => {
  try {
    const opportunities = await kv.getByPrefix(PREFIX);
    return c.json({ success: true, opportunities: opportunities || [] });
  } catch (err) {
    console.log("Error fetching investment opportunities:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// POST create an opportunity
router.post("/make-server-57095a78/investments/opportunities", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `opp-${Date.now()}`;
    const opportunity = {
      ...body,
      id,
      updated_at: new Date().toISOString(),
      created_at: body.created_at || new Date().toISOString(),
    };
    await kv.set(`${PREFIX}${id}`, opportunity);
    return c.json({ success: true, opportunity });
  } catch (err) {
    console.log("Error creating investment opportunity:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// PUT update an opportunity (accepts partial fields)
router.put("/make-server-57095a78/investments/opportunities/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`${PREFIX}${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Opportunity not found" }, 404);
    }
    const opportunity = { ...existing, ...body, id, updated_at: new Date().toISOString() };
    await kv.set(`${PREFIX}${id}`, opportunity);
    return c.json({ success: true, opportunity });
  } catch (err) {
    console.log("Error updating investment opportunity:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// DELETE an opportunity
router.delete("/make-server-57095a78/investments/opportunities/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`${PREFIX}${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error deleting investment opportunity:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
