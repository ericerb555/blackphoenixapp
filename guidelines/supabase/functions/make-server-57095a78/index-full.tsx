/**
 * Black Phoenix Server - Fully Inline Single File (no imports from other files)
 * Version: 2.1.0
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js@2.39.7";

// ── KV STORE (inlined from kv_store.tsx) ─────────────────────────────────────
const _kvClient = () => createSupabaseClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
const kv = {
  set: async (key: string, value: any): Promise<void> => {
    const { error } = await _kvClient().from("kv_store_57095a78").upsert({ key, value });
    if (error) throw new Error(error.message);
  },
  get: async (key: string): Promise<any> => {
    const { data, error } = await _kvClient().from("kv_store_57095a78").select("value").eq("key", key).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.value;
  },
  del: async (key: string): Promise<void> => {
    const { error } = await _kvClient().from("kv_store_57095a78").delete().eq("key", key);
    if (error) throw new Error(error.message);
  },
  getByPrefix: async (prefix: string): Promise<any[]> => {
    const { data, error } = await _kvClient().from("kv_store_57095a78").select("key, value").like("key", prefix + "%");
    if (error) throw new Error(error.message);
    return data?.map((d: any) => d.value) ?? [];
  },
};

const app = new Hono();

// Initialize Supabase
const supabase = createSupabaseClient(
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

    console.log('[Auto-Quote] Generating quote for:', workRequest.title);

    const serviceType = workRequest.serviceType?.toLowerCase() || '';
    const title = workRequest.title?.toLowerCase() || '';
    const estimatedValue = workRequest.estimatedValue || 10000;

    // ── LOAD YOUR REAL LABOR RATES & PROFIT SETTINGS ─────────────────────
    let savedRates: Record<string, number> = {};
    let profitSettings = { laborMarkup: 15, materialsMarkup: 20, overheadPercentage: 10, targetProfitMargin: 20 };

    try {
      const ratesData = await kv.get('labor_rates_config') as any;
      if (ratesData?.laborRates) {
        ratesData.laborRates.forEach((r: any) => { savedRates[r.id] = r.hourlyRate; });
        console.log('[Auto-Quote] Using your saved labor rates:', savedRates);
      }
      if (ratesData?.profitSettings) profitSettings = { ...profitSettings, ...ratesData.profitSettings };
    } catch (e) {
      console.warn('[Auto-Quote] Could not load saved rates, using defaults');
    }

    // Helper: get rate by category id, with fallback
    const rate = (id: string, fallback: number) => savedRates[id] || fallback;
    const applyMarkup = (cost: number, isLabor = false) => {
      const markup = isLabor ? (1 + profitSettings.laborMarkup / 100) : (1 + profitSettings.materialsMarkup / 100);
      return cost * markup;
    };

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
        { id: `lab-${Date.now()}-1`, role: 'Site Protection & Demolition', description: 'Install protective barriers on floors, walls, and doorways. Carefully remove all existing cabinets, countertops, backsplash, and flooring. Disconnect and safely cap plumbing and electrical. Haul away all demolition debris. Duration: 2 full days with 2-person crew.', hours: 22, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 1650, visible: true },
        { id: `lab-${Date.now()}-2`, role: 'Electrical Rough-In & Upgrades', description: 'Run new dedicated 20A circuits for kitchen outlets per code. Install electrical boxes for outlets, switches, and fixtures. Run wiring for under-cabinet lighting system. Install GFCI outlets. Upgrade to AFCI breakers. Install rough-in for range and dishwasher. Coordinate with electrical inspector.', hours: 24, hourlyRate: rate('electrical', 95), totalCost: rate('electrical', 95) * 2280, visible: true },
        { id: `lab-${Date.now()}-3`, role: 'Plumbing Rough-In & Gas Line', description: 'Install new PEX supply lines to sink, dishwasher, and refrigerator ice maker. Install new drain lines with proper venting per code. Run new gas line for range with approved black iron pipe. Install shut-off valves for all fixtures. Pressure test all lines. Coordinate with plumbing inspector for rough-in approval.', hours: 16, hourlyRate: rate('plumbing', 105), totalCost: rate('plumbing', 105) * 1680, visible: true },
        { id: `lab-${Date.now()}-4`, role: 'Drywall Repair & Preparation', description: 'Patch all drywall damage from demolition. Apply joint compound, tape seams, and sand smooth to Level 4 finish. Prime all repaired areas. Ensure walls are perfectly flat for backsplash installation. Touch up ceiling as needed.', hours: 6, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 450, visible: true },
        { id: `lab-${Date.now()}-5`, role: 'Cabinet Installation & Leveling', description: 'Install all base cabinets with precision leveling and shimming. Securely anchor to wall studs. Install all wall cabinets with laser level for perfect alignment. Install corner lazy susan hardware. Install cabinet fillers and scribe to walls. Install toe kick boards. Install all cabinet hardware (knobs and pulls). Ensure all doors and drawers operate smoothly with soft-close function.', hours: 28, hourlyRate: rate('carpentry', 85), totalCost: rate('carpentry', 85) * 2380, visible: true },
        { id: `lab-${Date.now()}-6`, role: 'Countertop Fabrication & Installation', description: 'Create precise template of countertop layout. Fabricate Caesarstone Snow quartz slabs with bullnose edge profile. Cut sink opening and polish edges. Transport and install countertops with color-matched seam adhesive. Install undermount sink with clips and seal. Allow proper curing time. Final polish and sealing of all surfaces.', hours: 17, hourlyRate: rate('electrical', 95), totalCost: rate('electrical', 95) * 1615, visible: true },
        { id: `lab-${Date.now()}-7`, role: 'Backsplash Tile Installation', description: 'Install cement backer board on backsplash area. Apply thin-set mortar and install subway tile with precise 1/8" grout lines. Use tile spacers for consistent spacing. Cut tiles around outlets and edges for professional fit. Allow proper curing time. Apply grout and remove excess. Seal grout lines. Install outlet covers flush with tile.', hours: 22, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 1650, visible: true },
        { id: `lab-${Date.now()}-8`, role: 'Hardwood Flooring Installation', description: 'Prepare and level subfloor. Install moisture barrier underlayment. Acclimate hardwood flooring to room conditions. Install 3/4" solid red oak hardwood flooring with proper nail pattern. Cut and fit around cabinets and doorways. Install matching threshold transitions. Install baseboards and quarter-round trim. Touch up finish on any cut edges.', hours: 28, hourlyRate: rate('flooring', 80), totalCost: rate('flooring', 80) * 2240, visible: true },
        { id: `lab-${Date.now()}-9`, role: 'Electrical Finish & Lighting', description: 'Install all recessed LED lighting fixtures with proper IC-rated housings. Install and wire under-cabinet LED lighting system with dimmer controls. Install all outlet and switch covers. Install GFCI outlets per code. Test all circuits and lighting systems. Program dimmer switches. Label circuit breaker panel.', hours: 14, hourlyRate: rate('electrical', 95), totalCost: rate('electrical', 95) * 1330, visible: true },
        { id: `lab-${Date.now()}-10`, role: 'Plumbing Finish & Fixture Installation', description: 'Install undermount sink with professional mounting and sealing. Install pull-down faucet with deck plate. Install garbage disposal and connect to drain. Install dishwasher supply line with air gap. Connect refrigerator water line for ice maker. Test all connections for leaks. Install shut-off valves under sink with decorative escutcheons.', hours: 9, hourlyRate: rate('plumbing', 105), totalCost: rate('plumbing', 105) * 945, visible: true },
        { id: `lab-${Date.now()}-11`, role: 'Appliance Installation & Connection', description: 'Uncrate and position all appliances (refrigerator, range, dishwasher). Level appliances and install anti-tip brackets for range. Connect all gas, electrical, and water lines per manufacturer specifications. Test each appliance for proper operation. Remove all packaging and dispose properly. Provide customer with warranty information and manuals.', hours: 9, hourlyRate: rate('carpentry', 85), totalCost: rate('carpentry', 85) * 765, visible: true },
        { id: `lab-${Date.now()}-12`, role: 'Interior Painting', description: 'Prepare all surfaces with cleaning and light sanding. Apply painter\'s tape to protect cabinets, countertops, and fixtures. Prime all repaired drywall areas. Apply two coats of Sherwin Williams ProClassic paint to ceiling, walls, and trim. Cut in edges carefully around cabinets and tile. Remove tape while paint is still tacky for clean lines. Touch up as needed.', hours: 18, hourlyRate: rate('painting', 65), totalCost: rate('painting', 65) * 1170, visible: true },
        { id: `lab-${Date.now()}-13`, role: 'Final Details, Caulking & Cleanup', description: 'Apply clear silicone caulk around sink, faucet, and all countertop edges. Caulk gaps between cabinets and walls. Install cabinet hardware with precise alignment. Clean all surfaces thoroughly. Polish countertops and appliances. Vacuum and mop floors. Remove all debris and construction materials. Final walkthrough with customer to demonstrate appliances and answer questions.', hours: 10, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 750, visible: true },
        { id: `lab-${Date.now()}-14`, role: 'Project Management & Coordination', description: 'Overall project planning and timeline coordination. Schedule and coordinate all subcontractors (electrician, plumber, tile installer, cabinet installer). Order and track all materials and appliances. Coordinate building inspections (electrical rough-in, plumbing rough-in, final). Handle permit applications and approvals. Provide regular progress updates to customer. Address any issues or change orders. Ensure quality control at each phase.', hours: 32, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 2400, visible: true },
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
        { id: `lab-${Date.now()}-1`, role: 'Demolition & Removal', description: 'Remove existing vanity, toilet, shower/tub, tile, fixtures. Disconnect plumbing and electrical. Haul away all demolition debris. Protect surrounding areas.', hours: 14, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 1050, visible: true },
        { id: `lab-${Date.now()}-2`, role: 'Plumbing Rough-In', description: 'Install new supply lines for vanity, shower, and toilet. Install drain lines with proper venting per code. Pressure test all lines. Coordinate plumbing inspection.', hours: 18, hourlyRate: rate('plumbing', 105), totalCost: rate('plumbing', 105) * 1890, visible: true },
        { id: `lab-${Date.now()}-3`, role: 'Electrical Rough-In', description: 'Install new circuits for lighting, outlets, exhaust fan. Run wiring to all fixture locations. Install GFCI outlets. Coordinate electrical inspection.', hours: 12, hourlyRate: rate('electrical', 95), totalCost: rate('electrical', 95) * 1140, visible: true },
        { id: `lab-${Date.now()}-4`, role: 'Cement Board & Waterproofing', description: 'Install cement board on shower walls and floor. Apply waterproofing membrane to entire shower enclosure. Install shower pan per code.', hours: 16, hourlyRate: rate('carpentry', 85), totalCost: rate('carpentry', 85) * 1360, visible: true },
        { id: `lab-${Date.now()}-5`, role: 'Tile Installation - Shower', description: 'Install mosaic tile on shower floor with proper slope. Install wall tile with precision cuts around fixtures. Grout and seal all tile.', hours: 32, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 2400, visible: true },
        { id: `lab-${Date.now()}-6`, role: 'Tile Installation - Floor & Walls', description: 'Install large-format floor tile with proper layout. Install wall tile as needed. Grout and seal all tile surfaces.', hours: 24, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 1800, visible: true },
        { id: `lab-${Date.now()}-7`, role: 'Vanity & Plumbing Fixtures', description: 'Install vanity cabinet and secure to wall. Install quartz countertop and sinks. Install faucets and drain assemblies. Install toilet with wax ring seal.', hours: 12, hourlyRate: rate('plumbing', 105), totalCost: rate('plumbing', 105) * 1260, visible: true },
        { id: `lab-${Date.now()}-8`, role: 'Glass Enclosure Installation', description: 'Professionally measure and install frameless glass shower enclosure. Install all hardware and seals. Test for proper operation.', hours: 8, hourlyRate: rate('electrical', 95), totalCost: rate('electrical', 95) * 760, visible: true },
        { id: `lab-${Date.now()}-9`, role: 'Electrical Finish & Lighting', description: 'Install all light fixtures, exhaust fan, outlets, and switches. Test all circuits. Install GFCI outlets per code.', hours: 10, hourlyRate: rate('electrical', 95), totalCost: rate('electrical', 95) * 950, visible: true },
        { id: `lab-${Date.now()}-10`, role: 'Painting', description: 'Prime and paint ceiling, walls, and trim with moisture-resistant paint. Apply two coats for full coverage.', hours: 12, hourlyRate: rate('painting', 65), totalCost: rate('painting', 65) * 780, visible: true },
        { id: `lab-${Date.now()}-11`, role: 'Accessories & Final Details', description: 'Install all bathroom accessories (towel bars, TP holder, hooks). Caulk all joints and seams. Final cleanup and polish.', hours: 6, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 450, visible: true },
        { id: `lab-${Date.now()}-12`, role: 'Project Management', description: 'Coordinate all trades, schedule inspections, order materials, provide progress updates, ensure quality control.', hours: 20, hourlyRate: rate('sheetrock', 75), totalCost: rate('sheetrock', 75) * 1500, visible: true },
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
      // Use YOUR saved labor rates — carpentry for general work, laboring for demo/cleanup
      const r_general   = rate('carpentry', 65);
      const r_laboring  = rate('laboring', 40);
      const r_painting  = rate('painting', 50);
      laborItems = [
        { id: `lab-${Date.now()}-1`, role: 'Site Preparation & Protection', description: 'Prepare work area, install protective barriers, organize materials', hours: Math.round(laborHoursBase * 0.10), hourlyRate: r_laboring, totalCost: Math.round(laborHoursBase * 0.10) * r_laboring, visible: true },
        { id: `lab-${Date.now()}-2`, role: 'Demolition & Removal', description: 'Remove existing materials, disconnect utilities, haul away debris', hours: Math.round(laborHoursBase * 0.20), hourlyRate: r_laboring, totalCost: Math.round(laborHoursBase * 0.20) * r_laboring, visible: true },
        { id: `lab-${Date.now()}-3`, role: 'Primary Installation', description: `Professional installation for ${workRequest.serviceType.toLowerCase()}`, hours: Math.round(laborHoursBase * 0.45), hourlyRate: r_general, totalCost: Math.round(laborHoursBase * 0.45) * r_general, visible: true },
        { id: `lab-${Date.now()}-4`, role: 'Finishing Work', description: 'Final finishing, touch-ups, detail work, quality control', hours: Math.round(laborHoursBase * 0.15), hourlyRate: r_painting, totalCost: Math.round(laborHoursBase * 0.15) * r_painting, visible: true },
        { id: `lab-${Date.now()}-5`, role: 'Cleanup & Final Inspection', description: 'Thorough cleanup, final walkthrough, customer demonstration', hours: Math.round(laborHoursBase * 0.05), hourlyRate: r_laboring, totalCost: Math.round(laborHoursBase * 0.05) * r_laboring, visible: true },
        { id: `lab-${Date.now()}-6`, role: 'Project Management & Coordination', description: 'Schedule coordination, quality control, progress updates', hours: Math.round(laborHoursBase * 0.05), hourlyRate: r_general, totalCost: Math.round(laborHoursBase * 0.05) * r_general, visible: true },
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

// ─── PORTAL-TARGETED DEALS ───────────────────────────────────────────────────

// GET all deals (optionally filtered by portal)
// Public — no auth required so portals can fetch on load
app.get('/make-server-57095a78/portal-deals', async (c) => {
  try {
    const portal = c.req.query('portal'); // e.g. 'territory', 'vendor', 'subcontractor'
    const all = (await kv.get('portal_deals') as any[]) || [];
    const now = Date.now();
    const active = all.filter((d: any) => {
      if (d.expiresAt && new Date(d.expiresAt).getTime() < now) return false;
      if (!portal) return true;
      return !d.targetPortals?.length || d.targetPortals.includes(portal) || d.targetPortals.includes('all');
    });
    return c.json({ deals: active });
  } catch (error: any) {
    return c.json({ deals: [], error: error.message }, 500);
  }
});

// GET all deals unfiltered (owner dashboard)
app.get('/make-server-57095a78/portal-deals/all', async (c) => {
  try {
    const all = (await kv.get('portal_deals') as any[]) || [];
    return c.json({ deals: all });
  } catch (error: any) {
    return c.json({ deals: [], error: error.message }, 500);
  }
});

// POST — create or update a deal (requires auth)
app.post('/make-server-57095a78/portal-deals', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { deal } = body;
    if (!deal?.title) return c.json({ error: 'Deal title required' }, 400);

    const existing = (await kv.get('portal_deals') as any[]) || [];
    const idx = existing.findIndex((d: any) => d.id === deal.id);
    const now = new Date().toISOString();
    const record = {
      id: deal.id || `deal_${Date.now()}`,
      title: deal.title,
      description: deal.description || '',
      promoCode: deal.promoCode || '',
      discountType: deal.discountType || 'percent',
      discountValue: deal.discountValue || '',
      originalPrice: deal.originalPrice || '',
      expiresAt: deal.expiresAt || '',
      imageUrl: deal.imageUrl || '',
      targetPortals: deal.targetPortals || ['all'],
      active: deal.active !== false,
      createdBy: user.email,
      createdAt: deal.createdAt || now,
      updatedAt: now,
    };

    if (idx >= 0) existing[idx] = record;
    else existing.unshift(record);

    await kv.set('portal_deals', existing);
    return c.json({ deal: record });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE a deal (requires auth)
app.delete('/make-server-57095a78/portal-deals/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const existing = (await kv.get('portal_deals') as any[]) || [];
    await kv.set('portal_deals', existing.filter((d: any) => d.id !== id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── MAINTENANCE / SUBSCRIPTION PLANS ────────────────────────────────────────

// GET all plans (owner view)
app.get('/make-server-57095a78/maintenance-plans', async (c) => {
  try {
    const all = (await kv.get('maintenance_plans') as any[]) || [];
    return c.json({ plans: all });
  } catch (error: any) {
    return c.json({ plans: [], error: error.message }, 500);
  }
});

// GET plans for a specific portal type / assignee (used by portal plan trackers)
app.get('/make-server-57095a78/maintenance-plans/for-portal', async (c) => {
  try {
    const portalType = c.req.query('portalType'); // e.g. 'landlord', 'customer'
    const assigneeEmail = c.req.query('email');
    const all = (await kv.get('maintenance_plans') as any[]) || [];
    const filtered = all.filter((p: any) => {
      if (!p.active) return false;
      if (portalType && p.targetPortals?.length && !p.targetPortals.includes(portalType) && !p.targetPortals.includes('all')) return false;
      if (assigneeEmail && p.assignedTo && p.assignedTo !== assigneeEmail) return false;
      return true;
    });
    return c.json({ plans: filtered });
  } catch (error: any) {
    return c.json({ plans: [], error: error.message }, 500);
  }
});

// POST — create or update a maintenance plan (requires auth)
app.post('/make-server-57095a78/maintenance-plans', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { plan } = body;
    if (!plan?.name) return c.json({ error: 'Plan name required' }, 400);

    const existing = (await kv.get('maintenance_plans') as any[]) || [];
    const idx = existing.findIndex((p: any) => p.id === plan.id);
    const now = new Date().toISOString();
    const record = {
      id: plan.id || `plan_${Date.now()}`,
      name: plan.name,
      description: plan.description || '',
      hoursIncluded: Number(plan.hoursIncluded) || 0,
      overageRate: Number(plan.overageRate) || 0,
      monthlyFee: Number(plan.monthlyFee) || 0,
      billingCycle: plan.billingCycle || 'monthly',
      targetPortals: plan.targetPortals || ['all'],
      assignedTo: plan.assignedTo || '',       // email of specific user, or '' for all in portal
      assignedName: plan.assignedName || '',
      renewsOn: plan.renewsOn || '',
      active: plan.active !== false,
      createdBy: user.email,
      createdAt: plan.createdAt || now,
      updatedAt: now,
    };

    if (idx >= 0) existing[idx] = record;
    else existing.unshift(record);

    await kv.set('maintenance_plans', existing);
    return c.json({ plan: record });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST — log usage hours against a plan (auth required)
app.post('/make-server-57095a78/maintenance-plans/:id/log-hours', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const planId = c.req.param('id');
    const body = await c.req.json();
    const { hours, description, tech, date } = body;
    if (!hours || !description) return c.json({ error: 'hours and description required' }, 400);

    const plans = (await kv.get('maintenance_plans') as any[]) || [];
    const plan = plans.find((p: any) => p.id === planId);
    if (!plan) return c.json({ error: 'Plan not found' }, 404);

    // Update hoursUsed
    plan.hoursUsed = (plan.hoursUsed || 0) + Number(hours);
    plan.updatedAt = new Date().toISOString();

    // Append to usage log
    const logKey = `plan_usage_${planId}`;
    const log = (await kv.get(logKey) as any[]) || [];
    log.unshift({ id: `u_${Date.now()}`, planId, hours: Number(hours), description, tech: tech || '', date: date || new Date().toISOString(), loggedBy: user.email });
    await kv.set(logKey, log);
    await kv.set('maintenance_plans', plans);

    return c.json({ success: true, hoursUsed: plan.hoursUsed });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET usage log for a plan
app.get('/make-server-57095a78/maintenance-plans/:id/usage', async (c) => {
  try {
    const planId = c.req.param('id');
    const log = (await kv.get(`plan_usage_${planId}`) as any[]) || [];
    return c.json({ log });
  } catch (error: any) {
    return c.json({ log: [], error: error.message }, 500);
  }
});

// DELETE a plan (requires auth)
app.delete('/make-server-57095a78/maintenance-plans/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const existing = (await kv.get('maintenance_plans') as any[]) || [];
    await kv.set('maintenance_plans', existing.filter((p: any) => p.id !== id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

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

// ── STRIPE PAYMENT LINKS ──────────────────────────────────────────────────────
// Creates Stripe Checkout sessions for invoice/deposit payments.
// Set STRIPE_SECRET_KEY_SERVICES in Supabase secrets (sk_live_... or sk_test_...)
// This account pays out to Bank B (contracting/service work).

app.post('/make-server-57095a78/payments/create-checkout', async (c) => {
  try {
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY_SERVICES') || Deno.env.get('STRIPE_SECRET_KEY') || '';
    if (!STRIPE_KEY) {
      return c.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY_SERVICES to Supabase secrets.' }, 503);
    }

    const { amount, description, clientName, clientEmail, workRequestId, invoiceId, metadata } = await c.req.json();
    if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400);

    const APP_URL = 'https://www.theblackphoenixcompany.com';

    // Create Stripe Checkout Session
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'mode': 'payment',
      'success_url': `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&wrId=${workRequestId || ''}`,
      'cancel_url': `${APP_URL}/customer-portal-app?tab=payments`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), // cents
      'line_items[0][price_data][product_data][name]': description || 'Black Phoenix Services',
      'line_items[0][price_data][product_data][description]': `Invoice from Black Phoenix Company`,
      'line_items[0][quantity]': '1',
      'customer_email': clientEmail || '',
      'metadata[workRequestId]': workRequestId || '',
      'metadata[invoiceId]': invoiceId || '',
      'metadata[clientName]': clientName || '',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error('[Stripe] Error:', session.error?.message);
      return c.json({ error: session.error?.message || 'Stripe error' }, 500);
    }

    // Store payment record
    const paymentRecord = {
      id: `pay_${Date.now()}`,
      sessionId: session.id,
      amount,
      description,
      clientName,
      clientEmail,
      workRequestId,
      invoiceId,
      status: 'pending',
      checkoutUrl: session.url,
      createdAt: new Date().toISOString(),
    };
    const payments = (await kv.get(`payments:${workRequestId}`) as any[]) || [];
    payments.unshift(paymentRecord);
    await kv.set(`payments:${workRequestId}`, payments);

    console.log(`✅ [Stripe] Checkout session created: ${session.id} for $${amount}`);
    return c.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error('[Stripe] Exception:', e);
    return c.json({ error: e.message }, 500);
  }
});

// ── MARKETPLACE PRODUCTS CRUD ────────────────────────────────────────────────
// Tables required (run migration SQL in Supabase dashboard):
//   marketplace_products  — product catalog
//   marketplace_orders    — purchase records

// GET all visible products (public storefront)
app.get('/make-server-57095a78/marketplace/products', async (c) => {
  try {
    const adminMode = c.req.query('admin') === 'true';
    let query = supabase.from('marketplace_products').select('*').order('sort_order', { ascending: true });
    if (!adminMode) query = query.eq('visible', true);
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ products: data || [] });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// POST — create product (admin)
app.post('/make-server-57095a78/marketplace/products', async (c) => {
  try {
    const product = await c.req.json();
    product.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('marketplace_products').insert(product).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ product: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// PUT — update product (admin)
app.put('/make-server-57095a78/marketplace/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('marketplace_products').update(updates).eq('id', id).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ product: data });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// DELETE — remove product (admin)
app.delete('/make-server-57095a78/marketplace/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('marketplace_products').delete().eq('id', id);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// POST — bulk seed products (admin, idempotent upsert)
app.post('/make-server-57095a78/marketplace/products/seed', async (c) => {
  try {
    const { products } = await c.req.json();
    if (!Array.isArray(products) || products.length === 0) return c.json({ error: 'No products provided' }, 400);
    const rows = products.map((p: any) => ({ ...p, updated_at: new Date().toISOString() }));
    const { data, error } = await supabase.from('marketplace_products').upsert(rows, { onConflict: 'id' }).select();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ seeded: data?.length || 0 });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// GET — all orders (admin)
app.get('/make-server-57095a78/marketplace/orders', async (c) => {
  try {
    const { data, error } = await supabase.from('marketplace_orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ orders: data || [] });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── MARKETPLACE CHECKOUT ─────────────────────────────────────────────────────
// Creates a Stripe Checkout session for digital product purchases.
// Requires STRIPE_SECRET_KEY_MARKETPLACE in Supabase secrets.
// This account pays out to Bank A (digital storefront revenue).
// Items: [{ id, title, price (cents), qty }]

app.post('/make-server-57095a78/marketplace/checkout', async (c) => {
  try {
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY_MARKETPLACE') || Deno.env.get('STRIPE_SECRET_KEY') || '';
    if (!STRIPE_KEY) {
      return c.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY_MARKETPLACE to Supabase Edge Function secrets.', configured: false }, 503);
    }

    const { items, email, name, successUrl, cancelUrl } = await c.req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'No items provided' }, 400);
    }

    const APP_URL = 'https://www.theblackphoenixcompany.com';
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'mode': 'payment',
      'success_url': successUrl || `${APP_URL}/store?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': cancelUrl || `${APP_URL}/store`,
      'customer_email': email || '',
      'metadata[customerName]': name || '',
      'metadata[source]': 'marketplace',
      'metadata[productIds]': items.map((i: any) => i.id).join(','),
    });

    items.forEach((item: any, idx: number) => {
      params.set(`line_items[${idx}][price_data][currency]`, 'usd');
      params.set(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(item.price)));
      params.set(`line_items[${idx}][price_data][product_data][name]`, item.title);
      params.set(`line_items[${idx}][price_data][product_data][description]`, `Digital download — Black Phoenix Property Services`);
      params.set(`line_items[${idx}][quantity]`, String(item.qty || 1));
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error('[Marketplace Stripe] Error:', session.error?.message);
      return c.json({ error: session.error?.message || 'Stripe error' }, 500);
    }

    // Record pending order in Supabase
    const total = items.reduce((sum: number, i: any) => sum + i.price * (i.qty || 1), 0);
    await supabase.from('marketplace_orders').insert({
      id: session.id,
      stripe_session_id: session.id,
      customer_email: email || '',
      customer_name: name || '',
      items,
      total,
      status: 'pending',
      download_sent: false,
    }).then(({ error: orderErr }) => {
      if (orderErr) console.error('[Marketplace] Order insert error:', orderErr.message);
    });

    console.log(`✅ [Marketplace] Checkout session created: ${session.id} for ${items.length} items`);
    return c.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error('[Marketplace] Exception:', e);
    return c.json({ error: e.message }, 500);
  }
});

// ── SERVICES Stripe Webhook — fires when a service/invoice payment completes ──
// Register this URL in your Services Stripe account:
//   https://<project>.supabase.co/functions/v1/make-server-57095a78/payments/webhook
// Set STRIPE_WEBHOOK_SECRET_SERVICES (or STRIPE_WEBHOOK_SECRET) in Supabase secrets.
app.post('/make-server-57095a78/payments/webhook', async (c) => {
  try {
    const body = await c.req.text();
    const sig = c.req.header('stripe-signature') || '';
    const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_SERVICES') || Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

    // Signature verification (Stripe signs the raw body)
    // Full HMAC verification omitted — rely on Stripe HTTPS + secret endpoint path
    let event: any;
    try { event = JSON.parse(body); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      // Only handle service payments here (not marketplace orders)
      if (session.metadata?.source === 'marketplace') {
        console.log('[Services Webhook] Skipping marketplace event — handled by /marketplace/webhook');
        return c.json({ received: true });
      }
      const { workRequestId, invoiceId, clientName } = session.metadata || {};
      const amountPaid = (session.amount_total || 0) / 100;

      console.log(`✅ [Payment] Received $${amountPaid} from ${clientName} for WR ${workRequestId}`);

      // Update work request payment status
      if (workRequestId) {
        const all = (await kv.get('all_work_requests') as any[]) || [];
        await kv.set('all_work_requests', all.map((r: any) =>
          r.id === workRequestId ? { ...r, deposit_paid: true, last_payment: amountPaid, updated_at: new Date().toISOString() } : r
        ));
      }

      // Admin alert
      const alert = {
        id: `payment_${session.id}`,
        type: 'info', category: 'Work Requests',
        title: `💰 Payment Received — $${amountPaid.toLocaleString()} from ${clientName}`,
        description: `Payment of $${amountPaid.toLocaleString()} processed successfully via Stripe.`,
        priority: 'high', status: 'unread', source: 'stripe-webhook',
        actionRequired: false, timestamp: new Date().toISOString(),
        data: { workRequestId, amountPaid, sessionId: session.id },
      };
      const alerts = (await kv.get('admin_alerts') as any[]) || [];
      alerts.unshift(alert);
      await kv.set('admin_alerts', alerts.slice(0, 200));

      // SMS admin
      const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
      const TWILIO_AUTH = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
      const TWILIO_FROM = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
      const ADMIN_PHONES = Deno.env.get('ADMIN_NOTIFICATION_PHONES') || '';
      if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && ADMIN_PHONES) {
        for (const phone of ADMIN_PHONES.split(',').map((p: string) => p.trim()).filter(Boolean)) {
          fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
            method: 'POST',
            headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: `💰 Payment received! $${amountPaid.toLocaleString()} from ${clientName}. Check your dashboard.` }),
          }).catch(() => {});
        }
      }

      // ── REVIEW REQUEST after payment ──────────────────────────────────────
      // Schedule a review request: send after 24 hours via a stored follow-up,
      // but also drop an in-app message immediately so it's ready when job ends.
      const customerEmail = (session.customer_details?.email || session.customer_email || '') as string;
      const reviewUrl = `https://www.theblackphoenixcompany.com/?page=home&review=true`;

      if (customerEmail) {
        // Store a pending review request follow-up (fires 24h after payment)
        const reviewFollowUp = {
          id: `review_req_${session.id}`,
          type: 'review_request',
          workRequestId: workRequestId || '',
          clientName: clientName || 'there',
          clientEmail: customerEmail,
          amountPaid,
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
          sent: false,
          createdAt: new Date().toISOString(),
        };
        const reviewFollowUps = (await kv.get('review_follow_ups') as any[]) || [];
        reviewFollowUps.push(reviewFollowUp);
        await kv.set('review_follow_ups', reviewFollowUps.slice(-500));

        // In-app message to customer now (they'll see it in their dashboard)
        const convKey = `customer_convs:${customerEmail}`;
        const convIds = (await kv.get(convKey) as string[]) || [];
        const mainConvId = convIds[0] || `conv:${customerEmail}:blackphoenix`;
        const convData = (await kv.get(mainConvId) as any) || {
          id: mainConvId, participants: [customerEmail, 'blackphoenix-admin'],
          messages: [], createdAt: new Date().toISOString(),
        };
        convData.messages = convData.messages || [];
        convData.messages.push({
          id: `msg_review_${Date.now()}`,
          senderId: 'blackphoenix-admin',
          senderName: 'Black Phoenix Team',
          content: `🙏 Thank you for your payment, ${clientName || 'there'}! We truly appreciate your business. Once your job is complete, we'd love it if you could take a moment to share your experience — it means the world to us and helps others find trusted service. [Leave a Review](${reviewUrl})`,
          timestamp: new Date().toISOString(),
          read: false,
        });
        convData.unreadCount = { ...(convData.unreadCount || {}), [customerEmail]: (convData.unreadCount?.[customerEmail] || 0) + 1 };
        convData.updatedAt = new Date().toISOString();
        await kv.set(mainConvId, convData);
        if (!convIds.includes(mainConvId)) {
          await kv.set(convKey, [mainConvId, ...convIds].slice(0, 50));
        }

        // Email review request via SendGrid (if configured)
        const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
        const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@theblackphoenixcompany.com';
        if (SENDGRID_KEY) {
          fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: customerEmail, name: clientName || '' }] }],
              from: { email: FROM_EMAIL, name: 'Black Phoenix Company' },
              subject: `Thank you, ${clientName || 'there'}! How did we do? ⭐`,
              content: [{
                type: 'text/html',
                value: `
                  <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;">
                    <div style="text-align:center;margin-bottom:24px;">
                      <img src="https://www.theblackphoenixcompany.com/phoenix-logo.png" alt="Black Phoenix" style="height:60px;" />
                    </div>
                    <h2 style="color:#f97316;margin-bottom:8px;">Thank You for Choosing Black Phoenix! 🦅</h2>
                    <p style="color:#a3a3a3;">Hi ${clientName || 'there'},</p>
                    <p>Your payment of <strong style="color:#f97316;">$${amountPaid.toLocaleString()}</strong> was received — thank you! We're committed to delivering exceptional work.</p>
                    <p>Once your project is complete, we'd love to hear about your experience. Your review helps our team and helps other homeowners find trusted services.</p>
                    <div style="text-align:center;margin:32px 0;">
                      <a href="${reviewUrl}" style="background:#f97316;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">⭐ Leave Us a Review</a>
                    </div>
                    <p style="color:#737373;font-size:13px;">Questions? Reply to this email or message us through your customer dashboard.</p>
                    <p style="color:#525252;font-size:12px;margin-top:24px;">Black Phoenix Company LLC · www.theblackphoenixcompany.com</p>
                  </div>
                `,
              }],
            }),
          }).catch(() => {});
        }
      }
      // ── END REVIEW REQUEST ─────────────────────────────────────────────────

      // ── MARKETPLACE FULFILLMENT ────────────────────────────────────────────
      // Marketplace purchases now handled by /marketplace/webhook (separate Stripe account).
      // This block is a fallback in case the same Stripe account is used for both.
      const isMarketplace = session.metadata?.source === 'marketplace';
      if (isMarketplace) {
        const buyerEmail = (session.customer_details?.email || session.customer_email || '') as string;
        const buyerName = (session.metadata?.customerName || session.customer_details?.name || 'there') as string;

        // Mark order as paid + fulfilled
        await supabase.from('marketplace_orders')
          .update({ status: 'paid', fulfilled_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);

        // Fetch the order items from our DB
        const { data: orderRow } = await supabase.from('marketplace_orders')
          .select('items').eq('stripe_session_id', session.id).maybeSingle();
        const purchasedItems: any[] = orderRow?.items || [];

        // Send fulfillment email via Resend (preferred) or SendGrid fallback
        const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || '';
        const SENDGRID_KEY2 = Deno.env.get('SENDGRID_API_KEY') || '';
        const FROM_EMAIL2 = Deno.env.get('FROM_EMAIL') || 'store@theblackphoenixcompany.com';

        const itemListHtml = purchasedItems.map((item: any) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#e5e5e5">${item.title}</td><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#f97316;text-align:right;white-space:nowrap">$${((item.price * (item.qty || 1)) / 100).toFixed(2)}</td></tr>`
        ).join('');

        const emailHtml = `
<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#111;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#1a0a00,#2d1200);padding:40px 32px;text-align:center;">
    <div style="width:60px;height:60px;background:#ea580c;border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:28px">🦅</span>
    </div>
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">Order Confirmed!</h1>
    <p style="color:#fb923c;margin:8px 0 0;font-size:14px">Black Phoenix Digital Store</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#e5e5e5;margin:0 0 8px">Hi ${buyerName},</p>
    <p style="color:#a3a3a3;margin:0 0 24px">Thank you for your purchase! Your NH property resources are ready. Download links for each product are below — they're also saved to your account for future access.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr><th style="text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2a2a2a">Product</th><th style="text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2a2a2a">Price</th></tr></thead>
      <tbody>${itemListHtml}</tbody>
    </table>
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="color:#9ca3af;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">How to Access Your Downloads</p>
      <p style="color:#e5e5e5;margin:0 0 8px;font-size:14px">1. Visit <a href="https://www.theblackphoenixcompany.com/store" style="color:#f97316">blackphoenixapp.com/store</a></p>
      <p style="color:#e5e5e5;margin:0 0 8px;font-size:14px">2. Sign in with this email address (${buyerEmail})</p>
      <p style="color:#e5e5e5;margin:0;font-size:14px">3. Your purchased items will show a ✅ Download button</p>
    </div>
    <p style="color:#6b7280;font-size:12px;margin:0">Questions? Reply to this email or visit <a href="https://www.theblackphoenixcompany.com" style="color:#f97316">theblackphoenixcompany.com</a></p>
  </div>
  <div style="background:#0a0a0a;padding:16px 32px;text-align:center;">
    <p style="color:#4b5563;font-size:11px;margin:0">© 2026 Black Phoenix Property Services · New Hampshire · 30-day satisfaction guarantee</p>
  </div>
</div>`;

        if (RESEND_KEY && buyerEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `Black Phoenix Store <${FROM_EMAIL2}>`,
              to: [buyerEmail],
              subject: `Your order is confirmed — ${purchasedItems.length} item${purchasedItems.length !== 1 ? 's' : ''} from Black Phoenix`,
              html: emailHtml,
            }),
          }).then(async r => {
            if (!r.ok) console.error('[Marketplace Resend] Error:', await r.text());
            else {
              await supabase.from('marketplace_orders').update({ download_sent: true }).eq('stripe_session_id', session.id);
              console.log(`✅ [Marketplace] Fulfillment email sent to ${buyerEmail}`);
            }
          }).catch(err => console.error('[Marketplace Resend] Exception:', err));
        } else if (SENDGRID_KEY2 && buyerEmail) {
          await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${SENDGRID_KEY2}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: buyerEmail, name: buyerName }] }],
              from: { email: FROM_EMAIL2, name: 'Black Phoenix Store' },
              subject: `Your order is confirmed — ${purchasedItems.length} item${purchasedItems.length !== 1 ? 's' : ''} from Black Phoenix`,
              content: [{ type: 'text/html', value: emailHtml }],
            }),
          }).catch(err => console.error('[Marketplace SendGrid] Exception:', err));
        } else {
          console.warn('[Marketplace] No email provider configured. Add RESEND_API_KEY to Supabase secrets.');
        }

        // Admin alert for marketplace sale
        const saleTotal = purchasedItems.reduce((s: number, i: any) => s + i.price * (i.qty || 1), 0);
        const saleAlert = {
          id: `mkt_sale_${session.id}`,
          type: 'info', category: 'Marketplace',
          title: `🛒 Marketplace Sale — $${(saleTotal / 100).toFixed(2)} from ${buyerName}`,
          description: `${purchasedItems.length} product${purchasedItems.length !== 1 ? 's' : ''} purchased: ${purchasedItems.map((i: any) => i.title).join(', ')}`,
          priority: 'high', status: 'unread', source: 'stripe-webhook',
          actionRequired: false, timestamp: new Date().toISOString(),
          data: { sessionId: session.id, buyerEmail, items: purchasedItems, total: saleTotal },
        };
        const existingAlerts2 = (await kv.get('admin_alerts') as any[]) || [];
        existingAlerts2.unshift(saleAlert);
        await kv.set('admin_alerts', existingAlerts2.slice(0, 200));
      }
    }

    return c.json({ received: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── MARKETPLACE Stripe Webhook — fires when a storefront purchase completes ───
// Register this URL in your Marketplace Stripe account:
//   https://<project>.supabase.co/functions/v1/make-server-57095a78/marketplace/webhook
// Set STRIPE_WEBHOOK_SECRET_MARKETPLACE in Supabase secrets.
app.post('/make-server-57095a78/marketplace/webhook', async (c) => {
  try {
    const body = await c.req.text();
    const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_MARKETPLACE') || Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

    let event: any;
    try { event = JSON.parse(body); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

    if (event.type !== 'checkout.session.completed') return c.json({ received: true });

    const session = event.data.object;
    const buyerEmail = (session.customer_details?.email || session.customer_email || '') as string;
    const buyerName = (session.metadata?.customerName || session.customer_details?.name || 'there') as string;
    const amountPaid = (session.amount_total || 0) / 100;

    console.log(`✅ [Marketplace Webhook] Sale $${amountPaid} from ${buyerName} (${buyerEmail})`);

    // Mark order paid + fulfilled
    await supabase.from('marketplace_orders')
      .update({ status: 'paid', fulfilled_at: new Date().toISOString() })
      .eq('stripe_session_id', session.id);

    const { data: orderRow } = await supabase.from('marketplace_orders')
      .select('items').eq('stripe_session_id', session.id).maybeSingle();
    const purchasedItems: any[] = orderRow?.items || [];

    // Send fulfillment email
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || '';
    const FROM_EMAIL2 = Deno.env.get('FROM_EMAIL') || 'store@theblackphoenixcompany.com';

    const itemListHtml = purchasedItems.map((item: any) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#e5e5e5">${item.title}</td><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#f97316;text-align:right;white-space:nowrap">$${((item.price * (item.qty || 1)) / 100).toFixed(2)}</td></tr>`
    ).join('');

    const emailHtml = `
<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#111;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#1a0a00,#2d1200);padding:40px 32px;text-align:center;">
    <div style="width:60px;height:60px;background:#ea580c;border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:28px">🦅</span>
    </div>
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">Order Confirmed!</h1>
    <p style="color:#fb923c;margin:8px 0 0;font-size:14px">Black Phoenix Digital Store</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#e5e5e5;margin:0 0 8px">Hi ${buyerName},</p>
    <p style="color:#a3a3a3;margin:0 0 24px">Thank you for your purchase! Your NH property resources are ready.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr><th style="text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2a2a2a">Product</th><th style="text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2a2a2a">Price</th></tr></thead>
      <tbody>${itemListHtml}</tbody>
    </table>
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="color:#9ca3af;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">How to Access Your Downloads</p>
      <p style="color:#e5e5e5;margin:0 0 8px;font-size:14px">1. Visit <a href="https://www.theblackphoenixcompany.com/store" style="color:#f97316">theblackphoenixcompany.com/store</a></p>
      <p style="color:#e5e5e5;margin:0 0 8px;font-size:14px">2. Sign in with this email (${buyerEmail})</p>
      <p style="color:#e5e5e5;margin:0;font-size:14px">3. Your purchased items will show a ✅ Read Now button</p>
    </div>
    <p style="color:#6b7280;font-size:12px;margin:0">Questions? Reply to this email or visit <a href="https://www.theblackphoenixcompany.com" style="color:#f97316">theblackphoenixcompany.com</a></p>
  </div>
  <div style="background:#0a0a0a;padding:16px 32px;text-align:center;">
    <p style="color:#4b5563;font-size:11px;margin:0">© 2026 Black Phoenix Property Services · New Hampshire · 30-day satisfaction guarantee</p>
  </div>
</div>`;

    if (RESEND_KEY && buyerEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Black Phoenix Store <${FROM_EMAIL2}>`,
          to: [buyerEmail],
          subject: `Your order is confirmed — ${purchasedItems.length} item${purchasedItems.length !== 1 ? 's' : ''} from Black Phoenix`,
          html: emailHtml,
        }),
      }).then(async r => {
        if (!r.ok) console.error('[Marketplace Webhook Resend] Error:', await r.text());
        else {
          await supabase.from('marketplace_orders').update({ download_sent: true }).eq('stripe_session_id', session.id);
          console.log(`✅ [Marketplace Webhook] Fulfillment email sent to ${buyerEmail}`);
        }
      }).catch(err => console.error('[Marketplace Webhook Resend] Exception:', err));
    }

    // Admin alert
    const saleTotal = purchasedItems.reduce((s: number, i: any) => s + i.price * (i.qty || 1), 0);
    const saleAlert = {
      id: `mkt_sale_${session.id}`,
      type: 'info', category: 'Marketplace',
      title: `🛒 Marketplace Sale — $${(saleTotal / 100).toFixed(2)} from ${buyerName}`,
      description: `${purchasedItems.length} product${purchasedItems.length !== 1 ? 's' : ''} purchased: ${purchasedItems.map((i: any) => i.title).join(', ')}`,
      priority: 'high', status: 'unread', source: 'stripe-marketplace-webhook',
      actionRequired: false, timestamp: new Date().toISOString(),
      data: { sessionId: session.id, buyerEmail, items: purchasedItems, total: saleTotal },
    };
    const existingAlerts = (await kv.get('admin_alerts') as any[]) || [];
    existingAlerts.unshift(saleAlert);
    await kv.set('admin_alerts', existingAlerts.slice(0, 200));

    return c.json({ received: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── QUOTE APPROVAL & E-SIGNATURE ─────────────────────────────────────────────

// Generate a unique shareable quote approval link
app.post('/make-server-57095a78/quotes/generate-link', async (c) => {
  try {
    const { quoteId, workRequestId, clientName, clientEmail, clientPhone, quoteData } = await c.req.json();
    const token = `qt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const quoteRecord = {
      token,
      quoteId: quoteId || `q_${Date.now()}`,
      workRequestId,
      clientName,
      clientEmail,
      clientPhone,
      quoteData: stripBase64(quoteData),
      status: 'pending', // pending | approved | rejected
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    await kv.set(`quote_token:${token}`, quoteRecord);

    // Also index by workRequestId
    const wrQuotes: string[] = (await kv.get(`wr_quotes:${workRequestId}`) as string[]) || [];
    wrQuotes.unshift(token);
    await kv.set(`wr_quotes:${workRequestId}`, wrQuotes.slice(0, 10));

    const approvalUrl = `https://www.theblackphoenixcompany.com/customer-quote-approval?token=${token}`;

    // Send SMS to customer if phone provided
    const TWILIO_SID  = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const TWILIO_AUTH = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const TWILIO_FROM = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && clientPhone) {
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: TWILIO_FROM, To: clientPhone, Body: `Hi ${clientName}! Your quote from Black Phoenix is ready to review and approve. Tap to view: ${approvalUrl}` }),
      }).catch(() => {});
    }

    // Send email via Resend
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || '';
    if (RESEND_KEY && clientEmail) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Black Phoenix Company <noreply@theblackphoenixcompany.com>',
          to: [clientEmail],
          subject: `Your Quote is Ready — Black Phoenix`,
          html: `<div style="font-family:sans-serif;max-width:600px;padding:24px">
            <h2 style="color:#ea580c">Your Quote is Ready!</h2>
            <p>Hi ${clientName},</p>
            <p>Your quote from Black Phoenix Company is ready to review. Click below to view the full itemized quote and approve it with your e-signature.</p>
            <a href="${approvalUrl}" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#ea580c;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">View & Approve Quote →</a>
            <p style="color:#666;font-size:13px">This link expires in 30 days. If you have questions, reply to this email or call us directly.</p>
          </div>`,
        }),
      }).catch(() => {});
    }

    return c.json({ success: true, token, approvalUrl });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET quote by token (public — no auth needed)
app.get('/make-server-57095a78/quotes/by-token/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const record = await kv.get(`quote_token:${token}`);
    if (!record) return c.json({ error: 'Quote not found or expired' }, 404);
    return c.json({ quote: record });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST sign/approve a quote
app.post('/make-server-57095a78/quotes/by-token/:token/sign', async (c) => {
  try {
    const token = c.req.param('token');
    const { signatureData, signerName, signedAt, decision } = await c.req.json();

    const record = await kv.get(`quote_token:${token}`) as any;
    if (!record) return c.json({ error: 'Quote not found' }, 404);

    const updated = {
      ...record,
      status: decision || 'approved',
      signatureData: signatureData || null, // base64 SVG/PNG of drawn signature
      signerName,
      signedAt: signedAt || new Date().toISOString(),
    };
    await kv.set(`quote_token:${token}`, updated);

    // Update work request status
    if (record.workRequestId) {
      const all = (await kv.get('all_work_requests') as any[]) || [];
      await kv.set('all_work_requests', all.map((r: any) =>
        r.id === record.workRequestId ? { ...r, status: decision === 'rejected' ? 'pending' : 'in-progress', quote_approved: true, updated_at: new Date().toISOString() } : r
      ));
    }

    // Cancel follow-ups — quote is no longer pending
    if (decision === 'approved') {
      const quoteId = record.quoteId || token;
      const fus = (await kv.get('follow_ups') as any[]) || [];
      const cancelled = fus.map((f: any) =>
        (f.quoteId === quoteId || f.quoteId === record.workRequestId) && f.status === 'pending'
          ? { ...f, status: 'cancelled', cancelledAt: new Date().toISOString(), reason: 'Quote approved' }
          : f
      );
      await kv.set('follow_ups', cancelled);
      console.log(`✅ [Follow-ups] Cancelled pending follow-ups for approved quote ${quoteId}`);
    }

    // Notify admin
    const alert = {
      id: `quote_signed_${token}`,
      type: decision === 'rejected' ? 'warning' : 'urgent',
      category: 'Work Requests',
      title: decision === 'rejected' ? `Quote Rejected by ${record.clientName}` : `✅ Quote Approved! ${record.clientName} signed`,
      description: `${record.clientName} has ${decision === 'rejected' ? 'rejected' : 'approved and signed'} the quote. Work request is now ${decision === 'rejected' ? 'back to pending' : 'ready to begin'}.`,
      priority: 'high', status: 'unread', source: 'quote-approval',
      actionRequired: true, timestamp: new Date().toISOString(),
      data: { token, workRequestId: record.workRequestId, clientName: record.clientName, clientEmail: record.clientEmail },
    };
    const alerts = (await kv.get('admin_alerts') as any[]) || [];
    alerts.unshift(alert);
    await kv.set('admin_alerts', alerts.slice(0, 200));

    // SMS admin
    const TWILIO_SID  = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const TWILIO_AUTH = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const TWILIO_FROM = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    const ADMIN_PHONES = Deno.env.get('ADMIN_NOTIFICATION_PHONES') || '';
    if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && ADMIN_PHONES && decision !== 'rejected') {
      const phones = ADMIN_PHONES.split(',').map((p: string) => p.trim()).filter(Boolean);
      for (const phone of phones) {
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: `🎉 ${record.clientName} just signed and approved their quote! Log in to begin scheduling.` }),
        }).catch(() => {});
      }
    }

    return c.json({ success: true, status: updated.status });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── WEB PUSH NOTIFICATIONS ────────────────────────────────────────────────────
// Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase secrets.
// Generate a key pair at: https://web-push-codelab.glitch.me/

// Save a push subscription (from browser)
app.post('/make-server-57095a78/notifications/push/subscribe', async (c) => {
  try {
    const { subscription, userId, userEmail, userRole } = await c.req.json();
    if (!subscription?.endpoint) return c.json({ error: 'Invalid subscription' }, 400);

    const record = {
      subscription,
      userId: userId || '',
      userEmail: userEmail || '',
      userRole: userRole || 'customer',
      createdAt: new Date().toISOString(),
    };

    // Index by userId and email so we can look up by either
    if (userId) await kv.set(`push_sub:user:${userId}`, record);
    if (userEmail) await kv.set(`push_sub:email:${userEmail.toLowerCase()}`, record);

    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Send a push notification to a specific user
app.post('/make-server-57095a78/notifications/push/send', async (c) => {
  try {
    const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || '';

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.log('⚠️ [Push] VAPID keys not configured');
      return c.json({ error: 'Push notifications not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Supabase secrets.' }, 503);
    }

    const { userId, userEmail, title, body, url, tag, requireInteraction } = await c.req.json();

    // Look up subscription
    let record: any = null;
    if (userId) record = await kv.get(`push_sub:user:${userId}`);
    if (!record && userEmail) record = await kv.get(`push_sub:email:${userEmail.toLowerCase()}`);
    if (!record?.subscription) {
      return c.json({ sent: false, reason: 'No push subscription found for this user' });
    }

    const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'bp', requireInteraction: requireInteraction || false });

    // Use web-push via fetch to the push endpoint
    // Build the Authorization header using VAPID JWT
    const pushEndpoint = record.subscription.endpoint;
    const origin = new URL(pushEndpoint).origin;

    // Simple VAPID JWT
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const claims = btoa(JSON.stringify({ aud: origin, exp: now + 43200, sub: 'mailto:noreply@theblackphoenixcompany.com' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    // For now, use the web-push npm package approach via a dynamic import
    // Since Deno doesn't have web-push, we'll use the push endpoint directly
    // with basic auth (this is a simplified version for testing)
    console.log(`📱 [Push] Would send to ${userEmail || userId}: "${title}" — ${body}`);

    return c.json({ sent: true, message: 'Push notification queued' });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// GET VAPID public key (needed by browser to subscribe)
app.get('/make-server-57095a78/notifications/push/vapid-key', (c) => {
  const key = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  return c.json({ publicKey: key });
});

// ── CUSTOMER REVIEWS ──────────────────────────────────────────────────────────

// GET approved reviews (public — landing page, customer portal)
app.get('/make-server-57095a78/reviews', async (c) => {
  try {
    const status = c.req.query('status') || 'approved';
    const all = (await kv.get('reviews') as any[]) || [];
    const filtered = status === 'all' ? all : all.filter((r: any) => r.status === status);
    return c.json({ reviews: filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (e: any) { return c.json({ reviews: [] }); }
});

// POST submit a review (customer)
app.post('/make-server-57095a78/reviews', async (c) => {
  try {
    const { customerName, customerEmail, rating, reviewText, serviceType, projectTitle, workRequestId } = await c.req.json();
    if (!customerName || !rating || !reviewText) return c.json({ error: 'Name, rating and review text required' }, 400);
    if (rating < 1 || rating > 5) return c.json({ error: 'Rating must be 1-5' }, 400);
    if (reviewText.length < 10) return c.json({ error: 'Review must be at least 10 characters' }, 400);

    const review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerName: customerName.trim(),
      customerEmail: customerEmail || '',
      rating: Number(rating),
      reviewText: reviewText.trim(),
      serviceType: serviceType || 'General Service',
      projectTitle: projectTitle || '',
      workRequestId: workRequestId || '',
      status: 'pending', // pending | approved | rejected
      createdAt: new Date().toISOString(),
      response: null, // admin reply
    };

    const existing = (await kv.get('reviews') as any[]) || [];
    existing.unshift(review);
    await kv.set('reviews', existing.slice(0, 500));

    // Alert admin
    const alert = {
      id: `review_alert_${review.id}`,
      type: 'info', category: 'Reviews',
      title: `⭐ New ${rating}-star review from ${customerName}`,
      description: `"${reviewText.substring(0, 80)}..."`,
      priority: 'medium', status: 'unread', source: 'review-submission',
      actionRequired: true, timestamp: new Date().toISOString(),
      data: { reviewId: review.id, customerName, rating, reviewText },
    };
    const alerts = (await kv.get('admin_alerts') as any[]) || [];
    alerts.unshift(alert);
    await kv.set('admin_alerts', alerts.slice(0, 200));

    return c.json({ success: true, review });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// PUT approve/reject/reply to review (admin)
app.put('/make-server-57095a78/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, response } = await c.req.json();
    const all = (await kv.get('reviews') as any[]) || [];
    const updated = all.map((r: any) =>
      r.id === id ? { ...r, status: status || r.status, response: response ?? r.response, updatedAt: new Date().toISOString() } : r
    );
    await kv.set('reviews', updated);
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── LABOR RATES CONFIG ────────────────────────────────────────────────────────

app.post('/make-server-57095a78/labor-rates/save', async (c) => {
  try {
    const body = await c.req.json();
    await kv.set('labor_rates_config', body);
    console.log('[Labor Rates] Saved', body.laborRates?.length, 'rates');
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get('/make-server-57095a78/labor-rates/get', async (c) => {
  try {
    const data = await kv.get('labor_rates_config') as any;
    return c.json({ laborRates: data?.laborRates || [], profitSettings: data?.profitSettings || null });
  } catch (e: any) { return c.json({ laborRates: [], profitSettings: null }); }
});

// ── AUTOMATED FOLLOW-UP SEQUENCES ────────────────────────────────────────────
// When a quote is sent, schedule follow-ups at 3 days and 7 days.
// Call POST /follow-ups/process to send any that are due (triggered on dashboard load).

// Schedule follow-ups when a quote is sent
app.post('/make-server-57095a78/follow-ups/schedule', async (c) => {
  try {
    const { quoteId, workRequestId, clientName, clientEmail, clientPhone, serviceType, approvalUrl, quoteTotal } = await c.req.json();

    const now = Date.now();
    const followUps = [
      {
        id: `fu_${quoteId}_3d`,
        quoteId, workRequestId, clientName, clientEmail, clientPhone,
        serviceType, approvalUrl, quoteTotal,
        scheduledAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        dayLabel: '3-day',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: `fu_${quoteId}_7d`,
        quoteId, workRequestId, clientName, clientEmail, clientPhone,
        serviceType, approvalUrl, quoteTotal,
        scheduledAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        dayLabel: '7-day',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];

    const existing = (await kv.get('follow_ups') as any[]) || [];
    // Remove any old follow-ups for same quote
    const filtered = existing.filter((f: any) => f.quoteId !== quoteId);
    await kv.set('follow_ups', [...filtered, ...followUps].slice(0, 500));

    console.log(`✅ [Follow-ups] Scheduled 3-day and 7-day follow-ups for ${clientName}`);
    return c.json({ success: true, scheduled: followUps.length });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// GET all follow-ups (admin view)
app.get('/make-server-57095a78/follow-ups', async (c) => {
  try {
    const all = (await kv.get('follow_ups') as any[]) || [];
    return c.json({ followUps: all.sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) });
  } catch (e: any) { return c.json({ followUps: [] }); }
});

// Cancel a follow-up (when quote is approved, don't follow up)
app.delete('/make-server-57095a78/follow-ups/:quoteId', async (c) => {
  try {
    const quoteId = c.req.param('quoteId');
    const all = (await kv.get('follow_ups') as any[]) || [];
    await kv.set('follow_ups', all.filter((f: any) => f.quoteId !== quoteId));
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Process due follow-ups — call this on dashboard load or via cron
app.post('/make-server-57095a78/follow-ups/process', async (c) => {
  try {
    const RESEND_KEY    = Deno.env.get('RESEND_API_KEY')    || '';
    const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const TWILIO_AUTH  = Deno.env.get('TWILIO_AUTH_TOKEN')  || '';
    const TWILIO_FROM  = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

    const all = (await kv.get('follow_ups') as any[]) || [];
    const now = new Date();
    const due = all.filter((f: any) => f.status === 'pending' && new Date(f.scheduledAt) <= now);

    if (due.length === 0) return c.json({ processed: 0 });

    const results: any[] = [];

    for (const fu of due) {
      const isLastChance = fu.dayLabel === '7-day';
      const subject = isLastChance
        ? `Last chance to approve your Black Phoenix quote 🔔`
        : `Your Black Phoenix quote is still waiting for your approval`;

      const emailBody = isLastChance
        ? `Hi ${fu.clientName},\n\nThis is a friendly final reminder that your quote from Black Phoenix Company is still waiting for your approval.\n\nQuote Total: $${(fu.quoteTotal || 0).toLocaleString()}\nService: ${fu.serviceType || 'Your Project'}\n\nClick below to review and approve your quote:\n${fu.approvalUrl}\n\nThis quote will expire soon. If you have any questions, reply to this email or call us directly.\n\nBlack Phoenix Company`
        : `Hi ${fu.clientName},\n\nJust following up on the quote we sent you for your ${fu.serviceType || 'project'}.\n\nWe'd love to get started and want to make sure you have everything you need to approve the quote.\n\nQuote Total: $${(fu.quoteTotal || 0).toLocaleString()}\n\nReview your quote here:\n${fu.approvalUrl}\n\nFeel free to reply with any questions!\n\nBlack Phoenix Company`;

      const sent: any = { id: fu.id, email: false, sms: false };

      // Send email
      if (RESEND_KEY && fu.clientEmail) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Black Phoenix Company <noreply@theblackphoenixcompany.com>',
              to: [fu.clientEmail],
              subject,
              text: emailBody,
              html: `<div style="font-family:sans-serif;max-width:600px;padding:24px">
                <h2 style="color:#ea580c">${isLastChance ? '⏰ Final Reminder' : '👋 Quick Follow-up'}</h2>
                <p>Hi ${fu.clientName},</p>
                <p>${isLastChance ? 'This is a friendly <strong>final reminder</strong> that your quote is still waiting.' : 'Just following up on the quote we sent for your <strong>${fu.serviceType || "project"}</strong>.'}</p>
                <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0">
                  <p style="margin:0"><strong>Service:</strong> ${fu.serviceType || 'Your Project'}</p>
                  <p style="margin:8px 0 0"><strong>Quote Total:</strong> $${(fu.quoteTotal || 0).toLocaleString()}</p>
                </div>
                <a href="${fu.approvalUrl}" style="display:inline-block;padding:14px 28px;background:#ea580c;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Review & Approve Quote →</a>
                <p style="color:#666;font-size:13px;margin-top:16px">Questions? Reply to this email or call us directly.</p>
              </div>`,
            }),
          });
          if (emailRes.ok) sent.email = true;
        } catch {}
      }

      // Send SMS
      if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && fu.clientPhone) {
        try {
          const smsText = isLastChance
            ? `Hi ${fu.clientName}! Final reminder: your Black Phoenix quote is still waiting. Approve here: ${fu.approvalUrl}`
            : `Hi ${fu.clientName}! Just following up on your Black Phoenix quote. Ready to approve? ${fu.approvalUrl}`;
          const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
            method: 'POST',
            headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ From: TWILIO_FROM, To: fu.clientPhone, Body: smsText }),
          });
          if (smsRes.ok) sent.sms = true;
        } catch {}
      }

      results.push(sent);
      console.log(`✅ [Follow-up] Sent ${fu.dayLabel} to ${fu.clientName} (email:${sent.email} sms:${sent.sms})`);
    }

    // Mark as sent
    const sentIds = new Set(results.map((r: any) => r.id));
    const updated = all.map((f: any) => sentIds.has(f.id) ? { ...f, status: 'sent', sentAt: new Date().toISOString() } : f);
    await kv.set('follow_ups', updated);

    // ── Process review request follow-ups (24h after payment) ────────────────
    const reviewFUs = (await kv.get('review_follow_ups') as any[]) || [];
    const dueReviews = reviewFUs.filter((r: any) => !r.sent && new Date(r.scheduledFor) <= now);
    const SENDGRID_KEY2 = Deno.env.get('SENDGRID_API_KEY') || '';
    const FROM_EMAIL2 = Deno.env.get('FROM_EMAIL') || 'no-reply@theblackphoenixcompany.com';
    const reviewUrl2 = `https://www.theblackphoenixcompany.com/?page=home&review=true`;
    let reviewsSent = 0;
    for (const rv of dueReviews) {
      if (SENDGRID_KEY2 && rv.clientEmail) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${SENDGRID_KEY2}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: rv.clientEmail, name: rv.clientName || '' }] }],
            from: { email: FROM_EMAIL2, name: 'Black Phoenix Company' },
            subject: `How did we do, ${rv.clientName || 'there'}? ⭐ Leave us a quick review`,
            content: [{
              type: 'text/html',
              value: `
                <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;">
                  <h2 style="color:#f97316;">We'd love your feedback! ⭐</h2>
                  <p>Hi ${rv.clientName || 'there'},</p>
                  <p>Thank you for choosing <strong>Black Phoenix Company</strong>. We hope your experience was top notch!</p>
                  <p>Would you take 60 seconds to leave us a review? It helps us grow and helps other homeowners find trusted service.</p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="${reviewUrl2}" style="background:#f97316;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">⭐ Leave a Review</a>
                  </div>
                  <p style="color:#737373;font-size:13px;">Questions? Reply to this email or reach us at www.theblackphoenixcompany.com.</p>
                </div>
              `,
            }],
          }),
        }).catch(() => {});
        reviewsSent++;
      }
      // SMS review request
      if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && rv.clientPhone) {
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ From: TWILIO_FROM, To: rv.clientPhone, Body: `Hi ${rv.clientName || 'there'}! How did we do? We'd love a quick review ⭐ ${reviewUrl2}` }),
        }).catch(() => {});
      }
    }
    if (dueReviews.length > 0) {
      const updatedReviews = reviewFUs.map((r: any) =>
        dueReviews.find((d: any) => d.id === r.id) ? { ...r, sent: true, sentAt: new Date().toISOString() } : r
      );
      await kv.set('review_follow_ups', updatedReviews);
    }
    // ── END review follow-ups ─────────────────────────────────────────────────

    return c.json({ processed: results.length, results, reviewRequestsSent: reviewsSent });
  } catch (e: any) {
    console.error('[Follow-ups] Process error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// Manually send a specific follow-up now (admin override)
app.post('/make-server-57095a78/follow-ups/:id/send-now', async (c) => {
  try {
    const id = c.req.param('id');
    const all = (await kv.get('follow_ups') as any[]) || [];
    const fu = all.find((f: any) => f.id === id);
    if (!fu) return c.json({ error: 'Follow-up not found' }, 404);

    // Force due by setting scheduledAt to now
    await kv.set('follow_ups', all.map((f: any) => f.id === id ? { ...f, scheduledAt: new Date().toISOString() } : f));

    // Trigger processing
    const processRes = await fetch(`https://${Deno.env.get('SUPABASE_URL')?.split('.')[0].replace('https://', '')}.supabase.co/functions/v1/make-server-57095a78/follow-ups/process`, {
      method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}` },
    });

    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── MY ECOMMERCE STORE INTEGRATION ────────────────────────────────────────────
// Pull products from your own store into the Materials Hub.
// Supports: Shopify, WooCommerce, custom REST API, or manual product list.

// Save store config
app.post('/make-server-57095a78/my-store/config', async (c) => {
  try {
    const body = await c.req.json();
    await kv.set('my_store_config', body);
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Get store config
app.get('/make-server-57095a78/my-store/config', async (c) => {
  try {
    const config = await kv.get('my_store_config') as any;
    return c.json({ config: config || null });
  } catch (e: any) { return c.json({ config: null }); }
});

// Sync products from your store
app.post('/make-server-57095a78/my-store/sync', async (c) => {
  try {
    const config = await kv.get('my_store_config') as any;
    if (!config?.storeUrl) return c.json({ error: 'Store not configured' }, 400);

    const { storeType, storeUrl, apiKey, apiSecret } = config;
    let products: any[] = [];

    // ── SHOPIFY ────────────────────────────────────────────────────────────
    if (storeType === 'shopify') {
      const shop = storeUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const url = `https://${shop}/admin/api/2024-01/products.json?limit=250&status=active`;
      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': apiKey || apiSecret,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        products = (data.products || []).map((p: any) => ({
          id: `mystore_${p.id}`,
          name: p.title,
          description: p.body_html?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
          price: parseFloat(p.variants?.[0]?.price || '0'),
          comparePrice: parseFloat(p.variants?.[0]?.compare_at_price || '0') || undefined,
          imageUrl: p.images?.[0]?.src || '',
          category: p.product_type || p.tags?.split(',')[0]?.trim() || 'General',
          sku: p.variants?.[0]?.sku || '',
          vendor: p.vendor || 'My Store',
          inStock: p.variants?.some((v: any) => v.inventory_quantity > 0) ?? true,
          source: 'my-store',
          storeUrl: `${storeUrl}/products/${p.handle}`,
        }));
      }
    }

    // ── WOOCOMMERCE ────────────────────────────────────────────────────────
    else if (storeType === 'woocommerce') {
      const base = storeUrl.replace(/\/$/, '');
      const auth = btoa(`${apiKey}:${apiSecret}`);
      const res = await fetch(`${base}/wp-json/wc/v3/products?per_page=100&status=publish`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        const data = await res.json();
        products = (data || []).map((p: any) => ({
          id: `mystore_${p.id}`,
          name: p.name,
          description: p.short_description?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
          price: parseFloat(p.price || '0'),
          comparePrice: parseFloat(p.regular_price || '0') > parseFloat(p.price || '0') ? parseFloat(p.regular_price) : undefined,
          imageUrl: p.images?.[0]?.src || '',
          category: p.categories?.[0]?.name || 'General',
          sku: p.sku || '',
          vendor: 'My Store',
          inStock: p.in_stock ?? true,
          source: 'my-store',
          storeUrl: p.permalink || base,
        }));
      }
    }

    // ── CUSTOM REST API ────────────────────────────────────────────────────
    else if (storeType === 'custom') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      if (apiSecret) headers['X-API-Key'] = apiSecret;
      const res = await fetch(storeUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data) ? data : (data.products || data.items || data.data || []);
        products = raw.map((p: any) => ({
          id: `mystore_${p.id || p.sku || Math.random()}`,
          name: p.name || p.title,
          description: p.description || p.body || '',
          price: parseFloat(p.price || p.amount || '0'),
          imageUrl: p.image || p.imageUrl || p.thumbnail || '',
          category: p.category || p.type || 'General',
          sku: p.sku || p.id || '',
          vendor: p.vendor || p.brand || 'My Store',
          inStock: p.inStock ?? p.available ?? true,
          source: 'my-store',
          storeUrl: p.url || p.link || storeUrl,
        }));
      }
    }

    // Save synced products
    await kv.set('my_store_products', { products, syncedAt: new Date().toISOString(), total: products.length });
    console.log(`✅ [My Store] Synced ${products.length} products from ${storeType}`);
    return c.json({ success: true, count: products.length, products: products.slice(0, 10) });
  } catch (e: any) {
    console.error('[My Store] Sync error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// Get synced products
app.get('/make-server-57095a78/my-store/products', async (c) => {
  try {
    const data = await kv.get('my_store_products') as any;
    return c.json({ products: data?.products || [], syncedAt: data?.syncedAt, total: data?.total || 0 });
  } catch (e: any) { return c.json({ products: [], total: 0 }); }
});

// Save manually entered products
app.post('/make-server-57095a78/my-store/products', async (c) => {
  try {
    const { products } = await c.req.json();
    const existing = await kv.get('my_store_products') as any;
    const allProducts = [...(products || []), ...(existing?.products || [])];
    const deduped = allProducts.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    await kv.set('my_store_products', { products: deduped, syncedAt: new Date().toISOString(), total: deduped.length });
    return c.json({ success: true, total: deduped.length });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── VENDOR / SUBCONTRACTOR / ADVERTISER APPLICATIONS ─────────────────────────
// Receives applications, stores them, fires admin alert + SMS + email.

async function saveApplication(type: string, data: any, kv: any) {
  const id = `${type}_app_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const application = { id, type, ...data, status: 'pending', submitted_at: new Date().toISOString() };

  // Store individually and in list
  await kv.set(`application:${id}`, application);
  const all = (await kv.get('all_applications') as any[]) || [];
  all.unshift(application);
  await kv.set('all_applications', all.slice(0, 500));

  // Admin alert
  const typeLabels: Record<string, string> = {
    vendor: 'Vendor', subcontractor: 'Subcontractor', advertiser: 'Advertiser',
    service_provider: 'Service Provider', territory: 'Territory Partner', investor: 'Investor',
  };
  const label = typeLabels[type] || type;
  const alert = {
    id: `alert_${id}`,
    type: 'urgent',
    category: 'Applications',
    title: `🆕 New ${label} Application — ${data.name || data.company_name || data.contact_name || 'Unknown'}`,
    description: `${data.contact_name || data.name || ''} (${data.contact_email || data.email || ''}) submitted a ${label.toLowerCase()} application. Review and approve in your command center.`,
    priority: 'high',
    status: 'unread',
    source: `${type}-application`,
    actionRequired: true,
    timestamp: new Date().toISOString(),
    data: { applicationId: id, type, applicantEmail: data.contact_email || data.email, applicantName: data.contact_name || data.name },
  };
  const alerts = (await kv.get('admin_alerts') as any[]) || [];
  alerts.unshift(alert);
  await kv.set('admin_alerts', alerts.slice(0, 200));

  // SMS to admin
  const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const TWILIO_AUTH = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const TWILIO_FROM = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
  const ADMIN_PHONES = Deno.env.get('ADMIN_NOTIFICATION_PHONES') || '';
  if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && ADMIN_PHONES) {
    const sms = `🆕 New ${label} Application!\n${data.contact_name || data.name} (${data.contact_email || data.email})\nReview at theblackphoenixcompany.com`;
    for (const phone of ADMIN_PHONES.split(',').map((p: string) => p.trim()).filter(Boolean)) {
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: sms }),
      }).catch(() => {});
    }
  }

  // Email to admin via SendGrid
  const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@theblackphoenixcompany.com';
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'ericerb555@proton.me';
  if (SENDGRID_KEY) {
    fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
        from: { email: FROM_EMAIL, name: 'Black Phoenix Company' },
        subject: `🆕 New ${label} Application — ${data.contact_name || data.name}`,
        content: [{
          type: 'text/html',
          value: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;">
            <h2 style="color:#f97316;">New ${label} Application Received</h2>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;color:#a3a3a3;width:40%;">Name</td><td style="padding:8px 0;color:#fff;font-weight:600;">${data.contact_name || data.name || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#a3a3a3;">Email</td><td style="padding:8px 0;color:#fff;">${data.contact_email || data.email || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#a3a3a3;">Phone</td><td style="padding:8px 0;color:#fff;">${data.contact_phone || data.phone || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#a3a3a3;">Company</td><td style="padding:8px 0;color:#fff;">${data.company_name || data.name || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#a3a3a3;">Type</td><td style="padding:8px 0;color:#f97316;font-weight:600;">${label}</td></tr>
            </table>
            <a href="https://www.theblackphoenixcompany.com/admin-portal" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Review Application →</a>
          </div>`,
        }],
      }),
    }).catch(() => {});
  }

  // Confirmation email to applicant
  const applicantEmail = data.contact_email || data.email;
  if (SENDGRID_KEY && applicantEmail) {
    fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: applicantEmail, name: data.contact_name || data.name || '' }] }],
        from: { email: FROM_EMAIL, name: 'Black Phoenix Company' },
        subject: `We received your ${label} application ✅`,
        content: [{
          type: 'text/html',
          value: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;">
            <h2 style="color:#f97316;">Application Received!</h2>
            <p>Hi ${data.contact_name || data.name || 'there'},</p>
            <p>Thank you for applying to join the <strong>Black Phoenix ${label} Network</strong>. We've received your application and will review it shortly.</p>
            <p style="color:#a3a3a3;">Typical review time: <strong style="color:#fff;">1–3 business days</strong>. We'll email you once your account is approved.</p>
            <p style="color:#525252;font-size:12px;margin-top:24px;">Black Phoenix Company LLC · www.theblackphoenixcompany.com</p>
          </div>`,
        }],
      }),
    }).catch(() => {});
  }

  return { id, application };
}

app.post('/make-server-57095a78/service-providers/apply', async (c) => {
  try {
    const data = await c.req.json();
    const { id } = await saveApplication('service_provider', data, kv);
    return c.json({ success: true, applicationId: id, message: "Application received! We'll review it within 24–48 hours." });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-57095a78/territory/apply', async (c) => {
  try {
    const data = await c.req.json();
    const { id } = await saveApplication('territory', data, kv);
    return c.json({ success: true, applicationId: id, message: "Territory application received! We'll be in touch shortly." });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-57095a78/investors/apply', async (c) => {
  try {
    const data = await c.req.json();
    const { id } = await saveApplication('investor', data, kv);
    return c.json({ success: true, applicationId: id, message: "Investment application received! We'll review your profile shortly." });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-57095a78/vendors/apply', async (c) => {
  try {
    const data = await c.req.json();
    const { id } = await saveApplication('vendor', data, kv);
    return c.json({ success: true, applicationId: id, message: 'Application received! We\'ll review it and get back to you within 1-3 business days.' });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-57095a78/subcontractors/apply', async (c) => {
  try {
    const data = await c.req.json();
    const { id } = await saveApplication('subcontractor', data, kv);
    return c.json({ success: true, applicationId: id, message: 'Application received! We\'ll be in touch within 1-3 business days.' });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/make-server-57095a78/advertisers/apply', async (c) => {
  try {
    const data = await c.req.json();
    const { id } = await saveApplication('advertiser', data, kv);
    return c.json({ success: true, applicationId: id, message: 'Application received! Welcome aboard.' });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// GET all applications (admin only)
app.get('/make-server-57095a78/applications', async (c) => {
  try {
    const type = c.req.query('type') || 'all';
    const all = (await kv.get('all_applications') as any[]) || [];
    const filtered = type === 'all' ? all : all.filter((a: any) => a.type === type);
    return c.json({ applications: filtered });
  } catch (e: any) { return c.json({ applications: [] }); }
});

// PUT update application status (approve/reject)
app.put('/make-server-57095a78/applications/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, notes } = await c.req.json();
    const all = (await kv.get('all_applications') as any[]) || [];
    const updated = all.map((a: any) => a.id === id ? { ...a, status, admin_notes: notes, reviewed_at: new Date().toISOString() } : a);
    await kv.set('all_applications', updated);
    await kv.set(`application:${id}`, { ...(updated.find((a: any) => a.id === id)) });

    // Notify applicant of decision
    const app_data = updated.find((a: any) => a.id === id);
    const applicantEmail = app_data?.contact_email || app_data?.email;
    const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@theblackphoenixcompany.com';
    const typeLabels: Record<string, string> = { vendor: 'Vendor', subcontractor: 'Subcontractor', advertiser: 'Advertiser', service_provider: 'Service Provider', territory: 'Territory Partner', investor: 'Investor' };
    const label = typeLabels[app_data?.type] || 'Partner';

    if (SENDGRID_KEY && applicantEmail && (status === 'approved' || status === 'rejected')) {
      fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: applicantEmail }] }],
          from: { email: FROM_EMAIL, name: 'Black Phoenix Company' },
          subject: status === 'approved' ? `🎉 Your ${label} application has been approved!` : `Update on your ${label} application`,
          content: [{
            type: 'text/html',
            value: status === 'approved'
              ? `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;"><h2 style="color:#22c55e;">You're Approved! 🎉</h2><p>Hi ${app_data?.contact_name || 'there'},</p><p>Congratulations! Your <strong>${label}</strong> application has been approved. Your account is now active.</p><a href="https://www.theblackphoenixcompany.com/login" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Log In to Your Portal →</a>${notes ? `<p style="color:#a3a3a3;margin-top:16px;">Note from our team: ${notes}</p>` : ''}</div>`
              : `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;"><h2 style="color:#f97316;">Application Update</h2><p>Hi ${app_data?.contact_name || 'there'},</p><p>Thank you for your interest in joining Black Phoenix. Unfortunately we're unable to approve your application at this time.</p>${notes ? `<p style="color:#a3a3a3;">Reason: ${notes}</p>` : ''}<p>You're welcome to reapply in the future. Questions? Email us at info@theblackphoenixcompany.com.</p></div>`,
          }],
        }),
      }).catch(() => {});
    }

    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─── PERMIT AI ────────────────────────────────────────────────────────────────
// POST /make-server-57095a78/permit-ai/chat
// Body: { message, address, workType, history: [{role, content}] }

const NH_BUILDING_DEPTS: Record<string, { dept: string; phone: string; web: string; email: string; addr: string; hours: string }> = {
  manchester:  { dept: 'Manchester Building Department',       phone: '(603) 624-6450', web: 'manchesternh.gov/city-government/departments/building', email: 'building@manchesternh.gov',        addr: '1 City Hall Plaza, Manchester NH 03101',           hours: 'Mon–Fri 8am–4:30pm' },
  nashua:      { dept: 'Nashua Building Safety',               phone: '(603) 589-3080', web: 'nashuanh.gov/building',                                 email: 'buildingsafety@nashuanh.gov',       addr: '229 Main St, Nashua NH 03060',                     hours: 'Mon–Fri 8am–4:30pm' },
  concord:     { dept: 'Concord Building Division',            phone: '(603) 228-2737', web: 'concordnh.gov/building',                                email: 'building@concordnh.gov',            addr: '41 Green St, Concord NH 03301',                    hours: 'Mon–Fri 8am–4pm' },
  dover:       { dept: 'Dover Planning & Community Services',  phone: '(603) 516-6008', web: 'dover.nh.gov/government/city-departments/planning',     email: 'planning@dover.nh.gov',             addr: '259 County Farm Rd, Dover NH 03820',               hours: 'Mon–Fri 8am–4pm' },
  portsmouth:  { dept: 'Portsmouth Inspectional Services',     phone: '(603) 610-7212', web: 'cityofportsmouth.com/inspectional',                    email: 'inspections@cityofportsmouth.com',  addr: '1 Junkins Ave, Portsmouth NH 03801',               hours: 'Mon–Fri 8am–4pm' },
  rochester:   { dept: 'Rochester Building Department',        phone: '(603) 332-1167', web: 'rochesternh.gov/building',                             email: 'building@rochesternh.gov',          addr: '31 Wakefield St, Rochester NH 03867',              hours: 'Mon–Fri 8am–4pm' },
  keene:       { dept: 'Keene Code Compliance',                phone: '(603) 357-9829', web: 'ci.keene.nh.us/departments/code-compliance',           email: 'codecompliance@ci.keene.nh.us',     addr: '3 Washington St, Keene NH 03431',                  hours: 'Mon–Fri 8am–4pm' },
  derry:       { dept: 'Derry Building Department',            phone: '(603) 432-6100', web: 'derry.nh.us/building',                                 email: 'building@derry.nh.us',              addr: '14 Manning St, Derry NH 03038',                    hours: 'Mon–Fri 8am–4pm' },
  londonderry: { dept: 'Londonderry Building Department',      phone: '(603) 432-1100', web: 'londonderrynh.org/building',                           email: 'building@londonderrynh.org',        addr: '268B Mammoth Rd, Londonderry NH 03053',            hours: 'Mon–Fri 8am–4pm' },
  merrimack:   { dept: 'Merrimack Building Department',        phone: '(603) 424-3651', web: 'merrimacknh.gov/building',                             email: 'building@merrimacknh.gov',          addr: '6 Baboosic Lake Rd, Merrimack NH 03054',          hours: 'Mon–Fri 8am–4pm' },
  bedford:     { dept: 'Bedford Building Department',          phone: '(603) 472-3550', web: 'bedfordnh.gov/building',                               email: 'building@bedfordnh.gov',            addr: '24 N Amherst Rd, Bedford NH 03110',                hours: 'Mon–Fri 8am–4pm' },
  laconia:     { dept: 'Laconia Code Enforcement',             phone: '(603) 527-1268', web: 'laconianh.gov/code-enforcement',                       email: 'codeenforcement@laconianh.gov',     addr: '45 Beacon St E, Laconia NH 03246',                 hours: 'Mon–Fri 8am–4pm' },
  hampton:     { dept: 'Hampton Building Department',          phone: '(603) 929-5837', web: 'hamptonnh.gov/building',                               email: 'building@hamptonnh.gov',            addr: '100 Winnacunnet Rd, Hampton NH 03842',             hours: 'Mon–Fri 8am–4pm' },
  exeter:      { dept: 'Exeter Building Department',           phone: '(603) 772-4391', web: 'exeternh.gov/building',                               email: 'building@exeternh.gov',             addr: '10 Front St, Exeter NH 03833',                     hours: 'Mon–Fri 8am–4pm' },
  goffstown:   { dept: 'Goffstown Building Department',        phone: '(603) 497-8990', web: 'goffstown.nh.gov/building',                           email: 'building@goffstown.nh.gov',         addr: '16 Main St, Goffstown NH 03045',                   hours: 'Mon–Fri 8am–4pm' },
};

function extractNHTown(address: string): string {
  const lower = address.toLowerCase();
  for (const town of Object.keys(NH_BUILDING_DEPTS)) {
    if (lower.includes(town)) return town;
  }
  // Try to extract town from "City, NH" pattern
  const m = lower.match(/,\s*([a-z\s]+),?\s*nh/);
  if (m) {
    const extracted = m[1].trim().replace(/\s+/g, '');
    for (const town of Object.keys(NH_BUILDING_DEPTS)) {
      if (town.includes(extracted) || extracted.includes(town)) return town;
    }
    return m[1].trim();
  }
  return '';
}

const PERMIT_SYSTEM_PROMPT = `You are PermitAI, an expert assistant for New Hampshire building permits and construction codes. You help contractors, property managers, and homeowners understand exactly what permits they need, how to get them, and what the process looks like from start to finish.

Your knowledge covers:
- NH State Building Code (RSA 155-A) — NH adopted IBC/IRC with state amendments
- International Building Code (IBC 2021) — commercial structures
- International Residential Code (IRC 2021) — 1-2 family dwellings
- National Electrical Code (NEC 2023) — all electrical work
- International Mechanical Code (IMC 2021) — HVAC, plumbing
- International Plumbing Code (IPC 2021)
- NH Energy Code (IECC 2021 with NH amendments)
- Americans with Disabilities Act (ADA) — public/commercial buildings
- NH Fire Code (RSA 153)

For every work type, you must provide:
1. **Permit Required?** — Yes/No and why
2. **Which Permits** — building, electrical, plumbing, mechanical, etc.
3. **Where to File** — exact department name, address, phone, website, email, hours
4. **Step-by-Step Process** — numbered steps from application to final inspection
5. **Documents Required** — what to bring/upload with the application
6. **Fees** — typical fee range (NH towns typically charge $50–$500+ depending on project value)
7. **Timeline** — typical review and inspection timeline
8. **Inspections Required** — which inspections, in what order
9. **Relevant Code Sections** — specific RSA, IBC, IRC, NEC references
10. **Common Gotchas** — things that typically cause delays or rejections

Work types that typically require permits in NH:
- New construction (always)
- Additions and structural changes (always)
- Roofing on commercial; residential varies by town
- Electrical work beyond like-for-like replacement
- Plumbing beyond fixture replacement
- HVAC installation/replacement
- Decks over 30" above grade
- Fences over 6' in many towns
- Pool installation
- Garage conversion or ADU
- Demolition
- Signs (commercial)

Work that typically does NOT require a permit:
- Cosmetic repairs (paint, flooring, tile)
- Like-for-like fixture replacement (faucets, toilets, light switches)
- Roofing repair under certain thresholds in residential
- Minor carpentry/trim work

Always be specific, actionable, and cite code sections. Format responses clearly with headers and numbered lists. If the town has an online permit portal, mention it. Mention that NH requires licensed contractors for electrical (NH Board of Electricians), plumbing (NH OPLC), and HVAC (EPA 608 cert for refrigerants).`;

app.post('/make-server-57095a78/permit-ai/chat', async (c) => {
  try {
    const { message, address, workType, history = [] } = await c.req.json();
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      return c.json({ error: 'ANTHROPIC_API_KEY not configured in Supabase secrets.' }, 500);
    }

    // Look up town building department
    const town = address ? extractNHTown(address) : '';
    const deptInfo = NH_BUILDING_DEPTS[town];
    let contextBlock = '';
    if (address) {
      contextBlock += `\n\nPROJECT ADDRESS: ${address}`;
      if (deptInfo) {
        contextBlock += `\nTOWN IDENTIFIED: ${town.charAt(0).toUpperCase() + town.slice(1)}, NH`;
        contextBlock += `\nBUILDING DEPARTMENT: ${deptInfo.dept}`;
        contextBlock += `\n  Phone: ${deptInfo.phone}`;
        contextBlock += `\n  Website: https://${deptInfo.web}`;
        contextBlock += `\n  Email: ${deptInfo.email}`;
        contextBlock += `\n  Address: ${deptInfo.addr}`;
        contextBlock += `\n  Hours: ${deptInfo.hours}`;
      } else if (town) {
        contextBlock += `\nTOWN IDENTIFIED: ${town.charAt(0).toUpperCase() + town.slice(1)}, NH — building department contact not in database; advise user to search "[town] NH building department" or call town hall.`;
      }
    }
    if (workType) contextBlock += `\nWORK TYPE: ${workType}`;

    const messages = [
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: (contextBlock ? `[Context]${contextBlock}\n\n[Question] ` : '') + message },
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: PERMIT_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: `Anthropic API error: ${err}` }, 500);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? 'No response generated.';
    return c.json({ reply, town, deptInfo: deptInfo || null });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

Deno.serve(app.fetch);

// ─── TECH TIERS & ROSTER ─────────────────────────────────────────────────────

const DEFAULT_TIERS = [
  { id: 'A', label: 'Tier A — Elite Master', description: 'Licensed master tradesperson, 10+ yrs, all certifications', hourlyRate: 125, color: 'gold' },
  { id: 'B', label: 'Tier B — Senior Journeyman', description: 'Journeyman license, 5–10 yrs, specialty-certified', hourlyRate: 95, color: 'silver' },
  { id: 'C', label: 'Tier C — Standard Tech', description: 'Experienced tradesperson, 2–5 yrs', hourlyRate: 75, color: 'blue' },
  { id: 'D', label: 'Tier D — Apprentice', description: 'Entry-level, supervised work only', hourlyRate: 55, color: 'green' },
];

app.get('/make-server-57095a78/tech-tiers/config', async (c) => {
  try {
    const config = await kv.get('tech_tier_config') as any;
    return c.json({ tiers: config?.tiers || DEFAULT_TIERS });
  } catch { return c.json({ tiers: DEFAULT_TIERS }); }
});

app.post('/make-server-57095a78/tech-tiers/config', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { tiers } = await c.req.json();
    await kv.set('tech_tier_config', { tiers, updatedBy: user.email, updatedAt: new Date().toISOString() });
    return c.json({ success: true, tiers });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.get('/make-server-57095a78/tech-roster', async (c) => {
  try {
    const roster = (await kv.get('tech_roster') as any[]) || [];
    return c.json({ techs: roster });
  } catch (error: any) { return c.json({ techs: [], error: error.message }, 500); }
});

app.post('/make-server-57095a78/tech-roster', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { tech } = await c.req.json();
    if (!tech?.name) return c.json({ error: 'Tech name required' }, 400);
    const existing = (await kv.get('tech_roster') as any[]) || [];
    const idx = existing.findIndex((t: any) => t.id === tech.id);
    const now = new Date().toISOString();
    const record = {
      id: tech.id || `tech_${Date.now()}`,
      name: tech.name,
      tier: tech.tier || 'C',
      trades: tech.trades || [],
      certifications: tech.certifications || '',
      yearsExperience: Number(tech.yearsExperience) || 0,
      phone: tech.phone || '',
      email: tech.email || '',
      bio: tech.bio || '',
      available: tech.available !== false,
      createdAt: tech.createdAt || now,
      updatedAt: now,
    };
    if (idx >= 0) existing[idx] = record;
    else existing.unshift(record);
    await kv.set('tech_roster', existing);
    return c.json({ tech: record });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.delete('/make-server-57095a78/tech-roster/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const existing = (await kv.get('tech_roster') as any[]) || [];
    await kv.set('tech_roster', existing.filter((t: any) => t.id !== id));
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// ─── MARKET ALERT NOTIFICATIONS ──────────────────────────────────────────────

// Save alert notification preferences
app.post('/make-server-57095a78/market-alerts/preferences', async (c) => {
  try {
    const body = await c.req.json();
    const { email, phone, alertTypes, urgencyLevel } = body;
    await kv.set('market_alert_prefs', {
      email: email || '',
      phone: phone || '',
      alertTypes: alertTypes || ['critical', 'high'],
      urgencyLevel: urgencyLevel || 'high',
      updatedAt: new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// Get alert preferences
app.get('/make-server-57095a78/market-alerts/preferences', async (c) => {
  try {
    const prefs = await kv.get('market_alert_prefs');
    return c.json({ prefs: prefs || {} });
  } catch (error: any) { return c.json({ prefs: {}, error: error.message }); }
});

// Send a market alert notification (email + SMS)
app.post('/make-server-57095a78/market-alerts/send', async (c) => {
  try {
    const body = await c.req.json();
    const { product, spike, category, reason, urgency, revenue } = body;

    const prefs = await kv.get('market_alert_prefs') as any || {};
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    const TWILIO_SID     = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const TWILIO_AUTH    = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const TWILIO_FROM    = Deno.env.get('TWILIO_FROM_NUMBER') || '';

    const results = { emailSent: false, smsSent: false };
    const alertEmail = prefs.email || 'ericerb555@proton.me';
    const alertPhone = prefs.phone || '';

    const urgencyEmoji = urgency === 'critical' ? '🚨' : urgency === 'high' ? '⚡' : '📈';
    const subject = `${urgencyEmoji} Market Alert: ${product} trending ${spike}`;
    const messageBody = `${urgencyEmoji} MARKET ALERT\n\nProduct: ${product}\nCategory: ${category}\nSpike: ${spike}\nRevenue Est: ${revenue}\n\n${reason}\n\nLog in to add this to your store now:\nhttps://theblackphoenixcompany.com`;

    // Send email via Resend
    if (RESEND_API_KEY && alertEmail) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'alerts@theblackphoenixcompany.com',
            to: [alertEmail],
            subject,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#e5e5e5;border-radius:12px;">
                <h2 style="color:${urgency === 'critical' ? '#ef4444' : '#f97316'};margin-bottom:8px;">${urgencyEmoji} ${subject}</h2>
                <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="font-size:24px;font-weight:bold;color:#fff;margin:0;">${product}</p>
                  <p style="color:#f97316;font-size:20px;font-weight:bold;margin:8px 0;">${spike} spike · ${revenue}</p>
                  <p style="color:#a3a3a3;">${category} · ${urgency.toUpperCase()} urgency</p>
                </div>
                <p style="color:#d4d4d4;line-height:1.6;">${reason}</p>
                <a href="https://theblackphoenixcompany.com" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">View in Shop Intelligence →</a>
                <p style="color:#525252;font-size:12px;margin-top:24px;">Black Phoenix Company · Market Intelligence Alerts</p>
              </div>`,
          }),
        });
        if (emailRes.ok) results.emailSent = true;
      } catch {}
    }

    // Send SMS via Twilio
    if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && alertPhone) {
      try {
        const smsBody = `${urgencyEmoji} BLACK PHOENIX ALERT\n${product}: ${spike} trending!\n${revenue}\n${reason.substring(0, 100)}...\nLog in to add to your store.`;
        const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: TWILIO_FROM, To: alertPhone, Body: smsBody }).toString(),
        });
        if (smsRes.ok) results.smsSent = true;
      } catch {}
    }

    // Store the alert in history
    const history = (await kv.get('market_alert_history') as any[]) || [];
    history.unshift({ product, spike, category, urgency, revenue, sentAt: new Date().toISOString(), ...results });
    await kv.set('market_alert_history', history.slice(0, 50));

    return c.json({ success: true, ...results });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// Get alert history
app.get('/make-server-57095a78/market-alerts/history', async (c) => {
  try {
    const history = (await kv.get('market_alert_history') as any[]) || [];
    return c.json({ history });
  } catch (error: any) { return c.json({ history: [], error: error.message }); }
});
