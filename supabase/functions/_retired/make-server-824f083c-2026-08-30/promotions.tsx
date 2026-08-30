import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// Get all promotions
router.get("/", async (c) => {
  try {
    console.log("📋 Getting all promotions");
    const promotions = await kv.getByPrefix("promotion:");
    console.log(`✅ Found ${promotions.length} promotions`);
    return c.json(promotions);
  } catch (error) {
    console.error("❌ Error getting promotions:", error);
    return c.json({ error: "Failed to get promotions" }, 500);
  }
});

// Get single promotion by ID
router.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`📋 Getting promotion: ${id}`);
    const promotion = await kv.get(`promotion:${id}`);
    
    if (!promotion) {
      return c.json({ error: "Promotion not found" }, 404);
    }
    
    console.log(`✅ Found promotion: ${id}`);
    return c.json(promotion);
  } catch (error) {
    console.error("❌ Error getting promotion:", error);
    return c.json({ error: "Failed to get promotion" }, 500);
  }
});

// Create new promotion
router.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `PROMO-${Date.now()}`;
    const promotion = {
      ...body,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log(`📝 Creating promotion: ${id}`);
    await kv.set(`promotion:${id}`, promotion);
    console.log(`✅ Created promotion: ${id}`);
    
    return c.json(promotion, 201);
  } catch (error) {
    console.error("❌ Error creating promotion:", error);
    return c.json({ error: "Failed to create promotion" }, 500);
  }
});

// Update promotion
router.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    console.log(`📝 Updating promotion: ${id}`);
    const existing = await kv.get(`promotion:${id}`);
    
    if (!existing) {
      return c.json({ error: "Promotion not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`promotion:${id}`, updated);
    console.log(`✅ Updated promotion: ${id}`);
    
    return c.json(updated);
  } catch (error) {
    console.error("❌ Error updating promotion:", error);
    return c.json({ error: "Failed to update promotion" }, 500);
  }
});

// Delete promotion
router.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`🗑️ Deleting promotion: ${id}`);
    
    await kv.del(`promotion:${id}`);
    console.log(`✅ Deleted promotion: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting promotion:", error);
    return c.json({ error: "Failed to delete promotion" }, 500);
  }
});

export default router;
