/**
 * Black Phoenix Server - Single File Deployment
 * All routes inline to avoid import issues
 * Version: 2.0.0
 * Updated: 2026-06-16
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
console.log("🚀 Black Phoenix Server v2.0.0");
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
    version: "2.0.0"
  });
});

// ============================================
// HELPERS
// ============================================

// Only real https:// URLs are safe to return — base64 data URIs are 100s of KB
// and cause "broken pipe / connection closed" errors from the Edge Function.
function isUrl(v: any): boolean {
  return typeof v === 'string' && v.startsWith('https://');
}

// Recursively replace any base64 data URI string in an object with null.
// This prevents large payloads from killing the Edge Function connection.
function stripBase64(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.startsWith('data:') ? null : obj;
  }
  if (Array.isArray(obj)) return obj.map(stripBase64);
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj)) out[k] = stripBase64(obj[k]);
    return out;
  }
  return obj;
}

// ============================================
// BUSINESS PROFILES / COMPANY BRANDING
// ============================================

// Get company branding (PUBLIC - no auth required)
// This endpoint provides logo and branding for landing pages.
// IMPORTANT: base64 logos are stripped — only https:// URLs are returned.
// Use the "Fix My Logo" page to publish a Storage URL first.
app.get('/make-server-57095a78/public/branding', async (c) => {
  try {
    const DEFAULT = { company_name: 'The Black Phoenix Company', dbaName: 'Black Phoenix Builds', logo_url: null, primary_color: '#ea580c', secondary_color: '#f97316' };

    // 1. KV memory cache — only stored when logo is a real URL
    const cached = await kv.get('public_branding') as any;
    if (cached && isUrl(cached.logo_url)) {
      return c.json(cached);
    }

    // 2. public_branding_profile row (written by Fix My Logo)
    const { data: kvRow } = await supabase
      .from('kv_store_57095a78')
      .select('value')
      .eq('key', 'public_branding_profile')
      .single();

    if (kvRow?.value) {
      const safe = stripBase64(kvRow.value);
      if (isUrl(safe.logo_url)) {
        await kv.set('public_branding', safe);
        console.log('✅ [Public Branding] Logo URL from public_branding_profile:', safe.logo_url);
        return c.json(safe);
      }
    }

    // 3. companies table — if logo is base64, auto-migrate to Storage server-side
    const { data: companies } = await supabase
      .from('companies')
      .select('id, company_name, company_legal_name, logo_primary, logo_url, primary_color, secondary_color, email, phone, website')
      .order('created_at', { ascending: false })
      .limit(1);

    if (companies && companies[0]) {
      const co = companies[0];
      let logo: string | null = [co.logo_primary, co.logo_url].find(isUrl) || null;

      // Auto-migrate base64 logo to Storage so every device can load it
      if (!logo) {
        const base64 = co.logo_primary || co.logo_url;
        if (base64 && base64.startsWith('data:')) {
          console.log('🔄 [Public Branding] Auto-migrating base64 logo to Storage...');
          try {
            const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const binaryData = Uint8Array.from(atob(matches[2]), (ch: string) => ch.charCodeAt(0));
              const ext = mimeType.split('/')[1] || 'png';
              const bucketName = 'make-57095a78-logos';

              const { data: buckets } = await supabase.storage.listBuckets();
              if (!buckets?.some((b: any) => b.name === bucketName)) {
                await supabase.storage.createBucket(bucketName, { public: true });
              }

              const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(`company-logo.${ext}`, binaryData, { contentType: mimeType, upsert: true });

              if (!uploadError) {
                const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(`company-logo.${ext}`);
                logo = urlData.publicUrl;
                console.log('✅ [Public Branding] Migrated to Storage:', logo);

                // Update companies table so future requests skip migration
                await supabase.from('companies').update({ logo_primary: logo, logo_url: logo }).eq('id', co.id);
              }
            }
          } catch (e) {
            console.error('❌ [Public Branding] Migration failed:', e);
          }
        }
      }

      const result = {
        company_name: co.company_name,
        dbaName: co.company_legal_name || co.company_name,
        businessName: co.company_name,
        logo_url: logo,
        logo_primary: logo,
        primary_color: co.primary_color || '#ea580c',
        secondary_color: co.secondary_color || '#f97316',
        email: co.email || null,
        phone: co.phone || null,
        website: co.website || null,
      };

      if (logo) {
        // Cache and also publish to public_branding_profile for future hits
        await kv.set('public_branding', result);
        await supabase.from('kv_store_57095a78').upsert(
          { key: 'public_branding_profile', value: result },
          { onConflict: 'key' }
        );
        console.log('✅ [Public Branding] Logo ready:', logo);
      }

      return c.json(result);
    }

    return c.json(DEFAULT);
  } catch (error: any) {
    console.error('❌ [Public Branding] Error:', error);
    return c.json({ company_name: 'The Black Phoenix Company', logo_url: null, primary_color: '#ea580c', secondary_color: '#f97316' });
  }
});

// Refresh the KV cache from the best available source
app.post('/make-server-57095a78/public/branding/refresh', async (c) => {
  try {
    const { data: kvRow } = await supabase
      .from('kv_store_57095a78')
      .select('value')
      .eq('key', 'public_branding_profile')
      .single();

    if (kvRow?.value) {
      const safe = stripBase64(kvRow.value);
      if (isUrl(safe.logo_url)) {
        await kv.set('public_branding', safe);
        console.log('✅ [Public Branding] Cache refreshed, logo:', safe.logo_url);
        return c.json({ success: true, logo_url: safe.logo_url });
      }
    }
    return c.json({ success: false, message: 'No Storage URL found — use Fix My Logo first' });
  } catch (error: any) {
    console.error('❌ [Public Branding] Refresh error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Upload logo to Supabase Storage — returns a permanent public URL
// This is the permanent fix: logos are stored as files, not base64 blobs
app.post('/make-server-57095a78/logo/upload', async (c) => {
  try {
    console.log('📸 [Logo Upload] Starting...');

    const body = await c.req.json();
    const { logo_base64, filename = 'company-logo.png' } = body;

    if (!logo_base64) {
      return c.json({ error: 'logo_base64 is required' }, 400);
    }

    // Decode base64 data URL
    const matches = logo_base64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return c.json({ error: 'Invalid base64 data URL format' }, 400);
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Ensure logo bucket exists
    const bucketName = 'make-57095a78-logos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
      console.log('✅ [Logo Upload] Created bucket:', bucketName);
    }

    // Use a stable filename so re-uploads overwrite the old file
    const ext = mimeType.split('/')[1] || 'png';
    const storagePath = `company-logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, binaryData, {
        contentType: mimeType,
        upsert: true, // overwrite if exists
      });

    if (uploadError) {
      console.error('❌ [Logo Upload] Storage error:', uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    // Get permanent public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    const logo_url = urlData.publicUrl;
    console.log('✅ [Logo Upload] Stored at:', logo_url);

    // Update companies table with the new URL
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .order('created_at', { ascending: false });

    if (companies && companies.length > 0) {
      await supabase
        .from('companies')
        .update({ logo_primary: logo_url, logo_url: logo_url })
        .eq('id', companies[0].id);
      console.log('✅ [Logo Upload] Updated companies table');
    }

    // Also write the new URL into the public_branding KV profile so it's served immediately
    const existing = await kv.get('public_branding') as any;
    const updated = { ...(existing || {}), logo_url, logo_primary: logo_url };
    await kv.set('public_branding', updated);

    // Also write to kv_store_57095a78 table for the branding refresh path
    const { data: kvRow } = await supabase
      .from('kv_store_57095a78')
      .select('value')
      .eq('key', 'public_branding_profile')
      .single();

    if (kvRow && kvRow.value) {
      const updatedKv = { ...kvRow.value, logo_url, logo_primary: logo_url };
      await supabase
        .from('kv_store_57095a78')
        .update({ value: updatedKv })
        .eq('key', 'public_branding_profile');
    } else {
      await supabase
        .from('kv_store_57095a78')
        .upsert({ key: 'public_branding_profile', value: { logo_url, logo_primary: logo_url } });
    }

    console.log('✅ [Logo Upload] All caches updated');
    return c.json({ success: true, logo_url });
  } catch (error: any) {
    console.error('❌ [Logo Upload] Error:', error);
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
    if (!authHeader) return c.json({ error: 'No authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

    // 1. Try the Supabase companies table first (primary source of truth)
    const { data: dbCompanies, error: dbError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbError && dbCompanies && dbCompanies.length > 0) {
      console.log(`✅ [Companies] Loaded ${dbCompanies.length} from companies table`);
      // Keep KV in sync for legacy reads
      const userKey = `companies_${user.id}`;
      await kv.set(userKey, stripBase64(dbCompanies));
      return c.json({ companies: stripBase64(dbCompanies) });
    }

    // 2. Fall back to KV store
    const userKey = `companies_${user.id}`;
    const kvCompanies = await kv.get(userKey) || [];
    console.log(`ℹ️ [Companies] Loaded ${(kvCompanies as any[]).length} from KV store`);
    return c.json({ companies: stripBase64(kvCompanies) });
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
// DOBA DROPSHIPPING INTEGRATION
// ============================================

// Test Doba API connection
app.post('/make-server-57095a78/doba/test-connection', async (c) => {
  try {
    const { retailerId, apiKey, apiSecret } = await c.req.json();

    if (!retailerId || !apiKey || !apiSecret) {
      return c.json({ error: 'Retailer ID, API Key, and API Secret are required' }, 400);
    }

    console.log('[Doba] Testing API connection for Retailer ID:', retailerId);

    // Make a test request to Doba API
    // Note: Replace with actual Doba API endpoint
    const response = await fetch('https://api.doba.com/v1/test', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Secret': apiSecret,
        'X-Retailer-ID': retailerId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Doba] Connection test failed:', response.status, errorText);
      return c.json({
        success: false,
        error: `Doba API error: ${response.status} - ${errorText}`
      }, response.status);
    }

    const data = await response.json();
    console.log('[Doba] Connection test successful');

    // Store credentials in KV store
    await kv.set('doba_credentials', {
      retailerId,
      apiKey,
      apiSecret,
      connected_at: new Date().toISOString()
    });

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Doba] Connection test error:', error);
    return c.json({ error: `Connection test failed: ${error.message}` }, 500);
  }
});

// Sync products from Doba
app.post('/make-server-57095a78/doba/sync-products', async (c) => {
  try {
    console.log('[Doba] Starting product sync...');

    // Get stored credentials
    const credentials = await kv.get('doba_credentials');
    if (!credentials || !credentials.retailerId || !credentials.apiKey || !credentials.apiSecret) {
      return c.json({ error: 'Doba credentials not found. Please connect first.' }, 401);
    }

    const { retailerId, apiKey, apiSecret } = credentials;

    console.log('[Doba] Syncing products for Retailer ID:', retailerId);

    // Fetch products from Doba API
    // Note: Replace with actual Doba API endpoint and pagination logic
    const response = await fetch('https://api.doba.com/v1/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Secret': apiSecret,
        'X-Retailer-ID': retailerId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Doba] Product sync failed:', response.status, errorText);
      return c.json({
        success: false,
        error: `Doba API error: ${response.status} - ${errorText}`
      }, response.status);
    }

    const products = await response.json();
    console.log(`[Doba] Fetched ${products.length || 0} products`);

    // Store products in KV store
    await kv.set('doba_products', {
      products: products,
      synced_at: new Date().toISOString(),
      count: products.length || 0
    });

    console.log('[Doba] Product sync complete');

    return c.json({
      success: true,
      products: products,
      count: products.length || 0,
      synced_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Doba] Product sync error:', error);
    return c.json({ error: `Product sync failed: ${error.message}` }, 500);
  }
});

// Get Doba connection status
app.get('/make-server-57095a78/doba/status', async (c) => {
  try {
    const credentials = await kv.get('doba_credentials');
    const products = await kv.get('doba_products');

    return c.json({
      connected: !!credentials,
      connected_at: credentials?.connected_at || null,
      product_count: products?.count || 0,
      last_sync: products?.synced_at || null
    });
  } catch (error: any) {
    console.error('[Doba] Status check error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get synced Doba products
app.get('/make-server-57095a78/doba/products', async (c) => {
  try {
    const productData = await kv.get('doba_products');

    if (!productData || !productData.products) {
      return c.json({ products: [], count: 0 });
    }

    return c.json({
      products: productData.products,
      count: productData.count,
      synced_at: productData.synced_at
    });
  } catch (error: any) {
    console.error('[Doba] Get products error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Disconnect Doba
app.post('/make-server-57095a78/doba/disconnect', async (c) => {
  try {
    await kv.del('doba_credentials');
    console.log('[Doba] Disconnected successfully');
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Doba] Disconnect error:', error);
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
    return c.json({ value: stripBase64(value) });
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
    return c.json({ values: stripBase64(values) });
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

// AI Guide Chat — drives customers through the work request form
// Uses OpenAI to ask targeted questions and extract form field values from answers
app.post('/make-server-57095a78/ai-guide-chat', async (c) => {
  try {
    const { messages, formData, projectCategory } = await c.req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Build a summary of what's already filled vs missing
    const filled: string[] = [];
    const missing: string[] = [];

    const check = (label: string, value: any) => {
      if (value && String(value).trim()) filled.push(label);
      else missing.push(label);
    };

    check('Project name', formData?.projectName);
    check('Client name', formData?.clientName);
    check('Client email', formData?.clientEmail);
    check('Client phone', formData?.clientPhone);
    check('Site address', formData?.siteAddress);
    check('City', formData?.city);
    check('State', formData?.state);
    check('ZIP code', formData?.zipCode);
    check('Project description', formData?.projectDescription);
    check('Timeline', formData?.timeline);
    check('Budget range', formData?.budgetMin || formData?.budgetMax);
    check('Property type', formData?.propertyType);
    check('Priority level', formData?.priorityLevel);

    if (projectCategory === 'kitchen_bath') {
      check('Kitchen layout type', formData?.kitchenLayoutType);
      check('Cabinet style', formData?.cabinetStyle);
      check('Countertop material', formData?.countertopMaterial);
    }
    if (projectCategory === 'full_renovation' || projectCategory === 'new_construction') {
      check('Architectural style', formData?.architecturalStyle);
      check('Number of rooms', formData?.rooms?.length);
    }

    const systemPrompt = `You are a friendly, professional project intake assistant for The Black Phoenix Company — a construction and renovation firm. Your job is to guide customers through their work request by asking about the specific fields that still need to be filled in.

CURRENT FORM STATUS:
- Project type: ${projectCategory || 'not selected yet'}
- Filled fields (${filled.length}): ${filled.join(', ') || 'none yet'}
- Missing fields (${missing.length}): ${missing.join(', ') || 'all done!'}

YOUR BEHAVIOR:
1. Be warm, conversational, and helpful — not robotic.
2. Focus on the MOST IMPORTANT missing field next. Don't ask about everything at once.
3. When the customer gives you information, extract it and include field updates in your response.
4. Ask one focused question at a time.
5. If all fields are filled, congratulate them and tell them to click "Continue" to proceed.
6. Tailor your questions to the project type (${projectCategory || 'general'}).

FIELD EXTRACTION:
After every user message, you MUST include a JSON block at the very end of your response (after your message) in this exact format to update the form:
<FIELDS>
{
  "projectName": "...",
  "clientName": "...",
  "clientEmail": "...",
  "clientPhone": "...",
  "siteAddress": "...",
  "city": "...",
  "state": "...",
  "zipCode": "...",
  "projectDescription": "...",
  "timeline": "...",
  "budgetMin": 0,
  "budgetMax": 0,
  "propertyType": "...",
  "priorityLevel": "...",
  "kitchenLayoutType": "...",
  "cabinetStyle": "...",
  "countertopMaterial": "..."
}
</FIELDS>

Only include fields you extracted from this message. Omit fields you didn't get new info for. Use empty string "" to omit a field. For budgetMin/budgetMax use numbers only.

Valid values:
- timeline: "asap", "1_week", "2_weeks", "1_month", "2_3_months", "flexible"
- priorityLevel: "low", "medium", "high", "urgent"
- propertyType: "single_family", "multi_family", "condo", "commercial", "industrial", "land"
- kitchenLayoutType: "l_shaped", "u_shaped", "galley", "island", "peninsula", "single_wall"

IMPORTANT: Keep your conversational message SHORT (2-3 sentences max). The <FIELDS> block must always be last.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.message })),
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AI Guide] OpenAI error:', err);
      return c.json({ error: 'AI service error' }, 500);
    }

    const data = await response.json();
    const fullText = data.choices[0]?.message?.content || '';

    // Split out the message and field updates
    const fieldsMatch = fullText.match(/<FIELDS>([\s\S]*?)<\/FIELDS>/);
    const message = fullText.replace(/<FIELDS>[\s\S]*?<\/FIELDS>/, '').trim();
    let fieldUpdates: Record<string, any> = {};

    if (fieldsMatch) {
      try {
        const parsed = JSON.parse(fieldsMatch[1].trim());
        // Only include non-empty values
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== '' && v !== null && v !== undefined && v !== 0) {
            fieldUpdates[k] = v;
          }
        }
      } catch (e) {
        console.warn('[AI Guide] Failed to parse field updates:', e);
      }
    }

    return c.json({
      message,
      fieldUpdates,
      missingFields: missing,
      filledFields: filled,
      complete: missing.length === 0,
    });
  } catch (error: any) {
    console.error('[AI Guide] Error:', error);
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
    version: "2.0.0",
    endpoints: {
      health: "/make-server-57095a78/health",
      investments: "/make-server-57095a78/investments",
      applications: "/make-server-57095a78/applications",
      kv: "/make-server-57095a78/kv/*",
      autoQuote: "/make-server-57095a78/auto-generate-quote"
    }
  });
});

// Data backup/restore — used by dataPersistence.ts on the frontend
app.post('/make-server-57095a78/data/backup', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    const userId = user?.id || 'anonymous';

    const body = await c.req.json();
    await kv.set(`data_backup_${userId}`, body);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-57095a78/data/restore', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    const userId = user?.id || 'anonymous';

    const backup = await kv.get(`data_backup_${userId}`);
    return c.json({ backup: backup || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ADMIN ALERTS — cross-device notification system ───────────────────────────
// Work requests submitted from any device are stored here and fetched by the admin panel.

app.post('/make-server-57095a78/notifications/admin-alert', async (c) => {
  try {
    const body = await c.req.json();
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...stripBase64(body),
      timestamp: new Date().toISOString(),
      status: 'unread',
    };
    const existing = (await kv.get('admin_alerts') as any[]) || [];
    existing.unshift(alert);
    await kv.set('admin_alerts', existing.slice(0, 200));
    console.log('✅ [Admin Alert] Stored:', alert.title);
    return c.json({ success: true, alert });
  } catch (e: any) {
    console.error('❌ [Admin Alert] Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

app.get('/make-server-57095a78/notifications/admin-alerts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const alerts = (await kv.get('admin_alerts') as any[]) || [];
    return c.json({ alerts });
  } catch (e: any) {
    return c.json({ alerts: [], error: e.message }, 500);
  }
});

app.put('/make-server-57095a78/notifications/admin-alerts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const existing = (await kv.get('admin_alerts') as any[]) || [];
    const updated = existing.map((a: any) => a.id === id ? { ...a, status } : a);
    await kv.set('admin_alerts', updated);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// /notifications/work-request — stores alert AND sends real email + SMS to admin
app.post('/make-server-57095a78/notifications/work-request', async (c) => {
  try {
    const body = await c.req.json();
    const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')    || '';
    const TWILIO_SID        = Deno.env.get('TWILIO_ACCOUNT_SID')|| '';
    const TWILIO_AUTH       = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const TWILIO_FROM       = Deno.env.get('TWILIO_PHONE_NUMBER')|| '';
    const ADMIN_PHONES      = Deno.env.get('ADMIN_NOTIFICATION_PHONES') || '';
    const COMPANY_NAME      = Deno.env.get('COMPANY_NAME') || 'The Black Phoenix Company';
    const ADMIN_EMAIL       = 'ericerb555@proton.me';

    const {
      workRequestId, clientName, clientEmail, clientPhone,
      serviceType, budgetRange, title, description
    } = body;

    const subject = `🚨 New Work Request: ${clientName} — ${serviceType || title || 'Service Request'}`;
    const msgBody = `New work request received!\n\nClient: ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone || 'N/A'}\nService: ${serviceType || title || 'N/A'}\nBudget: ${budgetRange || 'N/A'}\n\nLog in to review: https://www.theblackphoenixcompany.com`;

    const results: Record<string, any> = { emailSent: false, smsSent: false, emailRecipients: [], smsRecipients: [] };

    // ── EMAIL via Resend ──────────────────────────────────────────────
    if (RESEND_API_KEY) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${COMPANY_NAME} <noreply@theblackphoenixcompany.com>`,
            to: [ADMIN_EMAIL],
            subject,
            text: msgBody,
            html: `<div style="font-family:sans-serif;max-width:600px;padding:24px">
              <h2 style="color:#ea580c">🚨 New Work Request</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px;color:#666">Client</td><td style="padding:8px;font-weight:bold">${clientName}</td></tr>
                <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px">${clientEmail}</td></tr>
                <tr><td style="padding:8px;color:#666">Phone</td><td style="padding:8px">${clientPhone || 'N/A'}</td></tr>
                <tr><td style="padding:8px;color:#666">Service</td><td style="padding:8px">${serviceType || title || 'N/A'}</td></tr>
                <tr><td style="padding:8px;color:#666">Budget</td><td style="padding:8px">${budgetRange || 'N/A'}</td></tr>
              </table>
              <a href="https://www.theblackphoenixcompany.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#ea580c;color:white;text-decoration:none;border-radius:8px;font-weight:bold">View in Admin Panel →</a>
            </div>`,
          }),
        });
        if (emailRes.ok) { results.emailSent = true; results.emailRecipients = [ADMIN_EMAIL]; }
        else { const e = await emailRes.json(); console.error('[Notify] Email error:', e); }
      } catch (e) { console.error('[Notify] Email exception:', e); }
    } else {
      console.log('ℹ️ [Notify] RESEND_API_KEY not set — skipping email');
    }

    // ── SMS via Twilio ────────────────────────────────────────────────
    if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && ADMIN_PHONES) {
      const phones = ADMIN_PHONES.split(',').map((p: string) => p.trim()).filter(Boolean);
      const smsText = `🚨 New Work Request!\n${clientName} | ${serviceType || title || 'Service'} | ${budgetRange || ''}\nPhone: ${clientPhone || clientEmail}\nLog in to review.`;

      for (const phone of phones) {
        try {
          const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: smsText }),
          });
          if (smsRes.ok) { results.smsSent = true; results.smsRecipients.push(phone); }
          else { const e = await smsRes.json(); console.error('[Notify] SMS error:', e); }
        } catch (e) { console.error('[Notify] SMS exception:', e); }
      }
    } else {
      console.log('ℹ️ [Notify] Twilio not configured — skipping SMS');
    }

    // Store as admin alert
    const alert = {
      id: `wr_alert_${Date.now()}`,
      type: 'urgent', category: 'Work Requests',
      title: subject,
      description: `${clientName} submitted a ${serviceType || 'work'} request. Budget: ${budgetRange || 'N/A'}`,
      priority: 'high', status: 'unread', source: 'work-request-form',
      actionRequired: true, timestamp: new Date().toISOString(),
      data: stripBase64(body),
    };
    const existing = (await kv.get('admin_alerts') as any[]) || [];
    existing.unshift(alert);
    await kv.set('admin_alerts', existing.slice(0, 200));

    console.log(`✅ [Notify] Work request alert stored. Email: ${results.emailSent}, SMS: ${results.smsSent}`);
    return c.json({ success: true, results });
  } catch (e: any) {
    console.error('❌ [Notify] Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// ── WORK REQUESTS (top-level, used by the client work request form) ───────────
// Ensure storage buckets exist and are public (called once on first work request)
async function ensureStorageBuckets() {
  const buckets = ['project-photos', 'project-videos', 'project-blueprints'];
  const { data: existing } = await supabase.storage.listBuckets();
  const existingNames = new Set((existing || []).map((b: any) => b.name));
  for (const name of buckets) {
    if (!existingNames.has(name)) {
      await supabase.storage.createBucket(name, { public: true });
      console.log(`✅ Created public storage bucket: ${name}`);
    }
  }
}

app.post('/make-server-57095a78/work-requests', async (c) => {
  try {
    // Ensure photo/video buckets exist so uploads don't fail
    await ensureStorageBuckets().catch(() => {});

    const body = await c.req.json();

    // Normalise client fields — they may be nested under client_info or flat
    const clientEmail = body.client_info?.email || body.clientEmail || body.email || '';
    const clientName  = body.client_info?.name  || body.clientName  || body.name  || '';
    const clientPhone = body.client_info?.phone || body.clientPhone || body.phone || '';

    console.log('[Work Requests] Creating work request from:', clientName, clientEmail);

    const workRequest = {
      ...stripBase64(body),
      id: `wr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      // Store identifiers at the top level for easy filtering
      client_email: clientEmail,
      client_name: clientName,
      client_phone: clientPhone,
      user_id: body.user_id || body.userId || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: body.status || 'pending',
    };

    // ── THREE-LAYER STORAGE for maximum reliability ────────────────────────
    // Layer 1: Individual KV key — never gets lost in a large array
    await kv.set(`wr:${workRequest.id}`, workRequest);

    // Layer 2: Master index — fast list of all IDs
    const index: string[] = (await kv.get('wr_index') as string[]) || [];
    if (!index.includes(workRequest.id)) {
      index.unshift(workRequest.id);
      await kv.set('wr_index', index.slice(0, 1000));
    }

    // Layer 3: Legacy array (backwards compatibility)
    const existing = (await kv.get('all_work_requests') as any[]) || [];
    existing.unshift(workRequest);
    await kv.set('all_work_requests', existing.slice(0, 500));

    // Layer 4: Supabase database table (most durable)
    try {
      await supabase.from('work_requests').upsert([{
        id: workRequest.id,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        user_id: workRequest.user_id || null,
        service_type: workRequest.serviceType || workRequest.project_type || null,
        title: workRequest.project_name || workRequest.title || null,
        description: workRequest.description || null,
        status: workRequest.status || 'pending',
        data: workRequest, // full payload
        created_at: workRequest.created_at,
        updated_at: workRequest.updated_at,
      }], { onConflict: 'id' });
      console.log('✅ [Work Requests] Saved to Supabase DB:', workRequest.id);
    } catch (dbErr: any) {
      // Table may not exist yet — that's OK, KV layers still work
      console.warn('⚠️ [Work Requests] DB save skipped (table may not exist):', dbErr.message);
    }

    // Always create an admin alert immediately — don't rely on the separate notification call
    const alert = {
      id: `wr_alert_${workRequest.id}`,
      type: 'urgent',
      category: 'Work Requests',
      title: `New Work Request: ${clientName || 'Customer'}`,
      description: `${clientName} submitted a ${workRequest.serviceType || workRequest.project_type || 'service'} request. Email: ${clientEmail}`,
      priority: 'high',
      status: 'unread',
      source: 'work-request-form',
      actionRequired: true,
      timestamp: new Date().toISOString(),
      data: {
        workRequestId: workRequest.id,
        clientName,
        clientEmail,
        clientPhone,
        serviceType: workRequest.serviceType || workRequest.project_type,
        budgetRange: workRequest.budget_range
          ? `$${workRequest.budget_range.min?.toLocaleString() || 0}–$${workRequest.budget_range.max?.toLocaleString() || 0}`
          : '',
      },
    };
    const existingAlerts = (await kv.get('admin_alerts') as any[]) || [];
    existingAlerts.unshift(alert);
    await kv.set('admin_alerts', existingAlerts.slice(0, 200));

    console.log('✅ [Work Requests] Created:', workRequest.id, '| Alert stored for', clientEmail);
    return c.json({ workRequest }, 201);
  } catch (error: any) {
    console.error('❌ [Work Requests] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-57095a78/work-requests', async (c) => {
  try {
    const userId = c.req.query('userId');
    const email  = c.req.query('email') || '';

    // Read from individual KV keys via the index (most reliable)
    const index: string[] = (await kv.get('wr_index') as string[]) || [];
    let all: any[] = [];

    if (index.length > 0) {
      const items = await Promise.all(index.map(id => kv.get(`wr:${id}`)));
      all = items.filter(Boolean) as any[];
    } else {
      // Fallback to legacy array
      all = (await kv.get('all_work_requests') as any[]) || [];
    }

    // Try Supabase DB as additional source (merge in any records not in KV)
    try {
      const { data: dbRows } = await supabase.from('work_requests').select('data').order('created_at', { ascending: false }).limit(500);
      if (dbRows && dbRows.length > 0) {
        const kvIds = new Set(all.map((r: any) => r.id));
        const fromDb = dbRows.map((r: any) => r.data).filter((r: any) => r && !kvIds.has(r.id));
        all = [...all, ...fromDb];
      }
    } catch {}

    if (userId || email) {
      const filtered = all.filter((r: any) =>
        (userId && (r.user_id === userId || r.userId === userId)) ||
        (email  && (r.client_email === email || r.client_info?.email === email || r.clientEmail === email))
      );
      return c.json(stripBase64(filtered));
    }

    return c.json(stripBase64(all));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update work request status (admin sets "opened", "in-progress", "completed", etc.)
app.put('/make-server-57095a78/work-requests/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const updates = await c.req.json();
    const safeUpdates = { ...stripBase64(updates), updated_at: new Date().toISOString() };

    // Update individual KV key
    const existing = await kv.get(`wr:${id}`) as any;
    if (existing) {
      await kv.set(`wr:${id}`, { ...existing, ...safeUpdates });
    }

    // Update legacy array
    const all = (await kv.get('all_work_requests') as any[]) || [];
    await kv.set('all_work_requests', all.map((r: any) => r.id === id ? { ...r, ...safeUpdates } : r));

    // Update Supabase DB
    try {
      await supabase.from('work_requests').update({ status: safeUpdates.status, updated_at: safeUpdates.updated_at, data: { ...(existing || {}), ...safeUpdates } }).eq('id', id);
    } catch {}

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── PUBLIC REELS ──────────────────────────────────────────────────────────────
// Vendors, subcontractors, advertisers and the content creation section
// publish reels here so they appear on the landing page for all visitors.

// GET all published reels (public, no auth)
app.get('/make-server-57095a78/public/reels', async (c) => {
  try {
    const reels = await kv.get('public_reels') as any[] || [];
    return c.json({ reels: stripBase64(reels) });
  } catch (error: any) {
    return c.json({ reels: [], error: error.message }, 500);
  }
});

// POST — publish a reel to the landing page (requires auth)
app.post('/make-server-57095a78/public/reels', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { reel } = body;
    if (!reel || !reel.title) return c.json({ error: 'Reel data required' }, 400);

    const existing = (await kv.get('public_reels') as any[]) || [];

    // Don't store base64 thumbnail — only https:// URLs
    const safeReel = {
      id: reel.id || `reel_${Date.now()}`,
      title: reel.title,
      description: reel.description || '',
      videoUrl: reel.videoUrl || '',
      thumbnailUrl: typeof reel.thumbnailUrl === 'string' && reel.thumbnailUrl.startsWith('https://') ? reel.thumbnailUrl : '',
      advertiser: {
        name: reel.advertiser?.name || reel.publisherName || 'Black Phoenix',
        logo: typeof reel.advertiser?.logo === 'string' && reel.advertiser.logo.startsWith('https://') ? reel.advertiser.logo : '',
        type: reel.advertiser?.type || 'content', // 'vendor' | 'subcontractor' | 'advertiser' | 'content'
      },
      linkUrl: reel.linkUrl || '',
      placement: reel.placement || ['directory-landing-page'],
      isActive: true,
      priority: reel.priority || existing.length + 1,
      publishedAt: new Date().toISOString(),
      publishedBy: user.id,
    };

    // Replace existing reel with same id or append
    const updated = existing.filter((r: any) => r.id !== safeReel.id);
    updated.push(safeReel);
    // Keep max 20 reels, sorted by priority
    updated.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
    await kv.set('public_reels', updated.slice(0, 20));

    console.log(`✅ [Reels] Published reel: ${safeReel.title} by ${safeReel.advertiser.name}`);
    return c.json({ success: true, reel: safeReel });
  } catch (error: any) {
    console.error('❌ [Reels] Publish error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE a reel by id (requires auth)
app.delete('/make-server-57095a78/public/reels/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const existing = (await kv.get('public_reels') as any[]) || [];
    await kv.set('public_reels', existing.filter((r: any) => r.id !== id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── SOCIAL MEDIA INTEGRATION ──────────────────────────────────────────────────
// Connects Facebook, Instagram, TikTok accounts for content pull & cross-posting.
// Tokens stored encrypted in KV store per user — never returned to the browser.

const FACEBOOK_APP_ID     = Deno.env.get('FACEBOOK_APP_ID')     || '';
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET') || '';
const TIKTOK_CLIENT_KEY   = Deno.env.get('TIKTOK_CLIENT_KEY')   || '';
const TIKTOK_CLIENT_SECRET= Deno.env.get('TIKTOK_CLIENT_SECRET')|| '';
const APP_URL             = Deno.env.get('APP_URL')             || 'https://www.theblackphoenixcompany.com';

// Helper: get/set social tokens per user
async function getSocialTokens(userId: string): Promise<Record<string, any>> {
  return (await kv.get(`social_tokens_${userId}`) as Record<string, any>) || {};
}
async function setSocialTokens(userId: string, tokens: Record<string, any>): Promise<void> {
  await kv.set(`social_tokens_${userId}`, tokens);
}

// GET connected accounts (returns safe public info only — no tokens)
app.get('/make-server-57095a78/social/accounts', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ accounts: {} });

    const tokens = await getSocialTokens(user.id);
    const accounts: Record<string, any> = {};

    for (const platform of ['facebook', 'instagram', 'tiktok']) {
      const t = tokens[platform];
      accounts[platform] = {
        connected: !!t?.accessToken,
        name: t?.name || null,
        avatar: t?.avatar || null,
        followers: t?.followers || null,
        connectedAt: t?.connectedAt || null,
      };
    }
    return c.json({ accounts });
  } catch (e: any) {
    return c.json({ accounts: {}, error: e.message }, 500);
  }
});

// POST /social/connect/:platform — returns OAuth URL or handles direct connection
app.post('/make-server-57095a78/social/connect/:platform', async (c) => {
  const platform = c.req.param('platform');
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const redirectUri = `${APP_URL}/social-callback`;

    if (platform === 'facebook' || platform === 'instagram') {
      if (!FACEBOOK_APP_ID) {
        return c.json({ error: 'Facebook App ID not configured. Add FACEBOOK_APP_ID to Supabase secrets.' }, 503);
      }
      const scopes = platform === 'instagram'
        ? 'instagram_basic,instagram_content_publish,pages_read_engagement'
        : 'pages_manage_posts,pages_read_engagement,publish_to_groups';
      const state = Buffer.from(JSON.stringify({ userId: user.id, platform })).toString('base64');
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;
      return c.json({ authUrl });
    }

    if (platform === 'tiktok') {
      if (!TIKTOK_CLIENT_KEY) {
        return c.json({ error: 'TikTok Client Key not configured. Add TIKTOK_CLIENT_KEY to Supabase secrets.' }, 503);
      }
      const state = Buffer.from(JSON.stringify({ userId: user.id, platform: 'tiktok' })).toString('base64');
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.list,video.publish&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      return c.json({ authUrl });
    }

    return c.json({ error: `Unknown platform: ${platform}` }, 400);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /social/callback — OAuth callback handler (redirect from platforms)
app.get('/make-server-57095a78/social/callback', async (c) => {
  try {
    const code  = c.req.query('code')  || '';
    const state = c.req.query('state') || '';
    const redirectUri = `${APP_URL}/social-callback`;

    if (!state) return c.text('Missing state', 400);
    const { userId, platform } = JSON.parse(Buffer.from(state, 'base64').toString());
    if (!userId || !platform) return c.text('Invalid state', 400);

    let tokenData: Record<string, any> = {};

    if (platform === 'facebook' || platform === 'instagram') {
      // Exchange code for access token
      const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) return c.text(`Auth error: ${tokenJson.error.message}`, 400);

      // Get user info
      const meRes = await fetch(`https://graph.facebook.com/me?fields=name,picture&access_token=${tokenJson.access_token}`);
      const me = await meRes.json();

      tokenData = { accessToken: tokenJson.access_token, name: me.name, avatar: me.picture?.data?.url, connectedAt: new Date().toISOString() };
    }

    if (platform === 'tiktok') {
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_key: TIKTOK_CLIENT_KEY, client_secret: TIKTOK_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) return c.text(`TikTok auth error: ${tokenJson.error}`, 400);

      const infoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,follower_count', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const info = await infoRes.json();
      tokenData = { accessToken: tokenJson.access_token, refreshToken: tokenJson.refresh_token, name: info.data?.user?.display_name, avatar: info.data?.user?.avatar_url, followers: info.data?.user?.follower_count, connectedAt: new Date().toISOString() };
    }

    // Save tokens
    const existing = await getSocialTokens(userId);
    existing[platform] = tokenData;
    await setSocialTokens(userId, existing);

    // Return HTML that posts message to parent window and closes popup
    return c.html(`<html><body><script>window.opener?.postMessage({type:'social_connected',platform:'${platform}'},'*');window.close();</script><p>Connected! You can close this window.</p></body></html>`);
  } catch (e: any) {
    console.error('[Social Callback] Error:', e);
    return c.text(`Error: ${e.message}`, 500);
  }
});

// DELETE /social/disconnect/:platform
app.delete('/make-server-57095a78/social/disconnect/:platform', async (c) => {
  const platform = c.req.param('platform');
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const tokens = await getSocialTokens(user.id);
    delete tokens[platform];
    await setSocialTokens(user.id, tokens);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /social/fetch/:platform — pull recent posts from a connected platform
app.get('/make-server-57095a78/social/fetch/:platform', async (c) => {
  const platform = c.req.param('platform');
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const tokens = await getSocialTokens(user.id);
    const t = tokens[platform];
    if (!t?.accessToken) return c.json({ error: `${platform} not connected` }, 400);

    let posts: any[] = [];

    if (platform === 'facebook') {
      // Get user's pages first
      const pagesRes = await fetch(`https://graph.facebook.com/me/accounts?access_token=${t.accessToken}`);
      const pages = await pagesRes.json();
      const page = pages.data?.[0];
      if (page) {
        const feedRes = await fetch(`https://graph.facebook.com/${page.id}/feed?fields=id,message,full_picture,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${page.access_token || t.accessToken}`);
        const feed = await feedRes.json();
        posts = (feed.data || []).map((p: any) => ({
          id: p.id, platform: 'facebook', content: p.message || '',
          imageUrl: p.full_picture || null, postedAt: p.created_time,
          likes: p.likes?.summary?.total_count || 0, comments: p.comments?.summary?.total_count || 0, shares: p.shares?.count || 0,
          permalink: `https://facebook.com/${p.id}`,
        }));
      }
    }

    if (platform === 'instagram') {
      const mediaRes = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_url,media_type,thumbnail_url,timestamp,like_count,comments_count,permalink&access_token=${t.accessToken}`);
      const media = await mediaRes.json();
      posts = (media.data || []).map((p: any) => ({
        id: p.id, platform: 'instagram', content: p.caption || '',
        imageUrl: p.media_url || null, videoUrl: p.media_type === 'VIDEO' ? p.media_url : null,
        postedAt: p.timestamp, likes: p.like_count || 0, comments: p.comments_count || 0, shares: 0,
        permalink: p.permalink,
      }));
    }

    if (platform === 'tiktok') {
      const videosRes = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,create_time,like_count,comment_count,share_count,embed_link', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 10 }),
      });
      const videos = await videosRes.json();
      posts = (videos.data?.videos || []).map((v: any) => ({
        id: v.id, platform: 'tiktok', content: v.title || '',
        imageUrl: v.cover_image_url || null, postedAt: new Date(v.create_time * 1000).toISOString(),
        likes: v.like_count || 0, comments: v.comment_count || 0, shares: v.share_count || 0,
        permalink: v.embed_link,
      }));
    }

    return c.json({ posts });
  } catch (e: any) {
    console.error('[Social Fetch] Error:', e);
    return c.json({ posts: [], error: e.message }, 500);
  }
});

// POST /social/import-to-library — save a pulled post to the content library KV
app.post('/make-server-57095a78/social/import-to-library', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { post } = await c.req.json();
    const existing = (await kv.get(`content_pieces_${user.id}`) as any[]) || [];
    const piece = {
      id: `imported_${post.id}`,
      title: post.content?.substring(0, 60) || `${post.platform} post`,
      content_body: post.content,
      content_format: post.videoUrl ? 'video_reel' : 'social_media',
      featured_image_url: post.imageUrl || null,
      status: 'published',
      source_platform: post.platform,
      source_url: post.permalink,
      created_at: post.postedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_impressions: post.likes || 0,
      total_engagement: (post.likes || 0) + (post.comments || 0),
      is_ai_generated: false,
    };
    existing.unshift(piece);
    await kv.set(`content_pieces_${user.id}`, existing.slice(0, 200));
    return c.json({ success: true, piece });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /social/ai-repurpose — rewrite content for a different platform using OpenAI
app.post('/make-server-57095a78/social/ai-repurpose', async (c) => {
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) return c.json({ error: 'OpenAI not configured' }, 503);

    const { originalContent, sourcePlatform, targetPlatform } = await c.req.json();

    const styleGuide: Record<string, string> = {
      facebook: 'conversational, 1-3 short paragraphs, include a call to action, use 1-2 emojis',
      instagram: 'engaging, use line breaks, 5-10 relevant hashtags at end, 1-3 emojis in caption',
      tiktok: 'punchy hook first line, casual Gen-Z friendly tone, 3-5 trending hashtags, very short',
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are a social media expert for The Black Phoenix Company, a construction and home services company. Repurpose content for different platforms.` },
          { role: 'user', content: `Rewrite this ${sourcePlatform} post for ${targetPlatform}.\n\nStyle: ${styleGuide[targetPlatform] || 'professional and engaging'}\n\nOriginal:\n${originalContent}\n\nReturn only the repurposed caption, nothing else.` },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || originalContent;
    return c.json({ caption });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /social/publish — cross-post content to multiple platforms
app.post('/make-server-57095a78/social/publish', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { content, imageUrl, videoUrl, platforms } = await c.req.json();
    const tokens = await getSocialTokens(user.id);
    const results: Record<string, any> = {};

    for (const platform of (platforms as string[])) {
      const t = tokens[platform];
      if (!t?.accessToken) { results[platform] = { error: 'Not connected' }; continue; }

      try {
        if (platform === 'facebook') {
          const pagesRes = await fetch(`https://graph.facebook.com/me/accounts?access_token=${t.accessToken}`);
          const pages = await pagesRes.json();
          const page = pages.data?.[0];
          if (!page) { results[platform] = { error: 'No Facebook Page found' }; continue; }
          const postRes = await fetch(`https://graph.facebook.com/${page.id}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content, access_token: page.access_token || t.accessToken }),
          });
          const postData = await postRes.json();
          results[platform] = postData.id ? { success: true, postId: postData.id } : { error: postData.error?.message };
        }

        if (platform === 'instagram') {
          if (!imageUrl && !videoUrl) { results[platform] = { error: 'Instagram requires an image or video' }; continue; }
          // Step 1: Create container
          const containerRes = await fetch(`https://graph.instagram.com/me/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caption: content, image_url: imageUrl, access_token: t.accessToken }),
          });
          const container = await containerRes.json();
          if (!container.id) { results[platform] = { error: container.error?.message || 'Container creation failed' }; continue; }
          // Step 2: Publish
          const publishRes = await fetch(`https://graph.instagram.com/me/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: container.id, access_token: t.accessToken }),
          });
          const published = await publishRes.json();
          results[platform] = published.id ? { success: true, postId: published.id } : { error: published.error?.message };
        }

        if (platform === 'tiktok') {
          if (!videoUrl) { results[platform] = { error: 'TikTok requires a video URL' }; continue; }
          const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: { Authorization: `Bearer ${t.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_info: { title: content, privacy_level: 'PUBLIC_TO_EVERYONE' }, source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } }),
          });
          const initData = await initRes.json();
          results[platform] = initData.data?.publish_id ? { success: true, publishId: initData.data.publish_id } : { error: initData.error?.message || 'TikTok publish failed' };
        }
      } catch (platformErr: any) {
        results[platform] = { error: platformErr.message };
      }
    }

    const anySuccess = Object.values(results).some((r: any) => r.success);
    return c.json({ results, success: anySuccess });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Submit reel for approval (from vendor/subcontractor/advertiser portals)
app.post('/make-server-57095a78/social/submit-reel', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);

    const { title, description, videoUrl, thumbnailUrl, linkUrl, submitterName, submitterType } = await c.req.json();
    if (!title) return c.json({ error: 'Title required' }, 400);

    // Store as a pending approval item in KV
    const pending = (await kv.get('pending_reels') as any[]) || [];
    const submission = {
      id: `pending_${Date.now()}`,
      title,
      description: description || '',
      videoUrl: videoUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      linkUrl: linkUrl || '',
      submitterName: submitterName || 'Unknown',
      submitterType: submitterType || 'vendor',
      submittedBy: user?.id || 'anonymous',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    pending.unshift(submission);
    await kv.set('pending_reels', pending.slice(0, 100));

    console.log(`✅ [Submit Reel] Pending: "${title}" from ${submitterName} (${submitterType})`);
    return c.json({ success: true, id: submission.id });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET pending reel submissions (admin only)
app.get('/make-server-57095a78/social/pending-reels', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const pending = await kv.get('pending_reels') as any[] || [];
    return c.json({ submissions: pending });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST approve a pending reel — publishes it live
app.post('/make-server-57095a78/social/approve-reel/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const pending = (await kv.get('pending_reels') as any[]) || [];
    const item = pending.find((p: any) => p.id === id);
    if (!item) return c.json({ error: 'Submission not found' }, 404);

    // Publish to live reels
    const existing = (await kv.get('public_reels') as any[]) || [];
    const reel = {
      id: `approved_${id}`,
      title: item.title,
      description: item.description,
      videoUrl: item.videoUrl || '',
      thumbnailUrl: isUrl(item.thumbnailUrl) ? item.thumbnailUrl : '',
      advertiser: { name: item.submitterName, type: item.submitterType },
      linkUrl: item.linkUrl || '',
      placement: ['directory-landing-page'],
      isActive: true,
      priority: existing.length + 1,
      publishedAt: new Date().toISOString(),
    };
    existing.push(reel);
    await kv.set('public_reels', existing.slice(0, 20));

    // Remove from pending
    await kv.set('pending_reels', pending.filter((p: any) => p.id !== id));

    console.log(`✅ [Approve Reel] Published: "${item.title}" from ${item.submitterName}`);
    return c.json({ success: true, reel });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── AI FLOOR PLAN & LAYOUT GENERATION ────────────────────────────────────────
// Called automatically when a work request enters the pipeline for the first time.
// Generates floor plan / layout from:
//   1. Photos attached to the work request (OpenAI Vision)
//   2. Work request description + room details (GPT-4o text fallback)

app.post('/make-server-57095a78/ai-floorplan/generate-for-work-request', async (c) => {
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) return c.json({ error: 'OpenAI not configured' }, 503);

    const {
      workRequestId, serviceType, projectType, description,
      photoUrls = [], roomType, dimensions, propertyType,
      budgetRange, stylePreferences, kitchenPreferences,
    } = await c.req.json();

    console.log(`[FloorPlan] Generating for work request: ${workRequestId}`);

    // Build context from work request details
    const contextText = [
      `Service Type: ${serviceType || projectType || 'renovation'}`,
      description ? `Project: ${description}` : '',
      roomType ? `Room: ${roomType}` : '',
      dimensions ? `Approx dimensions: ${JSON.stringify(dimensions)}` : '',
      propertyType ? `Property: ${propertyType}` : '',
      budgetRange ? `Budget: ${budgetRange}` : '',
      stylePreferences?.primary ? `Style: ${stylePreferences.primary}` : '',
      kitchenPreferences?.layoutType ? `Kitchen layout: ${kitchenPreferences.layoutType}` : '',
    ].filter(Boolean).join('\n');

    let messages: any[] = [];

    // If photos uploaded, analyze them with Vision
    if (photoUrls.length > 0) {
      const validPhotos = photoUrls
        .filter((u: string) => isUrl(u))
        .slice(0, 4); // max 4 photos for cost/speed

      const imageContent = validPhotos.map((url: string) => ({
        type: 'image_url',
        image_url: { url, detail: 'low' },
      }));

      messages = [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert architectural AI. Analyze these photos of a ${serviceType || 'renovation'} project and generate a detailed floor plan layout.

Work Request Context:
${contextText}

Generate a JSON floor plan with this exact structure:
{
  "roomType": "kitchen|bathroom|bedroom|living|general",
  "estimatedDimensions": { "length": 15, "width": 12, "unit": "feet" },
  "rooms": [{ "name": "...", "sqft": 0, "features": ["..."] }],
  "layout": {
    "description": "...",
    "keyFeatures": ["..."],
    "trafficFlow": "...",
    "recommendations": ["..."]
  },
  "materials": [{ "item": "...", "current": "...", "recommended": "..." }],
  "estimatedScope": {
    "complexity": "low|medium|high",
    "estimatedDays": 0,
    "keyTasks": ["..."]
  },
  "svgLayout": "<svg>...</svg>"
}

Return ONLY the JSON object.`,
          },
          ...imageContent,
        ],
      }];
    } else {
      // No photos — generate from description only
      messages = [{
        role: 'user',
        content: `You are an expert architectural AI. Generate a floor plan layout for this work request.

${contextText}

Generate a JSON floor plan with this exact structure:
{
  "roomType": "kitchen|bathroom|bedroom|living|general",
  "estimatedDimensions": { "length": 15, "width": 12, "unit": "feet" },
  "rooms": [{ "name": "...", "sqft": 0, "features": ["..."] }],
  "layout": {
    "description": "...",
    "keyFeatures": ["..."],
    "trafficFlow": "...",
    "recommendations": ["..."]
  },
  "materials": [{ "item": "...", "current": "...", "recommended": "..." }],
  "estimatedScope": {
    "complexity": "low|medium|high",
    "estimatedDays": 0,
    "keyTasks": ["..."]
  },
  "svgLayout": "<svg viewBox='0 0 400 300' xmlns='http://www.w3.org/2000/svg'><!-- floor plan --></svg>"
}

Return ONLY the JSON object.`,
      }];
    }

    const model = photoUrls.length > 0 ? 'gpt-4o' : 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.4 }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[FloorPlan] OpenAI error:', err);
      return c.json({ error: 'AI generation failed' }, 500);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '{}';

    // Strip markdown code blocks if present
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let floorPlan: any;
    try {
      floorPlan = JSON.parse(cleaned);
    } catch {
      // Return a minimal layout if parsing fails
      floorPlan = {
        roomType: serviceType?.toLowerCase().includes('kitchen') ? 'kitchen' : 'general',
        estimatedDimensions: { length: 15, width: 12, unit: 'feet' },
        layout: { description: `${serviceType} renovation project`, keyFeatures: [], recommendations: [] },
        estimatedScope: { complexity: 'medium', estimatedDays: 5, keyTasks: [] },
      };
    }

    floorPlan.generatedAt = new Date().toISOString();
    floorPlan.workRequestId = workRequestId;
    floorPlan.source = photoUrls.length > 0 ? 'photo-analysis' : 'description';
    floorPlan.photosAnalyzed = photoUrls.length;

    console.log(`✅ [FloorPlan] Generated for ${workRequestId} using ${model} (${photoUrls.length} photos)`);
    return c.json({ floorPlan });
  } catch (e: any) {
    console.error('[FloorPlan] Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// ── MESSAGING — admin ↔ customer direct messages ──────────────────────────────
// Conversations and messages stored in KV store.

function convKey(id: string) { return `conv:${id}`; }
function msgsKey(convId: string) { return `msgs:${convId}`; }

app.get('/make-server-57095a78/messaging/conversations/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const email = c.req.query('email') || '';

    // Direct lookup by email index (most reliable path)
    if (email) {
      const emailKey = `customer_convs:${email.toLowerCase()}`;
      const convIds: string[] = (await kv.get(emailKey) as string[]) || [];
      const convs: any[] = [];
      for (const id of convIds) {
        const conv = await kv.get(convKey(id));
        if (conv) convs.push(conv);
      }
      if (convs.length > 0) return c.json({ conversations: convs });
    }

    // Fallback: scan all conversations
    const all = await kv.getByPrefix('conv:') as any[];
    const userConvs = all.filter((conv: any) =>
      conv?.participants?.some((p: any) =>
        p.userId === userId ||
        p.userId === (email || '').toLowerCase() ||
        (email && (p.userId === email || p.userEmail === email))
      ) ||
      (email && conv?.metadata?.customerEmail === email)
    );
    return c.json({ conversations: userConvs });
  } catch (e: any) { return c.json({ conversations: [], error: e.message }); }
});

app.get('/make-server-57095a78/messaging/conversations/:convId/messages', async (c) => {
  try {
    const convId = c.req.param('convId');
    const msgs = (await kv.get(msgsKey(convId)) as any[]) || [];
    return c.json({ messages: msgs });
  } catch (e: any) { return c.json({ messages: [], error: e.message }); }
});

app.post('/make-server-57095a78/messaging/conversations', async (c) => {
  try {
    const body = await c.req.json();
    const conv = {
      id: `conv_${Date.now()}`,
      type: body.type || 'direct',
      name: body.name || '',
      participants: body.participants || [],
      metadata: body.metadata || {},
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(convKey(conv.id), conv);
    return c.json({ conversation: conv }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Find existing OR create direct conversation between admin and customer
app.post('/make-server-57095a78/messaging/conversations/direct', async (c) => {
  try {
    const { user1Id, user1Name, user2Id, user2Name, name, metadata } = await c.req.json();
    const customerEmail = metadata?.customerEmail || user2Id;

    // Look for existing conversation — match by userId OR email in metadata
    const all = await kv.getByPrefix('conv:') as any[];
    const existing = all.find((conv: any) => {
      const ids = (conv.participants || []).map((p: any) => p.userId);
      const convEmail = conv.metadata?.customerEmail;
      return (ids.includes(user1Id) && (ids.includes(user2Id) || convEmail === customerEmail));
    });
    if (existing) return c.json({ conversation: existing });

    const conv = {
      id: `conv_${Date.now()}`,
      type: 'direct',
      name: name || `${user1Name} & ${user2Name}`,
      participants: [
        { userId: user1Id, userName: user1Name, userRole: 'admin', joinedAt: new Date().toISOString() },
        // Store email as userId fallback so customer lookup works
        { userId: user2Id, userEmail: customerEmail, userName: user2Name, userRole: 'customer', joinedAt: new Date().toISOString() },
      ],
      metadata: { ...(metadata || {}), customerEmail },
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      unreadCount: { [user2Id]: 1, [customerEmail]: 1 }, // mark unread for customer
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(convKey(conv.id), conv);

    // Index conversation by customer email for instant lookup
    const emailIdx = `customer_convs:${customerEmail.toLowerCase()}`;
    const existingIdx: string[] = (await kv.get(emailIdx) as string[]) || [];
    if (!existingIdx.includes(conv.id)) {
      await kv.set(emailIdx, [...existingIdx, conv.id]);
    }

    return c.json({ conversation: conv }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Notify customer that admin viewed their work request
app.post('/make-server-57095a78/work-requests/:id/viewed', async (c) => {
  try {
    const wrId = c.req.param('id');
    const { adminName, customerEmail, customerName } = await c.req.json();

    // Create/find conversation and send an automatic notification message
    const all = await kv.getByPrefix('conv:') as any[];
    let conv = all.find((cv: any) => cv?.metadata?.workRequestId === wrId);

    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        type: 'direct',
        name: `Black Phoenix Team & ${customerName || 'Customer'}`,
        participants: [
          { userId: 'admin', userName: adminName || 'Black Phoenix Team', userRole: 'admin', joinedAt: new Date().toISOString() },
          { userId: customerEmail, userEmail: customerEmail, userName: customerName || 'Customer', userRole: 'customer', joinedAt: new Date().toISOString() },
        ],
        metadata: { workRequestId: wrId, customerEmail },
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        unreadCount: { [customerEmail]: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(convKey(conv.id), conv);

      // Index by customer email
      const emailIdx = `customer_convs:${customerEmail.toLowerCase()}`;
      const existingIdx: string[] = (await kv.get(emailIdx) as string[]) || [];
      if (!existingIdx.includes(conv.id)) {
        await kv.set(emailIdx, [...existingIdx, conv.id]);
      }
    }

    // Send automatic notification message
    const notifMsg = {
      id: `msg_${Date.now()}`,
      conversationId: conv.id,
      senderId: 'admin',
      senderName: adminName || 'Black Phoenix Team',
      senderRole: 'admin',
      content: `👀 Hi ${customerName || 'there'}! We've received your work request and are currently reviewing it. We'll be in touch shortly with any questions or your quote. Feel free to message us here if you have anything to add!`,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const msgs = (await kv.get(msgsKey(conv.id)) as any[]) || [];
    // Only send once — don't spam if admin views multiple times
    const alreadySent = msgs.some((m: any) => m.content?.includes("We've received your work request"));
    if (!alreadySent) {
      msgs.push(notifMsg);
      await kv.set(msgsKey(conv.id), msgs);
      conv.lastMessage = notifMsg.content.substring(0, 80);
      conv.lastMessageAt = notifMsg.createdAt;
      conv.unreadCount = { ...(conv.unreadCount || {}), [customerEmail]: 1 };
      await kv.set(convKey(conv.id), conv);
      console.log(`✅ [Viewed notification] Sent to ${customerEmail} for work request ${wrId}`);
    }

    return c.json({ success: true, conversationId: conv.id });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/make-server-57095a78/messaging/messages', async (c) => {
  try {
    const body = await c.req.json();
    const { conversationId, senderId, senderName, senderRole, content } = body;
    if (!conversationId || !content) return c.json({ error: 'conversationId and content required' }, 400);

    const msg = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: senderId || 'unknown',
      senderName: senderName || 'Unknown',
      senderRole: senderRole || 'customer',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Append to messages list
    const msgs = (await kv.get(msgsKey(conversationId)) as any[]) || [];
    msgs.push(msg);
    await kv.set(msgsKey(conversationId), msgs.slice(-200)); // keep last 200

    // Update conversation last message
    const conv = await kv.get(convKey(conversationId)) as any;
    if (conv) {
      conv.lastMessage = content.substring(0, 80);
      conv.lastMessageAt = msg.createdAt;
      // Increment unread for other participants
      const others = (conv.participants || []).filter((p: any) => p.userId !== senderId);
      others.forEach((p: any) => {
        conv.unreadCount = conv.unreadCount || {};
        conv.unreadCount[p.userId] = (conv.unreadCount[p.userId] || 0) + 1;
      });
      await kv.set(convKey(conversationId), conv);
    }

    console.log(`✅ [Messaging] Message sent in conv ${conversationId} by ${senderName}`);

    // Send SMS to customer when ADMIN sends a message
    if (senderRole === 'admin' && conv) {
      const customerParticipant = (conv.participants || []).find((p: any) => p.userRole === 'customer');
      const customerPhone = customerParticipant?.userPhone || conv.metadata?.customerPhone || '';
      const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
      const TWILIO_AUTH  = Deno.env.get('TWILIO_AUTH_TOKEN')  || '';
      const TWILIO_FROM  = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
      if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && customerPhone) {
        const smsText = `Black Phoenix: ${senderName} sent you a message: "${content.substring(0, 100)}". Reply in your dashboard.`;
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ From: TWILIO_FROM, To: customerPhone, Body: smsText }),
        }).catch(() => {});
      }
    }
    return c.json({ message: msg }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-57095a78/messaging/conversations/:convId/read', async (c) => {
  try {
    const convId = c.req.param('convId');
    const { userId } = await c.req.json();
    const conv = await kv.get(convKey(convId)) as any;
    if (conv) {
      conv.unreadCount = conv.unreadCount || {};
      conv.unreadCount[userId] = 0;
      await kv.set(convKey(convId), conv);
    }
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get('/make-server-57095a78/messaging/unread/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const all = await kv.getByPrefix('conv:') as any[];
    let total = 0;
    all.forEach((conv: any) => {
      total += conv?.unreadCount?.[userId] || 0;
    });
    return c.json({ unreadCount: total });
  } catch (e: any) { return c.json({ unreadCount: 0 }); }
});

// ── AI EMAIL LEAD GENERATION ─────────────────────────────────────────────────

// Capture a new lead
app.post('/make-server-57095a78/leads/capture', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, source, page, cartValue, productsViewed, phone } = body;
    if (!email) return c.json({ error: 'Email required' }, 400);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
    const existingLeads: any[] = (await kv.get('leads:all') as any[]) || [];

    // Don't duplicate
    const existing = existingLeads.find((l: any) => l.email === email);
    if (existing) {
      // Update activity
      existing.lastSeen = new Date().toISOString();
      existing.pageViews = (existing.pageViews || 0) + 1;
      if (cartValue) existing.cartValue = cartValue;
      await kv.set('leads:all', existingLeads);
      return c.json({ success: true, leadId: existing.id, existing: true });
    }

    // AI score the lead
    let score = 50;
    let intent = 'browsing';
    let aiSummary = '';

    if (OPENAI_API_KEY) {
      try {
        const prompt = `Score this ecommerce lead from 0-100 and classify intent.
Lead data:
- Source: ${source || 'store'}
- Page: ${page || 'homepage'}
- Cart value: $${cartValue || 0}
- Products viewed: ${productsViewed || 0}
- Has phone: ${!!phone}

Return JSON only: {"score": number, "intent": "hot"|"warm"|"cold", "summary": "one sentence why", "recommendedAction": "what email to send first"}`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 150,
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        score = parsed.score || 50;
        intent = parsed.intent || 'warm';
        aiSummary = parsed.summary || '';
      } catch { /* use default score */ }
    } else {
      // Simple rule-based scoring without AI
      if (cartValue > 100) { score = 85; intent = 'hot'; }
      else if (cartValue > 0) { score = 70; intent = 'warm'; }
      else if (source === 'quote') { score = 90; intent = 'hot'; }
      else { score = 40; intent = 'cold'; }
    }

    const lead = {
      id: `lead_${Date.now()}`,
      email, name: name || '', phone: phone || '',
      source: source || 'store', page: page || '',
      cartValue: cartValue || 0, productsViewed: productsViewed || 0,
      score, intent, aiSummary,
      capturedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      pageViews: 1,
      emailsSent: 0, emailsOpened: 0,
      status: 'new', tags: [],
      sequence: 'welcome',
      sequenceStep: 0,
    };

    existingLeads.unshift(lead);
    await kv.set('leads:all', existingLeads);
    return c.json({ success: true, leadId: lead.id, score, intent });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Get all leads
