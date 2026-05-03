/**
 * Black Phoenix Server - Single File Deployment
 * All routes inline to avoid import issues
 * Version: 1.1.0
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

console.log("========================================");
console.log("🚀 Black Phoenix Server v1.1.0");
console.log("========================================");

// CORS
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.use('*', logger(console.log));

// Health check
app.get("/make-server-57095a78/health", (c) => {
  return c.json({
    status: "ok",
    message: "Black Phoenix Server Running",
    timestamp: new Date().toISOString(),
    version: "1.1.0"
  });
});

// ============================================
// INVESTMENT OPPORTUNITIES
// ============================================

// Get all opportunities
app.get('/make-server-57095a78/investments/opportunities', async (c) => {
  try {
    const { data, error } = await supabase
      .from('investment_opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json({ opportunities: data || [] });
  } catch (error: any) {
    console.error('Error fetching opportunities:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single opportunity
app.get('/make-server-57095a78/investments/opportunities/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('investment_opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return c.json({ opportunity: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create opportunity
app.post('/make-server-57095a78/investments/opportunities', async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('investment_opportunities')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return c.json({ opportunity: data }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update opportunity
app.put('/make-server-57095a78/investments/opportunities/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('investment_opportunities')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ opportunity: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete opportunity
app.delete('/make-server-57095a78/investments/opportunities/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase
      .from('investment_opportunities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// INVESTOR COMMITMENTS
// ============================================

// Get commitments for investor
app.get('/make-server-57095a78/investments/commitments/investor/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const { data, error } = await supabase
      .from('investor_commitments')
      .select(`*, opportunity:investment_opportunities(*)`)
      .eq('investor_email', email)
      .order('commitment_date', { ascending: false });

    if (error) throw error;
    return c.json({ commitments: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create commitment
app.post('/make-server-57095a78/investments/commitments', async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('investor_commitments')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return c.json({ commitment: data }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update commitment
app.put('/make-server-57095a78/investments/commitments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('investor_commitments')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ commitment: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// PAYOUTS
// ============================================

// Get payouts for investor
app.get('/make-server-57095a78/investments/payouts/investor/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const { data, error } = await supabase
      .from('payout_distributions')
      .select(`*, commitment:investor_commitments(*), opportunity:investment_opportunities(*)`)
      .eq('investor_email', email)
      .order('payout_date', { ascending: false });

    if (error) throw error;
    return c.json({ payouts: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create payout
app.post('/make-server-57095a78/investments/payouts', async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('payout_distributions')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return c.json({ payout: data }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update payout
app.put('/make-server-57095a78/investments/payouts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = { ...body };
    if (body.status === 'completed' && !body.processed_at) {
      updateData.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('payout_distributions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ payout: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// DOCUMENTS
// ============================================

// Get documents for opportunity
app.get('/make-server-57095a78/investments/documents/opportunity/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('investment_documents')
      .select('*')
      .eq('opportunity_id', id)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return c.json({ documents: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Sign document
app.post('/make-server-57095a78/investments/documents/:id/sign', async (c) => {
  try {
    const id = c.req.param('id');
    const { signed_by, signature_data } = await c.req.json();
    const { data, error } = await supabase
      .from('investment_documents')
      .update({
        signed_at: new Date().toISOString(),
        signed_by,
        signature_data
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ document: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// PORTFOLIO ANALYTICS
// ============================================

app.get('/make-server-57095a78/investments/analytics/portfolio/:email', async (c) => {
  try {
    const email = c.req.param('email');

    const { data: commitments, error: commitmentsError } = await supabase
      .from('investor_commitments')
      .select(`*, opportunity:investment_opportunities(*)`)
      .eq('investor_email', email)
      .in('status', ['approved', 'active', 'completed']);

    if (commitmentsError) throw commitmentsError;

    const { data: payouts, error: payoutsError } = await supabase
      .from('payout_distributions')
      .select('*')
      .eq('investor_email', email)
      .eq('status', 'completed');

    if (payoutsError) throw payoutsError;

    const totalInvested = commitments?.reduce((sum, c) => sum + parseFloat(c.commitment_amount), 0) || 0;
    const totalReceived = commitments?.reduce((sum, c) => sum + parseFloat(c.total_received || 0), 0) || 0;

    return c.json({
      summary: {
        totalInvested,
        totalReceived,
        currentValue: totalInvested + totalReceived,
        totalROI: totalInvested > 0 ? ((totalReceived / totalInvested) * 100).toFixed(2) : 0,
        activeInvestments: commitments?.filter(c => c.status === 'active').length || 0,
        completedInvestments: commitments?.filter(c => c.status === 'completed').length || 0,
        totalPayouts: payouts?.length || 0
      },
      commitments,
      recentPayouts: payouts?.slice(0, 10) || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// COMPANIES CRUD
// ============================================

// Get all companies for user
app.get('/make-server-57095a78/companies', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get companies from KV store (user-specific key)
    const userKey = `companies_${user.id}`;
    const companies = await kv.get(userKey) || [];

    return c.json({ companies });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create company
app.post('/make-server-57095a78/companies', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const userKey = `companies_${user.id}`;

    // Get existing companies
    const existingCompanies = await kv.get(userKey) || [];

    // Add new company
    const newCompany = {
      ...body,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedCompanies = [...existingCompanies, newCompany];

    // Save back to KV store
    await kv.set(userKey, updatedCompanies);

    return c.json({ company: newCompany }, 201);
  } catch (error: any) {
    console.error('Error creating company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update company
app.put('/make-server-57095a78/companies/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('id');
    const body = await c.req.json();
    const userKey = `companies_${user.id}`;

    // Get existing companies
    const companies = await kv.get(userKey) || [];

    // Find and update the company
    const updatedCompanies = companies.map((company: any) =>
      company.id === companyId
        ? { ...company, ...body, updated_at: new Date().toISOString() }
        : company
    );

    // Save back to KV store
    await kv.set(userKey, updatedCompanies);

    const updatedCompany = updatedCompanies.find((c: any) => c.id === companyId);

    return c.json({ company: updatedCompany });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete company
app.delete('/make-server-57095a78/companies/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyId = c.req.param('id');
    const userKey = `companies_${user.id}`;

    // Get existing companies
    const companies = await kv.get(userKey) || [];

    // Filter out the deleted company
    const updatedCompanies = companies.filter((company: any) => company.id !== companyId);

    // Save back to KV store
    await kv.set(userKey, updatedCompanies);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// KV STORE (Database Persistence)
// ============================================

// Set key-value
app.post('/make-server-57095a78/kv/set', async (c) => {
  try {
    const { key, value } = await c.req.json();
    await kv.set(key, value);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('KV set error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get key-value
app.get('/make-server-57095a78/kv/get', async (c) => {
  try {
    const key = c.req.query('key');
    if (!key) {
      return c.json({ error: 'Key parameter required' }, 400);
    }
    const value = await kv.get(key);
    return c.json({ value });
  } catch (error: any) {
    console.error('KV get error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get by prefix
app.get('/make-server-57095a78/kv/get-by-prefix', async (c) => {
  try {
    const prefix = c.req.query('prefix');
    if (!prefix) {
      return c.json({ error: 'Prefix parameter required' }, 400);
    }
    const values = await kv.getByPrefix(prefix);
    return c.json({ values });
  } catch (error: any) {
    console.error('KV getByPrefix error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete key
app.delete('/make-server-57095a78/kv/delete', async (c) => {
  try {
    const key = c.req.query('key');
    if (!key) {
      return c.json({ error: 'Key parameter required' }, 400);
    }
    await kv.del(key);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('KV delete error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Root
app.get("/", (c) => {
  return c.json({
    message: "Black Phoenix API",
    version: "1.1.0",
    endpoints: {
      health: "/make-server-57095a78/health",
      investments: "/make-server-57095a78/investments",
      kv: "/make-server-57095a78/kv/*"
    }
  });
});

Deno.serve(app.fetch);
