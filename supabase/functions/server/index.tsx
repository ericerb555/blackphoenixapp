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
// BUSINESS PROFILES / COMPANY BRANDING
// ============================================

// Get company branding (PUBLIC - no auth required)
// This endpoint provides logo and branding for landing pages
app.get('/make-server-57095a78/public/branding', async (c) => {
  try {
    console.log('📷 [Public Branding] Fetching company branding...');

    // Try KV store first (fastest, no auth needed)
    let branding = await kv.get('public_branding');

    if (branding && branding.logo_url) {
      console.log('✅ [Public Branding] Loaded from KV cache:', branding.company_name);
      console.log('✅ [Public Branding] Logo:', branding.logo_url ? (branding.logo_url.length / 1024).toFixed(1) + 'KB' : 'NOT SET');
      return c.json(branding);
    }

    // If not in KV, fetch from database and cache it
    console.log('ℹ️ [Public Branding] Not in cache, fetching from database...');

    const { data: companies, error } = await supabase
      .from('companies')
      .select('company_name, company_legal_name, logo_primary, logo_url, primary_color, secondary_color, email, phone, website, address_line1, city, state, zip_code, country')
      .limit(1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Public Branding] Database error:', error);
      // Return default branding even on error
      const defaultBranding = {
        company_name: 'The Black Phoenix Company',
        dbaName: 'Black Phoenix Builds',
        logo_url: null,
        primary_color: '#ea580c',
        secondary_color: '#f97316'
      };
      return c.json(defaultBranding);
    }

    if (!companies || companies.length === 0) {
      console.log('ℹ️ [Public Branding] No companies found');
      const defaultBranding = {
        company_name: 'The Black Phoenix Company',
        dbaName: 'Black Phoenix Builds',
        logo_url: null,
        primary_color: '#ea580c',
        secondary_color: '#f97316'
      };
      return c.json(defaultBranding);
    }

    const company = companies[0];
    const logoToUse = company.logo_primary || company.logo_url;

    branding = {
      company_name: company.company_name,
      dbaName: company.company_legal_name || company.company_name,
      businessName: company.company_name,
      logo_url: logoToUse,
      primary_color: company.primary_color || '#ea580c',
      secondary_color: company.secondary_color || '#f97316',
      email: company.email,
      phone: company.phone,
      address_line1: company.address_line1,
      city: company.city,
      state: company.state,
      zip_code: company.zip_code,
      country: company.country,
      website: company.website,
    };

    // Cache it in KV store for future requests
    await kv.set('public_branding', branding);
    console.log('✅ [Public Branding] Cached to KV store');

    console.log('✅ [Public Branding] Branding fetched:', company.company_name);
    console.log('✅ [Public Branding] Logo:', logoToUse ? (logoToUse.length / 1024).toFixed(1) + 'KB' : 'NOT SET');

    return c.json(branding);
  } catch (error: any) {
    console.error('❌ [Public Branding] Error:', error);
    // Return default branding on any error
    const defaultBranding = {
      company_name: 'The Black Phoenix Company',
      dbaName: 'Black Phoenix Builds',
      logo_url: null,
      primary_color: '#ea580c',
      secondary_color: '#f97316'
    };
    return c.json(defaultBranding);
  }
});