app.get('/make-server-57095a78/leads', async (c) => {
  try {
    const leads = (await kv.get('leads:all') as any[]) || [];
    const stats = {
      total: leads.length,
      hot: leads.filter((l: any) => l.intent === 'hot').length,
      warm: leads.filter((l: any) => l.intent === 'warm').length,
      cold: leads.filter((l: any) => l.intent === 'cold').length,
      emailsSent: leads.reduce((s: number, l: any) => s + (l.emailsSent || 0), 0),
      avgScore: leads.length ? Math.round(leads.reduce((s: number, l: any) => s + (l.score || 0), 0) / leads.length) : 0,
    };
    return c.json({ leads, stats });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Send AI-written email to a lead
app.post('/make-server-57095a78/leads/send-email', async (c) => {
  try {
    const body = await c.req.json();
    const { leadId, emailType, customMessage } = body;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
    const COMPANY_NAME = 'The Black Phoenix Company';
    const FROM_EMAIL = 'hello@theblackphoenixcompany.com';
    const STORE_URL = 'https://theblackphoenixcompany.com/shop';

    if (!RESEND_API_KEY) return c.json({ error: 'RESEND_API_KEY not configured' }, 400);

    const leads: any[] = (await kv.get('leads:all') as any[]) || [];
    const lead = leads.find((l: any) => l.id === leadId);
    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    // AI writes the email
    let subject = '';
    let htmlBody = '';
    let textBody = '';

    const emailTemplates: Record<string, { subject: string; prompt: string }> = {
      welcome: {
        subject: `Welcome to ${COMPANY_NAME} — Here's What We Have For You`,
        prompt: `Write a warm welcome email for a new store visitor named "${lead.name || 'Friend'}". They visited our store page: ${lead.page}. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Keep it friendly, 3 short paragraphs, end with a CTA to browse the store.`,
      },
      cart_abandon: {
        subject: `Hey${lead.name ? ' ' + lead.name : ''}, you left something behind 🛒`,
        prompt: `Write a cart abandonment recovery email. Customer left $${lead.cartValue} in their cart. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Be friendly, create urgency, offer help. 2-3 short paragraphs.`,
      },
      hot_follow_up: {
        subject: `${lead.name ? lead.name + ', we' : 'We'} noticed you were interested — can we help?`,
        prompt: `Write a follow-up email for a high-intent lead (score: ${lead.score}/100). They browsed ${lead.productsViewed} products. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Be direct, helpful, and offer to answer questions. Short and friendly.`,
      },
      promo: {
        subject: `Exclusive offer just for you — 10% off your first order`,
        prompt: `Write a promotional email offering 10% off with code BPBUILDS10. Company: ${COMPANY_NAME}. Store: ${STORE_URL}. Mention free shipping over $500. Upbeat, exciting tone. 2 paragraphs + CTA.`,
      },
      custom: {
        subject: `A message from ${COMPANY_NAME}`,
        prompt: customMessage || 'Write a friendly outreach email.',
      },
    };

    const template = emailTemplates[emailType] || emailTemplates.welcome;

    if (OPENAI_API_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an email marketing expert. Write concise, high-converting emails. Return JSON with keys: subject, html, text' },
              { role: 'user', content: template.prompt + '\n\nReturn JSON: {"subject": "...", "html": "<html email body>", "text": "plain text version"}' },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 800,
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        subject = parsed.subject || template.subject;
        htmlBody = parsed.html || `<p>${parsed.text || ''}</p>`;
        textBody = parsed.text || '';
      } catch { subject = template.subject; }
    } else {
      subject = template.subject;
    }

    // Wrap in branded template
    const brandedHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#0a0a0a;padding:24px;text-align:center">
          <h1 style="color:#ea580c;margin:0;font-size:22px">${COMPANY_NAME}</h1>
          <p style="color:#888;margin:4px 0 0;font-size:13px">theblackphoenixcompany.com</p>
        </div>
        <div style="padding:32px 24px;color:#222;line-height:1.7">
          ${htmlBody}
        </div>
        <div style="background:#f5f5f5;padding:20px 24px;text-align:center;border-top:1px solid #eee">
          <a href="${STORE_URL}" style="display:inline-block;padding:12px 28px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">Visit the Store →</a>
          <p style="color:#aaa;font-size:11px;margin:16px 0 0">© ${new Date().getFullYear()} ${COMPANY_NAME} · <a href="${STORE_URL}" style="color:#aaa">Unsubscribe</a></p>
        </div>
      </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
        to: [lead.email],
        subject,
        html: brandedHtml,
        text: textBody || subject,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      return c.json({ error: err.message || 'Email send failed' }, 500);
    }

    // Update lead record
    lead.emailsSent = (lead.emailsSent || 0) + 1;
    lead.lastEmailSent = new Date().toISOString();
    lead.lastEmailType = emailType;
    lead.status = 'contacted';
    await kv.set('leads:all', leads);

    return c.json({ success: true, subject, to: lead.email });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Blast email to all leads (or by intent filter)
app.post('/make-server-57095a78/leads/blast', async (c) => {
  try {
    const body = await c.req.json();
    const { emailType, intentFilter, customMessage } = body;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    if (!RESEND_API_KEY) return c.json({ error: 'RESEND_API_KEY not configured' }, 400);

    const leads: any[] = (await kv.get('leads:all') as any[]) || [];
    const targets = intentFilter && intentFilter !== 'all'
      ? leads.filter((l: any) => l.intent === intentFilter)
      : leads;

    const results = { sent: 0, failed: 0, total: targets.length };

    // Send in batches to avoid rate limits
    for (const lead of targets.slice(0, 50)) {
      try {
        await fetch(`https://${Deno.env.get('SUPABASE_URL')?.split('//')[1]}/functions/v1/make-server-57095a78/leads/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
          body: JSON.stringify({ leadId: lead.id, emailType, customMessage }),
        });
        results.sent++;
      } catch { results.failed++; }
    }

    return c.json({ success: true, ...results });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Delete a lead
app.delete('/make-server-57095a78/leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const leads: any[] = (await kv.get('leads:all') as any[]) || [];
    await kv.set('leads:all', leads.filter((l: any) => l.id !== id));
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

Deno.serve(app.fetch);
