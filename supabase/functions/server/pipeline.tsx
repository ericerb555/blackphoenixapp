import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const pipelineRouter = new Hono();

// Enable CORS for all pipeline routes
pipelineRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// Handle OPTIONS for all routes
pipelineRouter.options("*", (c) => {
  console.log("✅ Pipeline OPTIONS preflight handled");
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
    },
  });
});

console.log("📋 Pipeline Router loaded with CORS enabled");

// ============================================================================
// PIPELINE MANAGEMENT ENDPOINTS
// ============================================================================

// Get all pipeline items
pipelineRouter.get("/make-server-57095a78/pipeline/items", async (c) => {
  try {
    console.log("[Pipeline] Fetching all pipeline items...");
    const items = await kv.getByPrefix("pipeline_");
    console.log(`[Pipeline] Found ${items?.length || 0} pipeline items`);
    
    return c.json({ 
      success: true,
      items: items || [],
      count: items?.length || 0
    });
  } catch (error) {
    console.error("[Pipeline] Error fetching items:", error);
    return c.json({ 
      success: false,
      error: "Failed to fetch pipeline items", 
      details: String(error) 
    }, 500);
  }
});

// Get a single pipeline item by ID
pipelineRouter.get("/make-server-57095a78/pipeline/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[Pipeline] Fetching item: ${id}`);
    
    const item = await kv.get(`pipeline_${id}`);
    
    if (!item) {
      return c.json({ 
        success: false,
        error: "Pipeline item not found" 
      }, 404);
    }
    
    return c.json({ 
      success: true,
      item 
    });
  } catch (error) {
    console.error("[Pipeline] Error fetching item:", error);
    return c.json({ 
      success: false,
      error: "Failed to fetch pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// Create a new pipeline item
pipelineRouter.post("/make-server-57095a78/pipeline/items", async (c) => {
  try {
    const body = await c.req.json();
    console.log("[Pipeline] Creating new item:", body.id);
    
    const item = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`pipeline_${item.id}`, item);
    
    return c.json({ 
      success: true,
      item 
    });
  } catch (error) {
    console.error("[Pipeline] Error creating item:", error);
    return c.json({ 
      success: false,
      error: "Failed to create pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// Update a pipeline item
pipelineRouter.put("/make-server-57095a78/pipeline/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    console.log(`[Pipeline] Updating item: ${id}`);
    
    // Get existing item
    const existing = await kv.get(`pipeline_${id}`);
    
    if (!existing) {
      return c.json({ 
        success: false,
        error: "Pipeline item not found" 
      }, 404);
    }
    
    // Merge updates
    const updated = {
      ...existing,
      ...body,
      id, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`pipeline_${id}`, updated);
    
    return c.json({ 
      success: true,
      item: updated 
    });
  } catch (error) {
    console.error("[Pipeline] Error updating item:", error);
    return c.json({ 
      success: false,
      error: "Failed to update pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// Delete a pipeline item
pipelineRouter.delete("/make-server-57095a78/pipeline/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[Pipeline] Deleting item: ${id}`);
    
    await kv.del(`pipeline_${id}`);
    
    return c.json({ 
      success: true,
      message: "Pipeline item deleted" 
    });
  } catch (error) {
    console.error("[Pipeline] Error deleting item:", error);
    return c.json({ 
      success: false,
      error: "Failed to delete pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// Move item to different stage
pipelineRouter.post("/make-server-57095a78/pipeline/items/:id/move", async (c) => {
  try {
    const id = c.req.param("id");
    const { stage } = await c.req.json();
    console.log(`[Pipeline] Moving item ${id} to stage: ${stage}`);
    
    const item = await kv.get(`pipeline_${id}`);
    
    if (!item) {
      return c.json({ 
        success: false,
        error: "Pipeline item not found" 
      }, 404);
    }
    
    const updated = {
      ...item,
      stage,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`pipeline_${id}`, updated);
    
    return c.json({ 
      success: true,
      item: updated 
    });
  } catch (error) {
    console.error("[Pipeline] Error moving item:", error);
    return c.json({ 
      success: false,
      error: "Failed to move pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// Batch update multiple items
pipelineRouter.post("/make-server-57095a78/pipeline/items/batch", async (c) => {
  try {
    const { items } = await c.req.json();
    console.log(`[Pipeline] Batch updating ${items?.length || 0} items`);
    
    if (!Array.isArray(items)) {
      return c.json({ 
        success: false,
        error: "Invalid request: items must be an array" 
      }, 400);
    }
    
    // Prepare items for batch update
    const kvPairs = items.map(item => ({
      key: `pipeline_${item.id}`,
      value: {
        ...item,
        updatedAt: new Date().toISOString()
      }
    }));
    
    // Use mset for batch update
    await kv.mset(kvPairs.map(pair => pair.key), kvPairs.map(pair => pair.value));
    
    return c.json({ 
      success: true,
      count: items.length 
    });
  } catch (error) {
    console.error("[Pipeline] Error batch updating items:", error);
    return c.json({ 
      success: false,
      error: "Failed to batch update pipeline items", 
      details: String(error) 
    }, 500);
  }
});

// Health check for pipeline API
pipelineRouter.get("/make-server-57095a78/pipeline/health", async (c) => {
  console.log("[Pipeline] Health check");
  return c.json({ 
    success: true,
    status: "healthy",
    service: "pipeline-api",
    timestamp: new Date().toISOString()
  });
});

export default pipelineRouter;