/**
 * Brands Router - KV Store Based Brand Management
 * 
 * Routes:
 * - GET    /make-server-3eae23a6/brands/:companyId - Get brand data for a company
 * - POST   /make-server-3eae23a6/brands/:companyId - Save/Update brand data for a company
 * - DELETE /make-server-3eae23a6/brands/:companyId - Delete brand data for a company
 * 
 * All routes require authentication via Bearer token in Authorization header.
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const brandsRouter = new Hono();

// Enable CORS for all brands routes
brandsRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// Handle OPTIONS for all routes
brandsRouter.options("*", (c) => {
  console.log("✅ Brands OPTIONS preflight handled");
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
    },
  });
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

console.log("🎨 Brands Router loaded with CORS enabled");

// Get brand data for a company
brandsRouter.get('/make-server-3eae23a6/brands/:companyId', async (c) => {
  try {
    console.log("[Brands] Fetching brand data...");
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.error("[Brands] No access token provided");
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error("[Brands] Auth error:", authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('companyId');
    console.log(`[Brands] Loading brand for company: ${companyId}`);

    // Get brand data from KV store
    const brandData = await kv.get(`brand:${user.id}:${companyId}`);
    
    if (!brandData) {
      console.log(`[Brands] No brand data found for company ${companyId}`);
      return c.json({ brand: null });
    }
    
    console.log(`[Brands] Found brand data for company ${companyId}`);
    return c.json({ brand: brandData });
  } catch (error) {
    console.error('[Brands] Error fetching brand:', error);
    return c.json({ error: 'Failed to fetch brand data' }, 500);
  }
});

// Save/Update brand data for a company
brandsRouter.post('/make-server-3eae23a6/brands/:companyId', async (c) => {
  try {
    console.log("[Brands] Saving brand data...");
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('companyId');
    const body = await c.req.json();
    
    const brandData = {
      ...body,
      companyId,
      userId: user.id,
      updated_at: new Date().toISOString()
    };

    // Store in KV with key pattern: brand:{user_id}:{company_id}
    await kv.set(`brand:${user.id}:${companyId}`, brandData);
    
    console.log(`[Brands] ✅ Saved brand data for company ${companyId}`);
    console.log(`[Brands] Logos saved:`, {
      primary: !!brandData.logoPrimary,
      secondary: !!brandData.logoSecondary,
      icon: !!brandData.logoIcon,
      light: !!brandData.logoLight,
      dark: !!brandData.logoDark,
      horizontal: !!brandData.logoHorizontal,
      vertical: !!brandData.logoVertical,
    });
    
    return c.json({ brand: brandData });
  } catch (error) {
    console.error('[Brands] Error saving brand:', error);
    return c.json({ error: 'Failed to save brand data' }, 500);
  }
});

// Delete brand data for a company
brandsRouter.delete('/make-server-3eae23a6/brands/:companyId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('companyId');
    
    // Verify brand exists
    const existingBrand = await kv.get(`brand:${user.id}:${companyId}`);
    
    if (!existingBrand) {
      return c.json({ error: 'Brand not found' }, 404);
    }

    await kv.del(`brand:${user.id}:${companyId}`);
    
    console.log(`[Brands] ✅ Deleted brand data for company ${companyId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Brands] Error deleting brand:', error);
    return c.json({ error: 'Failed to delete brand data' }, 500);
  }
});

export default brandsRouter;
