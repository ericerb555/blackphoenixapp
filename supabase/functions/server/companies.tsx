/**
 * Companies Router - KV Store Based Company Management
 * 
 * IMPORTANT: After modifying this file, you MUST redeploy the Supabase Edge Function:
 * 
 * The server function needs to be redeployed for changes to take effect.
 * This router handles all company CRUD operations using the KV store.
 * 
 * Routes:
 * - GET    /make-server-3eae23a6/companies - List all companies for authenticated user
 * - POST   /make-server-3eae23a6/companies - Create a new company
 * - PUT    /make-server-3eae23a6/companies/:id - Update a company
 * - DELETE /make-server-3eae23a6/companies/:id - Delete a company
 * 
 * All routes require authentication via Bearer token in Authorization header.
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const companiesRouter = new Hono();

// Enable CORS for all companies routes
companiesRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// Handle OPTIONS for all routes
companiesRouter.options("*", (c) => {
  console.log("✅ Companies OPTIONS preflight handled");
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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

console.log("🏢 Companies Router loaded with CORS enabled");

// Get all companies for a user
companiesRouter.get('/make-server-3eae23a6/companies', async (c) => {
  try {
    console.log("[Companies] Fetching all companies...");
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.error("[Companies] No access token provided");
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error("[Companies] Auth error:", authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`[Companies] Loading companies for user: ${user.id}`);

    // Get all companies for this user from KV store
    const companiesData = await kv.getByPrefix(`company:${user.id}:`);
    
    console.log(`[Companies] Raw data from KV store:`, companiesData);
    
    // Extract values from the {key, value} objects returned by getByPrefix
    const companies = companiesData && companiesData.length > 0 
      ? companiesData.map((item: any) => item.value || item)
      : [];
    
    console.log(`[Companies] Found ${companies.length} companies for user ${user.id}`);
    return c.json({ companies });
  } catch (error) {
    console.error('[Companies] Error fetching companies:', error);
    console.error('[Companies] Error details:', error?.message);
    return c.json({ error: 'Failed to fetch companies', details: error?.message || String(error) }, 500);
  }
});

// Create a new company
companiesRouter.post('/make-server-3eae23a6/companies', async (c) => {
  try {
    console.log('[Companies] Creating new company...');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.error('[Companies] No access token provided for POST');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('[Companies] Auth error on POST:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    console.log('[Companies] Creating company for user:', user.id, 'with data:', body.name);
    
    const company = {
      ...body,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in KV with key pattern: company:{user_id}:{company_id}
    const key = `company:${user.id}:${company.id}`;
    console.log('[Companies] Storing company with key:', key);
    await kv.set(key, company);
    
    console.log('[Companies] ✅ Company created successfully:', company.id);
    return c.json({ company });
  } catch (error) {
    console.error('[Companies] Error creating company:', error);
    console.error('[Companies] Error details:', error?.message);
    return c.json({ error: 'Failed to create company', details: error?.message || String(error) }, 500);
  }
});

// Update a company
companiesRouter.put('/make-server-3eae23a6/companies/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('id');
    const body = await c.req.json();
    
    // Get existing company to verify ownership
    const existingCompany = await kv.get(`company:${user.id}:${companyId}`);
    
    if (!existingCompany) {
      return c.json({ error: 'Company not found' }, 404);
    }

    const updatedCompany = {
      ...existingCompany,
      ...body,
      id: companyId,
      owner_id: user.id,
      updated_at: new Date().toISOString()
    };

    await kv.set(`company:${user.id}:${companyId}`, updatedCompany);
    
    return c.json({ company: updatedCompany });
  } catch (error) {
    console.error('Error updating company:', error);
    return c.json({ error: 'Failed to update company' }, 500);
  }
});

// Delete a company
companiesRouter.delete('/make-server-3eae23a6/companies/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('id');
    
    // Verify company exists and user owns it
    const existingCompany = await kv.get(`company:${user.id}:${companyId}`);
    
    if (!existingCompany) {
      return c.json({ error: 'Company not found' }, 404);
    }

    await kv.del(`company:${user.id}:${companyId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return c.json({ error: 'Failed to delete company' }, 500);
  }
});

export default companiesRouter;