// Update public branding cache (call this after uploading logo)
app.post('/make-server-57095a78/public/branding/refresh', async (c) => {
  try {
    console.log('🔄 [Public Branding] Refreshing cache...');

    const { data: companies, error } = await supabase
      .from('companies')
      .select('company_name, company_legal_name, logo_primary, logo_url, primary_color, secondary_color, email, phone, website, address_line1, city, state, zip_code, country')
      .limit(1)
      .order('created_at', { ascending: false });

    if (error || !companies || companies.length === 0) {
      return c.json({ error: 'No companies found' }, 404);
    }

    const company = companies[0];
    const logoToUse = company.logo_primary || company.logo_url;

    const branding = {
      company_name: company.company_name,
      dbaName: company.company_legal_name || company.company_name,
      businessName: company.company_name,
      logo_url: logoToUse,
      primary_color: company.primary_color || '#ea580c',
      secondary_color: company.secondary_color || '#f97316',
      email: company.email,
      phone: company.phone,
      address_line1: company.address_line1,
      city: company.city,
      state: company.state,
      zip_code: company.zip_code,
      country: company.country,
      website: company.website,
    };

    await kv.set('public_branding', branding);
    console.log('✅ [Public Branding] Cache refreshed');

    return c.json({ success: true, branding });
  } catch (error: any) {
    console.error('❌ [Public Branding] Refresh error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get business profiles (public - no auth required)
app.get('/make-server-57095a78/business-profiles', async (c) => {
  try {
    const profiles = await kv.get('business_profiles') || [];
    return c.json(profiles);
  } catch (error: any) {
    console.error('Error fetching business profiles:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create or update business profile
app.post('/make-server-57095a78/business-profiles', async (c) => {
  try {
    const body = await c.req.json();
    const profiles = await kv.get('business_profiles') || [];

    // Check if profile exists
    const existingIndex = profiles.findIndex((p: any) => p.id === body.id);

    if (existingIndex >= 0) {
      // Update existing
      profiles[existingIndex] = {
        ...profiles[existingIndex],
        ...body,
        updated_at: new Date().toISOString()
      };
    } else {
      // Create new
      profiles.push({
        ...body,
        id: body.id || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    await kv.set('business_profiles', profiles);
    return c.json({ success: true, profiles });
  } catch (error: any) {
    console.error('Error saving business profile:', error);
    return c.json({ error: error.message }, 500);
  }
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
// APPLICATIONS
// ============================================

// Submit application
app.post('/make-server-57095a78/applications', async (c) => {
  try {
    const applicationData = await c.req.json();

    // Get existing applications or initialize empty array
    const applications = await kv.get('applications') || [];

    // Create new application with metadata
    const newApplication = {
      id: crypto.randomUUID(),
      ...applicationData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to applications array
    applications.push(newApplication);

    // Save back to KV store
    await kv.set('applications', applications);

    console.log('Application submitted successfully:', newApplication.id);

    return c.json({
      success: true,
      applicationId: newApplication.id,
      message: 'Application submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return c.json({ error: `Application submission error: ${error.message}` }, 500);
  }
});

// Get all applications
app.get('/make-server-57095a78/applications', async (c) => {
  try {
    const applications = await kv.get('applications') || [];
    return c.json(applications);
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get application by ID
app.get('/make-server-57095a78/applications/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const applications = await kv.get('applications') || [];
    const application = applications.find((app: any) => app.id === id);

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    return c.json(application);
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update application status
app.patch('/make-server-57095a78/applications/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updateData = await c.req.json();
    const applications = await kv.get('applications') || [];

    const index = applications.findIndex((app: any) => app.id === id);
    if (index === -1) {
      return c.json({ error: 'Application not found' }, 404);
    }

    applications[index] = {
      ...applications[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await kv.set('applications', applications);

    return c.json({
      success: true,
      application: applications[index]
    });
  } catch (error: any) {
    console.error('Error updating application:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// PROPERTY MANAGEMENT (Condos, Landlords, Property Managers)
// ============================================

// Get all condo associations
app.get('/make-server-57095a78/property-management/condos', async (c) => {
  try {
    const condos = await kv.get('condos') || [];
    return c.json({ success: true, data: condos });
  } catch (error: any) {
    console.error('Error fetching condos:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single condo
app.get('/make-server-57095a78/property-management/condos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const condos = await kv.get('condos') || [];
    const condo = condos.find((c: any) => c.id === id);

    if (!condo) {
      return c.json({ success: false, error: 'Condo not found' }, 404);
    }

    return c.json({ success: true, data: condo });
  } catch (error: any) {
    console.error('Error fetching condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create condo
app.post('/make-server-57095a78/property-management/condos', async (c) => {
  try {
    const body = await c.req.json();
    const condos = await kv.get('condos') || [];

    const newCondo = {
      ...body,
      id: body.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    condos.push(newCondo);
    await kv.set('condos', condos);

    return c.json({ success: true, data: newCondo });
  } catch (error: any) {
    console.error('Error creating condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update condo
app.put('/make-server-57095a78/property-management/condos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const condos = await kv.get('condos') || [];

    const index = condos.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return c.json({ success: false, error: 'Condo not found' }, 404);
    }

    condos[index] = {
      ...condos[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    await kv.set('condos', condos);
    return c.json({ success: true, data: condos[index] });
  } catch (error: any) {
    console.error('Error updating condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete condo
app.delete('/make-server-57095a78/property-management/condos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const condos = await kv.get('condos') || [];

    const filtered = condos.filter((c: any) => c.id !== id);
    await kv.set('condos', filtered);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get work requests for condo
app.get('/make-server-57095a78/property-management/condos/:id/work-requests', async (c) => {
  try {
    const condoId = c.req.param('id');
    const status = c.req.query('status');

    const allWorkRequests = await kv.get('work_requests') || [];
    let filtered = allWorkRequests.filter((wr: any) => wr.condoId === condoId);

    if (status) {
      filtered = filtered.filter((wr: any) => wr.status === status);
    }

    return c.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Error fetching work requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create work request for condo
app.post('/make-server-57095a78/property-management/condos/:id/work-requests', async (c) => {
  try {
    const condoId = c.req.param('id');
    const body = await c.req.json();
    const allWorkRequests = await kv.get('work_requests') || [];

    const newRequest = {
      ...body,
      id: crypto.randomUUID(),
      condoId,
      type: 'condo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    allWorkRequests.push(newRequest);
    await kv.set('work_requests', allWorkRequests);

    return c.json({ success: true, data: newRequest });
  } catch (error: any) {
    console.error('Error creating work request:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update work request for condo
app.put('/make-server-57095a78/property-management/condos/:id/work-requests/:requestId', async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const body = await c.req.json();
    const allWorkRequests = await kv.get('work_requests') || [];

    const index = allWorkRequests.findIndex((wr: any) => wr.id === requestId);
    if (index === -1) {
      return c.json({ success: false, error: 'Work request not found' }, 404);
    }

    allWorkRequests[index] = {
      ...allWorkRequests[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    await kv.set('work_requests', allWorkRequests);
    return c.json({ success: true, data: allWorkRequests[index] });
  } catch (error: any) {
    console.error('Error updating work request:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get units for condo
app.get('/make-server-57095a78/property-management/condos/:id/units', async (c) => {
  try {
    const condoId = c.req.param('id');
    const allUnits = await kv.get('condo_units') || [];
    const filtered = allUnits.filter((u: any) => u.condoId === condoId);

    return c.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create unit for condo
app.post('/make-server-57095a78/property-management/condos/:id/units', async (c) => {
  try {
    const condoId = c.req.param('id');
    const body = await c.req.json();
    const allUnits = await kv.get('condo_units') || [];

    const newUnit = {
      ...body,
      id: crypto.randomUUID(),
      condoId,
      created_at: new Date().toISOString()
    };

    allUnits.push(newUnit);
    await kv.set('condo_units', allUnits);

    return c.json({ success: true, data: newUnit });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Property Manager - Get managed associations
app.get('/make-server-57095a78/property-management/property-managers/:id/associations', async (c) => {
  try {
    const managerId = c.req.param('id');

    // Get all condos where this manager is assigned
    const condos = await kv.get('condos') || [];
    const landlords = await kv.get('landlords') || [];

    const managedCondos = condos.filter((c: any) => c.propertyManagerId === managerId);
    const managedLandlords = landlords.filter((l: any) => l.propertyManagerId === managerId);

    return c.json({
      success: true,
      data: {
        condos: managedCondos,
        landlords: managedLandlords,
        total: managedCondos.length + managedLandlords.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching managed associations:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Property Manager - Get all work requests across managed associations
app.get('/make-server-57095a78/property-management/property-managers/:id/work-requests', async (c) => {
  try {
    const managerId = c.req.param('id');
    const status = c.req.query('status');

    // Get all condos managed by this PM
    const condos = await kv.get('condos') || [];
    const managedCondoIds = condos
      .filter((c: any) => c.propertyManagerId === managerId)
      .map((c: any) => c.id);

    // Get all work requests for managed properties
    const allWorkRequests = await kv.get('work_requests') || [];
    let filtered = allWorkRequests.filter((wr: any) =>
      managedCondoIds.includes(wr.condoId) || wr.propertyManagerId === managerId
    );

    if (status) {
      filtered = filtered.filter((wr: any) => wr.status === status);
    }

    return c.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Error fetching work requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get pending work requests counts
app.get('/make-server-57095a78/property-management/pending-counts', async (c) => {
  try {
    const allWorkRequests = await kv.get('work_requests') || [];
    const pending = allWorkRequests.filter((wr: any) => wr.status === 'pending_approval');

    const counts = {
      total: pending.length,
      condo: pending.filter((wr: any) => wr.type === 'condo').length,
      landlord: pending.filter((wr: any) => wr.type === 'landlord').length,
      propertyManager: pending.filter((wr: any) => wr.type === 'property_manager').length
    };

    return c.json({ success: true, data: counts });
  } catch (error: any) {
    console.error('Error fetching pending counts:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all pending work requests
app.get('/make-server-57095a78/property-management/work-requests/pending', async (c) => {
  try {
    const allWorkRequests = await kv.get('work_requests') || [];
    const pending = allWorkRequests.filter((wr: any) => wr.status === 'pending_approval');

    return c.json({ success: true, data: pending });
  } catch (error: any) {
    console.error('Error fetching pending work requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all approved work requests
app.get('/make-server-57095a78/property-management/work-requests/approved', async (c) => {
  try {
    const allWorkRequests = await kv.get('work_requests') || [];
    const approved = allWorkRequests.filter((wr: any) => wr.status === 'approved');

    return c.json({ success: true, data: approved });
  } catch (error: any) {
    console.error('Error fetching approved work requests:', error);
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

// Auto-generate comprehensive quote from work request - EVERY SCREW, SHIM, FASTENER
app.post('/make-server-57095a78/auto-generate-quote', async (c) => {
  try {
    const { workRequest } = await c.req.json();

    if (!workRequest) {
      return c.json({ error: 'Work request data required' }, 400);
    }

    console.log('[Auto-Quote] Generating COMPREHENSIVE quote for:', workRequest.title);

    const serviceType = workRequest.serviceType?.toLowerCase() || '';
    const title = workRequest.title?.toLowerCase() || '';
    const estimatedValue = workRequest.estimatedValue || 10000;

    let materials: any[] = [];
    let laborItems: any[] = [];
    let processSteps: any[] = [];

    // KITCHEN RENOVATION - Every screw, shim, fastener needed
    if (serviceType.includes('kitchen') || title.includes('kitchen')) {
      materials = [
        // CABINETRY - Main Units
        { id: `mat-${Date.now()}-1`, name: 'White Shaker Base Cabinets - 36" Sink Base', description: 'Premium white shaker style 36" sink base cabinet with soft-close hinges', quantity: 1, unit: 'each', unitCost: 485, totalCost: 485, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-2`, name: 'White Shaker Base Cabinets - 18" Base', description: 'Premium white shaker style 18" base cabinet with soft-close hinges and drawer', quantity: 4, unit: 'each', unitCost: 325, totalCost: 1300, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-3`, name: 'White Shaker Base Cabinets - 24" Base', description: 'Premium white shaker style 24" base cabinet with soft-close hinges and drawers', quantity: 3, unit: 'each', unitCost: 395, totalCost: 1185, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-4`, name: 'White Shaker Wall Cabinets - 36" x 30"', description: 'Premium white shaker style 36" wide x 30" tall wall cabinet', quantity: 4, unit: 'each', unitCost: 385, totalCost: 1540, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-5`, name: 'White Shaker Wall Cabinets - 30" x 30"', description: 'Premium white shaker style 30" wide x 30" tall wall cabinet', quantity: 2, unit: 'each', unitCost: 345, totalCost: 690, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-6`, name: 'Corner Base Cabinet - Lazy Susan', description: 'Premium corner base cabinet with lazy susan hardware', quantity: 1, unit: 'each', unitCost: 625, totalCost: 625, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        // CABINET HARDWARE & INSTALLATION
        { id: `mat-${Date.now()}-7`, name: 'Cabinet Knobs - Brushed Nickel', description: '1-1/4" brushed nickel cabinet knobs', quantity: 28, unit: 'each', unitCost: 4.25, totalCost: 119, supplier: 'Hardware Supply', category: 'Cabinet Hardware', visible: true },
        { id: `mat-${Date.now()}-8`, name: 'Cabinet Pulls - Brushed Nickel', description: '5" center-to-center brushed nickel pulls', quantity: 16, unit: 'each', unitCost: 6.50, totalCost: 104, supplier: 'Hardware Supply', category: 'Cabinet Hardware', visible: true },
        { id: `mat-${Date.now()}-9`, name: 'Cabinet Installation Screws - 2-1/2"', description: '#10 x 2-1/2" cabinet installation screws', quantity: 200, unit: 'each', unitCost: 0.18, totalCost: 36, supplier: 'Fastener Supply', category: 'Fasteners', visible: true },
        { id: `mat-${Date.now()}-10`, name: 'Cabinet Shims - Composite', description: 'Composite shims for cabinet leveling', quantity: 48, unit: 'each', unitCost: 0.65, totalCost: 31.20, supplier: 'Lumber & Supply', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-11`, name: 'Wood Glue - Construction Grade', description: 'Titebond III waterproof wood glue', quantity: 4, unit: 'quart', unitCost: 12.50, totalCost: 50, supplier: 'Lumber & Supply', category: 'Adhesives', visible: true },
        { id: `mat-${Date.now()}-12`, name: 'Cabinet Filler Strips - 3" x 96"', description: 'White painted filler strips for cabinet gaps', quantity: 4, unit: 'each', unitCost: 28, totalCost: 112, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-13`, name: 'Toe Kick Board - Painted White', description: '4-1/2" painted toe kick board', quantity: 28, unit: 'linear ft', unitCost: 5.25, totalCost: 147, supplier: 'Cabinet Direct Pro', category: 'Cabinetry', visible: true },
        // COUNTERTOPS
        { id: `mat-${Date.now()}-14`, name: 'Caesarstone Snow Quartz Countertops', description: '3cm Caesarstone Snow quartz slab with bullnose edge', quantity: 45, unit: 'sq ft', unitCost: 95, totalCost: 4275, supplier: 'Stone & Tile Warehouse', category: 'Countertops', visible: true },
        { id: `mat-${Date.now()}-15`, name: 'Quartz Seam Adhesive', description: 'Two-part epoxy for quartz seams (color-matched)', quantity: 3, unit: 'kit', unitCost: 45, totalCost: 135, supplier: 'Stone & Tile Warehouse', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-16`, name: 'Undermount Sink Clips', description: 'Stainless steel undermount sink clips', quantity: 8, unit: 'each', unitCost: 6.25, totalCost: 50, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-17`, name: 'Silicone Caulk - Clear', description: '100% silicone caulk for countertop installation', quantity: 6, unit: 'tube', unitCost: 8.50, totalCost: 51, supplier: 'General Supply', category: 'Sealants', visible: true },
        // APPLIANCES
        { id: `mat-${Date.now()}-18`, name: 'Bosch French Door Refrigerator - 36"', description: 'B36CL80ENS 36" counter-depth French door, stainless steel', quantity: 1, unit: 'each', unitCost: 2850, totalCost: 2850, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
        { id: `mat-${Date.now()}-19`, name: 'KitchenAid Dual-Fuel Range - 30"', description: 'KFDC500JSS 30" dual-fuel range with convection', quantity: 1, unit: 'each', unitCost: 2450, totalCost: 2450, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
        { id: `mat-${Date.now()}-20`, name: 'Bosch Dishwasher - 24"', description: 'SHEM78Z55N 24" dishwasher with third rack, 42 dBA', quantity: 1, unit: 'each', unitCost: 1200, totalCost: 1200, supplier: 'Appliance Depot', category: 'Appliances', visible: true },
        { id: `mat-${Date.now()}-21`, name: 'Undermount Sink & Faucet Package', description: 'Kraus 33" sink with Moen pull-down faucet', quantity: 1, unit: 'set', unitCost: 850, totalCost: 850, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-22`, name: 'Under-Cabinet LED Lighting', description: 'Dimmable LED strip system', quantity: 30, unit: 'linear ft', unitCost: 28, totalCost: 840, supplier: 'Lighting Solutions', category: 'Lighting', visible: true },
        { id: `mat-${Date.now()}-23`, name: 'Recessed LED Lights', description: '6" IC-rated LED fixtures', quantity: 8, unit: 'each', unitCost: 65, totalCost: 520, supplier: 'Lighting Solutions', category: 'Lighting', visible: true },
        { id: `mat-${Date.now()}-24`, name: 'Subway Tile Backsplash', description: '3x6 white ceramic subway tile', quantity: 65, unit: 'sq ft', unitCost: 7.50, totalCost: 487.50, supplier: 'Stone & Tile Warehouse', category: 'Tile', visible: true },
        { id: `mat-${Date.now()}-25`, name: 'Tile Installation Materials', description: 'Thinset, grout, spacers, sealer', quantity: 1, unit: 'kit', unitCost: 185, totalCost: 185, supplier: 'Stone & Tile Warehouse', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-26`, name: 'Red Oak Hardwood Flooring', description: '3/4" solid red oak, prefinished', quantity: 185, unit: 'sq ft', unitCost: 12.50, totalCost: 2312.50, supplier: 'Hardwood Floors Direct', category: 'Flooring', visible: true },
        { id: `mat-${Date.now()}-27`, name: 'Flooring Installation Materials', description: 'Underlayment, cleats, nails, adhesive', quantity: 1, unit: 'kit', unitCost: 280, totalCost: 280, supplier: 'Hardwood Floors Direct', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-28`, name: 'Paint & Supplies', description: 'Sherwin Williams ProClassic system, brushes, rollers', quantity: 1, unit: 'kit', unitCost: 685, totalCost: 685, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
        { id: `mat-${Date.now()}-29`, name: 'Electrical Materials', description: 'Wire, outlets, switches, breakers, boxes', quantity: 1, unit: 'kit', unitCost: 485, totalCost: 485, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
        { id: `mat-${Date.now()}-30`, name: 'Plumbing Materials', description: 'PEX, fittings, valves, supplies', quantity: 1, unit: 'kit', unitCost: 325, totalCost: 325, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-31`, name: 'Miscellaneous Fasteners & Supplies', description: 'Screws, nails, caulk, tape, drop cloths', quantity: 1, unit: 'kit', unitCost: 285, totalCost: 285, supplier: 'General Supply', category: 'Installation Materials', visible: true },
      ];

      laborItems = [
        { id: `lab-${Date.now()}-1`, role: 'Site Protection & Demolition', description: 'Install protective barriers on floors, walls, and doorways. Carefully remove all existing cabinets, countertops, backsplash, and flooring. Disconnect and safely cap plumbing and electrical. Haul away all demolition debris. Duration: 2 full days with 2-person crew.', hours: 22, hourlyRate: 75, totalCost: 1650, visible: true },
        { id: `lab-${Date.now()}-2`, role: 'Electrical Rough-In & Upgrades', description: 'Run new dedicated 20A circuits for kitchen outlets per code. Install electrical boxes for outlets, switches, and fixtures. Run wiring for under-cabinet lighting system. Install GFCI outlets. Upgrade to AFCI breakers. Install rough-in for range and dishwasher. Coordinate with electrical inspector.', hours: 24, hourlyRate: 95, totalCost: 2280, visible: true },
        { id: `lab-${Date.now()}-3`, role: 'Plumbing Rough-In & Gas Line', description: 'Install new PEX supply lines to sink, dishwasher, and refrigerator ice maker. Install new drain lines with proper venting per code. Run new gas line for range with approved black iron pipe. Install shut-off valves for all fixtures. Pressure test all lines. Coordinate with plumbing inspector for rough-in approval.', hours: 16, hourlyRate: 105, totalCost: 1680, visible: true },
        { id: `lab-${Date.now()}-4`, role: 'Drywall Repair & Preparation', description: 'Patch all drywall damage from demolition. Apply joint compound, tape seams, and sand smooth to Level 4 finish. Prime all repaired areas. Ensure walls are perfectly flat for backsplash installation. Touch up ceiling as needed.', hours: 6, hourlyRate: 75, totalCost: 450, visible: true },
        { id: `lab-${Date.now()}-5`, role: 'Cabinet Installation & Leveling', description: 'Install all base cabinets with precision leveling and shimming. Securely anchor to wall studs. Install all wall cabinets with laser level for perfect alignment. Install corner lazy susan hardware. Install cabinet fillers and scribe to walls. Install toe kick boards. Install all cabinet hardware (knobs and pulls). Ensure all doors and drawers operate smoothly with soft-close function.', hours: 28, hourlyRate: 85, totalCost: 2380, visible: true },
        { id: `lab-${Date.now()}-6`, role: 'Countertop Fabrication & Installation', description: 'Create precise template of countertop layout. Fabricate Caesarstone Snow quartz slabs with bullnose edge profile. Cut sink opening and polish edges. Transport and install countertops with color-matched seam adhesive. Install undermount sink with clips and seal. Allow proper curing time. Final polish and sealing of all surfaces.', hours: 17, hourlyRate: 95, totalCost: 1615, visible: true },
        { id: `lab-${Date.now()}-7`, role: 'Backsplash Tile Installation', description: 'Install cement backer board on backsplash area. Apply thin-set mortar and install subway tile with precise 1/8" grout lines. Use tile spacers for consistent spacing. Cut tiles around outlets and edges for professional fit. Allow proper curing time. Apply grout and remove excess. Seal grout lines. Install outlet covers flush with tile.', hours: 22, hourlyRate: 75, totalCost: 1650, visible: true },
        { id: `lab-${Date.now()}-8`, role: 'Hardwood Flooring Installation', description: 'Prepare and level subfloor. Install moisture barrier underlayment. Acclimate hardwood flooring to room conditions. Install 3/4" solid red oak hardwood flooring with proper nail pattern. Cut and fit around cabinets and doorways. Install matching threshold transitions. Install baseboards and quarter-round trim. Touch up finish on any cut edges.', hours: 28, hourlyRate: 80, totalCost: 2240, visible: true },
        { id: `lab-${Date.now()}-9`, role: 'Electrical Finish & Lighting', description: 'Install all recessed LED lighting fixtures with proper IC-rated housings. Install and wire under-cabinet LED lighting system with dimmer controls. Install all outlet and switch covers. Install GFCI outlets per code. Test all circuits and lighting systems. Program dimmer switches. Label circuit breaker panel.', hours: 14, hourlyRate: 95, totalCost: 1330, visible: true },
        { id: `lab-${Date.now()}-10`, role: 'Plumbing Finish & Fixture Installation', description: 'Install undermount sink with professional mounting and sealing. Install pull-down faucet with deck plate. Install garbage disposal and connect to drain. Install dishwasher supply line with air gap. Connect refrigerator water line for ice maker. Test all connections for leaks. Install shut-off valves under sink with decorative escutcheons.', hours: 9, hourlyRate: 105, totalCost: 945, visible: true },
        { id: `lab-${Date.now()}-11`, role: 'Appliance Installation & Connection', description: 'Uncrate and position all appliances (refrigerator, range, dishwasher). Level appliances and install anti-tip brackets for range. Connect all gas, electrical, and water lines per manufacturer specifications. Test each appliance for proper operation. Remove all packaging and dispose properly. Provide customer with warranty information and manuals.', hours: 9, hourlyRate: 85, totalCost: 765, visible: true },
        { id: `lab-${Date.now()}-12`, role: 'Interior Painting', description: 'Prepare all surfaces with cleaning and light sanding. Apply painter\'s tape to protect cabinets, countertops, and fixtures. Prime all repaired drywall areas. Apply two coats of Sherwin Williams ProClassic paint to ceiling, walls, and trim. Cut in edges carefully around cabinets and tile. Remove tape while paint is still tacky for clean lines. Touch up as needed.', hours: 18, hourlyRate: 65, totalCost: 1170, visible: true },
        { id: `lab-${Date.now()}-13`, role: 'Final Details, Caulking & Cleanup', description: 'Apply clear silicone caulk around sink, faucet, and all countertop edges. Caulk gaps between cabinets and walls. Install cabinet hardware with precise alignment. Clean all surfaces thoroughly. Polish countertops and appliances. Vacuum and mop floors. Remove all debris and construction materials. Final walkthrough with customer to demonstrate appliances and answer questions.', hours: 10, hourlyRate: 75, totalCost: 750, visible: true },
        { id: `lab-${Date.now()}-14`, role: 'Project Management & Coordination', description: 'Overall project planning and timeline coordination. Schedule and coordinate all subcontractors (electrician, plumber, tile installer, cabinet installer). Order and track all materials and appliances. Coordinate building inspections (electrical rough-in, plumbing rough-in, final). Handle permit applications and approvals. Provide regular progress updates to customer. Address any issues or change orders. Ensure quality control at each phase.', hours: 32, hourlyRate: 75, totalCost: 2400, visible: true },
      ];

      processSteps = [
        { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Site Preparation & Protection', description: 'Protect floors, walls, doorways with barriers', estimatedDuration: '0.5 days', visible: true },
        { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Demolition', description: 'Remove cabinets, countertops, flooring, appliances', estimatedDuration: '2 days', visible: true },
        { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Rough Electrical & Plumbing', description: 'Install new circuits, run supply/drain lines', estimatedDuration: '3-4 days', visible: true },
        { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Drywall Repair', description: 'Patch walls, tape, mud, sand smooth', estimatedDuration: '1-2 days', visible: true },
        { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Cabinet Installation', description: 'Install base and wall cabinets, level and secure', estimatedDuration: '3 days', visible: true },
        { id: `step-${Date.now()}-6`, stepNumber: 6, title: 'Countertop Installation', description: 'Template, fabricate, install quartz tops', estimatedDuration: '4-5 days', visible: true },
        { id: `step-${Date.now()}-7`, stepNumber: 7, title: 'Backsplash Tile', description: 'Install tile backsplash and grout', estimatedDuration: '2-3 days', visible: true },
        { id: `step-${Date.now()}-8`, stepNumber: 8, title: 'Flooring Installation', description: 'Install hardwood flooring and trim', estimatedDuration: '3-4 days', visible: true },
        { id: `step-${Date.now()}-9`, stepNumber: 9, title: 'Electrical & Plumbing Finish', description: 'Install fixtures, outlets, sink, faucet', estimatedDuration: '2 days', visible: true },
        { id: `step-${Date.now()}-10`, stepNumber: 10, title: 'Appliance Installation', description: 'Install and test all appliances', estimatedDuration: '1 day', visible: true },
        { id: `step-${Date.now()}-11`, stepNumber: 11, title: 'Painting', description: 'Paint ceiling, walls, trim', estimatedDuration: '2 days', visible: true },
        { id: `step-${Date.now()}-12`, stepNumber: 12, title: 'Final Details & Cleanup', description: 'Hardware, caulking, deep clean, walkthrough', estimatedDuration: '1 day', visible: true },
      ];
    }
    // BATHROOM RENOVATION - Every material needed
    else if (serviceType.includes('bathroom') || title.includes('bathroom')) {
      materials = [
        { id: `mat-${Date.now()}-1`, name: 'Vanity Cabinet - 60" Double Sink', description: '60" modern vanity with quartz top and dual undermount sinks', quantity: 1, unit: 'each', unitCost: 1850, totalCost: 1850, supplier: 'Bath Specialists', category: 'Cabinetry', visible: true },
        { id: `mat-${Date.now()}-2`, name: 'Vanity Faucets - Brushed Nickel', description: 'Moen Arbor widespread faucets (2)', quantity: 2, unit: 'each', unitCost: 285, totalCost: 570, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-3`, name: 'Walk-In Shower System', description: 'Custom walk-in shower with bench and rain head', quantity: 1, unit: 'set', unitCost: 3200, totalCost: 3200, supplier: 'Bath Specialists', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-4`, name: 'Frameless Glass Shower Enclosure', description: '3/8" tempered glass with chrome hardware', quantity: 1, unit: 'set', unitCost: 1950, totalCost: 1950, supplier: 'Glass & Mirror Co', category: 'Glass', visible: true },
        { id: `mat-${Date.now()}-5`, name: 'Porcelain Floor Tile - Large Format', description: '12x24 porcelain tile in gray', quantity: 90, unit: 'sq ft', unitCost: 9.50, totalCost: 855, supplier: 'Stone & Tile Warehouse', category: 'Tile', visible: true },
        { id: `mat-${Date.now()}-6`, name: 'Porcelain Wall Tile - Subway', description: '4x12 white subway tile for walls', quantity: 220, unit: 'sq ft', unitCost: 8.25, totalCost: 1815, supplier: 'Stone & Tile Warehouse', category: 'Tile', visible: true },
        { id: `mat-${Date.now()}-7`, name: 'Shower Floor Tile - Mosaic', description: '2x2 mosaic tile for shower floor with slip resistance', quantity: 18, unit: 'sq ft', unitCost: 14.50, totalCost: 261, supplier: 'Stone & Tile Warehouse', category: 'Tile', visible: true },
        { id: `mat-${Date.now()}-8`, name: 'Tile Installation Materials', description: 'Thinset, grout, waterproofing membrane, spacers', quantity: 1, unit: 'kit', unitCost: 485, totalCost: 485, supplier: 'Stone & Tile Warehouse', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-9`, name: 'Toilet - Dual Flush', description: 'American Standard Cadet dual-flush elongated', quantity: 1, unit: 'each', unitCost: 385, totalCost: 385, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-10`, name: 'Recessed LED Lighting', description: '4" IC-rated LED fixtures', quantity: 6, unit: 'each', unitCost: 48, totalCost: 288, supplier: 'Lighting Solutions', category: 'Lighting', visible: true },
        { id: `mat-${Date.now()}-11`, name: 'Vanity Lighting - LED', description: '4-light LED vanity fixture', quantity: 1, unit: 'each', unitCost: 285, totalCost: 285, supplier: 'Lighting Solutions', category: 'Lighting', visible: true },
        { id: `mat-${Date.now()}-12`, name: 'Exhaust Fan - Ultra Quiet', description: 'Panasonic WhisperCeiling 110 CFM', quantity: 1, unit: 'each', unitCost: 195, totalCost: 195, supplier: 'Electrical Supply', category: 'Ventilation', visible: true },
        { id: `mat-${Date.now()}-13`, name: 'Bathroom Accessories', description: 'Towel bars, TP holder, robe hooks (chrome)', quantity: 1, unit: 'set', unitCost: 285, totalCost: 285, supplier: 'Bath Specialists', category: 'Accessories', visible: true },
        { id: `mat-${Date.now()}-14`, name: 'Plumbing Rough-In Materials', description: 'PEX, fittings, valves, drain pipes, vents', quantity: 1, unit: 'kit', unitCost: 485, totalCost: 485, supplier: 'Plumbing Supply Co', category: 'Plumbing', visible: true },
        { id: `mat-${Date.now()}-15`, name: 'Electrical Materials', description: 'Wire, boxes, GFCI outlets, switches', quantity: 1, unit: 'kit', unitCost: 285, totalCost: 285, supplier: 'Electrical Supply', category: 'Electrical', visible: true },
        { id: `mat-${Date.now()}-16`, name: 'Cement Board - Shower Walls', description: '1/2" HardieBacker for shower walls', quantity: 12, unit: 'sheet', unitCost: 28, totalCost: 336, supplier: 'Building Supply', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-17`, name: 'Waterproofing System', description: 'RedGard waterproofing membrane and tape', quantity: 1, unit: 'kit', unitCost: 185, totalCost: 185, supplier: 'Stone & Tile Warehouse', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-18`, name: 'Paint & Primer', description: 'Bathroom-grade moisture-resistant paint', quantity: 1, unit: 'kit', unitCost: 165, totalCost: 165, supplier: 'Paint Pro Supply', category: 'Paint', visible: true },
        { id: `mat-${Date.now()}-19`, name: 'Fasteners & Hardware', description: 'Screws, anchors, shims, construction adhesive', quantity: 1, unit: 'kit', unitCost: 125, totalCost: 125, supplier: 'General Supply', category: 'Fasteners', visible: true },
        { id: `mat-${Date.now()}-20`, name: 'Silicone & Caulk', description: 'Mold-resistant silicone caulk (various colors)', quantity: 8, unit: 'tube', unitCost: 9.50, totalCost: 76, supplier: 'General Supply', category: 'Sealants', visible: true },
      ];

      laborItems = [
        { id: `lab-${Date.now()}-1`, role: 'Demolition & Removal', description: 'Remove existing vanity, toilet, shower/tub, tile, fixtures. Disconnect plumbing and electrical. Haul away all demolition debris. Protect surrounding areas.', hours: 14, hourlyRate: 75, totalCost: 1050, visible: true },
        { id: `lab-${Date.now()}-2`, role: 'Plumbing Rough-In', description: 'Install new supply lines for vanity, shower, and toilet. Install drain lines with proper venting per code. Pressure test all lines. Coordinate plumbing inspection.', hours: 18, hourlyRate: 105, totalCost: 1890, visible: true },
        { id: `lab-${Date.now()}-3`, role: 'Electrical Rough-In', description: 'Install new circuits for lighting, outlets, exhaust fan. Run wiring to all fixture locations. Install GFCI outlets. Coordinate electrical inspection.', hours: 12, hourlyRate: 95, totalCost: 1140, visible: true },
        { id: `lab-${Date.now()}-4`, role: 'Cement Board & Waterproofing', description: 'Install cement board on shower walls and floor. Apply waterproofing membrane to entire shower enclosure. Install shower pan per code.', hours: 16, hourlyRate: 85, totalCost: 1360, visible: true },
        { id: `lab-${Date.now()}-5`, role: 'Tile Installation - Shower', description: 'Install mosaic tile on shower floor with proper slope. Install wall tile with precision cuts around fixtures. Grout and seal all tile.', hours: 32, hourlyRate: 75, totalCost: 2400, visible: true },
        { id: `lab-${Date.now()}-6`, role: 'Tile Installation - Floor & Walls', description: 'Install large-format floor tile with proper layout. Install wall tile as needed. Grout and seal all tile surfaces.', hours: 24, hourlyRate: 75, totalCost: 1800, visible: true },
        { id: `lab-${Date.now()}-7`, role: 'Vanity & Plumbing Fixtures', description: 'Install vanity cabinet and secure to wall. Install quartz countertop and sinks. Install faucets and drain assemblies. Install toilet with wax ring seal.', hours: 12, hourlyRate: 105, totalCost: 1260, visible: true },
        { id: `lab-${Date.now()}-8`, role: 'Glass Enclosure Installation', description: 'Professionally measure and install frameless glass shower enclosure. Install all hardware and seals. Test for proper operation.', hours: 8, hourlyRate: 95, totalCost: 760, visible: true },
        { id: `lab-${Date.now()}-9`, role: 'Electrical Finish & Lighting', description: 'Install all light fixtures, exhaust fan, outlets, and switches. Test all circuits. Install GFCI outlets per code.', hours: 10, hourlyRate: 95, totalCost: 950, visible: true },
        { id: `lab-${Date.now()}-10`, role: 'Painting', description: 'Prime and paint ceiling, walls, and trim with moisture-resistant paint. Apply two coats for full coverage.', hours: 12, hourlyRate: 65, totalCost: 780, visible: true },
        { id: `lab-${Date.now()}-11`, role: 'Accessories & Final Details', description: 'Install all bathroom accessories (towel bars, TP holder, hooks). Caulk all joints and seams. Final cleanup and polish.', hours: 6, hourlyRate: 75, totalCost: 450, visible: true },
        { id: `lab-${Date.now()}-12`, role: 'Project Management', description: 'Coordinate all trades, schedule inspections, order materials, provide progress updates, ensure quality control.', hours: 20, hourlyRate: 75, totalCost: 1500, visible: true },
      ];

      processSteps = [
        { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Demolition', description: 'Remove all existing bathroom fixtures and finishes', estimatedDuration: '1-2 days', visible: true },
        { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Rough Plumbing', description: 'Install new water supply and drain lines', estimatedDuration: '2-3 days', visible: true },
        { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Rough Electrical', description: 'Run new circuits for lighting and outlets', estimatedDuration: '1-2 days', visible: true },
        { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Waterproofing', description: 'Install cement board and waterproofing membrane', estimatedDuration: '2 days', visible: true },
        { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Tile Installation', description: 'Install floor, wall, and shower tile', estimatedDuration: '5-7 days', visible: true },
        { id: `step-${Date.now()}-6`, stepNumber: 6, title: 'Fixture Installation', description: 'Install vanity, toilet, shower system', estimatedDuration: '2-3 days', visible: true },
        { id: `step-${Date.now()}-7`, stepNumber: 7, title: 'Glass Enclosure', description: 'Install frameless shower glass', estimatedDuration: '1 day', visible: true },
        { id: `step-${Date.now()}-8`, stepNumber: 8, title: 'Finishing', description: 'Painting, accessories, final details', estimatedDuration: '2 days', visible: true },
      ];
    }
    // GENERIC SERVICE - Based on estimated value
    else {
      const matMultiplier = estimatedValue * 0.50;
      materials = [
        { id: `mat-${Date.now()}-1`, name: `${workRequest.serviceType} - Primary Materials`, description: 'Main materials for project', quantity: 1, unit: 'lot', unitCost: matMultiplier * 0.70, totalCost: matMultiplier * 0.70, supplier: 'General Supply', category: 'Materials', visible: true },
        { id: `mat-${Date.now()}-2`, name: 'Fasteners & Hardware Package', description: 'Screws, nails, bolts, anchors, clips', quantity: 1, unit: 'kit', unitCost: matMultiplier * 0.10, totalCost: matMultiplier * 0.10, supplier: 'Fastener Supply', category: 'Fasteners', visible: true },
        { id: `mat-${Date.now()}-3`, name: 'Adhesives & Sealants', description: 'Construction adhesive, caulk, sealants, tape', quantity: 1, unit: 'kit', unitCost: matMultiplier * 0.08, totalCost: matMultiplier * 0.08, supplier: 'General Supply', category: 'Adhesives', visible: true },
        { id: `mat-${Date.now()}-4`, name: 'Installation Supplies', description: 'Drop cloths, protective materials, consumables', quantity: 1, unit: 'kit', unitCost: matMultiplier * 0.07, totalCost: matMultiplier * 0.07, supplier: 'General Supply', category: 'Installation Materials', visible: true },
        { id: `mat-${Date.now()}-5`, name: 'Finishing Materials', description: 'Final finishing and touch-up materials', quantity: 1, unit: 'kit', unitCost: matMultiplier * 0.05, totalCost: matMultiplier * 0.05, supplier: 'General Supply', category: 'Finishing', visible: true },
      ];

      const laborHoursBase = Math.max(40, Math.round(estimatedValue * 0.01));
      laborItems = [
        { id: `lab-${Date.now()}-1`, role: 'Site Preparation & Protection', description: 'Prepare work area, install protective barriers, organize materials', hours: Math.round(laborHoursBase * 0.10), hourlyRate: 75, totalCost: Math.round(laborHoursBase * 0.10) * 75, visible: true },
        { id: `lab-${Date.now()}-2`, role: 'Demolition & Removal', description: 'Remove existing materials, disconnect utilities, haul away debris', hours: Math.round(laborHoursBase * 0.20), hourlyRate: 75, totalCost: Math.round(laborHoursBase * 0.20) * 75, visible: true },
        { id: `lab-${Date.now()}-3`, role: 'Primary Installation', description: `Professional installation and construction for ${workRequest.serviceType.toLowerCase()}`, hours: Math.round(laborHoursBase * 0.45), hourlyRate: 85, totalCost: Math.round(laborHoursBase * 0.45) * 85, visible: true },
        { id: `lab-${Date.now()}-4`, role: 'Finishing Work', description: 'Final finishing, touch-ups, detail work, quality control', hours: Math.round(laborHoursBase * 0.15), hourlyRate: 75, totalCost: Math.round(laborHoursBase * 0.15) * 75, visible: true },
        { id: `lab-${Date.now()}-5`, role: 'Cleanup & Final Inspection', description: 'Thorough cleanup, final walkthrough, customer demonstration', hours: Math.round(laborHoursBase * 0.05), hourlyRate: 65, totalCost: Math.round(laborHoursBase * 0.05) * 65, visible: true },
        { id: `lab-${Date.now()}-6`, role: 'Project Management & Coordination', description: 'Schedule coordination, quality control, progress updates', hours: Math.round(laborHoursBase * 0.05), hourlyRate: 75, totalCost: Math.round(laborHoursBase * 0.05) * 75, visible: true },
      ];

      processSteps = [
        { id: `step-${Date.now()}-1`, stepNumber: 1, title: 'Site Preparation', description: 'Prepare work area and protect surroundings', estimatedDuration: '0.5-1 days', visible: true },
        { id: `step-${Date.now()}-2`, stepNumber: 2, title: 'Demolition', description: 'Remove existing materials as needed', estimatedDuration: '1-2 days', visible: true },
        { id: `step-${Date.now()}-3`, stepNumber: 3, title: 'Primary Work', description: `Execute main ${workRequest.serviceType.toLowerCase()} work`, estimatedDuration: '3-5 days', visible: true },
        { id: `step-${Date.now()}-4`, stepNumber: 4, title: 'Finishing', description: 'Complete finishing work and details', estimatedDuration: '1-2 days', visible: true },
        { id: `step-${Date.now()}-5`, stepNumber: 5, title: 'Final Inspection', description: 'Quality inspection and customer walkthrough', estimatedDuration: '0.5 days', visible: true },
      ];
    }

    // Calculate totals
    const materialsSubtotal = materials.reduce((sum, m) => sum + m.totalCost, 0);
    const laborSubtotal = laborItems.reduce((sum, l) => sum + l.totalCost, 0);
    const subtotal = materialsSubtotal + laborSubtotal;
    const taxAmount = subtotal * 0.08;
    const total = subtotal + taxAmount;

    const quoteData = {
      materialItems: materials,
      laborItems: laborItems,
      processSteps: processSteps,
      subtotals: {
        materials: materialsSubtotal,
        labor: laborSubtotal,
        tax: taxAmount
      },
      total: total,
      generatedAt: new Date().toISOString(),
      status: 'draft'
    };

    console.log('[Auto-Quote] Generated COMPREHENSIVE quote:', {
      total: `$${total.toFixed(2)}`,
      materials: materials.length,
      labor: laborItems.length,
      processSteps: processSteps.length
    });

    return c.json(quoteData);
  } catch (error: any) {
    console.error('[Auto-Quote] Error:', error);
    return c.json({ error: error.message || 'Failed to generate quote' }, 500);
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
      applications: "/make-server-57095a78/applications",
      kv: "/make-server-57095a78/kv/*",
      autoQuote: "/make-server-57095a78/auto-generate-quote"
    }
  });
});

Deno.serve(app.fetch);
