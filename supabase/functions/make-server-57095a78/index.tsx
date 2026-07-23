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
import plansRouter from "../server/plans.tsx";
import { entitlementsRouter, recordEntitlementEvent } from "../server/entitlements.tsx";
import paymentProcessingRouter from "../server/payment-processing.tsx";
import hourTransfersRouter from "../server/hour-transfers.tsx";
import timeTrackingRouter from "../server/time-tracking.tsx";
import quotesRouter from "../server/quotes.tsx";
import deliverablesRouter from "../server/deliverables.tsx";
import designProjectsRouter from "../server/design-projects.tsx";
import projectVisionRouter from "../server/project-vision.tsx";
import aiFloorplanRouter from "../server/ai-floorplan.tsx";
import maintenanceConfigRouter from "../server/maintenance-config.tsx";
import { productsRouter } from "../server/ecommerce-products.tsx";
import { cartRouter } from "../server/ecommerce-cart.tsx";
import { ordersRouter } from "../server/ecommerce-orders.tsx";
import crmContentRouter from "../server/crm-content.tsx";
import growthMarketingRouter from "../server/growth-marketing.tsx";
import { marketingAssetsRouter } from "../server/marketing-assets.tsx";
import { territoryCohortRouter } from "../server/territory-cohorts.tsx";
import { vendorProfileRouter } from "../server/vendor-profile.tsx";
import pipelineRouter from "../server/pipeline.tsx";
import vendorPricingRouter from "../server/vendorPricing.tsx";
import brandsRouter from "../server/brands.tsx";
import { companyConfigRouter } from "../server/company-config.tsx";
import { getConfig as getDropshipperConfig, setEnabled as setDropshipperEnabled, getProviders as getDropshipperProviders } from "../server/dropshipper-config.tsx";
import { getAllInventory, getAllOrders as getDropshipperOrders, getErrors as getDropshipperErrors, syncInventory as syncDropshipperInventory, syncAllTracking as syncDropshipperTracking, handleWebhook as handleDropshipperWebhook } from "../server/dropshipper.tsx";
import { getAllStagedProducts, getStagingStats, getStagedCategories, importProductsToLive, clearStagedProducts } from "../server/dropshipper-catalog.tsx";
import zendropRouter, { forwardZendropOrder } from "../server/zendrop.tsx";
import jobFinancialsRouter from "../server/job-financials.tsx";

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
  allowHeaders: ["Content-Type", "Authorization", "X-Payment-Confirmation-Secret", "X-Loyalty-Event-Secret", "X-Affiliate-Event-Secret"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.use('*', logger(console.log));
app.use('/make-server-57095a78/pipeline/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  await next();
});

app.use('/make-server-57095a78/orders/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email) return c.json({ success: false, error: 'Sign in required to access order operations.' }, 401);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  await next();
});
app.use('/make-server-57095a78/vendor-orders/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email || !admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  await next();
});
app.use('/make-server-57095a78/admin/orders/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email || !admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  await next();
});
app.use('/make-server-57095a78/products/*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'OPTIONS') return next();
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email || !admin) return c.json({ success: false, error: 'Administrator access is required to change products.' }, 403);
  await next();
});

app.use('/make-server-57095a78/job-financials/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required for company financial records.' }, 403);
  await next();
});

// Zendrop credentials, configuration, and supplier inventory are restricted to
// signed-in owners/admins. The storefront only receives the already-published
// canonical product records through its public /products feed.
app.use('/make-server-57095a78/zendrop/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email) return c.json({ success: false, error: 'Sign in required to manage Zendrop.' }, 401);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required to manage Zendrop.' }, 403);
  await next();
});


// Entitlement records are financial/account data. Keep the shared read model
// available to the signed-in plan owner, while reserving cross-account reads
// and ledger event creation for administrators.
app.use('/make-server-57095a78/entitlements/*', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
  const path = new URL(c.req.url).pathname;
  if (path.endsWith('/events') && !admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const planId = path.split('/').filter(Boolean).at(-1) || '';
  if (!admin && planId && planId !== 'events') {
    const plan = await kv.get(`plan:${planId}`) as any;
    if (!plan || String(plan.ownerEmail || '').toLowerCase() !== String(user.email).toLowerCase()) return c.json({ success: false, error: 'Not permitted.' }, 403);
  }
  await next();
});
app.use('/make-server-57095a78/entitlements-summary', async (c, next) => {
  const user = await intakeActor(c); const admin = await intakeIsAdmin(user);
  if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
  const requestedOwner = String(c.req.query('owner') || c.req.query('email') || '').toLowerCase();
  if (!admin && requestedOwner !== String(user.email).toLowerCase()) return c.json({ success: false, error: 'You may only view your own plan summary.' }, 403);
  await next();
});

// Batch 1 workflow routers. These modules are mounted here as well as in the
// modular entrypoint so the deployed make-server function exposes the same
// paths the React clients call.
app.route("/", plansRouter);
app.route("/", entitlementsRouter);
app.route("/make-server-57095a78/payment", paymentProcessingRouter);
app.route("/make-server-57095a78/hour-transfers", hourTransfersRouter);
app.route("/make-server-57095a78/time-tracking", timeTrackingRouter);
app.route("/", quotesRouter);
app.route("/", deliverablesRouter);
// Existing design/vision modules were present but unreachable from the deployed function.
app.route("/", designProjectsRouter);
app.route("/", projectVisionRouter);
app.route("/make-server-57095a78/ai-floorplan", aiFloorplanRouter);
app.route("/", maintenanceConfigRouter);
// Existing commerce, CRM, and growth routers are mounted under the API paths their clients already call.
app.route("/make-server-57095a78", productsRouter);
app.route("/make-server-57095a78", cartRouter);
app.route("/make-server-57095a78", ordersRouter);
app.route("/", zendropRouter);
app.route("/", jobFinancialsRouter);
app.route("/", crmContentRouter);
app.route("/", growthMarketingRouter);
app.route("/make-server-57095a78", marketingAssetsRouter);
app.route("/make-server-57095a78", territoryCohortRouter);
app.route("/make-server-57095a78", vendorProfileRouter);
app.route("/", pipelineRouter);
app.route("/", vendorPricingRouter);
app.route("/", brandsRouter);
app.route("/make-server-57095a78", companyConfigRouter);

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
// Public applications are the entry point for technician, employee, vendor,
// and partner workflows.  Keep the application, CRM contact, and pipeline lead
// in sync here so an accepted browser request is never "successfully" lost.
// ============================================
const INTAKE_ADMIN_ROLES = new Set(['owner', 'platform_owner', 'business_owner', 'admin', 'master_admin', 'management']);

async function intakeActor(c: any) {
  const raw = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!raw) return null;
  const { data: { user }, error } = await supabase.auth.getUser(raw);
  return error || !user ? null : user;
}

async function intakeIsAdmin(user: any) {
  if (!user?.id) return false;
  const metadataRole = String(user.app_metadata?.role || user.user_metadata?.role || user.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (INTAKE_ADMIN_ROLES.has(metadataRole)) return true;
  try {
    const [permissions, memberships] = await Promise.all([
      supabase.from('user_permissions').select('role_name').eq('user_id', user.id),
      supabase.from('company_members').select('role').eq('user_id', user.id).eq('is_active', true),
    ]);
    const hasPermissionRole = (permissions.data || []).some((row: any) => INTAKE_ADMIN_ROLES.has(String(row.role_name || '').toLowerCase()));
    const hasCompanyAuthority = (memberships.data || []).some((row: any) => ['owner', 'admin'].includes(String(row.role || '').toLowerCase()));
    return hasPermissionRole || hasCompanyAuthority;
  } catch { return false; }
}

function intakePortalType(application: any) {
  const source = String(application.applicationType || application.type || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (source.includes('vendor')) return 'vendor';
  if (source.includes('subcontractor') || source.includes('service_provider') || source.includes('contractor')) return 'subcontractor';
  if (source.includes('advertiser')) return 'advertiser';
  if (source.includes('property') || source.includes('landlord') || source.includes('condo')) return 'property_manager';
  if (source.includes('territory')) return 'territory_owner';
  if (source.includes('employee') || source.includes('tech')) return 'employee';
  return 'customer';
}

function intakeTasks(portalType: string, application?: any) {
  const base = [{ id: 'identity', label: 'Government-issued photo ID', required: true, status: 'pending' }];
  const contractorRequest = application?.taxClassification?.requestedPath === 'independent_contractor_1099';
  if (['employee', 'subcontractor', 'vendor'].includes(portalType)) base.push({ id: 'w9_or_tax', label: contractorRequest ? 'W-9 / 1099 contractor documentation (pending classification approval)' : portalType === 'employee' ? 'Employment tax forms (W-4 path)' : 'W-9 / tax documentation', required: true, status: 'pending' });
  if (['subcontractor', 'vendor', 'property_manager'].includes(portalType)) base.push({ id: 'insurance', label: 'Certificate of insurance', required: true, status: 'pending' });
  if (portalType === 'employee') base.push({ id: 'background', label: 'Background-check authorization', required: true, status: 'pending' });
  return base;
}

async function ensureIntake(application: any) {
  const key = `intake:onboarding:${application.id}`;
  const existing = await kv.get(key) as any;
  if (existing) return existing;
  const now = new Date().toISOString();
  const intake = { id: application.id, applicationId: application.id, applicantEmail: String(application.email || '').toLowerCase(), applicantName: application.name || 'Applicant', portalType: intakePortalType(application), taxClassification: application.taxClassification || null, status: 'pending_documents', requiredTasks: intakeTasks(intakePortalType(application), application), documents: [], createdAt: now, updatedAt: now };
  await kv.set(key, intake);
  await kv.set(`intake:email:${intake.applicantEmail}`, intake.applicationId);
  return intake;
}

async function syncPortalAccess(application: any, intake: any, statusOverride?: string) {
  const email = String(application.email || intake?.applicantEmail || '').toLowerCase();
  if (!email) return null;
  const portalType = intake?.portalType || intakePortalType(application); const now = new Date().toISOString();
  const key = `portal_access:${email}:${portalType}`; const prior = await kv.get(key) as any;
  const access = { ...(prior || {}), id: prior?.id || `ACCESS-${crypto.randomUUID()}`, applicationId: application.id, email, portalType, applicantName: application.name || intake?.applicantName || '', status: statusOverride || (intake?.status === 'active' ? 'active' : 'onboarding'), onboardingStatus: intake?.status || 'pending_documents', updatedAt: now, createdAt: prior?.createdAt || now };
  await kv.set(key, access); return access;
}

const APPLICATIONS_KEY = 'applications';
const CRM_CONTACTS_KEY = 'crm_contacts:default';
const LEADS_KEY = 'leads:all';
const APPLICATION_PLAN_PROPOSAL_PREFIX = 'application_plan_proposal:';

async function ensureApplicationPlanProposal(application: any, reviewedBy: string) {
  const preference = application?.planPreference;
  if (!preference || typeof preference !== 'object') return null;
  const key = `${APPLICATION_PLAN_PROPOSAL_PREFIX}${application.id}`;
  const existing = await kv.get(key) as any;
  if (existing) return existing;
  const now = new Date().toISOString();
  const proposal = {
    id: `PLAN-PROP-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    applicationId: application.id,
    applicantName: application.name,
    ownerEmail: String(application.email || '').toLowerCase(),
    portalType: intakePortalType(application),
    requestedPlan: preference,
    requestedMonthlyTotal: money(preference.monthlyTotal),
    quotedMonthlyTotal: null,
    status: 'pending_pricing',
    notes: '',
    createdAt: now,
    updatedAt: now,
    createdBy: reviewedBy,
  };
  await kv.set(key, proposal);
  return proposal;
}

async function activatePaidApplicationPlan(invoice: any, payment: any) {
  const applicationId = String(invoice?.planProposalApplicationId || invoice?.applicationId || '');
  if (!applicationId) return null;
  const proposalKey = `${APPLICATION_PLAN_PROPOSAL_PREFIX}${applicationId}`;
  const proposal = await kv.get(proposalKey) as any;
  if (!proposal || proposal.status === 'declined') return null;
  if (proposal.status === 'active' && proposal.subscriptionId) return { proposal, subscription: await kv.get(subscriptionKey(proposal.subscriptionId)), plan: proposal.planId ? await kv.get(`plan:${proposal.planId}`) : null };
  const now = new Date().toISOString();
  const requested = proposal.requestedPlan || {};
  const amount = money(proposal.quotedMonthlyTotal ?? invoice.total_amount ?? invoice.total ?? 0);
  const includedHours = Math.max(0, Number(requested.hoursIncluded ?? requested.hours?.included ?? 0));
  const planId = proposal.planId || `PLAN-${crypto.randomUUID()}`;
  const subscriptionId = proposal.subscriptionId || `SUB-${crypto.randomUUID()}`;
  const plan = { id: planId, planName: String(requested.planName || 'Approved Custom Plan'), portalType: proposal.portalType, owner: proposal.applicantName, ownerEmail: proposal.ownerEmail, status: 'active', entity: requested.entity || 'homeowner', skillId: requested.skillId || 'journeyman', frequencyId: requested.frequencyId || 'monthly', serviceIds: Array.isArray(requested.serviceIds) ? requested.serviceIds : [], serviceNames: Array.isArray(requested.serviceNames) ? requested.serviceNames : [], monthlyTotal: amount, annualTotal: amount * 12, hours: { included: includedHours, used: 0, overageRate: 0, bankId: `HRS-${crypto.randomUUID()}` }, applicationId, proposalId: proposal.id, invoiceId: invoice.id, activatedAt: now, createdAt: now, updatedAt: now };
  const subscription = { id: subscriptionId, type: subscriptionType, stakeholderId: proposal.ownerEmail, stakeholderName: proposal.applicantName || proposal.ownerEmail, stakeholderEmail: proposal.ownerEmail, customerEmail: proposal.ownerEmail, plan: plan.planName, planId, applicationId, planProposalId: proposal.id, status: 'active', billingCycle: requested.frequencyId === 'annual' ? 'annual' : requested.frequencyId === 'quarterly' ? 'quarterly' : 'monthly', amount, startDate: now, renewalDate: nextRenewalDate({ billingCycle: requested.frequencyId === 'annual' ? 'annual' : requested.frequencyId === 'quarterly' ? 'quarterly' : 'monthly' }, new Date()).toISOString(), hoursIncluded: includedHours, hoursUsed: 0, hoursRollover: 0, hoursGifted: 0, autoRenew: false, paymentMethod: 'stripe', paymentId: payment.id, activatedAt: now, createdAt: now, updatedAt: now };
  const activatedProposal = { ...proposal, status: 'active', planId, subscriptionId, invoiceId: invoice.id, activatedAt: now, activatedByPaymentId: payment.id, updatedAt: now };
  await kv.set(`plan:${planId}`, plan);
  await kv.set(subscriptionKey(subscriptionId), subscription);
  await kv.set(proposalKey, activatedProposal);
  const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || [];
  const index = applications.findIndex((application: any) => application.id === applicationId);
  if (index >= 0) { applications[index] = { ...applications[index], planProposal: activatedProposal, planProposalId: activatedProposal.id, planId, subscriptionId, updatedAt: now }; await kv.set(APPLICATIONS_KEY, applications); }
  return { proposal: activatedProposal, plan, subscription };
}

function cleanApplicationText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function applicationApplicant(data: Record<string, unknown>) {
  // Public forms use several generations of field names. Normalize them before
  // validation so a technician's `full_name` or a company's `contact_name`
  // never gets rejected as a missing applicant identity.
  const name = cleanApplicationText(data.full_name) || cleanApplicationText(data.fullName) || cleanApplicationText(data.contact_name) || cleanApplicationText(data.contactName) || cleanApplicationText(data.name) ||
    [cleanApplicationText(data.firstName), cleanApplicationText(data.lastName)].filter(Boolean).join(' ');
  const email = (cleanApplicationText(data.email) || cleanApplicationText(data.contact_email) || cleanApplicationText(data.contactEmail)).toLowerCase();
  const phone = cleanApplicationText(data.phone) || cleanApplicationText(data.contact_phone) || cleanApplicationText(data.contactPhone);
  const location = [cleanApplicationText(data.city), cleanApplicationText(data.state)].filter(Boolean).join(', ') || cleanApplicationText(data.company_address) || cleanApplicationText(data.address);
  return { name, email, phone, location };
}

function applicationTaxClassification(data: Record<string, unknown>) {
  const request = cleanApplicationText(data.taxClassificationRequest || data.tax_classification_request || data.engagement_preference).toLowerCase();
  const isContractorRequest = /contractor|w-?9|1099/.test(request);
  return {
    requestedPath: isContractorRequest ? 'independent_contractor_1099' : 'employee_w4',
    requestedLabel: isContractorRequest ? 'Independent contractor request — W-9 / 1099 paperwork' : 'Employee — W-4 employment paperwork',
    reviewStatus: 'pending_review',
    requestedAt: new Date().toISOString(),
    notes: cleanApplicationText(data.taxClassificationNotes || data.tax_classification_notes).slice(0, 3000),
  };
}

async function saveApplicationAndCrm(data: Record<string, unknown>) {
  const applicant = applicationApplicant(data);
  if (!applicant.name || !applicant.email || !applicant.phone) {
    throw new Error('Name, email, and phone are required.');
  }

  const now = new Date().toISOString();
  const applicationType = cleanApplicationText(data.applicationType) || cleanApplicationText(data.type) || 'general';
  const planPreference = data.planPreference && typeof data.planPreference === 'object' ? data.planPreference : null;
  const employeeOrTechnician = /employee|technician|field_tech|field tech|maintenance tech/.test(applicationType.toLowerCase());
  const taxClassification = employeeOrTechnician ? applicationTaxClassification(data) : null;
  const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || [];
  const existingIndex = applications.findIndex((application: any) =>
    String(application.email || application.contact_email || '').toLowerCase() === applicant.email &&
    application.applicationType === applicationType &&
    application.status === 'pending',
  );
  const id = existingIndex >= 0 ? applications[existingIndex].id : crypto.randomUUID();
  const application = {
    ...(existingIndex >= 0 ? applications[existingIndex] : {}),
    ...data,
    id,
    applicationType,
    type: applicationType,
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    taxClassification: taxClassification || (existingIndex >= 0 ? applications[existingIndex].taxClassification : null),
    status: existingIndex >= 0 ? applications[existingIndex].status : 'pending',
    submittedAt: existingIndex >= 0 ? applications[existingIndex].submittedAt : now,
    updatedAt: now,
  };
  if (existingIndex >= 0) applications[existingIndex] = application;
  else applications.unshift(application);
  await kv.set(APPLICATIONS_KEY, applications);

  const contacts: any[] = (await kv.get(CRM_CONTACTS_KEY)) || [];
  const contactIndex = contacts.findIndex((contact: any) => String(contact.email || '').toLowerCase() === applicant.email);
  const contact = {
    ...(contactIndex >= 0 ? contacts[contactIndex] : {}),
    id: contactIndex >= 0 ? contacts[contactIndex].id : `applicant_${id}`,
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    company: cleanApplicationText(data.companyName) || cleanApplicationText(data.company_name) || undefined,
    location: applicant.location || undefined,
    type: applicationType === 'field_technician' ? 'employee' : 'partner',
    status: 'lead',
    source: 'application',
    taxClassification: taxClassification || (contactIndex >= 0 ? contacts[contactIndex].taxClassification : null),
    planPreference: planPreference || (contactIndex >= 0 ? contacts[contactIndex].planPreference : null),
    tags: Array.from(new Set([...(contactIndex >= 0 && Array.isArray(contacts[contactIndex].tags) ? contacts[contactIndex].tags : []), 'application', applicationType, ...(planPreference ? ['plan_preference'] : []), ...(taxClassification ? ['tax_classification_review', taxClassification.requestedPath] : [])])),
    applicationId: id,
    updatedAt: now,
    createdAt: contactIndex >= 0 ? contacts[contactIndex].createdAt : now,
  };
  if (contactIndex >= 0) contacts[contactIndex] = contact;
  else contacts.unshift(contact);
  await kv.set(CRM_CONTACTS_KEY, contacts);

  const leads: any[] = (await kv.get(LEADS_KEY)) || [];
  const leadIndex = leads.findIndex((lead: any) => String(lead.email || '').toLowerCase() === applicant.email);
  const lead = {
    ...(leadIndex >= 0 ? leads[leadIndex] : {}),
    id: leadIndex >= 0 ? leads[leadIndex].id : `application_lead_${id}`,
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    source: 'application',
    applicationId: id,
    applicationType,
    status: 'new',
    intent: 'warm',
    score: planPreference ? 78 : 70,
    taxClassification: taxClassification || (leadIndex >= 0 ? leads[leadIndex].taxClassification : null),
    planPreference: planPreference || (leadIndex >= 0 ? leads[leadIndex].planPreference : null),
    lastSeen: now,
    capturedAt: leadIndex >= 0 ? leads[leadIndex].capturedAt : now,
    tags: Array.from(new Set([...(leadIndex >= 0 && Array.isArray(leads[leadIndex].tags) ? leads[leadIndex].tags : []), 'application', applicationType])),
  };
  if (leadIndex >= 0) leads[leadIndex] = lead;
  else leads.unshift(lead);
  await kv.set(LEADS_KEY, leads);

  return { application, contact, updated: existingIndex >= 0 };
}

// Universal signup is the public entry point used by every portal registration card.
// Normalize its nested browser payload into the same application → CRM pipeline.
app.post('/make-server-57095a78/signup/universal', async (c) => {
  try {
    const body = await c.req.json(); const personal = body.personalInfo || {}; const address = body.addressInfo || {}; const business = body.businessInfo || {};
    const accountType = String(body.accountType || 'customer');
    const applicationData = { ...body, applicationType: accountType, type: accountType, firstName: personal.firstName, lastName: personal.lastName, name: [personal.firstName, personal.lastName].filter(Boolean).join(' '), email: personal.email, phone: personal.phone, address: [address.street, address.city, address.state, address.zip].filter(Boolean).join(', '), city: address.city, state: address.state, zip: address.zip, companyName: business.companyName || body.companyName, signupSource: 'universal_signup' };
    const { application, updated } = await saveApplicationAndCrm(applicationData);
    const requestKey = `access_request:application:${application.id}`; const priorRequest = await kv.get(requestKey) as any;
    const request = { ...(priorRequest || {}), id: priorRequest?.id || `access_${crypto.randomUUID()}`, applicationId: application.id, email: application.email, requestedPortal: intakePortalType(application), requestedAccountType: accountType, status: application.status === 'approved' ? 'approved' : 'pending', createdAt: priorRequest?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(requestKey, request);
    return c.json({ success: true, applicationId: application.id, application, accessRequest: request, message: updated ? 'Your application has been updated and remains in review.' : 'Application received. We will review your portal access request and follow up soon.' }, updated ? 200 : 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to submit registration.' }, 400); }
});

app.post('/make-server-57095a78/applications', async (c) => {
  try {
    const applicationData = await c.req.json();
    const { application, updated } = await saveApplicationAndCrm(applicationData);
    return c.json({
      success: true,
      applicationId: application.id,
      application,
      message: updated ? 'Your application has been updated and is in review.' : 'Application received. Our team will review it and follow up soon.',
    });
  } catch (error: any) {
    console.error('Application submission error:', error);
    return c.json({ success: false, error: error.message || 'Unable to submit application.' }, 400);
  }
});

// Backward-compatible endpoint used by earlier public application forms.
app.post('/make-server-57095a78/applications/submit', async (c) => {
  try {
    const applicationData = await c.req.json();
    const { application, updated } = await saveApplicationAndCrm(applicationData);
    return c.json({ success: true, applicationId: application.id, application, message: updated ? 'Your application has been updated and is in review.' : 'Application received. Our team will review it and follow up soon.' });
  } catch (error: any) {
    console.error('Application submission error:', error);
    return c.json({ success: false, error: error.message || 'Unable to submit application.' }, 400);
  }
});

app.get('/make-server-57095a78/applications', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || [];
    return c.json({ success: true, applications, total: applications.length });
  } catch (error: any) { return c.json({ success: false, error: error.message, applications: [] }, 500); }
});

app.get('/make-server-57095a78/applications/:id', async (c) => {
  try {
    const user = await intakeActor(c);
    const application = ((await kv.get(APPLICATIONS_KEY)) || []).find((item: any) => item.id === c.req.param('id'));
    if (!application) return c.json({ success: false, error: 'Application not found' }, 404);
    if (!user?.email || (!await intakeIsAdmin(user) && String(application.email || '').toLowerCase() !== String(user.email).toLowerCase())) return c.json({ success: false, error: 'You may only view your own application.' }, 403);
    return c.json({ success: true, application });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

app.patch('/make-server-57095a78/applications/:id', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const patch = await c.req.json();
    const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || [];
    const index = applications.findIndex((item: any) => item.id === c.req.param('id'));
    if (index < 0) return c.json({ success: false, error: 'Application not found' }, 404);
    const prior = applications[index];
    const allowed = { ...patch }; delete allowed.id; delete allowed.email; delete allowed.submittedAt;
    if (String(allowed.status || '').toLowerCase() === 'accepted') allowed.status = 'approved';
    applications[index] = { ...prior, ...allowed, id: prior.id, email: prior.email, submittedAt: prior.submittedAt, updatedAt: new Date().toISOString(), reviewedBy: user.email, reviewedAt: new Date().toISOString() };
    const intake = ['approved', 'active'].includes(String(applications[index].status).toLowerCase()) ? await ensureIntake(applications[index]) : null;
    const access = intake ? await syncPortalAccess(applications[index], intake) : null;
    const planProposal = intake ? await ensureApplicationPlanProposal(applications[index], user.email) : null;
    applications[index] = { ...applications[index], planProposal: planProposal || applications[index].planProposal || null, planProposalId: planProposal?.id || applications[index].planProposalId || null };
    await kv.set(APPLICATIONS_KEY, applications);
    return c.json({ success: true, application: applications[index], intake, access, planProposal });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

app.get('/make-server-57095a78/application-plan-proposals', async (c) => {
  try {
    const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const proposals = await kv.getByPrefix(APPLICATION_PLAN_PROPOSAL_PREFIX) as any[] || [];
    return c.json({ success: true, proposals: proposals.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load plan proposals.' }, 500); }
});

app.patch('/make-server-57095a78/application-plan-proposals/:applicationId', async (c) => {
  try {
    const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const applicationId = c.req.param('applicationId'); const key = `${APPLICATION_PLAN_PROPOSAL_PREFIX}${applicationId}`;
    const current = await kv.get(key) as any; if (!current) return c.json({ success: false, error: 'Plan proposal not found. Approve the application first.' }, 404);
    const body = await c.req.json(); const requestedStatus = String(body.status || current.status).toLowerCase();
    if (!['pending_pricing', 'quoted', 'approved', 'declined'].includes(requestedStatus)) return c.json({ success: false, error: 'Invalid proposal status.' }, 400);
    const quoteProvided = body.quotedMonthlyTotal !== undefined && body.quotedMonthlyTotal !== '';
    const quote = quoteProvided ? money(body.quotedMonthlyTotal) : current.quotedMonthlyTotal;
    if (['quoted', 'approved'].includes(requestedStatus) && !(Number(quote) >= 0)) return c.json({ success: false, error: 'Enter a valid monthly price before quoting or approving this plan.' }, 400);
    let proposal = { ...current, status: requestedStatus, quotedMonthlyTotal: quote, notes: String(body.notes ?? current.notes ?? '').slice(0, 3000), updatedAt: new Date().toISOString(), pricedBy: user.email, pricedAt: new Date().toISOString() };
    let invoice = null;
    if (requestedStatus === 'approved' && !proposal.invoiceId) {
      const invoiceId = crypto.randomUUID(); const now = new Date().toISOString(); const total = money(quote);
      invoice = { id: invoiceId, invoice_id: `INV-PLAN-${now.slice(0, 10).replaceAll('-', '')}-${invoiceId.slice(0, 6).toUpperCase()}`, invoice_number: `INV-PLAN-${now.slice(0, 10).replaceAll('-', '')}-${invoiceId.slice(0, 6).toUpperCase()}`, clientEmail: proposal.ownerEmail, customerEmail: proposal.ownerEmail, customer_name: proposal.applicantName, planProposalId: proposal.id, planProposalApplicationId: applicationId, applicationId, description: `Approved plan: ${proposal.requestedPlan?.planName || 'Custom Plan'}`, line_items: [{ line_number: 1, description: proposal.requestedPlan?.planName || 'Approved custom maintenance plan', quantity: 1, unit_price: total, amount: total }], subtotal: total, tax_rate: 0, tax_amount: 0, discount_amount: 0, total_amount: total, paid_amount: 0, balance_due: total, status: 'pending', is_draft: false, createdAt: now, updatedAt: now, createdBy: user.email };
      await kv.set(`invoice:${invoiceId}`, invoice);
      proposal = { ...proposal, invoiceId, invoiceNumber: invoice.invoice_number, invoiceStatus: 'pending' };
    }
    await kv.set(key, proposal);
    const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || []; const index = applications.findIndex((item: any) => item.id === applicationId);
    if (index >= 0) { applications[index] = { ...applications[index], planProposal: proposal, planProposalId: proposal.id, updatedAt: proposal.updatedAt }; await kv.set(APPLICATIONS_KEY, applications); }
    return c.json({ success: true, proposal, invoice });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update plan proposal.' }, 500); }
});

app.get('/make-server-57095a78/crm/contacts', async (c) => {
  try {
    const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    return c.json({ success: true, contacts: (await kv.get(CRM_CONTACTS_KEY)) || [], hidden: [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-57095a78/crm/contacts', async (c) => {
  try {
    const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const { contacts, hidden } = await c.req.json();
    if (Array.isArray(contacts)) await kv.set(CRM_CONTACTS_KEY, contacts);
    if (Array.isArray(hidden)) await kv.set('crm_hidden_ids:default', hidden);
    return c.json({ success: true, contacts, hidden });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
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

// Property account collections — used by landlord and property-manager portals.
// These retain one source of truth and allow the existing service client paths to resolve.
for (const resource of ['landlords', 'property-managers']) {
  app.get(`/make-server-57095a78/property-management/${resource}`, async (c) => {
    try { return c.json({ success: true, data: (await kv.get(resource)) || [] }); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
  app.get(`/make-server-57095a78/property-management/${resource}/:id`, async (c) => {
    try { const item = ((await kv.get(resource)) || []).find((row: any) => row.id === c.req.param('id')); return item ? c.json({ success: true, data: item }) : c.json({ success: false, error: 'Record not found' }, 404); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
  app.post(`/make-server-57095a78/property-management/${resource}`, async (c) => {
    try { const rows = (await kv.get(resource)) || []; const body = await c.req.json(); const item = { ...stripBase64(body), id: body.id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; await kv.set(resource, [...rows, item]); return c.json({ success: true, data: item }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
  app.put(`/make-server-57095a78/property-management/${resource}/:id`, async (c) => {
    try { const rows = (await kv.get(resource)) || []; const index = rows.findIndex((row: any) => row.id === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Record not found' }, 404); rows[index] = { ...rows[index], ...stripBase64(await c.req.json()), id: rows[index].id, updated_at: new Date().toISOString() }; await kv.set(resource, rows); return c.json({ success: true, data: rows[index] }); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
}

// Landlord properties and requests share the property-operations work queue.
app.get('/make-server-57095a78/property-management/landlords/:id/properties', async (c) => {
  try { const landlordId = c.req.param('id'); return c.json({ success: true, data: ((await kv.get('properties')) || []).filter((item: any) => item.landlordId === landlordId) }); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
app.post('/make-server-57095a78/property-management/landlords/:id/properties', async (c) => {
  try { const rows = (await kv.get('properties')) || []; const body = await c.req.json(); const item = { ...stripBase64(body), id: body.id || crypto.randomUUID(), landlordId: c.req.param('id'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; await kv.set('properties', [...rows, item]); return c.json({ success: true, data: item }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
app.get('/make-server-57095a78/property-management/landlords/:id/work-requests', async (c) => {
  try { const status = c.req.query('status'); const rows = ((await kv.get('work_requests')) || []).filter((item: any) => item.landlordId === c.req.param('id')); return c.json({ success: true, data: status ? rows.filter((item: any) => item.status === status) : rows }); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
app.post('/make-server-57095a78/property-management/landlords/:id/work-requests', async (c) => {
  try { const rows = (await kv.get('work_requests')) || []; const body = await c.req.json(); const item = { ...stripBase64(body), id: body.id || crypto.randomUUID(), landlordId: c.req.param('id'), type: 'landlord', status: body.status || 'pending_approval', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; await kv.set('work_requests', [...rows, item]); return c.json({ success: true, data: item }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
app.put('/make-server-57095a78/property-management/landlords/:id/work-requests/:requestId', async (c) => {
  try { const rows = (await kv.get('work_requests')) || []; const index = rows.findIndex((item: any) => item.id === c.req.param('requestId') && item.landlordId === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Work request not found' }, 404); rows[index] = { ...rows[index], ...stripBase64(await c.req.json()), id: rows[index].id, landlordId: rows[index].landlordId, updated_at: new Date().toISOString() }; await kv.set('work_requests', rows); return c.json({ success: true, data: rows[index] }); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
function propertyAdminAlert(title: string, description: string, data: any) { return { id: `property_${crypto.randomUUID()}`, type: 'info', category: 'Property Management', title, description, status: 'unread', source: 'property-management-hub', data, timestamp: new Date().toISOString() }; }
async function requirePropertyAdmin(c: any) { const user = await intakeActor(c); return await intakeIsAdmin(user) ? user : null; }
app.get('/make-server-57095a78/property-management/stats', async (c) => {
  try { if (!await requirePropertyAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const [condos, landlords, managers, requests, properties] = await Promise.all([kv.get('condos'), kv.get('landlords'), kv.get('property-managers'), kv.get('work_requests'), kv.getByPrefix('property_manager_portfolio:')]); const all = requests || []; const portfolios = (properties || []).flatMap((item: any) => Array.isArray(item) ? item : []); return c.json({ success: true, data: { totalCondos: (condos || []).length, totalLandlords: (landlords || []).length, totalPropertyManagers: (managers || []).length, totalProperties: portfolios.length, pendingApproval: all.filter((item: any) => item.status === 'pending_approval').length, approved: all.filter((item: any) => item.status === 'approved').length, inProgress: all.filter((item: any) => ['assigned', 'in-progress'].includes(item.status)).length, completed: all.filter((item: any) => item.status === 'completed').length, totalWorkRequests: all.length } }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

app.get('/make-server-57095a78/property-management/work-requests/pending', async (c) => { try { if (!await requirePropertyAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const allWorkRequests = await kv.get('work_requests') || []; return c.json({ success: true, data: allWorkRequests.filter((wr: any) => wr.status === 'pending_approval') }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.get('/make-server-57095a78/property-management/work-requests/approved', async (c) => { try { if (!await requirePropertyAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const allWorkRequests = await kv.get('work_requests') || []; return c.json({ success: true, data: allWorkRequests.filter((wr: any) => ['approved', 'offered', 'assigned', 'in-progress'].includes(wr.status)) }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/property-management/work-requests/:id/offer', async (c) => { try { const user = await requirePropertyAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const rows = (await kv.get('work_requests') as any[]) || []; const index = rows.findIndex((item: any) => item.id === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Work request not found.' }, 404); const now = new Date().toISOString(); const request = rows[index] = { ...rows[index], status: 'offered', offerMessage: String(body.message || '').trim().slice(0, 2000), offeredAt: now, offeredBy: user.email, updated_at: now }; await kv.set('work_requests', rows); const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift(propertyAdminAlert(`Offer prepared: ${request.title || request.id}`, `Property offer created by ${user.email}.`, { workRequestId: request.id })); await kv.set('admin_alerts', alerts.slice(0, 200)); return c.json({ success: true, data: request, delivery: { queued: true, emailSent: false }, message: 'Offer recorded and queued for delivery. Configure an email provider to send email automatically.' }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/property-management/offers/send', async (c) => { try { const user = await requirePropertyAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const workRequestId = String(body.workRequestId || ''); const recipientEmail = String(body.recipientEmail || '').trim().toLowerCase(); if (!workRequestId || !/^\S+@\S+\.\S+$/.test(recipientEmail)) return c.json({ success: false, error: 'A work request and valid recipient email are required.' }, 400); const rows = (await kv.get('work_requests') as any[]) || []; const index = rows.findIndex((item: any) => item.id === workRequestId); if (index < 0) return c.json({ success: false, error: 'Work request not found.' }, 404); const now = new Date().toISOString(); const offer = { id: crypto.randomUUID(), workRequestId, propertyType: String(body.propertyType || ''), recipientEmail, recipientName: String(body.recipientName || '').trim().slice(0, 120), details: stripBase64(body.offerDetails || {}), status: 'queued', createdAt: now, createdBy: user.email }; const offers = (await kv.get('property_offers') as any[]) || []; offers.unshift(offer); await kv.set('property_offers', offers.slice(0, 1000)); const request = rows[index] = { ...rows[index], status: 'offered', offerId: offer.id, offerRecipientEmail: recipientEmail, offeredAt: now, offeredBy: user.email, updated_at: now }; await kv.set('work_requests', rows); const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift(propertyAdminAlert(`Offer queued: ${request.title || request.id}`, `Offer queued for ${recipientEmail}.`, { workRequestId, offerId: offer.id })); await kv.set('admin_alerts', alerts.slice(0, 200)); return c.json({ success: true, data: request, offer, delivery: { queued: true, emailSent: false }, message: 'Offer saved and queued. Configure email delivery to send it externally.' }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/property-management/work-requests/:id/assign', async (c) => { try { const user = await requirePropertyAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const crewName = String(body.crewName || '').trim().slice(0, 160); if (!crewName) return c.json({ success: false, error: 'Choose a crew or technician before assigning this request.' }, 400); const rows = (await kv.get('work_requests') as any[]) || []; const index = rows.findIndex((item: any) => item.id === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Work request not found.' }, 404); const now = new Date().toISOString(); const request = rows[index] = { ...rows[index], status: 'assigned', assignedTo: crewName, assignedAt: now, assignedBy: user.email, updated_at: now }; await kv.set('work_requests', rows); const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift(propertyAdminAlert(`Crew assigned: ${request.title || request.id}`, `${crewName} assigned by ${user.email}.`, { workRequestId: request.id, crewName })); await kv.set('admin_alerts', alerts.slice(0, 200)); return c.json({ success: true, data: request }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

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
// Data backups are per signed-in account. The browser only calls these routes
// with a Supabase session token; anonymous writes would leak local app data into
// a shared backup and also caused repeated 401 retries during app startup.
async function backupActor(c: any) {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

app.post('/make-server-57095a78/data/backup', async (c) => {
  try {
    const user = await backupActor(c);
    if (!user?.id) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const body = await c.req.json();
    if (!body?.data || typeof body.data !== 'object') return c.json({ success: false, error: 'Invalid backup payload.' }, 400);
    await kv.set(`data_backup_${user.id}`, body);
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save backup.' }, 500); }
});

app.get('/make-server-57095a78/data/restore', async (c) => {
  try {
    const user = await backupActor(c);
    if (!user?.id) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const backup = await kv.get(`data_backup_${user.id}`);
    return c.json({ success: true, backup: backup || null });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to restore backup.' }, 500); }
});

// ── LIVE CHAT & PAYMENT GATEWAY SETTINGS ─────────────────────────────────────
// Public chat appearance is intentionally readable without authentication. Every
// administrative write and every lead read requires an actual owner/admin session.
const CHAT_CONFIG_KEY = 'live_chat_config';
const CHAT_LEADS_KEY = 'live_chat_leads';
const PAYMENT_GATEWAYS_KEY = 'payment_gateway_configs';
const defaultChatConfig = { enabled: true, businessName: 'Black Phoenix Builds', welcomeMessage: 'Hi there! How can we help you today?', accentColor: '#ea580c', position: 'bottom-right', agentName: 'Phoenix Support', collectLeads: true, aiEnabled: true, businessHours: { start: 8, end: 18 }, quickReplies: ['Get a free estimate', 'What services do you offer?', 'How much does it cost?', 'Schedule a call'] };
function cleanChatConfig(value: any) { const body = value || {}; const color = /^#[0-9a-fA-F]{6}$/.test(String(body.accentColor || '')) ? body.accentColor : defaultChatConfig.accentColor; return { enabled: Boolean(body.enabled), businessName: String(body.businessName || defaultChatConfig.businessName).trim().slice(0, 100), welcomeMessage: String(body.welcomeMessage || defaultChatConfig.welcomeMessage).trim().slice(0, 1000), accentColor: color, position: body.position === 'bottom-left' ? 'bottom-left' : 'bottom-right', agentName: String(body.agentName || defaultChatConfig.agentName).trim().slice(0, 100), collectLeads: body.collectLeads !== false, aiEnabled: body.aiEnabled !== false, businessHours: { start: Math.max(0, Math.min(23, Number(body.businessHours?.start ?? 8))), end: Math.max(0, Math.min(23, Number(body.businessHours?.end ?? 18))) }, quickReplies: Array.isArray(body.quickReplies) ? body.quickReplies.map((item: any) => String(item).trim().slice(0, 160)).filter(Boolean).slice(0, 12) : defaultChatConfig.quickReplies }; }
app.get('/make-server-57095a78/chat/config', async (c) => { try { return c.json({ success: true, config: cleanChatConfig(await kv.get(CHAT_CONFIG_KEY)) }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/chat/config', async (c) => { try { const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const config = { ...cleanChatConfig(await c.req.json()), updatedAt: new Date().toISOString(), updatedBy: user.email }; await kv.set(CHAT_CONFIG_KEY, config); return c.json({ success: true, config: cleanChatConfig(config) }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.get('/make-server-57095a78/chat/leads', async (c) => { try { const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); return c.json({ success: true, leads: (await kv.get(CHAT_LEADS_KEY) as any[]) || [] }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/chat/leads', async (c) => { try { const body = await c.req.json(); const email = String(body.email || '').trim().toLowerCase(); const name = String(body.name || '').trim().slice(0, 120); if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ success: false, error: 'A valid email is required.' }, 400); const leads = (await kv.get(CHAT_LEADS_KEY) as any[]) || []; const lead = { id: crypto.randomUUID(), email, name: name || email.split('@')[0], source: String(body.source || 'live_chat').slice(0, 80), capturedAt: new Date().toISOString() }; const index = leads.findIndex((item: any) => String(item.email).toLowerCase() === email); if (index >= 0) leads[index] = { ...leads[index], ...lead, id: leads[index].id }; else leads.unshift(lead); await kv.set(CHAT_LEADS_KEY, leads.slice(0, 1000)); return c.json({ success: true, lead }, 201); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.delete('/make-server-57095a78/chat/leads', async (c) => { try { const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); await kv.set(CHAT_LEADS_KEY, []); return c.json({ success: true }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

// Gateway state is shared across devices but never accepts API keys or secrets.
app.get('/make-server-57095a78/payment-gateways', async (c) => { try { const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); return c.json({ success: true, configs: (await kv.get(PAYMENT_GATEWAYS_KEY)) || {} }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/payment-gateways', async (c) => { try { const user = await intakeActor(c); if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const supplied = (await c.req.json()).configs || {}; const allowed = ['stripe', 'paypal', 'square', 'bank_of_america', 'stellar', 'xdc']; const configs: Record<string, any> = {}; for (const id of allowed) if (supplied[id]) configs[id] = { is_active: Boolean(supplied[id].is_active), test_mode: supplied[id].test_mode !== false, updated_at: new Date().toISOString(), updated_by: user.email }; await kv.set(PAYMENT_GATEWAYS_KEY, configs); return c.json({ success: true, configs }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

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
    if (!await intakeIsAdmin(user)) return c.json({ error: 'Administrator access is required' }, 403);

    const alerts = (await kv.get('admin_alerts') as any[]) || [];
    return c.json({ alerts });
  } catch (e: any) {
    return c.json({ alerts: [], error: e.message }, 500);
  }
});

app.put('/make-server-57095a78/notifications/admin-alerts/:id', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!await intakeIsAdmin(user)) return c.json({ error: 'Administrator access is required' }, 403);
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

async function workRequestActor(c: any) {
  const user = await intakeActor(c);
  return { user, admin: await intakeIsAdmin(user) };
}

function ownsWorkRequest(record: any, user: any) {
  const email = String(user?.email || '').toLowerCase();
  return Boolean(
    (user?.id && (record.user_id === user.id || record.userId === user.id)) ||
    (email && [record.client_email, record.clientEmail, record.client_info?.email, record.email]
      .some((value: any) => String(value || '').toLowerCase() === email))
  );
}

async function readWorkRequests() {
  const index: string[] = (await kv.get('wr_index') as string[]) || [];
  let all: any[] = index.length
    ? (await Promise.all(index.map(id => kv.get(`wr:${id}`)))).filter(Boolean) as any[]
    : (await kv.get('all_work_requests') as any[]) || [];
  try {
    const { data } = await supabase.from('work_requests').select('data').order('created_at', { ascending: false }).limit(500);
    const present = new Set(all.map((record: any) => record.id));
    all = [...all, ...((data || []).map((row: any) => row.data).filter((record: any) => record && !present.has(record.id)))];
  } catch { /* KV remains the durable fallback when the optional table is absent. */ }
  return all;
}

async function persistWorkRequest(record: any) {
  await kv.set(`wr:${record.id}`, record);
  const index: string[] = (await kv.get('wr_index') as string[]) || [];
  if (!index.includes(record.id)) await kv.set('wr_index', [record.id, ...index].slice(0, 1000));
  const legacy = (await kv.get('all_work_requests') as any[]) || [];
  const nextLegacy = [record, ...legacy.filter((item: any) => item.id !== record.id)].slice(0, 500);
  await kv.set('all_work_requests', nextLegacy);
  try {
    await supabase.from('work_requests').upsert([{
      id: record.id, client_name: record.client_name || '', client_email: record.client_email || '',
      client_phone: record.client_phone || '', user_id: record.user_id || null,
      service_type: record.serviceType || record.project_type || null,
      title: record.project_name || record.title || null, description: record.description || null,
      status: record.status || 'pending', data: record, created_at: record.created_at, updated_at: record.updated_at,
    }], { onConflict: 'id' });
  } catch (error: any) { console.warn('[Work Requests] Database mirror skipped:', error?.message); }
}

// Authenticated customers can submit requests. Anonymous submissions are retained
// as intake leads, but never become readable through the portal until the customer signs in.
app.post('/make-server-57095a78/work-requests', async (c) => {
  try {
    await ensureStorageBuckets().catch(() => {});
    const body = await c.req.json();
    const { user, admin } = await workRequestActor(c);
    const suppliedEmail = String(body.client_info?.email || body.clientEmail || body.email || '').trim().toLowerCase();
    if (!admin && user?.email && suppliedEmail && suppliedEmail !== String(user.email).toLowerCase()) {
      return c.json({ error: 'The request email must match the signed-in account.' }, 403);
    }
    const clientEmail = String((admin && suppliedEmail) ? suppliedEmail : (user?.email || suppliedEmail)).toLowerCase();
    if (!clientEmail) return c.json({ error: 'A customer email is required.' }, 400);
    const clientName = body.client_info?.name || body.clientName || body.name || user?.user_metadata?.full_name || '';
    const record = {
      ...stripBase64(body), id: String(body.id || `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`),
      client_email: clientEmail, client_name: clientName, client_phone: body.client_info?.phone || body.clientPhone || body.phone || '',
      user_id: user?.id || body.user_id || body.userId || '', status: 'pending',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await persistWorkRequest(record);
    const alerts = (await kv.get('admin_alerts') as any[]) || [];
    alerts.unshift({ id: `wr_alert_${record.id}`, type: 'urgent', category: 'Work Requests', title: `New Work Request: ${clientName || 'Customer'}`,
      description: `${clientName || 'Customer'} submitted a ${record.serviceType || record.project_type || 'service'} request.`, priority: 'high', status: 'unread', source: 'work-request-form', actionRequired: true, timestamp: new Date().toISOString(), data: { workRequestId: record.id, clientEmail } });
    await kv.set('admin_alerts', alerts.slice(0, 200));
    return c.json({ success: true, workRequest: stripBase64(record) }, 201);
  } catch (error: any) { console.error('[Work Requests] Create error:', error); return c.json({ error: error.message || 'Unable to create work request.' }, 500); }
});

app.get('/make-server-57095a78/work-requests', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ error: 'Sign in to view work requests.' }, 401);
    const all = await readWorkRequests();
    // Query values are deliberately ignored for non-admins: a portal user can only ever read their own records.
    const records = admin ? all : all.filter((record: any) => ownsWorkRequest(record, user));
    return c.json(stripBase64(records));
  } catch (error: any) { return c.json({ error: error.message || 'Unable to load work requests.' }, 500); }
});

app.get('/make-server-57095a78/work-requests/:id', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ error: 'Sign in to view this work request.' }, 401);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ error: 'Work request not found.' }, 404);
    if (!admin && !ownsWorkRequest(record, user)) return c.json({ error: 'You may only view your own work requests.' }, 403);
    return c.json(stripBase64(record));
  } catch (error: any) { return c.json({ error: error.message || 'Unable to load work request.' }, 500); }
});

app.put('/make-server-57095a78/work-requests/:id', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const existing = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!existing) return c.json({ error: 'Work request not found.' }, 404);
    if (!admin && !ownsWorkRequest(existing, user)) return c.json({ error: 'You may only update your own work request.' }, 403);
    const input = stripBase64(await c.req.json());
    const customerFields = ['media_attachments', 'description', 'client_phone', 'client_info', 'project_details'];
    const updates = admin ? input : Object.fromEntries(Object.entries(input).filter(([key]) => customerFields.includes(key)));
    if (!admin && Object.keys(updates).length === 0) return c.json({ error: 'This update requires administrator access.' }, 403);
    const record = { ...existing, ...updates, id: existing.id, client_email: existing.client_email, user_id: existing.user_id, updated_at: new Date().toISOString() };
    await persistWorkRequest(record);
    return c.json({ success: true, workRequest: stripBase64(record) });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to update work request.' }, 500); }
});

// ── PROJECT SCHEDULES + INTERNAL FIELD NOTES ────────────────────────────────
// These records stay on the canonical work request so scheduling and field notes
// survive browser changes and are visible to the authorized operations team.
function internalWorkAccess(record: any, user: any, admin: boolean) {
  if (admin) return true;
  const role = String(user?.app_metadata?.role || user?.user_metadata?.role || user?.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (['employee', 'technician', 'field_technician', 'maintenance_tech', 'subcontractor', 'service_provider'].includes(role)) return true;
  const email = String(user?.email || '').toLowerCase();
  return Boolean(email && [record.assignedToEmail, record.assigned_to_email, record.assignedTechnicianEmail, record.assigned_technician_email, record.employeeEmail, record.employee_email]
    .some((value: any) => String(value || '').toLowerCase() === email));
}

// Unit-entry details are confidential operational data. A field employee can only
// receive them for an explicitly assigned work order—not for every company job.
function assignedFieldWorkAccess(record: any, user: any, admin: boolean) {
  if (admin) return true;
  const role = String(user?.app_metadata?.role || user?.user_metadata?.role || user?.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!['employee', 'technician', 'field_technician', 'maintenance_tech', 'subcontractor', 'service_provider'].includes(role)) return false;
  const email = String(user?.email || '').trim().toLowerCase();
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim().toLowerCase();
  const ids = [record.assignedEmployeeId, record.assigned_employee_id, record.employeeId, record.employee_id].map((value: any) => String(value || ''));
  const emails = [record.assignedToEmail, record.assigned_to_email, record.assignedTechnicianEmail, record.assigned_technician_email, record.employeeEmail, record.employee_email].map((value: any) => String(value || '').trim().toLowerCase());
  const names = [record.assignedTo, record.assigned_to, record.assignedTechnician, record.assigned_technician].map((value: any) => String(value || '').trim().toLowerCase());
  return ids.includes(String(user?.id || '')) || (!!email && (emails.includes(email) || names.includes(email))) || (!!name && names.includes(name));
}

function fieldWorkOrderPayload(record: any) {
  const access = record.unit_access || record.unitAccess || {};
  return {
    id: record.id, workRequestId: record.id, title: record.title || record.project_name || record.serviceType || record.project_type || 'Work order',
    location: [record.site_address || record.address || record.location || '', access.unitNumber || record.unit || record.unitNumber || ''].filter(Boolean).join(' · '),
    scheduledAt: record.scheduledAt || record.scheduled_at || record.requestedDate || record.created_at || new Date().toISOString(), status: record.status || 'assigned',
    access: { unitNumber: String(access.unitNumber || record.unit || record.unitNumber || ''), entryInstructions: String(access.entryInstructions || access.instructions || ''), accessContact: String(access.accessContact || ''), accessWindow: String(access.accessWindow || '') },
  };
}

app.get('/make-server-57095a78/field/work-orders', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const records = await readWorkRequests();
    const workOrders = records.filter((record: any) => assignedFieldWorkAccess(record, user, admin) && !['cancelled', 'rejected'].includes(String(record.status || '').toLowerCase())).map(fieldWorkOrderPayload);
    return c.json({ success: true, workOrders });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load assigned work orders.' }, 500); }
});

app.post('/make-server-57095a78/field/work-orders/:id/status', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work order not found.' }, 404);
    if (!assignedFieldWorkAccess(record, user, admin)) return c.json({ success: false, error: 'This work order is not assigned to your account.' }, 403);
    const body = await c.req.json(); const status = String(body.status || '').toLowerCase();
    if (!['in-progress', 'completed', 'on-hold'].includes(status)) return c.json({ success: false, error: 'Unsupported field status.' }, 400);
    const now = new Date().toISOString(); const updated = { ...record, status, fieldStatusUpdatedAt: now, fieldStatusUpdatedBy: user.email, updated_at: now };
    await persistWorkRequest(updated);
    return c.json({ success: true, workOrder: fieldWorkOrderPayload(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update work order.' }, 500); }
});

app.put('/make-server-57095a78/work-requests/:id/project-schedule', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user || !admin) return c.json({ success: false, error: 'Administrator access is required to publish a project schedule.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    const body = await c.req.json();
    if (!Array.isArray(body.tasks) || !body.tasks.length) return c.json({ success: false, error: 'Add at least one schedule task before publishing.' }, 400);
    const tasks = body.tasks.slice(0, 100).map((task: any, index: number) => {
      const title = String(task.title || '').trim().slice(0, 180);
      const startDate = String(task.startDate || ''); const endDate = String(task.endDate || '');
      if (!title || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) throw new Error(`Task ${index + 1} needs a title, start date, and end date.`);
      return { id: String(task.id || `task_${crypto.randomUUID()}`), title, startDate, endDate, duration: Math.max(0, Number(task.duration) || 0), assignedTo: String(task.assignedTo || '').slice(0, 180), dependencies: Array.isArray(task.dependencies) ? task.dependencies.slice(0, 30).map(String) : [], status: ['not-started', 'in-progress', 'completed'].includes(String(task.status)) ? task.status : 'not-started', color: String(task.color || '#3b82f6').slice(0, 24) };
    });
    const now = new Date().toISOString();
    const projectSchedule = { id: record.projectSchedule?.id || `project_schedule_${crypto.randomUUID()}`, tasks, quoteNumber: String(body.quoteNumber || '').slice(0, 100), projectTitle: String(body.projectTitle || record.title || record.project_name || '').slice(0, 220), publishedBy: user.email, publishedAt: record.projectSchedule?.publishedAt || now, updatedAt: now };
    const updated = { ...record, projectSchedule, updated_at: now };
    await persistWorkRequest(updated);
    await kv.set(`project_schedule:${projectSchedule.id}`, { ...projectSchedule, workRequestId: record.id });
    return c.json({ success: true, workRequest: stripBase64(updated), projectSchedule });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to publish project schedule.' }, 500); }
});

app.get('/make-server-57095a78/work-requests/:id/notes', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in to view project notes.' }, 401);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!internalWorkAccess(record, user, admin)) return c.json({ success: false, error: 'This internal project record is not assigned to your account.' }, 403);
    return c.json({ success: true, notes: Array.isArray(record.internalNotesLog) ? record.internalNotesLog : [] });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load project notes.' }, 500); }
});

app.post('/make-server-57095a78/work-requests/:id/notes', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in before adding a project note.' }, 401);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!internalWorkAccess(record, user, admin)) return c.json({ success: false, error: 'This internal project record is not assigned to your account.' }, 403);
    const content = String((await c.req.json()).content || '').trim().slice(0, 10000);
    if (!content) return c.json({ success: false, error: 'Note content cannot be empty.' }, 400);
    const now = new Date().toISOString(); const note = { id: `note_${crypto.randomUUID()}`, content, author: String(user.user_metadata?.full_name || user.email), authorEmail: user.email, authorId: user.id, createdAt: now };
    const updated = { ...record, internalNotesLog: [note, ...(Array.isArray(record.internalNotesLog) ? record.internalNotesLog : [])].slice(0, 500), updated_at: now };
    await persistWorkRequest(updated); return c.json({ success: true, note }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add project note.' }, 500); }
});

app.put('/make-server-57095a78/work-requests/:id/notes/:noteId', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c); if (!user) return c.json({ success: false, error: 'Sign in before editing a project note.' }, 401);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any; if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!internalWorkAccess(record, user, admin)) return c.json({ success: false, error: 'This internal project record is not assigned to your account.' }, 403);
    const notes = Array.isArray(record.internalNotesLog) ? record.internalNotesLog : []; const noteIndex = notes.findIndex((note: any) => note.id === c.req.param('noteId'));
    if (noteIndex < 0) return c.json({ success: false, error: 'Note not found.' }, 404); if (!admin && String(notes[noteIndex].authorId || '') !== String(user.id)) return c.json({ success: false, error: 'You may only edit your own note.' }, 403);
    const content = String((await c.req.json()).content || '').trim().slice(0, 10000); if (!content) return c.json({ success: false, error: 'Note content cannot be empty.' }, 400);
    const now = new Date().toISOString(); notes[noteIndex] = { ...notes[noteIndex], content, updatedAt: now }; await persistWorkRequest({ ...record, internalNotesLog: notes, updated_at: now }); return c.json({ success: true, note: notes[noteIndex] });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to edit project note.' }, 500); }
});

app.delete('/make-server-57095a78/work-requests/:id/notes/:noteId', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c); if (!user) return c.json({ success: false, error: 'Sign in before deleting a project note.' }, 401);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any; if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!internalWorkAccess(record, user, admin)) return c.json({ success: false, error: 'This internal project record is not assigned to your account.' }, 403);
    const notes = Array.isArray(record.internalNotesLog) ? record.internalNotesLog : []; const note = notes.find((item: any) => item.id === c.req.param('noteId'));
    if (!note) return c.json({ success: false, error: 'Note not found.' }, 404); if (!admin && String(note.authorId || '') !== String(user.id)) return c.json({ success: false, error: 'You may only delete your own note.' }, 403);
    await persistWorkRequest({ ...record, internalNotesLog: notes.filter((item: any) => item.id !== note.id), updated_at: new Date().toISOString() }); return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete project note.' }, 500); }
});

// Property managers have a scoped operations queue.  Unlike the legacy
// property-management routes, this route requires a signed-in portal user and
// only returns requests explicitly assigned to that manager.
async function propertyManagerActor(c: any) {
  const user = await intakeActor(c);
  if (!user?.email) return { user: null, admin: false, manager: false };
  const admin = await intakeIsAdmin(user);
  if (admin) return { user, admin: true, manager: true };
  const email = String(user.email).toLowerCase();
  // Property, condo, and landlord portals all use this scoped operations layer.
  // Check each portal grant so a valid landlord is never rejected by a
  // property-manager-only access lookup.
  const portalTypes = ['property_manager', 'condo_manager', 'landlord'];
  const accessRecords = await Promise.all(portalTypes.map(async (portalType) =>
    await kv.get(`portal_access:${email}:${portalType}`) as any
  ));
  const metadataRole = String(user.user_metadata?.role || user.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  const manager = portalTypes.includes(metadataRole) || accessRecords.some((access) => access?.status === 'active');
  return { user, admin: false, manager };
}

function assignedToPropertyManager(record: any, user: any) {
  const email = String(user?.email || '').toLowerCase();
  // A manager can always operate requests their own authenticated account created.
  // Tenant/owner requests additionally require an explicit manager assignment.
  return ownsWorkRequest(record, user) || Boolean(
    (user?.id && [record.propertyManagerUserId, record.property_manager_user_id, record.assignedManagerUserId]
      .some((value: any) => String(value || '') === String(user.id))) ||
    (email && [record.propertyManagerEmail, record.property_manager_email, record.managerEmail, record.assignedManagerEmail]
      .some((value: any) => String(value || '').toLowerCase() === email))
  );
}

function assignedToCondoManager(record: any, user: any) {
  const email = String(user?.email || '').toLowerCase();
  return ownsWorkRequest(record, user) || Boolean(
    (user?.id && [record.condoManagerUserId, record.condo_manager_user_id, record.assignedManagerUserId]
      .some((value: any) => String(value || '') === String(user.id))) ||
    (email && [record.condoManagerEmail, record.condo_manager_email, record.managerEmail, record.assignedManagerEmail]
      .some((value: any) => String(value || '').toLowerCase() === email))
  );
}

function condoUnitsKey(email: string) { return `condo_manager_units:${String(email).toLowerCase()}`; }

app.get('/make-server-57095a78/condo-manager/units', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view association units.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    return c.json({ success: true, units: ((await kv.get(condoUnitsKey(actor.user.email))) as any[] || []).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load association units.' }, 500); }
});

app.post('/make-server-57095a78/condo-manager/units', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a unit.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const body = stripBase64(await c.req.json()); const number = String(body.number || '').trim(); const owner = String(body.owner || '').trim(); const status = ['occupied', 'vacant'].includes(String(body.status || 'occupied')) ? String(body.status) : 'occupied'; const dues = ['current', 'overdue', 'n/a'].includes(String(body.dues || 'n/a')) ? String(body.dues) : 'n/a';
    if (!number) return c.json({ success: false, error: 'Unit number is required.' }, 400);
    if (status === 'occupied' && !owner) return c.json({ success: false, error: 'An owner is required for an occupied unit.' }, 400);
    const key = condoUnitsKey(actor.user.email); const existing = (await kv.get(key) as any[]) || [];
    if (existing.some((unit: any) => String(unit.number).toLowerCase() === number.toLowerCase())) return c.json({ success: false, error: 'This unit already exists in your association roster.' }, 409);
    const now = new Date().toISOString(); const unit = { id: `condo_unit_${crypto.randomUUID()}`, number, owner: status === 'vacant' ? 'Vacant' : owner, status, dues: status === 'vacant' ? 'n/a' : dues, condoManagerEmail: actor.user.email, condoManagerUserId: actor.user.id, createdAt: now, updatedAt: now };
    await kv.set(key, [unit, ...existing]); return c.json({ success: true, unit }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add unit.' }, 500); }
});

app.get('/make-server-57095a78/condo-manager/work-requests', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view condo work requests.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const records = await readWorkRequests();
    return c.json({ success: true, workRequests: (actor.admin ? records : records.filter((record: any) => assignedToCondoManager(record, actor.user))).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load condo work requests.' }, 500); }
});

app.patch('/make-server-57095a78/condo-manager/work-requests/:id/decision', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in before making a decision.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!actor.admin && !assignedToCondoManager(record, actor.user)) return c.json({ success: false, error: 'This request is not assigned to your condo-management account.' }, 403);
    const body = await c.req.json(); const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString(); const updated = { ...record, status: decision, approvalHistory: [...(Array.isArray(record.approvalHistory) ? record.approvalHistory : []), { status: decision, note: String(body.note || '').slice(0, 2000), actorEmail: actor.user.email, decidedAt: now }], lastDecisionBy: actor.user.email, lastDecisionAt: now, updated_at: now };
    await persistWorkRequest(updated);
    return c.json({ success: true, workRequest: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update condo work request.' }, 500); }
});

async function landlordActor(c: any) {
  const user = await intakeActor(c);
  if (!user?.email) return { user: null, admin: false, landlord: false };
  const admin = await intakeIsAdmin(user);
  if (admin) return { user, admin: true, landlord: true };
  const email = String(user.email).toLowerCase();
  const metadataRole = String(user.user_metadata?.role || user.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  // Earlier landlord applications used the property_manager intake type. Keep
  // those approved accounts working while allowing the explicit landlord role.
  const access = await kv.get(`portal_access:${email}:property_manager`) as any || await kv.get(`portal_access:${email}:landlord`) as any;
  return { user, admin: false, landlord: metadataRole === 'landlord' || access?.status === 'active' };
}

app.get('/make-server-57095a78/landlord/work-requests', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view maintenance requests.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const records = await readWorkRequests();
    const scoped = actor.admin ? records : records.filter((record: any) => ownsWorkRequest(record, actor.user) || String(record.landlordEmail || '').toLowerCase() === String(actor.user.email).toLowerCase() || String(record.ownerEmail || '').toLowerCase() === String(actor.user.email).toLowerCase());
    return c.json({ success: true, workRequests: scoped.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load maintenance requests.' }, 500); }
});

app.patch('/make-server-57095a78/landlord/work-requests/:id/decision', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in before making a decision.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Maintenance request not found.' }, 404);
    const owns = ownsWorkRequest(record, actor.user) || String(record.landlordEmail || '').toLowerCase() === String(actor.user.email).toLowerCase() || String(record.ownerEmail || '').toLowerCase() === String(actor.user.email).toLowerCase();
    if (!actor.admin && !owns) return c.json({ success: false, error: 'This request is not assigned to your landlord account.' }, 403);
    const body = await c.req.json(); const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString();
    const updated = { ...record, status: decision, approvalHistory: [...(Array.isArray(record.approvalHistory) ? record.approvalHistory : []), { status: decision, note: String(body.note || '').slice(0, 2000), actorEmail: actor.user.email, decidedAt: now }], lastDecisionBy: actor.user.email, lastDecisionAt: now, updated_at: now };
    await persistWorkRequest(updated);
    return c.json({ success: true, workRequest: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update maintenance request.' }, 500); }
});

function landlordTenantsKey(email: string) { return `landlord_tenants:${String(email).toLowerCase()}`; }

app.get('/make-server-57095a78/landlord/tenants', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view tenants.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    return c.json({ success: true, tenants: ((await kv.get(landlordTenantsKey(actor.user.email))) as any[] || []).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load tenants.' }, 500); }
});

app.post('/make-server-57095a78/landlord/tenants', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a tenant.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const body = stripBase64(await c.req.json()); const name = String(body.name || '').trim(); const unit = String(body.unit || '').trim(); const rent = Number(body.rent);
    const status = ['current', 'late', 'pending'].includes(String(body.status || 'current')) ? String(body.status) : 'current';
    if (!name) return c.json({ success: false, error: 'Tenant name is required.' }, 400);
    if (!unit) return c.json({ success: false, error: 'Unit is required.' }, 400);
    if (!Number.isFinite(rent) || rent < 0) return c.json({ success: false, error: 'Monthly rent must be zero or greater.' }, 400);
    const now = new Date().toISOString(); const tenant = { id: `tenant_${crypto.randomUUID()}`, name, unit, rent: Math.round(rent * 100) / 100, status, landlordEmail: actor.user.email, landlordUserId: actor.user.id, createdAt: now, updatedAt: now };
    const key = landlordTenantsKey(actor.user.email); const existing = (await kv.get(key) as any[]) || []; await kv.set(key, [tenant, ...existing]);
    return c.json({ success: true, tenant }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add tenant.' }, 500); }
});

// ── TENANT SUB-PORTALS ───────────────────────────────────────────────────────
// Tenant records are deliberately stored one-per-record and indexed by both the
// authenticated tenant email and the inviting portal email. This keeps a tenant
// in the exact parent portal that invited them—never in a shared resident pool.
const TENANT_PARENT_TYPES = ['landlord', 'property_manager', 'condo_manager'];
const TENANT_DEFAULT_EXPERIENCE = {
  marqueeItems: [
    'Submit a maintenance request anytime. Your property team reviews every request.',
    'Keep your unit details current so your service team can arrive prepared.',
    'Explore resident rewards, gift cards, and services from Black Phoenix.',
  ],
  ads: [
    { id: 'gift-cards', title: 'Give a little help', body: 'Send a Black Phoenix gift card for a project, repair, or seasonal refresh.', ctaLabel: 'View gift cards', ctaRoute: 'gift-cards', active: true },
    { id: 'shop', title: 'Resident essentials', body: 'Shop curated home and maintenance products from the Black Phoenix store.', ctaLabel: 'Open shop', ctaRoute: 'public-store', active: true },
  ],
};
function tenantPortalKey(id: string) { return `tenant_portal:${id}`; }
function tenantPortalEmailKey(email: string) { return `tenant_portal_email:${String(email).trim().toLowerCase()}`; }
function tenantPortalParentKey(email: string) { return `tenant_portal_parent:${String(email).trim().toLowerCase()}`; }
function tenantExperienceKey(email: string) { return `tenant_portal_experience:${String(email).trim().toLowerCase()}`; }

async function tenantParentActor(c: any, requestedType?: string) {
  const actor = await propertyManagerActor(c);
  if (!actor.user?.email || !actor.manager) return { ...actor, allowed: false, portalType: '' };
  const portalType = String(requestedType || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!TENANT_PARENT_TYPES.includes(portalType)) return { ...actor, allowed: false, portalType };
  if (actor.admin) return { ...actor, allowed: true, portalType };
  const email = String(actor.user.email).toLowerCase();
  const access = await kv.get(`portal_access:${email}:${portalType}`) as any;
  const metadataRole = String(actor.user.user_metadata?.role || actor.user.user_metadata?.accountType || '').toLowerCase().replace(/[\s-]+/g, '_');
  // Preserve only the documented legacy path: former landlord accounts may have
  // property_manager access. Other portal types must have their own grant.
  const landlordLegacy = portalType === 'landlord' && (metadataRole === 'landlord' || (await kv.get(`portal_access:${email}:property_manager`) as any)?.status === 'active');
  return { ...actor, allowed: access?.status === 'active' || metadataRole === portalType || landlordLegacy, portalType };
}

async function tenantActor(c: any) {
  const user = await intakeActor(c);
  if (!user?.email) return { user: null, tenant: null };
  const tenantId = await kv.get(tenantPortalEmailKey(user.email)) as string | null;
  const tenant = tenantId ? await kv.get(tenantPortalKey(tenantId)) as any : null;
  return { user, tenant };
}

app.get('/make-server-57095a78/tenant-portals', async (c) => {
  try {
    const type = c.req.query('portalType');
    const actor = await tenantParentActor(c, type);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to manage tenant access.' }, 401);
    if (!actor.allowed) return c.json({ success: false, error: 'An active matching portal is required.' }, 403);
    const ids = (await kv.get(tenantPortalParentKey(actor.user.email)) as string[]) || [];
    const tenants = (await Promise.all(ids.map(id => kv.get(tenantPortalKey(id)))).then(rows => rows.filter(Boolean) as any[])).map(stripBase64);
    return c.json({ success: true, tenants });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load tenant portals.' }, 500); }
});

app.post('/make-server-57095a78/tenant-portals/invite', async (c) => {
  try {
    const body = stripBase64(await c.req.json());
    const actor = await tenantParentActor(c, body.parentPortalType);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before inviting a tenant.' }, 401);
    if (!actor.allowed) return c.json({ success: false, error: 'Your active portal does not match this invitation.' }, 403);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const propertyName = String(body.propertyName || '').trim();
    const propertyId = String(body.propertyId || '').trim();
    const unitNumber = String(body.unitNumber || '').trim();
    if (!name || !email || !propertyName || !unitNumber) return c.json({ success: false, error: 'Name, email, property, and unit are required.' }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ success: false, error: 'Enter a valid tenant email.' }, 400);
    const existingId = await kv.get(tenantPortalEmailKey(email)) as string | null;
    if (existingId) {
      const existing = await kv.get(tenantPortalKey(existingId)) as any;
      if (existing && String(existing.parentEmail).toLowerCase() !== String(actor.user.email).toLowerCase()) return c.json({ success: false, error: 'This email is already connected to another property portal.' }, 409);
      if (existing) return c.json({ success: true, tenant: stripBase64(existing), invitationSent: false, message: 'This tenant is already connected to your portal.' });
    }
    const now = new Date().toISOString();
    const id = `tenant_${crypto.randomUUID()}`;
    const tenant = { id, tenantName: name, tenantEmail: email, phone, propertyName, propertyId, unitNumber, parentEmail: String(actor.user.email).toLowerCase(), parentUserId: actor.user.id, parentPortalType: actor.portalType, status: 'invited', createdAt: now, updatedAt: now, invitedBy: actor.user.email };
    await kv.set(tenantPortalKey(id), tenant);
    await kv.set(tenantPortalEmailKey(email), id);
    const parentKey = tenantPortalParentKey(actor.user.email); const ids = (await kv.get(parentKey) as string[]) || []; await kv.set(parentKey, [id, ...ids.filter(item => item !== id)]);
    let invitationSent = false;
    let inviteNote = '';
    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: name, phone, role: 'tenant', accountType: 'tenant', tenant_portal_id: id } });
      if (error) inviteNote = error.message || 'The portal was created, but the email invite could not be sent.';
      else invitationSent = true;
    } catch (error: any) { inviteNote = error?.message || 'The portal was created, but the email invite could not be sent.'; }
    return c.json({ success: true, tenant: stripBase64(tenant), invitationSent, message: invitationSent ? 'Tenant invitation sent.' : inviteNote || 'Tenant portal created. They may sign in with this email.' }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create tenant invitation.' }, 500); }
});

app.patch('/make-server-57095a78/tenant-portals/:id', async (c) => {
  try {
    const record = await kv.get(tenantPortalKey(c.req.param('id'))) as any;
    if (!record) return c.json({ success: false, error: 'Tenant portal not found.' }, 404);
    const actor = await tenantParentActor(c, record.parentPortalType);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before updating tenant access.' }, 401);
    if (!actor.admin && (!actor.allowed || String(record.parentEmail).toLowerCase() !== String(actor.user.email).toLowerCase())) return c.json({ success: false, error: 'This tenant portal belongs to another account.' }, 403);
    const body = stripBase64(await c.req.json()); const status = String(body.status || '').toLowerCase();
    if (!['active', 'invited', 'deactivated'].includes(status)) return c.json({ success: false, error: 'Use active, invited, or deactivated status.' }, 400);
    const updated = { ...record, status, updatedAt: new Date().toISOString() }; await kv.set(tenantPortalKey(record.id), updated);
    return c.json({ success: true, tenant: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update tenant access.' }, 500); }
});

app.get('/make-server-57095a78/tenant-portals/experience', async (c) => {
  try {
    const requestedType = c.req.query('portalType');
    const parent = await tenantParentActor(c, requestedType);
    if (parent.user?.email && parent.allowed) {
      const experience = (await kv.get(tenantExperienceKey(parent.user.email)) as any) || TENANT_DEFAULT_EXPERIENCE;
      return c.json({ success: true, experience: stripBase64(experience) });
    }
    const actor = await tenantActor(c);
    if (!actor.user?.email || !actor.tenant || actor.tenant.status === 'deactivated') return c.json({ success: false, error: 'An active tenant portal is required.' }, 403);
    const experience = (await kv.get(tenantExperienceKey(actor.tenant.parentEmail)) as any) || TENANT_DEFAULT_EXPERIENCE;
    return c.json({ success: true, experience: stripBase64(experience) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load resident experience.' }, 500); }
});

app.put('/make-server-57095a78/tenant-portals/experience', async (c) => {
  try {
    const body = stripBase64(await c.req.json()); const actor = await tenantParentActor(c, body.parentPortalType);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before changing resident content.' }, 401);
    if (!actor.allowed) return c.json({ success: false, error: 'An active matching portal is required.' }, 403);
    const marqueeItems = Array.isArray(body.marqueeItems) ? body.marqueeItems.map((item: any) => String(item).trim()).filter(Boolean).slice(0, 8) : TENANT_DEFAULT_EXPERIENCE.marqueeItems;
    const ads = Array.isArray(body.ads) ? body.ads.map((ad: any, index: number) => ({ id: String(ad.id || `ad_${index}`), title: String(ad.title || '').slice(0, 80), body: String(ad.body || '').slice(0, 220), ctaLabel: String(ad.ctaLabel || 'Learn more').slice(0, 40), ctaRoute: String(ad.ctaRoute || 'landing').replace(/^\//, ''), active: ad.active !== false })).filter((ad: any) => ad.title).slice(0, 6) : TENANT_DEFAULT_EXPERIENCE.ads;
    const experience = { marqueeItems: marqueeItems.length ? marqueeItems : TENANT_DEFAULT_EXPERIENCE.marqueeItems, ads: ads.length ? ads : TENANT_DEFAULT_EXPERIENCE.ads, updatedAt: new Date().toISOString(), updatedBy: actor.user.email };
    await kv.set(tenantExperienceKey(actor.user.email), experience); return c.json({ success: true, experience });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save resident content.' }, 500); }
});

app.get('/make-server-57095a78/tenant-portal/me', async (c) => {
  try {
    const actor = await tenantActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to open your resident portal.' }, 401);
    if (!actor.tenant || actor.tenant.status === 'deactivated') return c.json({ success: false, error: 'Your resident portal invitation is not active.' }, 403);
    const tenant = actor.tenant.status === 'invited' ? { ...actor.tenant, status: 'active', activatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : actor.tenant;
    if (tenant !== actor.tenant) await kv.set(tenantPortalKey(tenant.id), tenant);
    const workRequests = (await readWorkRequests()).filter((record: any) => String(record.tenantPortalId || '') === String(tenant.id)).map(stripBase64);
    return c.json({ success: true, tenant: stripBase64(tenant), workRequests });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load the resident portal.' }, 500); }
});

app.post('/make-server-57095a78/tenant-portal/work-requests', async (c) => {
  try {
    const actor = await tenantActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before submitting a maintenance request.' }, 401);
    if (!actor.tenant || actor.tenant.status === 'deactivated') return c.json({ success: false, error: 'Your resident portal invitation is not active.' }, 403);
    const body = stripBase64(await c.req.json()); const title = String(body.title || body.project_name || '').trim(); const description = String(body.description || '').trim(); const priority = ['low', 'normal', 'high', 'urgent'].includes(String(body.priority || '').toLowerCase()) ? String(body.priority).toLowerCase() : 'normal';
    if (!title || !description) return c.json({ success: false, error: 'Tell your property team what is needed and include a description.' }, 400);
    const now = new Date().toISOString();
    const record = { id: `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`, project_name: title, title, description, project_type: String(body.category || 'maintenance'), serviceType: String(body.category || 'maintenance'), priority, status: 'pending_approval', source: 'tenant-portal', tenantPortalId: actor.tenant.id, tenantName: actor.tenant.tenantName, tenantEmail: actor.tenant.tenantEmail, propertyName: actor.tenant.propertyName, propertyId: actor.tenant.propertyId, unitNumber: actor.tenant.unitNumber, parentEmail: actor.tenant.parentEmail, parentPortalType: actor.tenant.parentPortalType, landlordEmail: actor.tenant.parentPortalType === 'landlord' ? actor.tenant.parentEmail : '', propertyManagerEmail: actor.tenant.parentPortalType === 'property_manager' ? actor.tenant.parentEmail : '', condoManagerEmail: actor.tenant.parentPortalType === 'condo_manager' ? actor.tenant.parentEmail : '', client_name: actor.tenant.tenantName, client_email: actor.tenant.tenantEmail, client_phone: actor.tenant.phone || '', user_id: actor.user.id, created_at: now, updated_at: now, requestedBy: 'tenant' };
    await persistWorkRequest(record);
    return c.json({ success: true, workRequest: stripBase64(record) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to submit maintenance request.' }, 500); }
});

function landlordPortfolioKey(email: string) { return `landlord_portfolio:${String(email).toLowerCase()}`; }

app.get('/make-server-57095a78/landlord/properties', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your properties.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const saved = (await kv.get(landlordPortfolioKey(email)) as any[]) || [];
    const legacy = (await kv.get('properties') as any[]) || [];
    const compatible = legacy.filter((property: any) => String(property.landlordEmail || property.ownerEmail || '').toLowerCase() === email || (actor.user?.id && String(property.landlordUserId || property.ownerUserId || '') === String(actor.user.id)));
    const seen = new Set(saved.map((property: any) => String(property.id)));
    return c.json({ success: true, properties: [...saved, ...compatible.filter((property: any) => !seen.has(String(property.id)))].map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load landlord properties.' }, 500); }
});

app.post('/make-server-57095a78/landlord/properties', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a property.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const body = stripBase64(await c.req.json()); const name = String(body.name || '').trim(); const address = String(body.address || '').trim(); const suppliedUnits = Number(body.units); const suppliedVacancies = Number(body.vacancies || 0);
    if (!name) return c.json({ success: false, error: 'Property name is required.' }, 400);
    if (!address) return c.json({ success: false, error: 'Property address is required.' }, 400);
    if (!Number.isFinite(suppliedUnits) || suppliedUnits < 1) return c.json({ success: false, error: 'Enter at least one unit.' }, 400);
    if (!Number.isFinite(suppliedVacancies) || suppliedVacancies < 0) return c.json({ success: false, error: 'Vacancies must be zero or greater.' }, 400);
    const units = Math.floor(suppliedUnits); const vacancies = Math.min(units, Math.floor(suppliedVacancies)); const now = new Date().toISOString();
    const property = { id: `landlord_property_${crypto.randomUUID()}`, name, address, units, vacancies, ownerEmail: actor.user.email, landlordEmail: actor.user.email, landlordUserId: actor.user.id, createdAt: now, updatedAt: now };
    const key = landlordPortfolioKey(actor.user.email); const existing = (await kv.get(key) as any[]) || []; await kv.set(key, [property, ...existing]);
    return c.json({ success: true, property }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add property.' }, 500); }
});

function propertyPortfolioKey(email: string) { return `property_manager_portfolio:${String(email).toLowerCase()}`; }

app.get('/make-server-57095a78/property-manager/properties', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your property portfolio.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const saved = (await kv.get(propertyPortfolioKey(email)) as any[]) || [];
    // Read compatible legacy records only when they are already explicitly assigned;
    // do not expose the old shared collection to a portal user.
    const legacy = (await kv.get('properties') as any[]) || [];
    const compatible = legacy.filter((property: any) => assignedToPropertyManager(property, actor.user));
    const seen = new Set(saved.map((property: any) => String(property.id)));
    const properties = [...saved, ...compatible.filter((property: any) => !seen.has(String(property.id)))];
    return c.json({ success: true, properties: properties.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load properties.' }, 500); }
});

app.post('/make-server-57095a78/property-manager/properties', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a property.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const body = stripBase64(await c.req.json());
    const name = String(body.name || '').trim();
    const address = String(body.address || '').trim();
    const suppliedUnits = Number(body.units);
    const suppliedOccupied = Number(body.occupied || 0);
    if (!name) return c.json({ success: false, error: 'Property name is required.' }, 400);
    if (!address) return c.json({ success: false, error: 'Property address is required.' }, 400);
    if (!Number.isFinite(suppliedUnits) || suppliedUnits < 1) return c.json({ success: false, error: 'Enter at least one unit.' }, 400);
    if (!Number.isFinite(suppliedOccupied) || suppliedOccupied < 0) return c.json({ success: false, error: 'Occupied units must be zero or greater.' }, 400);
    const units = Math.floor(suppliedUnits);
    const occupied = Math.min(units, Math.floor(suppliedOccupied));
    const now = new Date().toISOString();
    const property = { id: `property_${crypto.randomUUID()}`, name, address, units, occupied, ownerEmail: actor.user.email, propertyManagerEmail: actor.user.email, propertyManagerUserId: actor.user.id, createdAt: now, updatedAt: now };
    const key = propertyPortfolioKey(actor.user.email);
    const existing = (await kv.get(key) as any[]) || [];
    await kv.set(key, [property, ...existing]);
    return c.json({ success: true, property }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add property.' }, 500); }
});

app.get('/make-server-57095a78/property-manager/work-requests', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view property work requests.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const requests = await readWorkRequests();
    const scoped = actor.admin ? requests : requests.filter((record: any) => assignedToPropertyManager(record, actor.user));
    return c.json({ success: true, workRequests: scoped.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load property work requests.' }, 500); }
});

app.patch('/make-server-57095a78/property-manager/work-requests/:id/decision', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in before making a decision.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!actor.admin && !assignedToPropertyManager(record, actor.user)) return c.json({ success: false, error: 'This request is not assigned to your property-management account.' }, 403);
    const body = await c.req.json();
    const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString();
    const history = Array.isArray(record.approvalHistory) ? record.approvalHistory : [];
    const updated = {
      ...record,
      status: decision,
      approvalHistory: [...history, { status: decision, note: String(body.note || '').slice(0, 2000), actorEmail: actor.user.email, decidedAt: now }],
      lastDecisionBy: actor.user.email,
      lastDecisionAt: now,
      updated_at: now,
    };
    await persistWorkRequest(updated);
    return c.json({ success: true, workRequest: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update work request.' }, 500); }
});

app.post('/make-server-57095a78/work-requests/:id/schedule', async (c) => {
  try {
    const { user, admin } = await workRequestActor(c);
    if (!user || !admin) return c.json({ error: 'Administrator access is required to schedule work.' }, 403);
    const existing = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!existing) return c.json({ error: 'Work request not found.' }, 404);
    const body = await c.req.json();
    const startAt = String(body.startAt || body.start_at || '');
    if (Number.isNaN(Date.parse(startAt))) return c.json({ error: 'A valid scheduled start time is required.' }, 400);
    const now = new Date().toISOString();
    const previousSchedule = existing.schedule || {};
    const schedule = { id: previousSchedule.id || `schedule_${crypto.randomUUID()}`, startAt, endAt: body.endAt || body.end_at || null, assignedTo: body.assignedTo || body.assigned_to || null, notes: String(body.notes || ''), scheduledBy: user.email, createdAt: previousSchedule.createdAt || now, updatedAt: now };
    const record = { ...existing, schedule, status: body.status || 'scheduled', updated_at: now };
    await persistWorkRequest(record);
    await kv.set(`schedule:${schedule.id}`, { ...schedule, workRequestId: record.id, clientEmail: record.client_email });
    return c.json({ success: true, workRequest: stripBase64(record), schedule });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to schedule work request.' }, 500); }
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
    const reel = existing.find((item: any) => item.id === id);
    if (!reel) return c.json({ error: 'Reel not found' }, 404);
    if (reel.publishedBy !== user.id && !await intakeIsAdmin(user)) return c.json({ error: 'You may only remove your own reel.' }, 403);
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

// Scheduled posts are kept per authenticated account. The browser never treats
// localStorage as the source of truth, so a campaign remains available across
// devices and its final publishing result is auditable.
const socialScheduleKey = (userId: string) => `social_scheduled_posts:${userId}`;
async function socialScheduleActor(c: any) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

app.get('/make-server-57095a78/social/scheduled-posts', async (c) => {
  try {
    const user = await socialScheduleActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const posts = (await kv.get(socialScheduleKey(user.id)) as any[]) || [];
    return c.json({ success: true, posts: posts.sort((a: any, b: any) => Date.parse(b.scheduled_date || b.created_at || 0) - Date.parse(a.scheduled_date || a.created_at || 0)) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load scheduled posts.' }, 500); }
});

app.post('/make-server-57095a78/social/scheduled-posts', async (c) => {
  try {
    const user = await socialScheduleActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const body = await c.req.json();
    const content = String(body.content || '').trim();
    const platforms = Array.isArray(body.platforms) ? body.platforms.map((value: unknown) => String(value).toLowerCase()).filter(Boolean) : [];
    const scheduledDate = String(body.scheduled_date || '').trim();
    if (!content || !scheduledDate || !platforms.length) return c.json({ success: false, error: 'Content, at least one platform, and a scheduled date are required.' }, 400);
    if (Number.isNaN(Date.parse(scheduledDate))) return c.json({ success: false, error: 'The scheduled date is invalid.' }, 400);
    const now = new Date().toISOString();
    const post = { id: `social-${crypto.randomUUID()}`, content, media_urls: Array.isArray(body.media_urls) ? body.media_urls.filter((url: unknown) => typeof url === 'string') : [], media_type: ['image', 'video', 'carousel', 'text'].includes(String(body.media_type)) ? body.media_type : 'text', platforms, scheduled_date: scheduledDate, status: 'scheduled', created_at: now, updated_at: now, created_by: user.id };
    const posts = (await kv.get(socialScheduleKey(user.id)) as any[]) || [];
    posts.unshift(post);
    await kv.set(socialScheduleKey(user.id), posts.slice(0, 500));
    return c.json({ success: true, post }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to schedule post.' }, 500); }
});

app.patch('/make-server-57095a78/social/scheduled-posts/:id', async (c) => {
  try {
    const user = await socialScheduleActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const posts = (await kv.get(socialScheduleKey(user.id)) as any[]) || [];
    const index = posts.findIndex((post: any) => String(post.id) === c.req.param('id'));
    if (index < 0) return c.json({ success: false, error: 'Scheduled post not found.' }, 404);
    const body = await c.req.json();
    const allowed: Record<string, unknown> = {};
    if (['draft', 'scheduled', 'published', 'failed'].includes(String(body.status))) allowed.status = body.status;
    if (body.publishResults && typeof body.publishResults === 'object') allowed.publishResults = body.publishResults;
    if (body.published_at) allowed.published_at = String(body.published_at);
    const post = { ...posts[index], ...allowed, updated_at: new Date().toISOString() };
    posts[index] = post;
    await kv.set(socialScheduleKey(user.id), posts);
    return c.json({ success: true, post });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update scheduled post.' }, 500); }
});

app.delete('/make-server-57095a78/social/scheduled-posts/:id', async (c) => {
  try {
    const user = await socialScheduleActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const posts = (await kv.get(socialScheduleKey(user.id)) as any[]) || [];
    const filtered = posts.filter((post: any) => String(post.id) !== c.req.param('id'));
    if (filtered.length === posts.length) return c.json({ success: false, error: 'Scheduled post not found.' }, 404);
    await kv.set(socialScheduleKey(user.id), filtered);
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete scheduled post.' }, 500); }
});

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
    if (!user) return c.json({ error: 'Sign in before submitting content.' }, 401);

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
    if (!await intakeIsAdmin(user)) return c.json({ error: 'Administrator access is required.' }, 403);

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
    if (!await intakeIsAdmin(user)) return c.json({ error: 'Administrator access is required.' }, 403);

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

// ── ABANDONED CARTS ─────────────────────────────────────────────────────────
const ABANDONED_CART_PREFIX = 'abandoned_cart:';
function abandonedCartKey(id: string) { return `${ABANDONED_CART_PREFIX}${id}`; }
function validAbandonedCartItems(items: unknown) {
  return Array.isArray(items) && items.length > 0 && items.length <= 100 && items.every((item: any) => String(item?.name || '').trim() && Number.isFinite(Number(item?.price)) && Number(item?.price) >= 0 && Number(item?.qty || item?.quantity || 1) > 0);
}

// The storefront may create a cart record only for its own captured customer.
// Reading, emailing, and marking recovery remain owner/admin operations.
app.post('/make-server-57095a78/abandoned-carts', async (c) => {
  try {
    const body = stripBase64(await c.req.json()); const email = String(body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || !validAbandonedCartItems(body.items)) return c.json({ success: false, error: 'A valid email and at least one valid cart item are required.' }, 400);
    const items = body.items.map((item: any) => ({ id: String(item.id || ''), name: String(item.name).slice(0, 300), price: money(item.price), qty: Math.max(1, Math.min(99, Number(item.qty || item.quantity || 1))) }));
    const total = money(items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0));
    const signature = JSON.stringify(items.map((item: any) => [item.id, item.qty])); const now = new Date().toISOString();
    const existing = ((await kv.getByPrefix(ABANDONED_CART_PREFIX)) || []).find((item: any) => item?.email === email && item?.signature === signature && ['abandoned', 'emailed'].includes(String(item.status)));
    const record = existing ? { ...existing, items, total, name: String(body.name || existing.name || '').slice(0, 160), source: String(body.source || existing.source || 'PublicStore').slice(0, 100), lastSeenAt: now, updatedAt: now } : { id: `AC-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`, email, name: String(body.name || '').slice(0, 160), items, total, signature, source: String(body.source || 'PublicStore').slice(0, 100), status: 'abandoned', emailsSent: 0, abandonedAt: now, lastSeenAt: now, createdAt: now, updatedAt: now };
    await kv.set(abandonedCartKey(record.id), record);
    return c.json({ success: true, cart: record, duplicate: Boolean(existing) }, existing ? 200 : 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to record abandoned cart.' }, 500); }
});

app.get('/make-server-57095a78/abandoned-carts', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const carts = ((await kv.getByPrefix(ABANDONED_CART_PREFIX)) || []).sort((a: any, b: any) => Date.parse(b.updatedAt || b.abandonedAt || '') - Date.parse(a.updatedAt || a.abandonedAt || ''));
    return c.json({ success: true, carts });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load abandoned carts.' }, 500); }
});

async function sendAbandonedCartRecoveryEmail(cart: any, subject: string, body: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY') || ''; const from = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('GIFT_CARD_FROM_EMAIL') || '';
  if (!resendKey || !from) throw new Error('Recovery email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.');
  const html = String(body || `Hi ${cart.name || 'there'},\n\nYour cart is still waiting for you.`).replace(/\n/g, '<br/>');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [cart.email], subject: String(subject || 'Your Black Phoenix cart is waiting').slice(0, 200), html }) });
  const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.message || payload?.error || 'Unable to send recovery email.'); return payload;
}

app.post('/make-server-57095a78/abandoned-carts/:id/recover', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const cart = await kv.get(abandonedCartKey(c.req.param('id'))) as any; if (!cart) return c.json({ success: false, error: 'Abandoned cart not found.' }, 404);
    const body = await c.req.json().catch(() => ({})); const delivery = await sendAbandonedCartRecoveryEmail(cart, body.subject, body.body); const now = new Date().toISOString();
    const updated = { ...cart, status: 'emailed', emailsSent: Number(cart.emailsSent || 0) + 1, lastEmailed: now, lastEmailId: delivery?.id || null, updatedAt: now, updatedBy: actor.user.email };
    await kv.set(abandonedCartKey(updated.id), updated); return c.json({ success: true, cart: updated });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to send recovery email.' }, 500); }
});

app.post('/make-server-57095a78/abandoned-carts/:id/mark-recovered', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const cart = await kv.get(abandonedCartKey(c.req.param('id'))) as any; if (!cart) return c.json({ success: false, error: 'Abandoned cart not found.' }, 404);
    const now = new Date().toISOString(); const updated = { ...cart, status: 'recovered', recoveredAt: now, updatedAt: now, updatedBy: actor.user.email }; await kv.set(abandonedCartKey(updated.id), updated); return c.json({ success: true, cart: updated });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to mark cart recovered.' }, 500); }
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
      review_request: {
        subject: `${lead.name ? lead.name + ', h' : 'H'}ow was your experience with ${COMPANY_NAME}? ⭐`,
        prompt: `Write a short, warm post-purchase review request email for ${lead.name || 'a customer'} who just ordered from ${COMPANY_NAME}. Thank them sincerely for their order. Ask them to leave a Google review with this direct link: https://g.page/r/your-google-review-link/review — explain it takes less than 60 seconds and means the world to a family-owned business. Keep it personal, 2 short paragraphs. Do NOT be pushy.`,
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


// ============================================
// GIFT CARDS — PURCHASE, ISSUANCE, BALANCE & REDEMPTION
// ============================================
// Gift-card value is issued only after Stripe confirms payment. A browser can
// create a pending checkout, but it can never mark its own card as paid.
const GIFT_CARD_PREFIX = 'giftcard:';
const GIFT_PURCHASE_PREFIX = 'giftcard_purchase:';
const GIFT_REDEMPTION_PREFIX = 'giftcard_redemption:';

function normalizeGiftCardCode(value: unknown) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatGiftCardCode(value: unknown) {
  const normalized = normalizeGiftCardCode(value);
  return normalized.match(/.{1,4}/g)?.join('-') || '';
}

function createGiftCardCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint8Array(16));
  return formatGiftCardCode(Array.from(values, (value) => alphabet[value % alphabet.length]).join(''));
}

function validGiftCardEmail(value: unknown) {
  return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value.trim());
}

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

type StripeAccount = 'services' | 'tbpco_ecommerce';

// Separate Stripe accounts are intentionally selected server-side by workflow.
// Services, invoices, subscriptions, maintenance, and gift cards remain on Black
// Phoenix Builds. Store merchandise uses the TBPCO e-commerce account.
function stripeKeyFor(account: StripeAccount = 'services') {
  if (account === 'tbpco_ecommerce') return Deno.env.get('TBPCO_ECOMMERCE_STRIPE_SECRET_KEY') || '';
  return Deno.env.get('STRIPE_SECRET_KEY_SERVICES') || Deno.env.get('STRIPE_SECRET_KEY') || '';
}

function stripeAccountLabel(account: StripeAccount) {
  return account === 'tbpco_ecommerce' ? 'TBPCO E-commerce' : 'Black Phoenix Builds Services';
}

async function stripeCheckoutSession(params: URLSearchParams, account: StripeAccount = 'services') {
  const stripeKey = stripeKeyFor(account);
  if (!stripeKey) throw new Error(`${stripeAccountLabel(account)} Stripe checkout is not configured.`);
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${stripeKey}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Unable to start secure Stripe checkout.');
  return payload;
}

async function retrieveStripeCheckoutSession(sessionId: string, account: StripeAccount = 'services') {
  const stripeKey = stripeKeyFor(account);
  if (!stripeKey) throw new Error(`${stripeAccountLabel(account)} Stripe checkout is not configured.`);
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Basic ${btoa(`${stripeKey}:`)}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Unable to verify Stripe payment.');
  return payload;
}


async function createStripeRefund(paymentIntentId: string, account: StripeAccount, amount?: number) {
  const stripeKey = stripeKeyFor(account);
  if (!stripeKey) throw new Error(`${stripeAccountLabel(account)} Stripe refunds are not configured.`);
  const params = new URLSearchParams({ payment_intent: paymentIntentId });
  if (amount && amount > 0) params.set('amount', String(Math.round(amount * 100)));
  const response = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${stripeKey}:`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Unable to issue the Stripe refund.');
  return payload;
}

async function deliverGiftCardEmail(card: any, recipientEmail: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY') || '';
  const from = Deno.env.get('GIFT_CARD_FROM_EMAIL') || Deno.env.get('RESEND_FROM_EMAIL') || '';
  if (!resendKey || !from || !recipientEmail) return { attempted: false, delivered: false };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [recipientEmail],
      subject: `You've received a $${Number(card.amount).toFixed(2)} Black Phoenix gift card`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1 style="color:#ea580c">A gift from Black Phoenix</h1><p>${card.from || 'Someone special'} sent you a $${Number(card.amount).toFixed(2)} gift card.</p><p><strong>Code: ${card.code}</strong></p>${card.message ? `<blockquote>${card.message}</blockquote>` : ''}<p>Use this code at checkout with Black Phoenix.</p></div>`,
    }),
  });
  return { attempted: true, delivered: response.ok };
}

async function issuePaidGiftCard(purchase: any) {
  if (purchase.status === 'paid' && purchase.cardCode) {
    const existing = await kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(purchase.cardCode)}`);
    if (existing) return existing;
  }

  const now = new Date().toISOString();
  const code = purchase.cardCode || createGiftCardCode();
  const card = {
    id: purchase.cardId || crypto.randomUUID(),
    code,
    amount: money(purchase.amount),
    balance: money(purchase.amount),
    from: purchase.senderName || 'Anonymous',
    to: purchase.recipientName || 'Friend',
    recipientEmail: String(purchase.recipientEmail || '').toLowerCase(),
    purchaserEmail: String(purchase.purchaserEmail || '').toLowerCase(),
    message: String(purchase.message || ''),
    design: purchase.design || 'classic',
    planId: purchase.planId || null,
    status: 'active',
    purchasedAt: purchase.createdAt || now,
    issuedAt: now,
    stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
    redeemedAmount: 0,
    redemptionHistory: [],
  };
  await kv.set(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(code)}`, card);
  for (const email of new Set([card.recipientEmail, card.purchaserEmail].filter(Boolean))) {
    const indexKey = `giftcard_owner:${email}`;
    const codes: string[] = (await kv.get(indexKey)) || [];
    if (!codes.includes(code)) await kv.set(indexKey, [code, ...codes]);
  }
  purchase.status = 'paid';
  purchase.cardCode = code;
  purchase.cardId = card.id;
  purchase.paidAt = now;
  purchase.updatedAt = now;
  const email = await deliverGiftCardEmail(card, card.recipientEmail);
  purchase.emailDelivery = email;
  await kv.set(`${GIFT_PURCHASE_PREFIX}${purchase.id}`, purchase);
  return card;
}

app.post('/make-server-57095a78/gift-cards/checkout', async (c) => {
  try {
    const body = await c.req.json();
    const amount = money(body.amount);
    if (amount < 10 || amount > 500) return c.json({ success: false, error: 'Gift card amount must be between $10 and $500.' }, 400);
    if (!validGiftCardEmail(body.recipientEmail)) return c.json({ success: false, error: 'A valid recipient email is required.' }, 400);

    const idempotencyKey = String(body.idempotencyKey || crypto.randomUUID()).slice(0, 128);
    const purchaseKey = `${GIFT_PURCHASE_PREFIX}${idempotencyKey}`;
    let purchase = await kv.get(purchaseKey) as any;
    if (purchase?.status === 'paid') return c.json({ success: true, purchase, card: await kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(purchase.cardCode)}`) });

    if (!purchase) {
      purchase = {
        id: idempotencyKey,
        status: 'pending_payment',
        amount,
        recipientName: String(body.recipientName || 'Friend').slice(0, 120),
        recipientEmail: String(body.recipientEmail).toLowerCase().trim(),
        senderName: String(body.senderName || 'Anonymous').slice(0, 120),
        purchaserEmail: validGiftCardEmail(body.purchaserEmail) ? String(body.purchaserEmail).toLowerCase().trim() : '',
        message: String(body.message || '').slice(0, 1000),
        design: ['classic', 'celebrate', 'love', 'birthday'].includes(body.design) ? body.design : 'classic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');
    const session = await stripeCheckoutSession(new URLSearchParams({
      'payment_method_types[]': 'card',
      mode: 'payment',
      success_url: `${appUrl}/gift-cards?gift_purchase_id=${encodeURIComponent(purchase.id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/gift-cards`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `Black Phoenix Gift Card — $${amount.toFixed(2)}`,
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][quantity]': '1',
      customer_email: purchase.purchaserEmail || purchase.recipientEmail,
      'metadata[gift_card_purchase_id]': purchase.id,
    }));
    purchase.stripeCheckoutSessionId = session.id;
    purchase.checkoutUrl = session.url;
    purchase.updatedAt = new Date().toISOString();
    await kv.set(purchaseKey, purchase);
    return c.json({ success: true, purchaseId: purchase.id, checkoutUrl: session.url });
  } catch (error: any) {
    console.error('[Gift cards] checkout error:', error);
    return c.json({ success: false, error: error?.message || 'Unable to start secure gift-card checkout.' }, 500);
  }
});

app.get('/make-server-57095a78/gift-cards/purchases/:id/confirm', async (c) => {
  try {
    const purchase = await kv.get(`${GIFT_PURCHASE_PREFIX}${c.req.param('id')}`) as any;
    if (!purchase) return c.json({ success: false, error: 'Gift-card purchase not found.' }, 404);
    if (purchase.status === 'paid') return c.json({ success: true, purchase, card: await kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(purchase.cardCode)}`) });

    const sessionId = String(c.req.query('session_id') || '');
    if (!sessionId || sessionId !== purchase.stripeCheckoutSessionId) return c.json({ success: false, error: 'Payment session does not match this gift-card purchase.' }, 400);
    const session = await retrieveStripeCheckoutSession(sessionId);
    if (session.payment_status !== 'paid') return c.json({ success: false, pending: true, purchase, error: 'Stripe has not confirmed this payment yet.' }, 409);
    const card = await issuePaidGiftCard(purchase);
    return c.json({ success: true, purchase, card });
  } catch (error: any) {
    console.error('[Gift cards] confirmation error:', error);
    return c.json({ success: false, error: error?.message || 'Unable to confirm gift-card payment.' }, 500);
  }
});

app.get('/make-server-57095a78/gift-cards/owner/:email', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return c.json({ success: false, error: 'Sign in to view your gift cards.' }, 401);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) return c.json({ success: false, error: 'Sign in to view your gift cards.' }, 401);
    const email = String(c.req.param('email') || '').toLowerCase().trim();
    if (user.email.toLowerCase() !== email) return c.json({ success: false, error: 'You may only view gift cards assigned to your account.' }, 403);
    const codes: string[] = (await kv.get(`giftcard_owner:${email}`)) || [];
    const cards = (await Promise.all(codes.map((code) => kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(code)}`))))
      .filter((card: any) => card && card.status === 'active')
      .map((card: any) => ({ ...card, recipientEmail: undefined, purchaserEmail: undefined }));
    return c.json({ success: true, cards });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to load gift cards.' }, 500);
  }
});

app.get('/make-server-57095a78/gift-cards', async (c) => { try { const user = await rewardsActor(c); if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); return c.json({ success: true, cards: (await kv.getByPrefix(GIFT_CARD_PREFIX)) || [] }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

app.get('/make-server-57095a78/gift-cards/:code', async (c) => {
  try {
    const card = await kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(c.req.param('code'))}`) as any;
    if (!card || card.status !== 'active') return c.json({ success: false, error: 'Gift card not found or inactive.' }, 404);
    return c.json({ success: true, card: { ...card, recipientEmail: undefined, purchaserEmail: undefined } });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to load gift card.' }, 500);
  }
});

app.post('/make-server-57095a78/gift-cards/:code/redeem', async (c) => {
  try {
    const body = await c.req.json();
    const code = normalizeGiftCardCode(c.req.param('code'));
    const amount = money(body.amount);
    const redemptionId = String(body.idempotencyKey || body.redemptionId || '');
    const orderReference = String(body.orderId || body.invoiceId || body.checkoutId || '');
    if (!redemptionId || !orderReference) return c.json({ success: false, error: 'A stable redemption ID and order, invoice, or checkout reference are required.' }, 400);
    if (amount <= 0) return c.json({ success: false, error: 'A positive redemption amount is required.' }, 400);
    const redemptionKey = `${GIFT_REDEMPTION_PREFIX}${code}:${redemptionId}`;
    const prior = await kv.get(redemptionKey);
    if (prior) return c.json({ success: true, duplicate: true, redemption: prior, card: await kv.get(`${GIFT_CARD_PREFIX}${code}`) });

    const card = await kv.get(`${GIFT_CARD_PREFIX}${code}`) as any;
    if (!card || card.status !== 'active') return c.json({ success: false, error: 'Gift card not found or inactive.' }, 404);
    if ((await availableGiftCardBalance(code, card)) < amount) return c.json({ success: false, error: 'Gift card balance is reserved or too low for this redemption.' }, 409);
    const redemption = { id: redemptionId, amount, orderReference, redeemedAt: new Date().toISOString() };
    card.balance = money(money(card.balance) - amount);
    card.redeemedAmount = money(money(card.redeemedAmount) + amount);
    card.redemptionHistory = [...(Array.isArray(card.redemptionHistory) ? card.redemptionHistory : []), redemption];
    if (card.balance === 0) card.redeemedAt = redemption.redeemedAt;
    await kv.set(`${GIFT_CARD_PREFIX}${code}`, card);
    await kv.set(redemptionKey, redemption);
    return c.json({ success: true, redemption, card });
  } catch (error: any) {
    console.error('[Gift cards] redemption error:', error);
    return c.json({ success: false, error: error?.message || 'Unable to redeem gift card.' }, 500);
  }
});


// ============================================
// REWARDS — REFERRALS, LOYALTY & AFFILIATES
// ============================================
const REWARDS_ADMIN_ROLES = new Set(['owner', 'admin', 'master_admin', 'management']);

async function rewardsActor(c: any) {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

async function rewardsAdmin(user: any) {
  if (!user?.id) return false;
  const { data, error } = await supabase.from('user_permissions').select('role_name').eq('user_id', user.id);
  if (error) return false;
  return (data || []).some((row: any) => REWARDS_ADMIN_ROLES.has(String(row.role_name || '').toLowerCase()));
}

function rewardsEmail(value: unknown) {
  return String(value || '').toLowerCase().trim();
}

function rewardId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function referralCodeFor(email: string) {
  const safe = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 5) || 'PHX';
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(-5).toUpperCase();
  return `${safe}${random}`;
}

function loyaltyTier(lifetimeSpend: number): 'bronze' | 'silver' | 'gold' | 'phoenix' {
  if (lifetimeSpend >= 1000) return 'phoenix';
  if (lifetimeSpend >= 500) return 'gold';
  if (lifetimeSpend >= 250) return 'silver';
  return 'bronze';
}

function publicLoyaltyAccount(account: any) {
  // This account is returned only to its authenticated owner or an administrator.
  return { ...account };
}

async function ownRewardsAccount(c: any, email: string) {
  const user = await rewardsActor(c);
  if (!user?.email) return { user: null, admin: false };
  return { user, admin: await rewardsAdmin(user) };
}

// Referral links work even when a member has not joined loyalty or affiliates.
app.get('/make-server-57095a78/referrals/my-code', async (c) => {
  try {
    const user = await rewardsActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in to create a referral link.' }, 401);
    const email = rewardsEmail(user.email); let code = await kv.get(`referral_code:${email}`) as string | null;
    if (!code) { code = `BP${referralCodeFor(email)}`; await kv.set(`referral_code:${email}`, code); await kv.set(`referral_code_owner:${code}`, email); }
    return c.json({ success: true, code });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to create referral link.' }, 500); }
});

// A member can see only referrals attributed to their own loyalty or affiliate code.
app.get('/make-server-57095a78/referrals/mine', async (c) => {
  try {
    const user = await rewardsActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in to view your referrals.' }, 401);
    const email = rewardsEmail(user.email); const all: any[] = (await kv.get('referrals:all')) || [];
    const referrals = all.filter((item: any) => rewardsEmail(item.referrerEmail || item.affiliateEmail) === email);
    return c.json({ success: true, referrals });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to load referrals.' }, 500); }
});

// Owner/admin referral-program view. Program creation and status changes are
// deliberately not exposed to anonymous browsers.
app.get('/make-server-57095a78/referrals', async (c) => {
  try {
    const user = await rewardsActor(c);
    if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    return c.json({ success: true, referrals: (await kv.get('referrals:all')) || [], programs: (await kv.get('referral_programs:all')) || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to load referrals.' }, 500);
  }
});

app.post('/make-server-57095a78/referrals', async (c) => {
  try {
    const user = await rewardsActor(c);
    if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const body = await c.req.json();
    if (!Array.isArray(body.referrals) || !Array.isArray(body.programs)) return c.json({ success: false, error: 'Both referrals and programs are required.' }, 400);
    await kv.set('referrals:all', body.referrals);
    await kv.set('referral_programs:all', body.programs);
    return c.json({ success: true, referrals: body.referrals, programs: body.programs });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to save referrals.' }, 500);
  }
});

// Owner-controlled individual referral mutations prevent browser-local referral records.
app.post('/make-server-57095a78/referrals/records', async (c) => {
  try {
    const user = await rewardsActor(c); if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const body = await c.req.json(); const now = new Date().toISOString(); const referrerName = String(body.referrerName || '').trim(); const referredName = String(body.referredName || '').trim();
    if (!referrerName || !referredName) return c.json({ success: false, error: 'Referrer and referred names are required.' }, 400);
    const status = ['pending', 'converted', 'paid'].includes(String(body.status)) ? String(body.status) : 'pending';
    const record = { id: `ref_${crypto.randomUUID()}`, referrerId: String(body.referrerId || ''), referrerEmail: String(body.referrerId || '').includes('@') ? String(body.referrerId).toLowerCase() : '', referrer: referrerName, referrerName, referredId: String(body.referredId || ''), referredEmail: String(body.referredId || '').includes('@') ? String(body.referredId).toLowerCase() : '', referred: referredName, referredName, source: String(body.referrerType || '').toLowerCase().includes('affiliate') ? 'affiliate' : 'loyalty', status, reward: Number(body.rewardAmount || 0), orderAmount: Number(body.conversionValue || 0), date: body.dateReferred || now, convertedAt: body.dateCompleted || null, paidAt: body.datePaid || null, createdAt: now, updatedAt: now, updatedBy: user.email };
    const records = (await kv.get('referrals:all') as any[]) || []; records.unshift(record); await kv.set('referrals:all', records.slice(0, 5000)); return c.json({ success: true, referral: record }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create referral.' }, 500); }
});
app.patch('/make-server-57095a78/referrals/records/:id', async (c) => {
  try {
    const user = await rewardsActor(c); if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const patch = await c.req.json(); const records = (await kv.get('referrals:all') as any[]) || []; const index = records.findIndex((item: any) => item.id === c.req.param('id'));
    if (index < 0) return c.json({ success: false, error: 'Referral not found.' }, 404);
    const current = records[index]; const requestedStatus = String(patch.status || current.status); const status = requestedStatus === 'completed' ? 'converted' : ['pending', 'converted', 'paid'].includes(requestedStatus) ? requestedStatus : current.status;
    records[index] = { ...current, ...patch, id: current.id, status, referrer: patch.referrerName ?? current.referrer, referred: patch.referredName ?? current.referred, reward: patch.rewardAmount ?? current.reward, orderAmount: patch.conversionValue ?? current.orderAmount, date: patch.dateReferred ?? current.date, convertedAt: patch.dateCompleted ?? current.convertedAt, paidAt: patch.datePaid ?? current.paidAt, updatedAt: new Date().toISOString(), updatedBy: user.email };
    await kv.set('referrals:all', records); return c.json({ success: true, referral: records[index] });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update referral.' }, 500); }
});

app.get('/make-server-57095a78/loyalty/:email', async (c) => {
  try {
    const email = rewardsEmail(c.req.param('email'));
    const { user, admin } = await ownRewardsAccount(c, email);
    if (!user?.email || (!admin && rewardsEmail(user.email) !== email)) return c.json({ success: false, error: 'Sign in to view your loyalty account.' }, 403);
    const account = await kv.get(`loyalty:${email}`);
    return c.json({ success: true, account: account ? publicLoyaltyAccount(account) : null });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to load loyalty account.' }, 500);
  }
});

app.post('/make-server-57095a78/loyalty/:email/join', async (c) => {
  try {
    const email = rewardsEmail(c.req.param('email'));
    const { user, admin } = await ownRewardsAccount(c, email);
    if (!user?.email || (!admin && rewardsEmail(user.email) !== email)) return c.json({ success: false, error: 'Sign in to join loyalty.' }, 403);
    const existing = await kv.get(`loyalty:${email}`);
    if (existing) return c.json({ success: true, account: publicLoyaltyAccount(existing), existing: true });
    const body = await c.req.json().catch(() => ({}));
    const now = new Date().toISOString();
    const account = {
      email, name: String(body.name || user.user_metadata?.full_name || email.split('@')[0]).slice(0, 120),
      points: 50, lifetimePoints: 50, lifetimeSpend: 0, tier: 'bronze', joinedAt: now,
      referralCode: referralCodeFor(email), redeemedCodes: [],
      history: [{ id: rewardId('loyalty'), type: 'bonus', points: 50, description: 'Welcome bonus — thanks for joining!', date: now }],
    };
    await kv.set(`loyalty:${email}`, account);
    await kv.set(`loyalty_referral:${account.referralCode}`, email);
    return c.json({ success: true, account: publicLoyaltyAccount(account) }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to join loyalty.' }, 500);
  }
});

app.post('/make-server-57095a78/loyalty/:email/redeem', async (c) => {
  try {
    const email = rewardsEmail(c.req.param('email'));
    const { user, admin } = await ownRewardsAccount(c, email);
    if (!user?.email || (!admin && rewardsEmail(user.email) !== email)) return c.json({ success: false, error: 'Sign in to redeem loyalty points.' }, 403);
    const body = await c.req.json();
    const reward = body.reward || {};
    const cost = Math.floor(Number(reward.points));
    const idempotencyKey = String(body.idempotencyKey || '');
    if (!idempotencyKey || !reward.id || !Number.isFinite(cost) || cost <= 0) return c.json({ success: false, error: 'A reward and stable redemption ID are required.' }, 400);
    const eventKey = `loyalty_redemption:${email}:${idempotencyKey}`;
    const existingEvent = await kv.get(eventKey);
    const account = await kv.get(`loyalty:${email}`);
    if (!account) return c.json({ success: false, error: 'Join the loyalty program first.' }, 404);
    if (existingEvent) return c.json({ success: true, duplicate: true, account: publicLoyaltyAccount(account), redemption: existingEvent });
    if (reward.code && (account.redeemedCodes || []).includes(reward.code)) return c.json({ success: false, error: 'This reward has already been redeemed.' }, 409);
    if (Number(account.points) < cost) return c.json({ success: false, error: 'Not enough points for this reward.' }, 409);
    const event = { id: rewardId('loyalty'), type: 'redeem', points: -cost, description: String(reward.label || 'Loyalty reward'), date: new Date().toISOString(), rewardId: reward.id, code: reward.code || null };
    account.points -= cost;
    account.redeemedCodes = Array.from(new Set([...(account.redeemedCodes || []), reward.code].filter(Boolean)));
    account.history = [event, ...(account.history || [])];
    await kv.set(`loyalty:${email}`, account);
    await kv.set(eventKey, event);
    return c.json({ success: true, account: publicLoyaltyAccount(account), redemption: event });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to redeem reward.' }, 500);
  }
});

// Purchase/invoice integrations call this trusted route from the server with a
// configured secret. The browser cannot mint loyalty points.
app.post('/make-server-57095a78/loyalty/events', async (c) => {
  try {
    const secret = Deno.env.get('LOYALTY_EVENT_SECRET') || '';
    if (!secret || c.req.header('X-Loyalty-Event-Secret') !== secret) return c.json({ success: false, error: 'Unauthorized reward event.' }, 401);
    const body = await c.req.json();
    const email = rewardsEmail(body.email);
    const eventId = String(body.eventId || body.orderId || body.invoiceId || '');
    const spend = Number(body.spend || 0);
    if (!email || !eventId || !Number.isFinite(spend) || spend <= 0) return c.json({ success: false, error: 'Email, event ID, and spend are required.' }, 400);
    const account = await kv.get(`loyalty:${email}`);
    if (!account) return c.json({ success: true, skipped: true, reason: 'not_enrolled' });
    const eventKey = `loyalty_event:${email}:${eventId}`;
    const prior = await kv.get(eventKey);
    if (prior) return c.json({ success: true, duplicate: true, account: publicLoyaltyAccount(account), event: prior });
    const multiplier = account.tier === 'phoenix' ? 2 : account.tier === 'gold' ? 1.5 : account.tier === 'silver' ? 1.25 : 1;
    const points = Math.floor(spend * multiplier);
    const event = { id: rewardId('loyalty'), type: 'earn', points, description: body.description || 'Purchase', date: new Date().toISOString(), eventId };
    account.points += points; account.lifetimePoints += points; account.lifetimeSpend = Number(account.lifetimeSpend || 0) + spend; account.tier = loyaltyTier(account.lifetimeSpend); account.history = [event, ...(account.history || [])];
    await kv.set(`loyalty:${email}`, account); await kv.set(eventKey, event);
    return c.json({ success: true, account: publicLoyaltyAccount(account), event });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to award loyalty points.' }, 500); }
});

app.get('/make-server-57095a78/affiliates/:email', async (c) => {
  try {
    const email = rewardsEmail(c.req.param('email'));
    const { user, admin } = await ownRewardsAccount(c, email);
    if (!user?.email || (!admin && rewardsEmail(user.email) !== email)) return c.json({ success: false, error: 'Sign in to view your affiliate account.' }, 403);
    return c.json({ success: true, stats: (await kv.get(`affiliate:${email}`)) || null });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to load affiliate account.' }, 500); }
});

app.post('/make-server-57095a78/affiliates/join', async (c) => {
  try {
    const user = await rewardsActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to join the affiliate program.' }, 401);
    const email = rewardsEmail(user.email);
    const existing = await kv.get(`affiliate:${email}`);
    if (existing) return c.json({ success: true, stats: existing, existing: true });
    const body = await c.req.json().catch(() => ({}));
    const stats = { email, name: String(body.name || user.user_metadata?.full_name || email.split('@')[0]).slice(0, 120), code: `BP${referralCodeFor(email)}`, clicks: 0, signups: 0, conversions: 0, pendingCredit: 0, paidCredit: 0, history: [], joinedAt: new Date().toISOString() };
    await kv.set(`affiliate:${email}`, stats); await kv.set(`affiliate_code:${stats.code}`, email);
    return c.json({ success: true, stats }, 201);
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to join affiliate program.' }, 500); }
});


app.get('/make-server-57095a78/affiliates/:email/payout-requests', async (c) => {
  try { const email = rewardsEmail(c.req.param('email')); const { user, admin } = await ownRewardsAccount(c, email); if (!user?.email || (!admin && rewardsEmail(user.email) !== email)) return c.json({ success: false, error: 'Sign in to view payout requests.' }, 403); const requests = (await kv.getByPrefix(`affiliate_payout:${email}:`)) || []; return c.json({ success: true, requests: requests.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) }); }
  catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to load payout requests.' }, 500); }
});
app.post('/make-server-57095a78/affiliates/:email/payout-requests', async (c) => {
  try {
    const email = rewardsEmail(c.req.param('email')); const { user, admin } = await ownRewardsAccount(c, email); if (!user?.email || (!admin && rewardsEmail(user.email) !== email)) return c.json({ success: false, error: 'Sign in to request a payout.' }, 403);
    const stats = await kv.get(`affiliate:${email}`) as any; if (!stats) return c.json({ success: false, error: 'Affiliate account not found.' }, 404);
    const body = await c.req.json().catch(() => ({})); const amount = money(body.amount || (Number(stats.pendingCredit || 0) - Number(stats.payoutHold || 0))); const available = money(Number(stats.pendingCredit || 0) - Number(stats.payoutHold || 0));
    if (amount < 25) return c.json({ success: false, error: 'A minimum $25.00 available credit is required for a payout request.' }, 400);
    if (amount > available) return c.json({ success: false, error: 'Payout amount exceeds available affiliate credit.' }, 409);
    const now = new Date().toISOString(); const request = { id: `PAY-${crypto.randomUUID()}`, affiliateEmail: email, amount, status: 'requested', payoutMethod: String(body.payoutMethod || 'manual_review').slice(0, 80), createdAt: now, updatedAt: now };
    stats.payoutHold = money(Number(stats.payoutHold || 0) + amount); stats.history = [{ id: rewardId('affiliate'), type: 'payout', description: `Payout request submitted for $${amount.toFixed(2)}`, credit: -amount, date: now, payoutRequestId: request.id }, ...(stats.history || [])]; await kv.set(`affiliate:${email}`, stats); await kv.set(`affiliate_payout:${email}:${request.id}`, request);
    return c.json({ success: true, request, stats });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to submit payout request.' }, 500); }
});
app.get('/make-server-57095a78/affiliate-payouts', async (c) => {
  try { const user = await rewardsActor(c); if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); return c.json({ success: true, requests: (await kv.getByPrefix('affiliate_payout:')) || [] }); }
  catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to load affiliate payouts.' }, 500); }
});
app.patch('/make-server-57095a78/affiliate-payouts/:email/:id', async (c) => {
  try {
    const user = await rewardsActor(c); if (!await rewardsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const email = rewardsEmail(c.req.param('email')); const key = `affiliate_payout:${email}:${c.req.param('id')}`; const request = await kv.get(key) as any; if (!request) return c.json({ success: false, error: 'Payout request not found.' }, 404);
    const body = await c.req.json(); const status = String(body.status || ''); if (!['approved', 'paid', 'rejected'].includes(status)) return c.json({ success: false, error: 'Invalid payout status.' }, 400); if (request.status === 'paid' || request.status === 'rejected') return c.json({ success: false, error: 'This payout request is already final.' }, 409);
    const stats = await kv.get(`affiliate:${email}`) as any; if (!stats) return c.json({ success: false, error: 'Affiliate account not found.' }, 404); const now = new Date().toISOString(); request.status = status; request.reviewedBy = user.email; request.reviewNote = String(body.reviewNote || ''); request.transferReference = String(body.transferReference || ''); request.updatedAt = now;
    if (status === 'paid') { stats.payoutHold = money(Math.max(0, Number(stats.payoutHold || 0) - Number(request.amount))); stats.pendingCredit = money(Math.max(0, Number(stats.pendingCredit || 0) - Number(request.amount))); stats.paidCredit = money(Number(stats.paidCredit || 0) + Number(request.amount)); stats.history = [{ id: rewardId('affiliate'), type: 'payout', description: `Payout completed${request.transferReference ? ` (${request.transferReference})` : ''}`, credit: -Number(request.amount), date: now, payoutRequestId: request.id }, ...(stats.history || [])]; }
    if (status === 'rejected') stats.payoutHold = money(Math.max(0, Number(stats.payoutHold || 0) - Number(request.amount)));
    await kv.set(`affiliate:${email}`, stats); await kv.set(key, request); return c.json({ success: true, request, stats });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to update payout request.' }, 500); }
});

// Checkout/order services use this protected endpoint after an order has been
// paid. It is idempotent by affiliate + order ID so retries never award twice.
app.post('/make-server-57095a78/affiliate-attributions', async (c) => {
  try {
    const secret = Deno.env.get('AFFILIATE_EVENT_SECRET') || '';
    if (!secret || c.req.header('X-Affiliate-Event-Secret') !== secret) return c.json({ success: false, error: 'Unauthorized affiliate event.' }, 401);
    const body = await c.req.json();
    const orderId = String(body.orderId || '');
    const amount = Number(body.amount || 0);
    const code = String(body.code || '').toUpperCase().trim();
    if (!orderId || !code || !Number.isFinite(amount) || amount <= 0) return c.json({ success: false, error: 'Affiliate code, paid order ID, and positive amount are required.' }, 400);
    const affiliateEmail = await kv.get(`affiliate_code:${code}`) as string | null;
    if (!affiliateEmail) return c.json({ success: false, error: 'Affiliate code not found.' }, 404);
    const eventKey = `affiliate_attribution:${affiliateEmail}:${orderId}`;
    const prior = await kv.get(eventKey);
    const stats = await kv.get(`affiliate:${affiliateEmail}`) as any;
    if (!stats) return c.json({ success: false, error: 'Affiliate account not found.' }, 404);
    if (prior) return c.json({ success: true, duplicate: true, stats, event: prior });
    const credit = Math.round(amount * 0.1 * 100) / 100;
    const event = { id: rewardId('affiliate'), type: 'sale', description: `10% credit from order ${orderId}`, credit, date: new Date().toISOString(), orderId };
    stats.conversions = Number(stats.conversions || 0) + 1;
    stats.pendingCredit = Math.round((Number(stats.pendingCredit || 0) + credit) * 100) / 100;
    stats.history = [event, ...(Array.isArray(stats.history) ? stats.history : [])];
    await kv.set(`affiliate:${affiliateEmail}`, stats);
    await kv.set(eventKey, event);
    return c.json({ success: true, stats, event });
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to attribute affiliate sale.' }, 500); }
});

// A referral is captured once from a referral code and a referred identity.
// It stays pending until a trusted paid-order flow changes its status.
app.post('/make-server-57095a78/referrals/attributions', async (c) => {
  try {
    const body = await c.req.json(); const code = String(body.code || '').toUpperCase().trim(); const referredEmail = rewardsEmail(body.referredEmail);
    if (!code || !referredEmail) return c.json({ success: false, error: 'Referral code and referred email are required.' }, 400);
    const loyaltyOwner = await kv.get(`loyalty_referral:${code}`) as string | null;
    const affiliateOwner = loyaltyOwner ? null : await kv.get(`affiliate_code:${code}`) as string | null;
    const memberOwner = loyaltyOwner || affiliateOwner ? null : await kv.get(`referral_code_owner:${code}`) as string | null;
    const referrerEmail = loyaltyOwner || affiliateOwner || memberOwner;
    if (!referrerEmail) return c.json({ success: false, error: 'Referral code not found.' }, 404);
    if (rewardsEmail(referrerEmail) === referredEmail) return c.json({ success: false, error: 'You cannot refer yourself.' }, 400);
    const key = `referral_attribution:${code}:${referredEmail}`; const prior = await kv.get(key);
    if (prior) return c.json({ success: true, duplicate: true, referral: prior });
    const referral = { id: rewardId('referral'), referrerEmail, affiliateEmail: affiliateOwner || null, referredEmail, referrer: body.referrerName || referrerEmail, referred: body.referredName || referredEmail, code, source: affiliateOwner ? 'affiliate' : 'loyalty', status: 'pending', reward: 0, date: new Date().toISOString() };
    const all: any[] = (await kv.get('referrals:all')) || []; await kv.set('referrals:all', [referral, ...all]); await kv.set(key, referral);
    if (affiliateOwner) { const stats = await kv.get(`affiliate:${affiliateOwner}`) as any; if (stats) { const event = { id: rewardId('affiliate'), type: 'signup', description: `Referral signup: ${referredEmail}`, credit: 0, date: new Date().toISOString(), referralId: referral.id }; stats.signups = Number(stats.signups || 0) + 1; stats.history = [event, ...(stats.history || [])]; await kv.set(`affiliate:${affiliateOwner}`, stats); } }
    return c.json({ success: true, referral }, 201);
  } catch (error: any) { return c.json({ success: false, error: error?.message || 'Unable to record referral.' }, 500); }
});

// A paid order is the trusted moment to earn rewards and convert a referral.
// This helper is idempotent by order ID, so checkout-return retries cannot mint
// duplicate points, referral rewards, or affiliate credit.
async function settlePaidStoreRewards(order: any) {
  const email = rewardsEmail(order.customer_email); const orderId = String(order.id || ''); const spend = money(order.amount_total);
  const result: any = { loyaltyPoints: 0, referralConverted: false, affiliateCredit: 0 };
  if (!email || !orderId || spend <= 0) return result;
  const loyalty = await kv.get(`loyalty:${email}`) as any;
  const loyaltyEventKey = `loyalty_event:${email}:${orderId}`;
  if (loyalty && !await kv.get(loyaltyEventKey)) {
    const multiplier = loyalty.tier === 'phoenix' ? 2 : loyalty.tier === 'gold' ? 1.5 : loyalty.tier === 'silver' ? 1.25 : 1;
    const points = Math.floor(spend * multiplier); const event = { id: rewardId('loyalty'), type: 'earn', points, description: `Store order ${orderId}`, date: new Date().toISOString(), eventId: orderId };
    loyalty.points = Number(loyalty.points || 0) + points; loyalty.lifetimePoints = Number(loyalty.lifetimePoints || 0) + points; loyalty.lifetimeSpend = Number(loyalty.lifetimeSpend || 0) + spend; loyalty.tier = loyaltyTier(loyalty.lifetimeSpend); loyalty.history = [event, ...(loyalty.history || [])];
    await kv.set(`loyalty:${email}`, loyalty); await kv.set(loyaltyEventKey, event); result.loyaltyPoints = points;
  }
  const referrals: any[] = (await kv.get('referrals:all')) || [];
  let changed = false;
  for (const referral of referrals) {
    if (rewardsEmail(referral.referredEmail) !== email || referral.status !== 'pending') continue;
    const conversionKey = `referral_conversion:${referral.id}:${orderId}`;
    if (await kv.get(conversionKey)) continue;
    referral.status = 'converted'; referral.convertedAt = new Date().toISOString(); referral.orderId = orderId; referral.orderAmount = spend; referral.reward = referral.affiliateEmail ? money(spend * 0.1) : 50; changed = true; result.referralConverted = true;
    if (referral.affiliateEmail) {
      const affiliate = await kv.get(`affiliate:${rewardsEmail(referral.affiliateEmail)}`) as any;
      if (affiliate) { const credit = money(spend * 0.1); const event = { id: rewardId('affiliate'), type: 'sale', description: `10% credit from order ${orderId}`, credit, date: new Date().toISOString(), orderId, referralId: referral.id }; affiliate.conversions = Number(affiliate.conversions || 0) + 1; affiliate.pendingCredit = money(Number(affiliate.pendingCredit || 0) + credit); affiliate.history = [event, ...(affiliate.history || [])]; await kv.set(`affiliate:${rewardsEmail(referral.affiliateEmail)}`, affiliate); result.affiliateCredit = credit; }
    } else {
      const referrer = rewardsEmail(referral.referrerEmail); const account = await kv.get(`loyalty:${referrer}`) as any;
      if (account) { const rewardKey = `loyalty_referral_reward:${referrer}:${orderId}`; if (!await kv.get(rewardKey)) { const event = { id: rewardId('loyalty'), type: 'referral', points: 50, description: `Referral reward from order ${orderId}`, date: new Date().toISOString(), eventId: orderId, referralId: referral.id }; account.points = Number(account.points || 0) + 50; account.lifetimePoints = Number(account.lifetimePoints || 0) + 50; account.history = [event, ...(account.history || [])]; await kv.set(`loyalty:${referrer}`, account); await kv.set(rewardKey, event); } }
    }
    await kv.set(conversionKey, { referralId: referral.id, orderId, settledAt: new Date().toISOString() });
  }
  if (changed) await kv.set('referrals:all', referrals);
  return result;
}

// ============================================
// PORTAL ONBOARDING + CONTRACT / INVOICE RECORDS
// ============================================
async function intakeOwnedBy(c: any, applicationId: string, allowAdmin = true) {
  const user = await intakeActor(c);
  if (!user?.email) return { user: null, admin: false, intake: null };
  const intake = await kv.get(`intake:onboarding:${applicationId}`) as any;
  const admin = allowAdmin && await intakeIsAdmin(user);
  if (!intake || (!admin && String(intake.applicantEmail || '').toLowerCase() !== String(user.email).toLowerCase())) return { user, admin, intake: null };
  return { user, admin, intake };
}

// Authenticated portal identity. Login uses this after Supabase sign-in rather
// than trusting a role cached in a particular browser or phone.
app.get('/make-server-57095a78/auth/me', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const allowedRoles = new Set(['owner', 'platform_owner', 'business_owner', 'admin', 'master_admin', 'management', 'customer', 'vendor', 'subcontractor', 'service_provider', 'employee', 'investor', 'advertiser', 'property_manager', 'territory_owner', 'territory', 'landlord', 'condo_manager']);
    const metadataRole = String(user.app_metadata?.role || user.user_metadata?.role || user.user_metadata?.accountType || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    let role = allowedRoles.has(metadataRole) ? metadataRole : '';
    if (!role) {
      try {
        const [permissionResult, membershipResult] = await Promise.all([
          supabase.from('user_permissions').select('role_name, level').eq('user_id', user.id).order('level', { ascending: true }).limit(10),
          supabase.from('company_members').select('role').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }).limit(10),
        ]);
        const roles = (permissionResult.data || []).map((row: any) => String(row.role_name || '').toLowerCase()).filter((value: string) => allowedRoles.has(value));
        const membershipRoles = (membershipResult.data || []).map((row: any) => String(row.role || '').toLowerCase());
        role = membershipRoles.includes('owner') ? 'owner' : membershipRoles.includes('admin') ? 'admin' : roles.find((value: string) => INTAKE_ADMIN_ROLES.has(value)) || roles[0] || '';
      } catch { /* Fall through to the approved application role. */ }
    }
    let applicationId = await kv.get(`intake:email:${String(user.email).toLowerCase()}`) as string | null;
    let intake = applicationId ? await kv.get(`intake:onboarding:${applicationId}`) as any : null;
    if (!intake) {
      const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || [];
      const application = applications.find((item: any) => String(item.email || '').toLowerCase() === String(user.email).toLowerCase() && ['approved', 'active'].includes(String(item.status || '').toLowerCase()));
      if (application) { intake = await ensureIntake(application); applicationId = intake.applicationId; }
    }
    if (!role && intake?.portalType) role = String(intake.portalType);
    return c.json({ success: true, user: { id: user.id, email: user.email, role: role || 'customer', onboardingStatus: intake?.status || null, applicationId: applicationId || null } });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load authenticated identity.' }, 500); }
});

// Owner-created portal access is intentionally free at creation.  The invite
// initializes a real onboarding record and an access record; no subscription or
// payment is created until the invited person chooses a plan themselves.
const OWNER_PROVISION_PORTALS = new Set(['customer', 'vendor', 'subcontractor', 'employee', 'advertiser', 'investor', 'property_manager', 'condo_manager', 'landlord', 'territory_owner']);
app.post('/make-server-57095a78/owner-provisioning/invites', async (c) => {
  try {
    const actor = await financialActor(c);
    if (!actor.admin || !actor.user?.email) return c.json({ success: false, error: 'Platform Owner or administrator access is required.' }, 403);
    const body = stripBase64(await c.req.json());
    const name = String(body.name || '').trim().slice(0, 180); const email = String(body.email || '').trim().toLowerCase(); const phone = String(body.phone || '').trim().slice(0, 64); const portalType = String(body.portalType || '').trim().toLowerCase();
    if (!name || !email || !phone) return c.json({ success: false, error: 'Name, email, and phone are required.' }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ success: false, error: 'Enter a valid email address.' }, 400);
    if (!OWNER_PROVISION_PORTALS.has(portalType)) return c.json({ success: false, error: 'Choose a valid portal.' }, 400);
    const existingId = await kv.get(`intake:email:${email}`) as string | null;
    if (existingId) return c.json({ success: false, error: 'This email already has an onboarding or portal record. Use access control to change their access.' }, 409);
    const now = new Date().toISOString(); const applicationId = `OWNER-INVITE-${crypto.randomUUID()}`;
    const intake = { id: applicationId, applicationId, applicantEmail: email, applicantName: name, applicantPhone: phone, portalType, status: 'profile_required', ownerProvisioned: true, provisionedBy: actor.user.email, provisionedAt: now, requiredTasks: [], documents: [], profile: { fullName: name, email, phone, completed: false }, planInterest: 'not_selected', createdAt: now, updatedAt: now };
    const access = { id: `ACCESS-${crypto.randomUUID()}`, applicationId, email, portalType, applicantName: name, status: 'onboarding', onboardingStatus: intake.status, freeProvisioned: true, provisionedBy: actor.user.email, createdAt: now, updatedAt: now };
    await kv.set(`intake:onboarding:${applicationId}`, intake); await kv.set(`intake:email:${email}`, applicationId); await kv.set(`portal_access:${email}:${portalType}`, access); await kv.set(`owner_provision:${applicationId}`, { ...intake, inviteStatus: 'pending' });
    let invitationSent = false; let inviteNotice = '';
    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: name, phone, role: portalType, accountType: portalType } });
      if (error) { inviteNotice = error.message || 'The account may already exist.'; } else { invitationSent = true; }
    } catch (error: any) { inviteNotice = error?.message || 'Invitation email could not be sent.'; }
    await kv.set(`owner_provision:${applicationId}`, { ...intake, inviteStatus: invitationSent ? 'sent' : 'account_exists_or_email_failed', inviteNotice, updatedAt: new Date().toISOString() });
    return c.json({ success: true, invite: { applicationId, name, email, phone, portalType, invitationSent, inviteNotice, freeProvisioned: true } }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create portal invite.' }, 500); }
});

app.get('/make-server-57095a78/intake/my-onboarding', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view onboarding.' }, 401);
    // Owners and administrators never enter applicant onboarding. Their portal
    // access is authoritative and they must retain Command Center access even if
    // an old intake record exists for the same email.
    if (await intakeIsAdmin(user)) return c.json({ success: true, intake: null, access: null, ownerBypass: true });
    let applicationId = await kv.get(`intake:email:${String(user.email).toLowerCase()}`) as string | null;
    if (!applicationId) {
      const applications: any[] = (await kv.get(APPLICATIONS_KEY)) || [];
      const approved = applications.find((application: any) => String(application.email || '').toLowerCase() === String(user.email).toLowerCase() && ['approved', 'active'].includes(String(application.status || '').toLowerCase()));
      if (approved) applicationId = (await ensureIntake(approved)).applicationId;
    }
    if (!applicationId) return c.json({ success: true, intake: null, access: null });
    const intake = await kv.get(`intake:onboarding:${applicationId}`);
    return c.json({ success: true, intake, access: intake ? { applicationId, portalType: intake.portalType, status: intake.status } : null });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load onboarding.' }, 500); }
});

app.post('/make-server-57095a78/intake/my-onboarding/profile', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to complete your profile.' }, 401);
    const applicationId = await kv.get(`intake:email:${String(user.email).toLowerCase()}`) as string | null;
    const intake = applicationId ? await kv.get(`intake:onboarding:${applicationId}`) as any : null;
    if (!intake) return c.json({ success: false, error: 'No onboarding record is assigned to this account.' }, 404);
    const body = stripBase64(await c.req.json()); const fullName = String(body.fullName || '').trim().slice(0, 180); const phone = String(body.phone || '').trim().slice(0, 64); const company = String(body.company || '').trim().slice(0, 180); const address = String(body.address || '').trim().slice(0, 300); const planInterest = ['not_selected', 'subscription', 'maintenance', 'both', 'later'].includes(String(body.planInterest)) ? String(body.planInterest) : 'not_selected';
    if (!fullName || !phone) return c.json({ success: false, error: 'Full name and phone number are required.' }, 400);
    const now = new Date().toISOString(); intake.applicantName = fullName; intake.applicantPhone = phone; intake.profile = { fullName, email: String(user.email).toLowerCase(), phone, company, address, completed: true, completedAt: now }; intake.planInterest = planInterest; intake.status = 'active'; intake.updatedAt = now;
    await kv.set(`intake:onboarding:${applicationId}`, intake);
    const accessKey = `portal_access:${String(user.email).toLowerCase()}:${intake.portalType}`; const prior = await kv.get(accessKey) as any; const access = { ...(prior || {}), applicationId, email: String(user.email).toLowerCase(), portalType: intake.portalType, applicantName: fullName, status: 'active', onboardingStatus: 'active', freeProvisioned: Boolean(intake.ownerProvisioned), updatedAt: now, createdAt: prior?.createdAt || now }; await kv.set(accessKey, access);
    if (['subscription', 'maintenance', 'both'].includes(planInterest)) await kv.set(`plan_interest:${String(user.email).toLowerCase()}`, { email: String(user.email).toLowerCase(), name: fullName, phone, company, address, portalType: intake.portalType, planInterest, source: 'owner-provisioned-onboarding', status: 'requested', applicationId, requestedAt: now });
    return c.json({ success: true, intake: stripBase64(intake), access, next: 'portal' });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save your profile.' }, 500); }
});

app.get('/make-server-57095a78/intake/my-access', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to access a portal.' }, 401);
    let applicationId = await kv.get(`intake:email:${String(user.email).toLowerCase()}`) as string | null;
    let intake = applicationId ? await kv.get(`intake:onboarding:${applicationId}`) as any : null;
    if (!intake) { const application = ((await kv.get(APPLICATIONS_KEY)) || []).find((item: any) => String(item.email || '').toLowerCase() === String(user.email).toLowerCase() && ['approved', 'active'].includes(String(item.status || '').toLowerCase())); if (application) { intake = await ensureIntake(application); applicationId = intake.applicationId; } }
    const application = intake ? ((await kv.get(APPLICATIONS_KEY)) || []).find((item: any) => item.id === intake.applicationId) : null;
    const access = intake ? await syncPortalAccess(application || { id: intake.applicationId, email: user.email, name: intake.applicantName, type: intake.portalType }, intake) : null;
    return c.json({ success: true, canEnterPortal: access?.status === 'active', access: access ? { applicationId: access.applicationId, portalType: access.portalType, status: access.status, onboardingStatus: access.onboardingStatus, active: access.status === 'active' } : null });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load portal access.' }, 500); }
});

app.get('/make-server-57095a78/intake/onboarding/:id', async (c) => {
  try {
    let { intake, admin } = await intakeOwnedBy(c, c.req.param('id'));
    if (!intake && admin) {
      const application = ((await kv.get(APPLICATIONS_KEY)) || []).find((item: any) => item.id === c.req.param('id'));
      if (application && ['approved', 'active'].includes(String(application.status || '').toLowerCase())) intake = await ensureIntake(application);
    }
    if (!intake) return c.json({ success: false, error: 'Onboarding record not found or unavailable.' }, 404);
    return c.json({ success: true, intake });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

app.post('/make-server-57095a78/intake/my-onboarding/documents', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in before uploading documents.' }, 401);
    const applicationId = await kv.get(`intake:email:${String(user.email).toLowerCase()}`) as string | null;
    if (!applicationId) return c.json({ success: false, error: 'No onboarding record is assigned to this account.' }, 404);
    const intake = await kv.get(`intake:onboarding:${applicationId}`) as any;
    if (!intake || intake.status === 'active') return c.json({ success: false, error: 'This onboarding record cannot accept documents.' }, 409);
    const body = await c.req.parseBody();
    const taskId = String(body.taskId || '');
    const file = body.file;
    const task = (intake.requiredTasks || []).find((item: any) => item.id === taskId);
    if (!task || !(file instanceof File)) return c.json({ success: false, error: 'A valid checklist item and document are required.' }, 400);
    if (file.size > 10 * 1024 * 1024) return c.json({ success: false, error: 'Documents must be 10 MB or smaller.' }, 413);
    const bucket = 'make-57095a78-intake-documents';
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((item: any) => item.name === bucket)) {
      const created = await supabase.storage.createBucket(bucket, { public: false });
      if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) throw created.error;
    }
    const documentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'document';
    const path = `${applicationId}/${documentId}-${safeName}`;
    const upload = await supabase.storage.from(bucket).upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upload.error) throw upload.error;
    const document = { id: documentId, taskId, name: file.name, status: 'submitted', uploadedAt: new Date().toISOString(), storageBucket: bucket, storagePath: path };
    intake.documents = [...(Array.isArray(intake.documents) ? intake.documents : []), document];
    intake.requiredTasks = (intake.requiredTasks || []).map((item: any) => item.id === taskId ? { ...item, status: 'submitted', submittedAt: document.uploadedAt } : item);
    intake.status = 'under_review'; intake.updatedAt = document.uploadedAt;
    await kv.set(`intake:onboarding:${applicationId}`, intake);
    return c.json({ success: true, document, requiredTasks: intake.requiredTasks });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to upload document.' }, 500); }
});

app.get('/make-server-57095a78/intake/onboarding/:id/documents/:documentId/download', async (c) => {
  try {
    const { intake } = await intakeOwnedBy(c, c.req.param('id'));
    if (!intake) return c.json({ success: false, error: 'Document is not available.' }, 404);
    const document = (intake.documents || []).find((item: any) => item.id === c.req.param('documentId'));
    if (!document?.storageBucket || !document?.storagePath) return c.json({ success: false, error: 'Document file is unavailable.' }, 404);
    const signed = await supabase.storage.from(document.storageBucket).createSignedUrl(document.storagePath, 300);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('Could not create document link.');
    return c.json({ success: true, url: signed.data.signedUrl });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to open document.' }, 500); }
});

app.delete('/make-server-57095a78/intake/onboarding/:id/documents/:documentId', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const intake = await kv.get(`intake:onboarding:${c.req.param('id')}`) as any;
    if (!intake) return c.json({ success: false, error: 'Onboarding record not found.' }, 404);
    const document = (intake.documents || []).find((item: any) => item.id === c.req.param('documentId'));
    if (!document) return c.json({ success: false, error: 'Document not found.' }, 404);
    if (document.storageBucket && document.storagePath) await supabase.storage.from(document.storageBucket).remove([document.storagePath]);
    intake.documents = (intake.documents || []).filter((item: any) => item.id !== document.id);
    intake.requiredTasks = (intake.requiredTasks || []).map((task: any) => task.id === document.taskId ? { ...task, status: 'pending', submittedAt: undefined, reviewedAt: undefined } : task);
    intake.status = 'pending_documents'; intake.updatedAt = new Date().toISOString();
    await kv.set(`intake:onboarding:${intake.applicationId}`, intake);
    return c.json({ success: true, intake });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete document.' }, 500); }
});

app.patch('/make-server-57095a78/intake/onboarding/:id/documents/:documentId', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!await intakeIsAdmin(user)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const intake = await kv.get(`intake:onboarding:${c.req.param('id')}`) as any;
    if (!intake) return c.json({ success: false, error: 'Onboarding record not found.' }, 404);
    const body = await c.req.json(); const status = body.status === 'approved' ? 'approved' : 'rejected';
    let found = false;
    intake.documents = (intake.documents || []).map((document: any) => {
      if (document.id !== c.req.param('documentId')) return document;
      found = true; return { ...document, status, reviewNote: String(body.reviewNote || ''), reviewedAt: new Date().toISOString(), reviewedBy: user.email };
    });
    if (!found) return c.json({ success: false, error: 'Document not found.' }, 404);
    intake.requiredTasks = (intake.requiredTasks || []).map((task: any) => {
      const doc = intake.documents.filter((item: any) => item.taskId === task.id).at(-1);
      return doc ? { ...task, status: doc.status === 'approved' ? 'complete' : doc.status === 'rejected' ? 'rejected' : 'submitted', reviewedAt: doc.reviewedAt } : task;
    });
    const required = intake.requiredTasks.filter((task: any) => task.required);
    intake.status = required.every((task: any) => task.status === 'complete') ? 'active' : 'under_review'; intake.updatedAt = new Date().toISOString();
    await kv.set(`intake:onboarding:${intake.applicationId}`, intake);
    const application = ((await kv.get(APPLICATIONS_KEY)) || []).find((item: any) => item.id === intake.applicationId);
    const access = application ? await syncPortalAccess(application, intake) : null;
    return c.json({ success: true, intake, access });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to review document.' }, 500); }
});

async function financialActor(c: any) { const user = await intakeActor(c); return { user, admin: await intakeIsAdmin(user) }; }
function ownsFinancialRecord(record: any, email: string) { const target = String(email || '').trim().toLowerCase(); return [record.customerEmail, record.customer_email, record.clientEmail, record.client_email, record.email, record.ownerEmail].some((value: any) => String(value || '').trim().toLowerCase() === target); }

const invoicePortalRoutes: Record<string, string> = { customer: 'customer-portal-app', vendor: 'vendor-portal', advertiser: 'advertiser-portal', subcontractor: 'subcontractor-portal', employee: 'employee-portal', investor: 'investor-portal', property_manager: 'property-manager-portal', condo_manager: 'condo-manager-portal', landlord: 'landlord-portal', territory_owner: 'territory-portal' };
function invoicePortal(value: any) { return Object.prototype.hasOwnProperty.call(invoicePortalRoutes, String(value || '')) ? String(value) : 'customer'; }
function invoiceRecipient(body: any) { const customerEmail = String(body.customerEmail || body.customer_email || body.clientEmail || body.client_email || '').trim().toLowerCase(); const customerName = String(body.customerName || body.customer_name || body.clientName || body.client_name || '').trim(); return { customerEmail, customerName, recipientPortal: invoicePortal(body.recipientPortal || body.recipient_portal), paymentRail: String(body.paymentRail || body.payment_rail) === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services' as StripeAccount }; }

app.get('/make-server-57095a78/contracts', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401); const records = (await kv.getByPrefix('contract:')) || []; return c.json({ success: true, contracts: admin ? records : records.filter((record: any) => ownsFinancialRecord(record, user.email)) }); }
  catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});
app.post('/make-server-57095a78/contracts', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const id = String(body.id || crypto.randomUUID()); const record = { ...body, id, status: body.status || 'pending_signature', createdAt: body.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: user.email }; await kv.set(`contract:${id}`, record); return c.json({ success: true, contract: record }, 201); }
  catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});
app.post('/make-server-57095a78/contracts/:id/sign', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    const record = await kv.get(`contract:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Contract not found.' }, 404);
    if (!user?.email || (!admin && !ownsFinancialRecord(record, user.email))) return c.json({ success: false, error: 'You may only sign your own contract.' }, 403);
    if (record.signedAt || ['active', 'signed', 'completed'].includes(String(record.status || '').toLowerCase())) return c.json({ success: false, error: 'This contract has already been signed and cannot be replaced.' }, 409);
    const body = await c.req.json();
    if (body.acceptTerms !== true) return c.json({ success: false, error: 'Terms must be accepted before signing.' }, 400);
    const signatureName = String(body.signatureName || '').trim();
    if (!signatureName) return c.json({ success: false, error: 'Your full legal name is required to sign.' }, 400);
    const signedAt = new Date().toISOString();
    const signature = { name: signatureName, signerEmail: String(user.email).toLowerCase(), acceptedTermsAt: signedAt, method: 'portal_typed_name' };
    const signed = { ...record, status: 'active', signedAt, signedBy: signature.signerEmail, signatureName, signature, updatedAt: signedAt, history: [...(Array.isArray(record.history) ? record.history : []), { ts: signedAt, type: 'contract_signed', note: `Signed by ${signatureName}` }] };
    await kv.set(`contract:${signed.id}`, signed);
    return c.json({ success: true, contract: signed });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

function customerFromContact(contact: any) { const name = String(contact.name || contact.contact_name || '').trim(); const [firstName = '', ...last] = name.split(/\s+/); const statusValue = String(contact.status || 'lead').toLowerCase(); const status = ['lead', 'active', 'inactive', 'vip'].includes(statusValue) ? statusValue : 'lead'; return { id: String(contact.id || crypto.randomUUID()), customer_number: String(contact.customer_number || `CUST-${String(contact.id || '').slice(-6).toUpperCase() || Date.now()}`), first_name: contact.first_name || firstName, last_name: contact.last_name || last.join(' '), email: String(contact.email || '').toLowerCase(), phone: contact.phone || '', company: contact.company || '', status, total_spent: Number(contact.total_spent || 0), project_count: Number(contact.project_count || 0), rating: contact.rating || 0, tags: Array.isArray(contact.tags) ? contact.tags : [], address_line1: contact.address_line1 || '', address_line2: contact.address_line2 || '', city: contact.city || '', state: contact.state || '', zip_code: contact.zip_code || '', country: contact.country || 'US', notes: contact.notes || '', source: contact.source || 'crm', assigned_to: contact.assigned_to || '', created_at: contact.createdAt || contact.created_at || new Date().toISOString(), updated_at: contact.updatedAt || contact.updated_at || new Date().toISOString(), created_by: contact.createdBy || contact.created_by || '' }; }
async function customerAdmin(c: any) { const actor = await financialActor(c); return actor.admin ? actor.user : null; }

// Platform subscription controls are shared operational settings. They are
// stored once server-side and restricted to the authenticated owner/admin.
const SUBSCRIPTION_HUB_SETTINGS_KEY = 'subscription_hub_settings:platform';
app.get('/make-server-57095a78/subscription-hub/settings', async (c) => {
  try {
    if (!await customerAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    return c.json({ success: true, settings: (await kv.get(SUBSCRIPTION_HUB_SETTINGS_KEY)) || null });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load subscription settings.' }, 500); }
});
app.put('/make-server-57095a78/subscription-hub/settings', async (c) => {
  try {
    const user = await customerAdmin(c);
    if (!user?.email) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const settings = await c.req.json();
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return c.json({ success: false, error: 'A settings object is required.' }, 400);
    const record = { ...settings, updatedAt: new Date().toISOString(), updatedBy: user.email };
    await kv.set(SUBSCRIPTION_HUB_SETTINGS_KEY, record);
    return c.json({ success: true, settings: record });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save subscription settings.' }, 500); }
});

app.get('/make-server-57095a78/customers', async (c) => { try { if (!await customerAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const contacts = (await kv.get(CRM_CONTACTS_KEY) as any[]) || []; return c.json({ success: true, customers: contacts.filter((contact: any) => contact.email).map(customerFromContact) }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.get('/make-server-57095a78/customers/stats', async (c) => { try { if (!await customerAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const contacts = ((await kv.get(CRM_CONTACTS_KEY) as any[]) || []).filter((item: any) => item.email).map(customerFromContact); const stats = { total: contacts.length, active: contacts.filter((item: any) => item.status === 'active').length, leads: contacts.filter((item: any) => item.status === 'lead').length, vip: contacts.filter((item: any) => item.status === 'vip').length, inactive: contacts.filter((item: any) => item.status === 'inactive').length, totalRevenue: contacts.reduce((sum: number, item: any) => sum + Number(item.total_spent || 0), 0), avgDeal: contacts.length ? contacts.reduce((sum: number, item: any) => sum + Number(item.total_spent || 0), 0) / contacts.length : 0 }; return c.json({ success: true, stats }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/customers', async (c) => { try { const user = await customerAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const email = String(body.email || '').trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ success: false, error: 'A valid customer email is required.' }, 400); const contacts = (await kv.get(CRM_CONTACTS_KEY) as any[]) || []; const index = contacts.findIndex((item: any) => String(item.email || '').toLowerCase() === email); const now = new Date().toISOString(); const record = { ...(index >= 0 ? contacts[index] : {}), ...stripBase64(body), id: index >= 0 ? contacts[index].id : crypto.randomUUID(), name: `${String(body.first_name || '').trim()} ${String(body.last_name || '').trim()}`.trim() || String(body.name || '').trim(), email, type: 'customer', updatedAt: now, updatedBy: user.email, createdAt: index >= 0 ? contacts[index].createdAt : now, createdBy: index >= 0 ? contacts[index].createdBy : user.email }; if (index >= 0) contacts[index] = record; else contacts.unshift(record); await kv.set(CRM_CONTACTS_KEY, contacts); return c.json({ success: true, customer: customerFromContact(record) }, index >= 0 ? 200 : 201); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.put('/make-server-57095a78/customers/:id', async (c) => { try { const user = await customerAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const contacts = (await kv.get(CRM_CONTACTS_KEY) as any[]) || []; const index = contacts.findIndex((item: any) => String(item.id) === String(c.req.param('id'))); if (index < 0) return c.json({ success: false, error: 'Customer not found.' }, 404); const body = await c.req.json(); const email = body.email ? String(body.email).trim().toLowerCase() : contacts[index].email; const record = { ...contacts[index], ...stripBase64(body), email, name: body.first_name || body.last_name ? `${String(body.first_name ?? customerFromContact(contacts[index]).first_name).trim()} ${String(body.last_name ?? customerFromContact(contacts[index]).last_name).trim()}`.trim() : contacts[index].name, updatedAt: new Date().toISOString(), updatedBy: user.email }; contacts[index] = record; await kv.set(CRM_CONTACTS_KEY, contacts); return c.json({ success: true, customer: customerFromContact(record) }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.delete('/make-server-57095a78/customers/:id', async (c) => { try { if (!await customerAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const contacts = (await kv.get(CRM_CONTACTS_KEY) as any[]) || []; const filtered = contacts.filter((item: any) => String(item.id) !== String(c.req.param('id'))); if (filtered.length === contacts.length) return c.json({ success: false, error: 'Customer not found.' }, 404); await kv.set(CRM_CONTACTS_KEY, filtered); return c.json({ success: true }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.get('/make-server-57095a78/reporting/referral-sources', async (c) => { try { if (!await customerAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const [referrals, applications] = await Promise.all([kv.get('referrals:all'), kv.get(APPLICATIONS_KEY)]); const now = Date.now(); const sourceMeta: Record<string, { category: string; color: string }> = { affiliate: { category: 'affiliate', color: '#a855f7' }, loyalty: { category: 'referral', color: '#ea4335' }, direct: { category: 'direct', color: '#34A853' }, social: { category: 'social', color: '#FBBC05' } }; const grouped = new Map<string, any>(); for (const referral of (referrals as any[]) || []) { const source = String(referral.source || 'loyalty'); const row = grouped.get(source) || { source_name: source === 'loyalty' ? 'Member Referral' : source === 'affiliate' ? 'Affiliate Referral' : source, category: sourceMeta[source]?.category || 'other', color: sourceMeta[source]?.color || '#6b7280', total_signups: 0, signups_last_30_days: 0, signups_last_7_days: 0, total_value: 0, avg_value_per_signup: 0, first_signup: '', last_signup: '', user_roles: [] as string[] }; const date = new Date(referral.date || referral.createdAt || 0).getTime(); row.total_signups += 1; if (date >= now - 30 * 86400000) row.signups_last_30_days += 1; if (date >= now - 7 * 86400000) row.signups_last_7_days += 1; row.total_value += money(referral.orderAmount || 0); const day = new Date(date || now).toISOString().slice(0, 10); row.first_signup = !row.first_signup || day < row.first_signup ? day : row.first_signup; row.last_signup = !row.last_signup || day > row.last_signup ? day : row.last_signup; grouped.set(source, row); } const sourceData = Array.from(grouped.values()).map((row: any) => ({ ...row, avg_value_per_signup: row.total_signups ? money(row.total_value / row.total_signups) : 0 })); const appRows = applications as any[] || []; const completed = appRows.filter((item: any) => ['approved','active','rejected'].includes(String(item.status || '').toLowerCase())).length; const funnel = { started_count: appRows.length, completed_count: completed, skipped_count: 0, abandoned_count: Math.max(0, appRows.length - completed), completion_rate: appRows.length ? Number((completed / appRows.length * 100).toFixed(1)) : 0, avg_completion_time_minutes: 0 }; return c.json({ success: true, sources: sourceData, funnel }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

// ── FINANCIAL RECONCILIATION ────────────────────────────────────────────────
// Bank-imported entries and verified platform payments are kept separately but
// returned together so the owner has a real reconciliation ledger on every device.
const reconciliationTxnPrefix = 'reconciliation_txn:';
const reconciliationPeriodPrefix = 'reconciliation_period:';
const reconciliationMatchPrefix = 'reconciliation_match:';
const reconciliationDiscrepancyPrefix = 'reconciliation_discrepancy:';
function reconciliationStats(transactions: any[], matches: any[], discrepancies: any[]) {
  const reconciledRows = transactions.filter((item) => item.isReconciled); const reconciledCount = reconciledRows.length; const totalTransactions = transactions.length;
  const signed = (item: any) => ['withdrawal', 'fee'].includes(String(item.type)) ? -Number(item.amount || 0) : Number(item.amount || 0);
  const totalAmount = transactions.reduce((sum, item) => sum + signed(item), 0); const reconciledAmount = reconciledRows.reduce((sum, item) => sum + signed(item), 0);
  const totalDiscrepancyAmount = discrepancies.reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  return { totalTransactions, reconciledCount, unreconciledCount: totalTransactions - reconciledCount, totalAmount, reconciledAmount, unreconciledAmount: totalAmount - reconciledAmount, reconciliationRate: totalTransactions ? Number((reconciledCount / totalTransactions * 100).toFixed(1)) : 0, matchCount: matches.length, openDiscrepancies: discrepancies.filter((item) => !['resolved', 'accepted'].includes(item.status)).length, totalDiscrepancyAmount };
}
app.get('/make-server-57095a78/financial-reconciliation', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin || !user?.email) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const companyId = String(c.req.query('companyId') || 'default').slice(0, 120);
    const [manualTransactions, payments, invoices, matchesAll, periodsAll, discrepanciesAll] = await Promise.all([kv.getByPrefix(reconciliationTxnPrefix), kv.getByPrefix('payment:'), kv.getByPrefix('invoice:'), kv.getByPrefix(reconciliationMatchPrefix), kv.getByPrefix(reconciliationPeriodPrefix), kv.getByPrefix(reconciliationDiscrepancyPrefix)]);
    const paymentTransactions = (payments as any[] || []).filter((payment: any) => ['paid', 'completed'].includes(String(payment.status || '').toLowerCase())).map((payment: any) => ({ id: `payment_${payment.id}`, companyId, date: payment.paidAt || payment.updatedAt || payment.createdAt || new Date().toISOString(), description: `Verified ${payment.paymentMethod || payment.rail || 'platform'} payment`, amount: Number(payment.amount || 0), type: 'deposit', reference: String(payment.invoiceId || payment.invoice_id || payment.id), category: 'verified_payment', isReconciled: true, reconciledDate: payment.paidAt || payment.updatedAt, reconciledBy: 'payment_confirmation', matchedInvoiceId: payment.invoiceId || payment.invoice_id || null, matchedPaymentId: payment.id, bankAccount: payment.paymentRail || payment.rail || 'platform', importedDate: payment.createdAt || new Date().toISOString(), notes: 'Verified platform payment' }));
    const manual = (manualTransactions as any[] || []).filter((item: any) => item.companyId === companyId); const transactions = [...paymentTransactions, ...manual].sort((a: any, b: any) => Date.parse(b.date) - Date.parse(a.date));
    const matches = (matchesAll as any[] || []).filter((item: any) => item.companyId === companyId); const periods = (periodsAll as any[] || []).filter((item: any) => item.companyId === companyId); const discrepancies = (discrepanciesAll as any[] || []).filter((item: any) => item.companyId === companyId);
    return c.json({ success: true, transactions, matches, periods, discrepancies, stats: reconciliationStats(transactions, matches, discrepancies), invoices: (invoices as any[] || []).map((invoice: any) => ({ id: invoice.id, balance_due: invoice.balance_due, total_amount: invoice.total_amount, status: invoice.status })) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load reconciliation ledger.' }, 500); }
});
app.post('/make-server-57095a78/financial-reconciliation/transactions', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin || !user?.email) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const body = await c.req.json(); const amount = Number(body.amount); const date = String(body.date || ''); const type = String(body.type || 'deposit');
    if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(Date.parse(date)) || !['deposit', 'withdrawal', 'transfer', 'fee'].includes(type)) return c.json({ success: false, error: 'A positive amount, valid date, and transaction type are required.' }, 400);
    const transaction = { id: `txn_${crypto.randomUUID()}`, companyId: String(body.companyId || 'default').slice(0, 120), date, description: String(body.description || '').trim().slice(0, 500), amount, type, reference: String(body.reference || '').trim().slice(0, 200), category: String(body.category || '').trim().slice(0, 100), isReconciled: false, bankAccount: String(body.bankAccount || 'main').trim().slice(0, 120), bankName: String(body.bankName || '').trim().slice(0, 120), importedDate: new Date().toISOString(), notes: String(body.notes || '').trim().slice(0, 2000), createdBy: user.email };
    if (!transaction.description) return c.json({ success: false, error: 'A transaction description is required.' }, 400); await kv.set(`${reconciliationTxnPrefix}${transaction.id}`, transaction); return c.json({ success: true, transaction }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save bank transaction.' }, 500); }
});
app.post('/make-server-57095a78/financial-reconciliation/transactions/:id/reconcile', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin || !user?.email) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const transaction = await kv.get(`${reconciliationTxnPrefix}${c.req.param('id')}`) as any; if (!transaction) return c.json({ success: false, error: 'Only manually imported bank transactions can be reconciled here.' }, 404);
    const body = await c.req.json().catch(() => ({})); const invoices = (await kv.getByPrefix('invoice:') as any[]) || []; const amount = Number(transaction.amount || 0); const invoice = body.invoiceId ? invoices.find((item: any) => item.id === body.invoiceId) : invoices.find((item: any) => !['paid','completed','void','cancelled'].includes(String(item.status || '').toLowerCase()) && Math.abs(Number(item.balance_due ?? item.total_amount ?? 0) - amount) < 0.01);
    if (!invoice) return c.json({ success: false, error: 'No open invoice with the same balance was found. Choose the correct invoice before reconciling.' }, 409);
    const now = new Date().toISOString(); const match = { id: `match_${crypto.randomUUID()}`, companyId: transaction.companyId, transactionId: transaction.id, invoiceId: invoice.id, matchType: body.invoiceId ? 'manual' : 'exact', matchConfidence: body.invoiceId ? 100 : 100, matchedAmount: amount, differenceAmount: Number((amount - Number(invoice.balance_due ?? invoice.total_amount ?? 0)).toFixed(2)), status: 'matched', matchedDate: now, matchedBy: user.email, notes: String(body.notes || '').slice(0, 2000) };
    await kv.set(`${reconciliationMatchPrefix}${match.id}`, match); await kv.set(`${reconciliationTxnPrefix}${transaction.id}`, { ...transaction, isReconciled: true, reconciledDate: now, reconciledBy: user.email, matchedInvoiceId: invoice.id }); return c.json({ success: true, match });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to reconcile transaction.' }, 500); }
});

// Completed work orders are derived from canonical paid invoices and their linked work requests.
// Costs remain zero until receipts/labor are recorded through their respective workflows; we never invent financial data.
app.get('/make-server-57095a78/work-orders/completion-reports', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!user?.email || !admin) return c.json({ success: false, error: 'Administrator access is required to view completion reports.' }, 403);
    const [requests, invoices, payments] = await Promise.all([readWorkRequests(), kv.getByPrefix('invoice:'), kv.getByPrefix('payment:')]);
    const paidPayments = (payments as any[] || []).filter((payment: any) => ['paid', 'completed'].includes(String(payment.status || '').toLowerCase()));
    const reports = (requests as any[]).flatMap((request: any) => {
      const linkedInvoices = (invoices as any[] || []).filter((invoice: any) => {
        const links = [invoice.workRequestId, invoice.work_request_id, invoice.projectId, invoice.project_id, invoice.sourceWorkRequestId];
        const invoicePaid = ['paid', 'completed'].includes(String(invoice.status || '').toLowerCase()) || paidPayments.some((payment: any) => String(payment.invoiceId || payment.invoice_id || '') === String(invoice.id));
        return invoicePaid && links.some((value: any) => String(value || '') === String(request.id));
      });
      return linkedInvoices.map((invoice: any) => {
        const payment = paidPayments.find((entry: any) => String(entry.invoiceId || entry.invoice_id || '') === String(invoice.id));
        const amount = Number(invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0) || 0;
        const completedAt = invoice.paidAt || invoice.paid_at || payment?.paidAt || payment?.updatedAt || invoice.updatedAt || invoice.updated_at || new Date().toISOString();
        return { id: request.id, invoiceId: invoice.id, itemNumber: String(request.itemNumber || request.workOrderNumber || request.id).slice(0, 50), customerName: request.client_name || request.clientName || request.customerName || invoice.customer_name || invoice.customerName || '', customerEmail: request.client_email || request.clientEmail || request.customerEmail || invoice.customerEmail || '', customerPhone: request.client_phone || request.clientPhone || request.customerPhone || '', title: request.title || request.project_name || request.projectTitle || invoice.description || 'Completed project', description: request.description || request.project_details?.description || '', location: request.location || request.address || request.client_info?.address || 'Not specified', requestDate: request.created_at || request.createdAt || completedAt, startDate: request.projectSchedule?.tasks?.[0]?.startDate || request.schedule?.startAt || request.created_at || completedAt, completionDate: completedAt, invoicePaidDate: completedAt, estimatedValue: Number(request.estimatedValue || request.quote?.totalCost || amount) || amount, finalInvoiceAmount: amount, totalMaterialCosts: 0, totalLaborCosts: 0, totalSubcontractorCosts: 0, totalServiceProviderCosts: 0, otherExpenses: 0, totalCosts: 0, profitAmount: amount, profitMargin: amount > 0 ? 100 : 0, receipts: [], laborEntries: [], changeOrders: [], notes: request.notes || '', internalNotes: request.internalNotes || '' };
      });
    }).sort((a: any, b: any) => Date.parse(b.invoicePaidDate) - Date.parse(a.invoicePaidDate));
    return c.json({ success: true, reports });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load completion reports.' }, 500); }
});

// ── CHANGE ORDERS ──────────────────────────────────────────────────────────
const CHANGE_ORDER_PREFIX = 'change_order:';
function changeOrderKey(id: string) { return `${CHANGE_ORDER_PREFIX}${id}`; }
app.get('/make-server-57095a78/change-orders', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const all = (await kv.getByPrefix(CHANGE_ORDER_PREFIX)) || [];
    const records = admin ? all : all.filter((record: any) => String(record.createdByEmail || '').toLowerCase() === String(user.email).toLowerCase());
    return c.json({ success: true, changeOrders: records.sort((a: any, b: any) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load change orders.' }, 500); }
});
app.post('/make-server-57095a78/change-orders', async (c) => {
  try {
    const { user } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const body = stripBase64(await c.req.json()); const description = String(body.description || body.title || '').trim(); const amount = Number(body.totalCost ?? body.amount ?? body.totalAmount ?? 0);
    if (!description || !Number.isFinite(amount) || amount < 0) return c.json({ success: false, error: 'A description and valid amount are required.' }, 400);
    const now = new Date().toISOString(); const id = String(body.id || `CO-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`);
    const record = { ...body, id, coNumber: String(body.coNumber || id), description: description.slice(0, 4000), amount, totalAmount: amount, status: String(body.status || 'pending_admin'), createdAt: now, updatedAt: now, createdBy: user.user_metadata?.full_name || user.email, createdByEmail: user.email };
    await kv.set(changeOrderKey(id), record); return c.json({ success: true, changeOrder: record }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create change order.' }, 500); }
});
app.patch('/make-server-57095a78/change-orders/:id', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const existing = await kv.get(changeOrderKey(c.req.param('id'))) as any; if (!existing) return c.json({ success: false, error: 'Change order not found.' }, 404);
    if (!admin && String(existing.createdByEmail || '').toLowerCase() !== String(user.email).toLowerCase()) return c.json({ success: false, error: 'Not permitted.' }, 403);
    const body = await c.req.json(); const nextStatus = body.status === undefined ? existing.status : String(body.status);
    if (!['draft', 'pending_admin', 'submitted', 'approved', 'rejected', 'completed'].includes(nextStatus)) return c.json({ success: false, error: 'Invalid change-order status.' }, 400);
    const record = { ...existing, ...stripBase64(body), id: existing.id, createdByEmail: existing.createdByEmail, createdAt: existing.createdAt, status: nextStatus, updatedAt: new Date().toISOString(), updatedBy: user.email };
    await kv.set(changeOrderKey(record.id), record); return c.json({ success: true, changeOrder: record });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update change order.' }, 500); }
});

app.get('/make-server-57095a78/command-center/summary', async (c) => { c.header('Cache-Control', 'no-store, no-cache, must-revalidate'); try { if (!await customerAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const [invoices, payments, contacts, applications, requests] = await Promise.all([kv.getByPrefix('invoice:'), kv.getByPrefix('payment:'), kv.get(CRM_CONTACTS_KEY), kv.get(APPLICATIONS_KEY), kv.get('work_requests')]); const paidPayments = (payments as any[] || []).filter((payment: any) => ['paid', 'completed'].includes(String(payment.status || '').toLowerCase())); const totalRevenue = paidPayments.reduce((sum: number, payment: any) => sum + money(payment.amount), 0); const openInvoiceTotal = (invoices as any[] || []).filter((invoice: any) => !['paid','completed','cancelled','void'].includes(String(invoice.status || '').toLowerCase())).reduce((sum: number, invoice: any) => sum + money(invoice.balance_due ?? invoice.balanceDue ?? invoice.total_amount ?? invoice.total), 0); const months: Record<string, number> = {}; for (let offset = 5; offset >= 0; offset--) { const date = new Date(); date.setMonth(date.getMonth() - offset); months[`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`] = 0; } for (const payment of paidPayments) { const date = new Date(payment.paidAt || payment.updatedAt || payment.createdAt || Date.now()); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (key in months) months[key] += money(payment.amount); } const chartData = Object.entries(months).map(([month, revenue]) => ({ month, revenue })); const appRows = applications as any[] || []; const workRows = requests as any[] || []; const employeeCount = appRows.filter((application: any) => ['employee','field_technician','technician','maintenance_tech'].includes(String(application.applicationType || application.type || '').toLowerCase()) && ['approved','active'].includes(String(application.status || '').toLowerCase())).length; return c.json({ success: true, summary: { totalRevenue, openInvoiceTotal, customersCount: ((contacts as any[]) || []).filter((item: any) => item.email).length, activeJobsCount: workRows.filter((item: any) => ['assigned','in-progress','approved'].includes(String(item.status || '').toLowerCase())).length, teamCount: employeeCount, pendingApplications: appRows.filter((item: any) => String(item.status || '').toLowerCase() === 'pending').length, pendingWorkRequests: workRows.filter((item: any) => String(item.status || '').toLowerCase() === 'pending_approval').length, chartData } }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

app.get('/make-server-57095a78/invoices', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401); const records = (await kv.getByPrefix('invoice:')) || []; return c.json({ success: true, invoices: admin ? records : records.filter((record: any) => ownsFinancialRecord(record, user.email)) }); }
  catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});
// Stellar receive-only configuration. This deliberately stores a public address only—never a secret signing key.
const stellarWalletKey = 'payment_wallet:stellar';
function publicStellarWallet(record: any) { return { enabled: Boolean(record?.enabled), network: record?.network === 'testnet' ? 'testnet' : 'public', publicKey: record?.publicKey || '', assetCode: record?.assetCode || 'XLM', assetIssuer: record?.assetIssuer || '', memoInstructions: record?.memoInstructions || '' }; }
app.get('/make-server-57095a78/payment-wallets/stellar', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401); const wallet = await kv.get(stellarWalletKey) as any; return c.json({ success: true, wallet: publicStellarWallet(wallet), canManage: admin }); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load Stellar wallet.' }, 500); }
});
app.put('/make-server-57095a78/payment-wallets/stellar', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const body = await c.req.json(); const publicKey = String(body.publicKey || '').trim(); const enabled = Boolean(body.enabled);
    if (enabled && !/^G[A-Z2-7]{55}$/.test(publicKey)) return c.json({ success: false, error: 'Enter a valid Stellar public wallet address starting with G. Never enter a secret key here.' }, 400);
    const assetCode = String(body.assetCode || 'XLM').trim().toUpperCase(); const assetIssuer = String(body.assetIssuer || '').trim();
    if (assetCode !== 'XLM' && !/^G[A-Z2-7]{55}$/.test(assetIssuer)) return c.json({ success: false, error: 'A valid Stellar asset issuer address is required for non-XLM assets.' }, 400);
    const wallet = { enabled, network: body.network === 'testnet' ? 'testnet' : 'public', publicKey, assetCode, assetIssuer: assetCode === 'XLM' ? '' : assetIssuer, memoInstructions: String(body.memoInstructions || '').trim().slice(0, 250), updatedAt: new Date().toISOString(), updatedBy: user.email };
    await kv.set(stellarWalletKey, wallet); return c.json({ success: true, wallet: publicStellarWallet(wallet) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save Stellar wallet.' }, 500); }
});
app.get('/make-server-57095a78/invoices/:id/stellar-instructions', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401); const invoice = await kv.get(`invoice:${c.req.param('id')}`) as any; if (!invoice) return c.json({ success: false, error: 'Invoice not found.' }, 404); if (!admin && !ownsFinancialRecord(invoice, user.email)) return c.json({ success: false, error: 'You may only view your own invoice.' }, 403); const wallet = publicStellarWallet(await kv.get(stellarWalletKey)); if (!wallet.enabled || !wallet.publicKey) return c.json({ success: false, error: 'Stellar payments are not enabled.' }, 409); return c.json({ success: true, wallet, invoice: { id: invoice.id, invoiceNumber: invoice.invoice_number || invoice.number || invoice.id, balanceDue: money(invoice.balance_due ?? invoice.balanceDue ?? invoice.total_amount ?? invoice.total) }, notice: 'Send the exact asset only. A Stellar transfer is recorded for review and does not automatically settle a USD invoice until the payment is reconciled.' }); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load Stellar instructions.' }, 500); }
});
app.post('/make-server-57095a78/invoices/:id/stellar-payment-submissions', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401); const invoice = await kv.get(`invoice:${c.req.param('id')}`) as any; if (!invoice) return c.json({ success: false, error: 'Invoice not found.' }, 404); if (!admin && !ownsFinancialRecord(invoice, user.email)) return c.json({ success: false, error: 'You may only submit payment proof for your own invoice.' }, 403); const body = await c.req.json(); const transactionHash = String(body.transactionHash || '').trim(); if (!/^[a-fA-F0-9]{64}$/.test(transactionHash)) return c.json({ success: false, error: 'Enter the 64-character Stellar transaction hash.' }, 400); const id = crypto.randomUUID(); const submission = { id, invoiceId: invoice.id, transactionHash: transactionHash.toLowerCase(), assetCode: String(body.assetCode || '').trim().toUpperCase(), amount: String(body.amount || '').trim(), status: 'submitted_for_reconciliation', customerEmail: user.email, createdAt: new Date().toISOString() }; await kv.set(`stellar_payment_submission:${id}`, submission); return c.json({ success: true, submission, message: 'Stellar transaction submitted for reconciliation. Your invoice will remain open until the received asset and USD value are verified.' }, 201); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to submit Stellar payment.' }, 500); }
});

app.post('/make-server-57095a78/invoices', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const body = await c.req.json(); const recipient = invoiceRecipient(body); const requestedDraft = body.is_draft ?? body.status === 'draft';
    if (!requestedDraft && !recipient.customerEmail) return c.json({ success: false, error: 'A recipient email is required before an invoice can be issued.' }, 400);
    const id = String(body.id || crypto.randomUUID()); const lineItems = Array.isArray(body.line_items) ? body.line_items.map((item: any, index: number) => ({ ...item, line_number: item.line_number || index + 1, quantity: Number(item.quantity || 0), unit_price: Number(item.unit_price || 0), amount: Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0)) })) : [];
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.amount, 0); const taxRate = Number(body.tax_rate || 0); const taxAmount = Number(body.tax_amount ?? subtotal * (taxRate / 100)); const discount = Number(body.discount_amount || 0); const total = Number(body.total_amount ?? subtotal + taxAmount - discount); const now = new Date().toISOString(); const invoiceNumber = body.invoice_number || body.invoice_id || `INV-${now.slice(0, 10).replaceAll('-', '')}-${id.slice(0, 6).toUpperCase()}`;
    const isDraft = Boolean(requestedDraft) || !recipient.customerEmail; const status = isDraft ? 'draft' : (body.status && body.status !== 'draft' ? body.status : 'pending');
    const record = { ...body, id, invoice_id: body.invoice_id || invoiceNumber, invoice_number: invoiceNumber, customerEmail: recipient.customerEmail, customer_email: recipient.customerEmail, customerName: recipient.customerName, customer_name: recipient.customerName, clientEmail: recipient.customerEmail, client_email: recipient.customerEmail, recipientPortal: recipient.recipientPortal, recipient_portal: recipient.recipientPortal, paymentRail: recipient.paymentRail, payment_rail: recipient.paymentRail, line_items: lineItems, subtotal, tax_rate: taxRate, tax_amount: taxAmount, discount_amount: discount, total_amount: total, paid_amount: Number(body.paid_amount || 0), balance_due: Number(body.balance_due ?? total), status, is_draft: isDraft, issuedAt: isDraft ? null : now, createdAt: body.createdAt || now, updatedAt: now, createdBy: user.email };
    await kv.set(`invoice:${id}`, record); return c.json({ success: true, invoice: record }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});


app.post('/make-server-57095a78/quotes/:id/convert-to-contract', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const quote = await kv.get(`quote:${c.req.param('id')}`) as any;
    if (!quote) return c.json({ success: false, error: 'Quote not found.' }, 404);
    const body = await c.req.json().catch(() => ({}));
    const id = crypto.randomUUID();
    const contract = { id, quoteId: quote.id, planId: body.planId || quote.planId || null, customerId: quote.customerId || null, customerEmail: quote.clientEmail || body.customerEmail || null, clientEmail: quote.clientEmail || body.customerEmail || null, clientName: quote.clientName || body.clientName || null, title: body.title || quote.number || 'Service Contract', amount: body.amount ?? quote.total ?? quote.grandTotal ?? null, terms: body.terms || quote.notes || '', status: 'pending_signature', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: user.email };
    await kv.set(`contract:${id}`, contract);
    await kv.set(`quote:${quote.id}`, { ...quote, contractId: id, status: 'sent', updatedAt: new Date().toISOString() });
    return c.json({ success: true, contract }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to convert quote to contract.' }, 500); }
});

app.put('/make-server-57095a78/invoices/:id', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const existing = await kv.get(`invoice:${c.req.param('id')}`) as any;
    if (!existing) return c.json({ success: false, error: 'Invoice not found.' }, 404);
    const patch = await c.req.json();
    if (['paid', 'completed'].includes(String(patch.status || '').toLowerCase())) return c.json({ success: false, error: 'Use verified payment confirmation to mark an invoice paid.' }, 400);
    const recipient = invoiceRecipient({ ...existing, ...patch });
    const invoice = { ...existing, ...patch, id: existing.id, customerEmail: recipient.customerEmail, customer_email: recipient.customerEmail, customerName: recipient.customerName, customer_name: recipient.customerName, clientEmail: recipient.customerEmail, client_email: recipient.customerEmail, recipientPortal: recipient.recipientPortal, recipient_portal: recipient.recipientPortal, paymentRail: recipient.paymentRail, payment_rail: recipient.paymentRail, updatedAt: new Date().toISOString(), updatedBy: user.email };
    await kv.set(`invoice:${invoice.id}`, invoice);
    return c.json({ success: true, invoice });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update invoice.' }, 500); }
});

app.delete('/make-server-57095a78/invoices/:id', async (c) => {
  try { const { admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const existing = await kv.get(`invoice:${c.req.param('id')}`); if (!existing) return c.json({ success: false, error: 'Invoice not found.' }, 404); await kv.del(`invoice:${c.req.param('id')}`); return c.json({ success: true }); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete invoice.' }, 500); }
});

app.get('/make-server-57095a78/payments', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!user?.email || !admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const payments = (await kv.getByPrefix('payment:')) as any[] || [];
    const subscriptions = (await kv.getByPrefix('subscription:')) as any[] || [];
    const invoices = (await kv.getByPrefix('invoice:')) as any[] || [];
    const records = payments.map((payment: any) => ({ ...payment, subscription: payment.subscriptionId ? subscriptions.find((subscription: any) => subscription.id === payment.subscriptionId) || null : null, invoice: payment.invoiceId ? invoices.find((invoice: any) => invoice.id === payment.invoiceId) || null : null }));
    return c.json({ success: true, payments: records.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load payments.' }, 500); }
});

// Condo manager financial history is isolated to the manager account; association
// dues are not inferred from demo data or exposed from the company-wide ledger.
app.get('/make-server-57095a78/condo-manager/financials', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view financial records.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const [payments, invoices] = await Promise.all([kv.getByPrefix('payment:'), kv.getByPrefix('invoice:')]);
    const visiblePayments = actor.admin ? (payments as any[] || []) : (payments as any[] || []).filter((record: any) => ownsFinancialRecord(record, email));
    const visibleInvoices = actor.admin ? (invoices as any[] || []) : (invoices as any[] || []).filter((record: any) => ownsFinancialRecord(record, email));
    const paidTotal = visiblePayments.filter((record: any) => ['paid', 'completed'].includes(String(record.status || '').toLowerCase())).reduce((sum: number, record: any) => sum + money(record.amount), 0);
    const pendingTotal = visiblePayments.filter((record: any) => !['paid', 'completed', 'failed', 'refunded'].includes(String(record.status || '').toLowerCase())).reduce((sum: number, record: any) => sum + money(record.amount), 0);
    const openInvoiceTotal = visibleInvoices.filter((record: any) => !['paid', 'completed', 'void', 'cancelled'].includes(String(record.status || '').toLowerCase())).reduce((sum: number, record: any) => sum + money(record.balance_due ?? record.balanceDue ?? record.amountDue ?? record.total_amount ?? record.total ?? record.amount), 0);
    return c.json({ success: true, summary: { paidTotal, pendingTotal, openInvoiceTotal }, payments: visiblePayments.sort((a: any, b: any) => new Date(b.paidAt || b.createdAt || 0).getTime() - new Date(a.paidAt || a.createdAt || 0).getTime()), invoices: visibleInvoices.sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load condo financial records.' }, 500); }
});

// A property manager sees only the financial records owned by their portal
// account.  The global /payments route remains restricted to admins.
app.get('/make-server-57095a78/property-manager/payments', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view property payments.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const [payments, invoices, subscriptions] = await Promise.all([
      kv.getByPrefix('payment:'), kv.getByPrefix('invoice:'), kv.getByPrefix('subscription:'),
    ]);
    const visiblePayments = actor.admin ? (payments as any[] || []) : (payments as any[] || []).filter((record: any) => ownsFinancialRecord(record, email));
    const visibleInvoices = actor.admin ? (invoices as any[] || []) : (invoices as any[] || []).filter((record: any) => ownsFinancialRecord(record, email));
    const records = visiblePayments.map((payment: any) => ({
      ...payment,
      invoice: payment.invoiceId ? visibleInvoices.find((invoice: any) => invoice.id === payment.invoiceId) || null : null,
      subscription: payment.subscriptionId ? (subscriptions as any[] || []).find((subscription: any) => subscription.id === payment.subscriptionId && (actor.admin || ownsFinancialRecord(subscription, email))) || null : null,
    }));
    return c.json({ success: true, payments: records.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()), invoices: visibleInvoices.sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load property payment records.' }, 500); }
});

// Landlord financial history is limited to invoices and verified payment
// attempts owned by that landlord account; it never exposes the admin ledger.
app.get('/make-server-57095a78/landlord/financials', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view financial records.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const [payments, invoices] = await Promise.all([kv.getByPrefix('payment:'), kv.getByPrefix('invoice:')]);
    const visiblePayments = actor.admin ? (payments as any[] || []) : (payments as any[] || []).filter((record: any) => ownsFinancialRecord(record, email));
    const visibleInvoices = actor.admin ? (invoices as any[] || []) : (invoices as any[] || []).filter((record: any) => ownsFinancialRecord(record, email));
    const paidTotal = visiblePayments.filter((record: any) => ['paid', 'completed'].includes(String(record.status || '').toLowerCase())).reduce((sum: number, record: any) => sum + money(record.amount), 0);
    const pendingTotal = visiblePayments.filter((record: any) => !['paid', 'completed', 'failed', 'refunded'].includes(String(record.status || '').toLowerCase())).reduce((sum: number, record: any) => sum + money(record.amount), 0);
    const openInvoiceTotal = visibleInvoices.filter((record: any) => !['paid', 'completed', 'void', 'cancelled'].includes(String(record.status || '').toLowerCase())).reduce((sum: number, record: any) => sum + money(record.balance_due ?? record.balanceDue ?? record.amountDue ?? record.total_amount ?? record.total ?? record.amount), 0);
    return c.json({ success: true, summary: { paidTotal, pendingTotal, openInvoiceTotal }, payments: visiblePayments.sort((a: any, b: any) => new Date(b.paidAt || b.createdAt || 0).getTime() - new Date(a.paidAt || a.createdAt || 0).getTime()), invoices: visibleInvoices.sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load landlord financial records.' }, 500); }
});

app.post('/make-server-57095a78/payments/create-checkout', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in before starting checkout.' }, 401);
    const body = await c.req.json();
    const invoice = body.invoiceId ? await kv.get(`invoice:${String(body.invoiceId)}`) as any : null;
    if (body.invoiceId && !invoice) return c.json({ success: false, error: 'Invoice not found.' }, 404);
    if (invoice && !admin && !ownsFinancialRecord(invoice, user.email)) return c.json({ success: false, error: 'You may only pay your own invoice.' }, 403);
    const amount = money(body.amount ?? invoice?.balance_due ?? invoice?.balanceDue ?? invoice?.amountDue ?? invoice?.total_amount ?? invoice?.total ?? invoice?.amount);
    if (amount <= 0) return c.json({ success: false, error: 'A positive payment amount is required.' }, 400);
    const paymentId = crypto.randomUUID();
    const appUrl = (Deno.env.get('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');
    const portal = invoicePortal(invoice?.recipientPortal || invoice?.recipient_portal || body.recipientPortal);
    const returnTo = invoicePortalRoutes[portal]; const rail: StripeAccount = invoice?.paymentRail === 'tbpco_ecommerce' || invoice?.payment_rail === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services';
    const paymentMethod = body.paymentMethod === 'us_bank_account' ? 'us_bank_account' : 'card';
    const session = await stripeCheckoutSession(new URLSearchParams({
      'payment_method_types[]': paymentMethod, mode: 'payment',
      success_url: `${appUrl}/payment-complete?payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnTo)}`,
      cancel_url: `${appUrl}/${returnTo}?tab=payments`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': String(body.description || invoice?.number || 'Black Phoenix payment'),
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][quantity]': '1', customer_email: user.email,
      'metadata[payment_id]': paymentId, 'metadata[invoice_id]': String(invoice?.id || ''),
    }), rail);
    const payment = { id: paymentId, invoiceId: invoice?.id || null, amount, status: 'pending_confirmation', paymentMethod, customerEmail: user.email, recipientPortal: portal, paymentRail: rail, stripeCheckoutSessionId: session.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(`payment:${paymentId}`, payment);
    if (invoice) await kv.set(`invoice:${invoice.id}`, { ...invoice, paymentId, checkoutSessionId: session.id, status: invoice.status === 'draft' ? 'sent' : invoice.status, updatedAt: new Date().toISOString() });
    return c.json({ success: true, paymentId, checkoutUrl: session.url });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to start secure checkout.' }, 500); }
});

app.post('/make-server-57095a78/payments/confirm', async (c) => {
  try {
    const secret = Deno.env.get('PAYMENT_CONFIRMATION_SECRET') || '';
    if (!secret || c.req.header('X-Payment-Confirmation-Secret') !== secret) return c.json({ success: false, error: 'Unauthorized payment confirmation.' }, 401);
    const body = await c.req.json();
    const payment = await kv.get(`payment:${String(body.paymentId || '')}`) as any;
    if (!payment) return c.json({ success: false, error: 'Payment not found.' }, 404);
    if (payment.status === 'paid') return c.json({ success: true, duplicate: true, payment });
    const verified = await retrieveStripeCheckoutSession(String(body.sessionId || payment.stripeCheckoutSessionId || ''), payment.paymentRail === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services');
    if (verified.id !== payment.stripeCheckoutSessionId || verified.payment_status !== 'paid') return c.json({ success: false, error: 'Stripe has not confirmed this payment.' }, 409);
    payment.status = 'paid'; payment.paidAt = new Date().toISOString(); payment.stripePaymentIntentId = verified.payment_intent || null; payment.updatedAt = payment.paidAt;
    await kv.set(`payment:${payment.id}`, payment);
    if (payment.subscriptionId) {
      const subscription = await kv.get(subscriptionKey(payment.subscriptionId)) as any;
      if (subscription) await kv.set(subscriptionKey(subscription.id), { ...subscription, status: 'active', activatedAt: payment.paidAt, paymentId: payment.id, updatedAt: payment.paidAt });
    }
    if (payment.invoiceId) {
      const invoice = await kv.get(`invoice:${payment.invoiceId}`) as any;
      if (invoice) {
        const priorPaid = Number(invoice.paid_amount ?? invoice.paidAmount ?? 0); const totalDue = Number(invoice.total_amount ?? invoice.total ?? payment.amount ?? 0); const newPaid = Math.min(totalDue, priorPaid + Number(payment.amount || 0)); const paidInvoice = { ...invoice, status: newPaid >= totalDue ? 'paid' : 'partial', paidAt: newPaid >= totalDue ? payment.paidAt : invoice.paidAt, paid_amount: newPaid, paidAmount: newPaid, balance_due: Math.max(0, totalDue - newPaid), balanceDue: Math.max(0, totalDue - newPaid), paymentId: payment.id, updatedAt: payment.paidAt };
        await kv.set(`invoice:${invoice.id}`, paidInvoice);
        const planId = String(paidInvoice.planId || paidInvoice.maintenancePlanId || '');
        if (planId) await recordEntitlementEvent({ planId, sourceType: 'payment', sourceId: payment.id, amountDelta: Number(payment.amount || 0), invoiceId: paidInvoice.id, note: `Invoice ${paidInvoice.number || paidInvoice.id} paid` });
      }
    }
    return c.json({ success: true, payment });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to confirm payment.' }, 500); }
});

// A signed-in customer may complete their own checkout return. The server verifies
// the Stripe session itself before activating a subscription or marking an invoice paid.
app.post('/make-server-57095a78/payments/complete', async (c) => {
  try {
    const { user } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in to complete checkout.' }, 401);
    const body = await c.req.json(); const payment = await kv.get(`payment:${String(body.paymentId || '')}`) as any;
    if (!payment) return c.json({ success: false, error: 'Payment not found.' }, 404);
    if (String(payment.customerEmail || '').toLowerCase() !== String(user.email).toLowerCase()) return c.json({ success: false, error: 'You may only complete your own payment.' }, 403);
    if (payment.status === 'paid') return c.json({ success: true, duplicate: true, payment, subscription: payment.subscriptionId ? await kv.get(subscriptionKey(payment.subscriptionId)) : null });
    const verified = await retrieveStripeCheckoutSession(String(body.sessionId || payment.stripeCheckoutSessionId || ''), payment.paymentRail === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services');
    if (verified.id !== payment.stripeCheckoutSessionId) return c.json({ success: false, error: 'Payment session does not match this checkout.' }, 400);
    if (verified.payment_status !== 'paid') {
      const now = new Date().toISOString(); payment.status = 'processing'; payment.updatedAt = now; payment.stripePaymentStatus = verified.payment_status || 'processing'; await kv.set(`payment:${payment.id}`, payment);
      return c.json({ success: true, processing: true, payment, message: 'Your bank payment is processing. The invoice will update automatically after Stripe confirms settlement.' });
    }
    const now = new Date().toISOString(); payment.status = 'paid'; payment.paidAt = now; payment.stripePaymentIntentId = verified.payment_intent || null; payment.updatedAt = now; await kv.set(`payment:${payment.id}`, payment);
    let subscription = null;
    if (payment.subscriptionId) { const current = await kv.get(subscriptionKey(payment.subscriptionId)) as any; if (current) { subscription = { ...current, status: 'active', activatedAt: now, paymentId: payment.id, updatedAt: now }; await kv.set(subscriptionKey(subscription.id), subscription); } }
    let invoice = null;
    if (payment.invoiceId) {
      const current = await kv.get(`invoice:${payment.invoiceId}`) as any;
      if (current) {
        const priorPaid = Number(current.paid_amount ?? current.paidAmount ?? 0); const totalDue = Number(current.total_amount ?? current.total ?? payment.amount ?? 0); const newPaid = Math.min(totalDue, priorPaid + Number(payment.amount || 0));
        invoice = { ...current, status: newPaid >= totalDue ? 'paid' : 'partial', paidAt: newPaid >= totalDue ? now : current.paidAt, paid_amount: newPaid, paidAmount: newPaid, balance_due: Math.max(0, totalDue - newPaid), balanceDue: Math.max(0, totalDue - newPaid), paymentId: payment.id, updatedAt: now };
        await kv.set(`invoice:${invoice.id}`, invoice);
        const planId = String(invoice.planId || invoice.maintenancePlanId || '');
        if (planId) await recordEntitlementEvent({ planId, sourceType: 'payment', sourceId: payment.id, amountDelta: Number(payment.amount || 0), invoiceId: invoice.id, note: `Invoice ${invoice.invoice_number || invoice.number || invoice.id} paid` });
      }
    }
    let planActivation = null;
    if (invoice?.status === 'paid' && invoice?.planProposalApplicationId) {
      planActivation = await activatePaidApplicationPlan(invoice, payment);
      if (planActivation?.plan) {
        invoice = { ...invoice, planId: planActivation.plan.id, subscriptionId: planActivation.subscription?.id || null, updatedAt: new Date().toISOString() };
        await kv.set(`invoice:${invoice.id}`, invoice);
        await recordEntitlementEvent({ planId: planActivation.plan.id, sourceType: 'payment', sourceId: payment.id, amountDelta: Number(payment.amount || 0), invoiceId: invoice.id, note: `Approved plan invoice ${invoice.invoice_number || invoice.id} paid and activated` });
        subscription = planActivation.subscription;
      }
    }
    return c.json({ success: true, payment, subscription, invoice, planActivation });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to complete payment.' }, 500); }
});

// ── STORE ORDERS / FULFILLMENT ───────────────────────────────────────────────
// A Stripe session creates only a pending checkout. An order is created only
// after this protected confirmation route verifies Stripe's paid status.
function storeOrderKey(id: string) { return `store:order:${id}`; }
function storeReturnKey(id: string) { return `store:return:${id}`; }
function storeCheckoutKey(id: string) { return `store:checkout:${id}`; }
function giftReservationKey(code: string, checkoutId: string) { return `giftcard_reservation:${normalizeGiftCardCode(code)}:${checkoutId}`; }
function validStoreItems(items: any) { return Array.isArray(items) && items.length > 0 && items.every((item: any) => String(item?.id || '').trim() && Number(item?.qty || item?.quantity) > 0); }

// Never accept a storefront price, title, or fulfillment source from the browser.
// The cart only identifies a catalog item and requested quantity; this resolves the
// current server-side product record used for both Stripe and supplier fulfillment.
async function resolveStoreCheckoutItems(rawItems: any[]) {
  const resolved: any[] = [];
  for (const raw of rawItems) {
    const id = String(raw?.id || '').trim();
    const qty = Math.max(1, Math.min(100, Math.floor(Number(raw?.qty || raw?.quantity || 1))));
    const product = (await kv.get(`product_${id}`) || await kv.get(`live_product_${id}`)) as any;
    if (!product || product.isActive === false) throw new Error(`This item is no longer available: ${id}.`);
    const inventory = Number(product.inventoryQuantity ?? product.stock ?? -1);
    if ((product.trackInventory !== false) && Number.isFinite(inventory) && inventory >= 0 && qty > inventory) {
      throw new Error(`${product.name || 'This item'} has only ${inventory} available.`);
    }
    const price = money(product.price);
    if (price < 0) throw new Error(`This item has an invalid catalog price: ${product.name || id}.`);
    const images = Array.isArray(product.images) ? product.images : [];
    resolved.push({
      id: String(product.id || id),
      name: String(product.name || 'Store item'),
      price,
      qty,
      image: isUrl(product.primaryImage) ? product.primaryImage : (isUrl(images[0]) ? images[0] : ''),
      sku: String(product.sku || product.id || id),
      providerId: String(product.providerId || product.source || product?._dropshipper?.providerId || '').toLowerCase(),
      providerProductId: String(product.providerProductId || product?._dropshipper?.providerProductId || product.id || id),
      trackInventory: product.trackInventory !== false,
    });
  }
  return resolved;
}

async function recordPaidStoreInventory(order: any) {
  await Promise.all((order.items || []).map(async (item: any) => {
    const key = `product_${String(item.id)}`;
    const product = (await kv.get(key) || await kv.get(`live_product_${String(item.id)}`)) as any;
    if (!product) return;
    const qty = Math.max(1, Number(item.qty || 1));
    const update: any = { ...product, orderCount: Math.max(0, Number(product.orderCount || 0)) + qty, updatedAt: new Date().toISOString() };
    if (product.trackInventory !== false && Number.isFinite(Number(product.inventoryQuantity))) {
      update.inventoryQuantity = Math.max(0, Number(product.inventoryQuantity) - qty);
    }
    await kv.set(key, update);
  }));
}

async function activeGiftCardReservations(code: string) {
  const now = Date.now();
  const reservations = await kv.getByPrefix(`giftcard_reservation:${normalizeGiftCardCode(code)}:`) as any[] || [];
  return reservations.filter((reservation: any) => reservation?.status === 'reserved' && new Date(reservation.expiresAt || 0).getTime() > now);
}

async function availableGiftCardBalance(code: string, card?: any) {
  const storedCard = card || await kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(code)}`) as any;
  if (!storedCard || storedCard.status !== 'active') return 0;
  const reserved = (await activeGiftCardReservations(code)).reduce((sum: number, reservation: any) => sum + money(reservation.amount), 0);
  return Math.max(0, money(storedCard.balance) - reserved);
}

async function reserveGiftCardForStore(codeValue: unknown, checkoutId: string, orderTotal: number) {
  const code = normalizeGiftCardCode(codeValue);
  if (!code) return null;
  const card = await kv.get(`${GIFT_CARD_PREFIX}${code}`) as any;
  if (!card || card.status !== 'active') throw new Error('Gift card not found or inactive.');
  const amount = money(Math.min(await availableGiftCardBalance(code, card), orderTotal));
  if (amount <= 0) throw new Error('This gift card has no available balance.');
  const reservation = { id: `GCR-${crypto.randomUUID()}`, code, checkoutId, amount, status: 'reserved', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 31 * 60 * 1000).toISOString() };
  await kv.set(giftReservationKey(code, checkoutId), reservation);
  return reservation;
}

async function captureStoreGiftCardReservation(checkout: any, orderId: string) {
  const reservation = checkout?.giftCardReservation;
  if (!reservation?.code || !reservation?.amount) return null;
  const key = giftReservationKey(reservation.code, checkout.id);
  const stored = await kv.get(key) as any;
  if (!stored || stored.status === 'captured') return stored || null;
  const card = await kv.get(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(reservation.code)}`) as any;
  if (!card || card.status !== 'active' || money(card.balance) < money(stored.amount)) throw new Error('Gift card balance is no longer available.');
  const redemption = { id: stored.id, amount: money(stored.amount), orderReference: orderId, redeemedAt: new Date().toISOString(), source: 'store_checkout' };
  card.balance = money(money(card.balance) - redemption.amount);
  card.redeemedAmount = money(money(card.redeemedAmount) + redemption.amount);
  card.redemptionHistory = [...(Array.isArray(card.redemptionHistory) ? card.redemptionHistory : []), redemption];
  if (card.balance === 0) card.redeemedAt = redemption.redeemedAt;
  await kv.set(`${GIFT_CARD_PREFIX}${normalizeGiftCardCode(reservation.code)}`, card);
  const captured = { ...stored, status: 'captured', capturedAt: redemption.redeemedAt, orderId };
  await kv.set(key, captured);
  await kv.set(`${GIFT_REDEMPTION_PREFIX}${normalizeGiftCardCode(reservation.code)}:${stored.id}`, redemption);
  return captured;
}


async function restoreStoreGiftCardCredit(orderId: string, amount: number, returnRequestId: string) {
  if (amount <= 0) return null;
  const cards = (await kv.getByPrefix(GIFT_CARD_PREFIX) || []) as any[];
  const card = cards.find((item: any) => (item?.redemptionHistory || []).some((redemption: any) => redemption?.orderReference === orderId));
  if (!card) throw new Error('The gift card used for this order could not be found for credit restoration.');
  const code = normalizeGiftCardCode(card.code || card.id || '');
  if (!code) throw new Error('The original gift card record is missing its code.');
  const restored = money(amount);
  const credit = { id: `GCR-${crypto.randomUUID()}`, amount: restored, orderReference: orderId, returnRequestId, restoredAt: new Date().toISOString(), source: 'store_return_refund' };
  card.balance = money(money(card.balance) + restored);
  card.refundedAmount = money(money(card.refundedAmount) + restored);
  card.redemptionHistory = [...(Array.isArray(card.redemptionHistory) ? card.redemptionHistory : []), credit];
  await kv.set(`${GIFT_CARD_PREFIX}${code}`, card);
  return { code: formatGiftCardCode(code), amount: restored };
}

function createStoreOrder(checkout: any, verified: any, now: string) {
  const orderId = `BP-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
  return { id: orderId, stripe_account: checkout.stripeAccount || 'services', stripe_session_id: verified?.id || null, stripe_payment_intent: verified?.payment_intent || null, customer_name: checkout.customer.name, customer_email: checkout.customer.email, customer_phone: checkout.customer.phone, shipping_address: checkout.customer.address, items: checkout.items, subtotal: checkout.subtotal, shipping: checkout.shipping, tax: checkout.tax, gift_card_amount: checkout.giftCardReservation?.amount || 0, amount_due: checkout.amountDue, amount_total: checkout.total, currency: 'usd', status: 'paid', payment_status: checkout.amountDue > 0 ? 'paid' : 'gift_card_paid', fulfillment_status: 'pending', created_at: now, updated_at: now };
}

async function finalizeStoreOrder(checkout: any, verified: any) {
  if (checkout.orderId) return await kv.get(storeOrderKey(checkout.orderId));
  const now = new Date().toISOString();
  const order = createStoreOrder(checkout, verified, now);
  await captureStoreGiftCardReservation(checkout, order.id);
  await recordPaidStoreInventory(order);
  const rewards = await settlePaidStoreRewards(order);
  Object.assign(order, { rewards });
  await kv.set(storeOrderKey(order.id), order);

  // Supplier submission happens only after Stripe has verified payment. A failed
  // handoff never loses the paid order: it remains in a visible manual-review state.
  const fulfillment = await forwardZendropOrder(order).catch((error: any) => ({
    status: 'manual_review', reason: error?.message || 'Zendrop handoff failed unexpectedly.', attemptedAt: new Date().toISOString(),
  }));
  Object.assign(order, {
    fulfillment_status: fulfillment.status === 'submitted' ? 'forwarded_to_zendrop' : (fulfillment.status === 'not_applicable' ? 'pending' : 'manual_review'),
    supplier_fulfillment: fulfillment,
    updated_at: new Date().toISOString(),
  });
  await kv.set(storeOrderKey(order.id), order);
  await kv.set(storeCheckoutKey(checkout.id), { ...checkout, status: 'paid', orderId: order.id, paidAt: now, updatedAt: now, rewards });
  return order;
}

app.post('/make-server-57095a78/store/checkout', async (c) => {
  try {
    const body = await c.req.json();
    if (!validStoreItems(body.items)) return c.json({ error: 'Your cart must contain valid items.' }, 400);
    const customer = body.customer || {}; const email = String(customer.email || '').trim().toLowerCase();
    if (!email || !String(customer.name || '').trim() || !String(customer.address || '').trim()) return c.json({ error: 'Name, email, and shipping address are required.' }, 400);
    const items = await resolveStoreCheckoutItems(body.items);
    const subtotal = money(items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0));
    const shipping = Math.max(0, money(body.shipping));
    const tax = Math.max(0, money(body.tax));
    const total = money(subtotal + shipping + tax);
    const checkoutId = crypto.randomUUID();
    const giftCardReservation = await reserveGiftCardForStore(body.giftCardCode, checkoutId, total);
    const amountDue = money(total - money(giftCardReservation?.amount));
    const checkout = { id: checkoutId, stripeAccount: 'tbpco_ecommerce' as StripeAccount, items, subtotal, shipping, tax, total, amountDue, giftCardReservation, customer: { name: String(customer.name), email, phone: String(customer.phone || ''), address: String(customer.address) }, status: 'pending_confirmation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any;
    if (amountDue <= 0) {
      await kv.set(storeCheckoutKey(checkoutId), checkout);
      const order = await finalizeStoreOrder(checkout, null);
      return c.json({ success: true, checkoutId, order, zeroBalanceOrder: true });
    }
    const appUrl = (Deno.env.get('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
    const params = new URLSearchParams({ 'payment_method_types[]': 'card', mode: 'payment', customer_email: email, success_url: `${appUrl}/store?checkout_id=${checkoutId}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${appUrl}/store?checkout=cancelled`, expires_at: String(expiresAt), 'metadata[store_checkout_id]': checkoutId, 'metadata[commerce_account]': 'TBPCO_ECOMMERCE', 'metadata[gift_card_amount]': String(money(giftCardReservation?.amount)) });
    let remainingCredit = money(giftCardReservation?.amount);
    let lineIndex = 0;
    for (const item of items) {
      for (let quantity = 0; quantity < item.qty; quantity += 1) {
        const credit = Math.min(remainingCredit, item.price); remainingCredit = money(remainingCredit - credit);
        const charge = money(item.price - credit); if (charge <= 0) continue;
        params.set(`line_items[${lineIndex}][price_data][currency]`, 'usd'); params.set(`line_items[${lineIndex}][price_data][product_data][name]`, item.name); params.set(`line_items[${lineIndex}][price_data][unit_amount]`, String(Math.round(charge * 100))); params.set(`line_items[${lineIndex}][quantity]`, '1'); lineIndex += 1;
      }
    }
    for (const [label, amount] of [['Shipping', shipping], ['Sales tax', tax]] as [string, number][]) {
      const credit = Math.min(remainingCredit, amount); remainingCredit = money(remainingCredit - credit); const charge = money(amount - credit);
      if (charge > 0) { params.set(`line_items[${lineIndex}][price_data][currency]`, 'usd'); params.set(`line_items[${lineIndex}][price_data][product_data][name]`, label); params.set(`line_items[${lineIndex}][price_data][unit_amount]`, String(Math.round(charge * 100))); params.set(`line_items[${lineIndex}][quantity]`, '1'); lineIndex += 1; }
    }
    const session = await stripeCheckoutSession(params, 'tbpco_ecommerce');
    checkout.stripeCheckoutSessionId = session.id;
    await kv.set(storeCheckoutKey(checkoutId), checkout);
    return c.json({ success: true, checkoutId, amountDue, giftCardAmount: money(giftCardReservation?.amount), url: session.url });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to start secure checkout.' }, 500); }
});

app.post('/make-server-57095a78/store/checkouts/:id/confirm', async (c) => {
  try {
    const secret = Deno.env.get('PAYMENT_CONFIRMATION_SECRET') || ''; if (!secret || c.req.header('X-Payment-Confirmation-Secret') !== secret) return c.json({ error: 'Unauthorized payment confirmation.' }, 401);
    const checkout = await kv.get(storeCheckoutKey(c.req.param('id'))) as any; if (!checkout) return c.json({ error: 'Checkout not found.' }, 404); if (checkout.orderId) return c.json({ success: true, duplicate: true, order: await kv.get(storeOrderKey(checkout.orderId)) });
    const body = await c.req.json(); const verified = await retrieveStripeCheckoutSession(String(body.sessionId || checkout.stripeCheckoutSessionId), checkout.stripeAccount === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services'); if (verified.id !== checkout.stripeCheckoutSessionId || verified.payment_status !== 'paid') return c.json({ error: 'Stripe has not confirmed this payment.' }, 409);
    const order = await finalizeStoreOrder(checkout, verified); return c.json({ success: true, order });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to confirm store checkout.' }, 500); }
});

// The customer returns from Stripe with a checkout-session capability URL.
// Verify it with Stripe before creating the order; retries remain idempotent.
app.post('/make-server-57095a78/store/checkouts/:id/complete', async (c) => {
  try {
    const checkout = await kv.get(storeCheckoutKey(c.req.param('id'))) as any;
    if (!checkout) return c.json({ success: false, error: 'Checkout not found.' }, 404);
    if (checkout.orderId) return c.json({ success: true, duplicate: true, order: await kv.get(storeOrderKey(checkout.orderId)) });
    const body = await c.req.json(); const sessionId = String(body.sessionId || '');
    if (!sessionId || sessionId !== checkout.stripeCheckoutSessionId) return c.json({ success: false, error: 'Payment session does not match this checkout.' }, 400);
    const verified = await retrieveStripeCheckoutSession(sessionId, checkout.stripeAccount === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services');
    if (verified.id !== checkout.stripeCheckoutSessionId || verified.payment_status !== 'paid') return c.json({ success: false, error: 'Stripe has not confirmed this payment yet.' }, 409);
    const order = await finalizeStoreOrder(checkout, verified);
    return c.json({ success: true, order });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to complete store checkout.' }, 500); }
});

app.get('/make-server-57095a78/store/orders', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ error: 'Sign in required.' }, 401); const orders = (await kv.getByPrefix('store:order:')) || []; const visible = admin ? orders : orders.filter((order: any) => String(order.customer_email || '').toLowerCase() === String(user.email).toLowerCase()); return c.json({ success: true, orders: visible.sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at)) }); }
  catch (error: any) { return c.json({ error: error.message || 'Unable to load orders.' }, 500); }
});

app.patch('/make-server-57095a78/store/orders/:id', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user || !admin) return c.json({ error: 'Administrator access is required.' }, 403); const existing = await kv.get(storeOrderKey(c.req.param('id'))) as any; if (!existing) return c.json({ error: 'Order not found.' }, 404); const body = await c.req.json(); const allowed = new Set(['pending', 'manual_review', 'forwarded_to_zendrop', 'forwarded_to_doba', 'shipped', 'delivered']); if (!allowed.has(String(body.fulfillment_status || ''))) return c.json({ error: 'A valid fulfillment status is required.' }, 400); const order = { ...existing, fulfillment_status: body.fulfillment_status, tracking_number: body.tracking_number ? String(body.tracking_number) : existing.tracking_number, updated_at: new Date().toISOString(), fulfillment_updated_by: user.email }; await kv.set(storeOrderKey(order.id), order); return c.json(order); }
  catch (error: any) { return c.json({ error: error.message || 'Unable to update order.' }, 500); }
});


// Store returns use the same canonical order records as checkout, fulfillment,
// rewards, and refunds. Customers may submit a request without an account by
// matching the order number and purchase email; only owners/admins can decide
// eligibility or move funds.
app.post('/make-server-57095a78/store/returns', async (c) => {
  try {
    const body = await c.req.json();
    const orderId = String(body.orderId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const reason = String(body.reason || '').trim();
    if (!orderId || !email || !reason) return c.json({ error: 'Order number, purchase email, and a return reason are required.' }, 400);
    const order = await kv.get(storeOrderKey(orderId)) as any;
    if (!order || String(order.customer_email || '').toLowerCase() !== email) return c.json({ error: 'We could not match that order number and email address.' }, 404);
    if (!['paid', 'gift_card_paid'].includes(String(order.payment_status || order.status || '').toLowerCase())) return c.json({ error: 'Only paid orders can be submitted for return review.' }, 400);
    const age = Date.now() - Date.parse(order.delivered_at || order.created_at || new Date().toISOString());
    if (Number.isFinite(age) && age > 30 * 24 * 60 * 60 * 1000) return c.json({ error: 'This order is outside the 30-day return-request window.' }, 400);
    const existing = (await kv.getByPrefix('store:return:') || []).find((item: any) => item?.orderId === orderId && ['requested', 'approved', 'received'].includes(String(item.status)));
    if (existing) return c.json({ success: true, duplicate: true, returnRequest: existing });
    const validItems = Array.isArray(body.itemIds) && body.itemIds.length ? order.items.filter((item: any) => body.itemIds.map(String).includes(String(item.id))) : order.items;
    if (!validItems.length) return c.json({ error: 'Select at least one item from the order.' }, 400);
    const now = new Date().toISOString();
    const request = { id: `RET-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`, orderId, customerEmail: email, customerName: order.customer_name || '', items: validItems, reason, details: String(body.details || '').slice(0, 2000), status: 'requested', requestedAt: now, updatedAt: now, orderTotal: money(order.amount_total), refundAmount: money(validItems.reduce((sum: number, item: any) => sum + money(item.price) * Number(item.qty || 1), 0)), policyVersion: 'store-returns-30-day-v1' };
    await kv.set(storeReturnKey(request.id), request);
    await kv.set(storeOrderKey(order.id), { ...order, return_status: 'requested', return_request_ids: [...new Set([...(order.return_request_ids || []), request.id])], updated_at: now });
    return c.json({ success: true, returnRequest: request }, 201);
  } catch (error: any) { return c.json({ error: error.message || 'Unable to submit your return request.' }, 500); }
});

app.get('/make-server-57095a78/store/returns', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!user?.email) return c.json({ error: 'Sign in required.' }, 401);
    const records = (await kv.getByPrefix('store:return:') || []) as any[];
    const visible = admin ? records : records.filter((item: any) => String(item.customerEmail || '').toLowerCase() === String(user.email).toLowerCase());
    return c.json({ success: true, returns: visible.sort((a: any, b: any) => Date.parse(b.requestedAt || '') - Date.parse(a.requestedAt || '')) });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to load return requests.' }, 500); }
});

app.patch('/make-server-57095a78/store/returns/:id', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!user?.email || !admin) return c.json({ error: 'Administrator access is required.' }, 403);
    const request = await kv.get(storeReturnKey(c.req.param('id'))) as any;
    if (!request) return c.json({ error: 'Return request not found.' }, 404);
    const order = await kv.get(storeOrderKey(request.orderId)) as any;
    if (!order) return c.json({ error: 'Related order not found.' }, 404);
    const body = await c.req.json(); const action = String(body.action || '').toLowerCase(); const now = new Date().toISOString();
    if (!['approve', 'reject', 'receive', 'refund', 'close'].includes(action)) return c.json({ error: 'A valid return action is required.' }, 400);
    if (action === 'approve' && request.status !== 'requested') return c.json({ error: 'Only requested returns can be approved.' }, 409);
    if (action === 'reject' && request.status !== 'requested') return c.json({ error: 'Only requested returns can be rejected.' }, 409);
    if (action === 'receive' && request.status !== 'approved') return c.json({ error: 'Only approved returns can be marked received.' }, 409);
    if (action === 'refund' && !['approved', 'received'].includes(String(request.status))) return c.json({ error: 'Approve or receive this return before issuing a refund.' }, 409);
    let next: any = { ...request, updatedAt: now, updatedBy: user.email, adminNote: String(body.adminNote || request.adminNote || '').slice(0, 2000) };
    if (action === 'approve') next = { ...next, status: 'approved', approvedAt: now, approvedBy: user.email };
    if (action === 'reject') next = { ...next, status: 'rejected', rejectedAt: now, rejectedBy: user.email };
    if (action === 'receive') next = { ...next, status: 'received', receivedAt: now, receivedBy: user.email };
    if (action === 'close') next = { ...next, status: 'closed', closedAt: now, closedBy: user.email };
    if (action === 'refund') {
      if (request.status === 'refunded') return c.json({ success: true, duplicate: true, returnRequest: request });
      const requestedAmount = body.refundAmount == null ? money(request.refundAmount) : money(body.refundAmount);
      if (requestedAmount <= 0 || requestedAmount > money(order.amount_total)) return c.json({ error: 'Refund amount must be within the order total.' }, 400);
      const stripePaidAmount = money(order.amount_due || Math.max(0, money(order.amount_total) - money(order.gift_card_amount)));
      const stripeRefundAmount = Math.min(requestedAmount, stripePaidAmount);
      const giftCardCreditAmount = money(Math.max(0, requestedAmount - stripeRefundAmount));
      let stripeRefund: any = null;
      if (stripeRefundAmount > 0) {
        if (!order.stripe_payment_intent) return c.json({ error: 'This order has no Stripe payment intent to refund.' }, 409);
        stripeRefund = await createStripeRefund(String(order.stripe_payment_intent), order.stripe_account === 'tbpco_ecommerce' ? 'tbpco_ecommerce' : 'services', stripeRefundAmount);
      }
      const giftCardCredit = giftCardCreditAmount > 0 ? await restoreStoreGiftCardCredit(order.id, giftCardCreditAmount, request.id) : null;
      next = { ...next, status: 'refunded', refundedAt: now, refundedBy: user.email, refundAmount: requestedAmount, stripeRefundId: stripeRefund?.id || null, stripeRefundAmount, giftCardCredit };
      await kv.set(storeOrderKey(order.id), { ...order, status: requestedAmount >= money(order.amount_total) ? 'refunded' : order.status, payment_status: requestedAmount >= money(order.amount_total) ? 'refunded' : order.payment_status, return_status: 'refunded', updated_at: now });
    } else {
      await kv.set(storeOrderKey(order.id), { ...order, return_status: next.status, updated_at: now });
    }
    await kv.set(storeReturnKey(next.id), next);
    return c.json({ success: true, returnRequest: next });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to process the return request.' }, 500); }
});


// Blueprint analyzer compatibility. The client sends an Anthropic-style message
// payload, while the server uses the configured OpenAI Vision key and returns the
// same `{ content: [{ text }] }` shape expected by the existing analyzer.
app.post('/make-server-57095a78/ai/vision', async (c) => {
  try {
    const body = await c.req.json(); const key = Deno.env.get('OPENAI_API_KEY') || '';
    if (!key) return c.json({ error: 'AI vision is not configured. Add OPENAI_API_KEY to the Edge Function secrets.' }, 503);
    const content = Array.isArray(body.messages?.[0]?.content) ? body.messages[0].content : [];
    const image = content.find((item: any) => item?.type === 'image')?.source; const prompt = String(content.find((item: any) => item?.type === 'text')?.text || 'Analyze this construction blueprint.');
    if (!image?.data || !image?.media_type) return c.json({ error: 'A blueprint image is required.' }, 400);
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4.1-mini', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${image.media_type};base64,${image.data}` } }] }], max_tokens: Math.min(4096, Number(body.max_tokens || 2048)) }) });
    const data = await response.json(); if (!response.ok) return c.json({ error: data?.error?.message || 'AI vision request failed.' }, response.status);
    const text = data?.choices?.[0]?.message?.content || ''; return c.json({ content: [{ type: 'text', text }], text });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to analyze blueprint.' }, 500); }
});

// ── MASTER SCHEDULE ──────────────────────────────────────────────────────────
function appointmentKey(id: string) { return `appointment:${id}`; }
app.post('/make-server-57095a78/schedule/appointments', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!user?.email) return c.json({ error: 'Sign in required.' }, 401);
    const body = await c.req.json();
    if (!String(body.date || '').trim() || !String(body.time || '').trim() || !String(body.employeeId || '').trim()) return c.json({ error: 'Date, time, and assigned technician are required.' }, 400);
    const requestedCustomerEmail = String(body.customerEmail || body.customer_email || '').trim().toLowerCase();
    if (!admin && requestedCustomerEmail && requestedCustomerEmail !== String(user.email).toLowerCase()) return c.json({ error: 'You can only schedule appointments for your own account.' }, 403);
    const now = new Date().toISOString();
    const record = {
      ...stripBase64(body),
      id: String(body.id || `apt_${crypto.randomUUID()}`),
      status: body.status || 'scheduled',
      customerEmail: admin ? (requestedCustomerEmail || String(user.email).toLowerCase()) : String(user.email).toLowerCase(),
      created_at: now,
      updated_at: now,
      requested_by: String(user.email).toLowerCase(),
    };
    await kv.set(appointmentKey(record.id), record);
    return c.json({ success: true, appointment: record }, 201);
  } catch (error: any) { return c.json({ error: error.message || 'Unable to schedule appointment.' }, 500); }
});
app.get('/make-server-57095a78/schedule/appointments', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ error: 'Sign in required.' }, 401);
    const all = (await kv.getByPrefix('appointment:')) || []; const records = admin ? all : all.filter((item: any) => [item.requested_by, item.customerEmail, item.customer_email].some((value: any) => String(value || '').toLowerCase() === String(user.email).toLowerCase()));
    return c.json({ success: true, appointments: records.sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)) });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to load appointments.' }, 500); }
});
app.patch('/make-server-57095a78/schedule/appointments/:id', async (c) => {
  try {
    const { user, admin } = await financialActor(c);
    if (!user?.email) return c.json({ error: 'Sign in required.' }, 401);
    if (!admin) return c.json({ error: 'Administrator access is required to change schedule status.' }, 403);
    const existing = await kv.get(appointmentKey(c.req.param('id'))) as any;
    if (!existing) return c.json({ error: 'Appointment not found.' }, 404);
    const body = await c.req.json();
    const status = String(body.status || '').trim().toLowerCase();
    if (!['scheduled', 'confirmed', 'completed', 'cancelled'].includes(status)) return c.json({ error: 'A valid appointment status is required.' }, 400);
    const record = { ...existing, status, updated_at: new Date().toISOString(), status_updated_by: String(user.email).toLowerCase() };
    await kv.set(appointmentKey(record.id), record);
    return c.json({ success: true, appointment: record });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to update appointment status.' }, 500); }
});

// ── MAINTENANCE PLAN COMPATIBILITY ────────────────────────────────────────────
// The older Maintenance Plan Creator now reads/writes the same canonical `plan:`
// records used by plans, entitlements, invoices, and portal trackers.
function publicMaintenancePlan(plan: any) { return { ...plan.maintenance, id: plan.id, name: plan.planName, active: plan.status === 'active', hoursUsed: Number(plan.hours?.used || 0), hoursIncluded: Number(plan.hours?.included || 0), overageRate: Number(plan.hours?.overageRate || 0), updatedAt: plan.updatedAt }; }
app.get('/make-server-57095a78/maintenance-plans', async (c) => {
  try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ error: 'Sign in required.' }, 401); const plans = (await kv.getByPrefix('plan:')) || []; const permitted = admin ? plans : plans.filter((plan: any) => String(plan.ownerEmail || plan.owner || '').toLowerCase() === String(user.email).toLowerCase()); return c.json({ success: true, plans: permitted.filter((plan: any) => plan.maintenance).map(publicMaintenancePlan) }); }
  catch (error: any) { return c.json({ error: error.message || 'Unable to load maintenance plans.' }, 500); }
});
app.post('/make-server-57095a78/maintenance-plans', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ error: 'Administrator access is required.' }, 403);
    const body = await c.req.json(); const input = body.plan || {}; if (!String(input.name || '').trim() || !(Number(input.hoursIncluded) >= 0)) return c.json({ error: 'Plan name and included hours are required.' }, 400);
    const id = String(input.id || crypto.randomUUID()); const existing = await kv.get(`plan:${id}`) as any; const now = new Date().toISOString(); const included = Number(input.hoursIncluded); const used = Number(existing?.hours?.used || 0);
    const plan = { ...(existing || {}), id, planName: String(input.name), owner: input.assignedName || input.assignedTo || existing?.owner || null, ownerEmail: input.assignedTo || existing?.ownerEmail || null, portalType: (input.targetPortals || ['all'])[0], status: input.active === false ? 'paused' : 'active', monthlyTotal: Number(input.monthlyFee || 0), annualTotal: Number(input.monthlyFee || 0) * 12, hours: { included, used, overageRate: Number(input.overageRate || 0), bankId: existing?.hours?.bankId || `HRS-${crypto.randomUUID()}` }, maintenance: { ...input, id, updatedAt: now, createdAt: existing?.maintenance?.createdAt || now }, createdAt: existing?.createdAt || now, updatedAt: now, createdBy: existing?.createdBy || user.email };
    await kv.set(`plan:${id}`, plan); return c.json({ success: true, plan: publicMaintenancePlan(plan) }, existing ? 200 : 201);
  } catch (error: any) { return c.json({ error: error.message || 'Unable to save maintenance plan.' }, 500); }
});
app.delete('/make-server-57095a78/maintenance-plans/:id', async (c) => {
  try { const { admin } = await financialActor(c); if (!admin) return c.json({ error: 'Administrator access is required.' }, 403); const plan = await kv.get(`plan:${c.req.param('id')}`) as any; if (!plan?.maintenance) return c.json({ error: 'Maintenance plan not found.' }, 404); await kv.set(`plan:${plan.id}`, { ...plan, status: 'cancelled', maintenance: { ...plan.maintenance, active: false }, updatedAt: new Date().toISOString() }); return c.json({ success: true }); }
  catch (error: any) { return c.json({ error: error.message || 'Unable to cancel maintenance plan.' }, 500); }
});
app.get('/make-server-57095a78/maintenance-plans/:id/usage', async (c) => {
  try { const { user, admin } = await financialActor(c); const plan = await kv.get(`plan:${c.req.param('id')}`) as any; if (!plan?.maintenance) return c.json({ error: 'Maintenance plan not found.' }, 404); if (!user?.email || (!admin && String(plan.ownerEmail || plan.owner || '').toLowerCase() !== String(user.email).toLowerCase())) return c.json({ error: 'You may only view your own plan.' }, 403); return c.json({ success: true, log: (await kv.getByPrefix(`plan_usage:${plan.id}:`)) || [] }); }
  catch (error: any) { return c.json({ error: error.message || 'Unable to load usage.' }, 500); }
});
app.post('/make-server-57095a78/maintenance-plans/:id/log-hours', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ error: 'Administrator access is required to log service hours.' }, 403);
    const plan = await kv.get(`plan:${c.req.param('id')}`) as any; if (!plan?.maintenance) return c.json({ error: 'Maintenance plan not found.' }, 404); const body = await c.req.json(); const hours = Number(body.hours || 0); if (!(hours > 0)) return c.json({ error: 'A positive hour amount is required.' }, 400);
    const now = new Date().toISOString(); const entry = { id: `USE-${crypto.randomUUID()}`, planId: plan.id, date: body.date || now, description: String(body.description || 'Service visit'), hours, tech: body.tech || null, invoiceId: body.invoiceId || null, workOrderId: body.workOrderId || null, createdAt: now };
    await kv.set(`plan_usage:${plan.id}:${entry.id}`, entry); const ledger = await recordEntitlementEvent({ planId: plan.id, sourceType: 'work_usage', sourceId: entry.id, hoursDelta: -hours, note: entry.description, invoiceId: entry.invoiceId, workOrderId: entry.workOrderId });
    plan.hours = { ...(plan.hours || {}), used: Number(plan.hours?.used || 0) + hours }; plan.updatedAt = now; await kv.set(`plan:${plan.id}`, plan); return c.json({ success: true, entry, hoursUsed: plan.hours.used, hoursRemaining: ledger.balance.hoursRemaining, overageHours: ledger.balance.overageHours });
  } catch (error: any) { return c.json({ error: error.message || 'Unable to log plan hours.' }, 500); }
});

// ── DROPSHIPPER OPERATIONS ───────────────────────────────────────────────────
// Provider credentials are never returned to a browser; management routes need
// an authenticated administrator, while order/inventory state remains shared.
function publicDropshipperConfig(config: any) { return { ...config, providers: (config.providers || []).map(({ apiKey, ...provider }: any) => provider) }; }
async function dropshipAdmin(c: any) { const actor = await financialActor(c); return actor.user && actor.admin ? actor : null; }
app.get('/make-server-57095a78/dropshipper/config', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, config: publicDropshipperConfig(await getDropshipperConfig()) }); });
app.post('/make-server-57095a78/dropshipper/initialize', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); await setDropshipperEnabled(true); return c.json({ success: true, config: publicDropshipperConfig(await getDropshipperConfig()), message: 'Dropshipper module initialized.' }); });
app.post('/make-server-57095a78/dropshipper/toggle', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); const body = await c.req.json(); await setDropshipperEnabled(Boolean(body.enabled)); return c.json({ success: true, config: publicDropshipperConfig(await getDropshipperConfig()) }); });
app.get('/make-server-57095a78/dropshipper/inventory', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); const inventory = await getAllInventory(); return c.json({ success: true, inventory, total: inventory.length }); });
app.get('/make-server-57095a78/dropshipper/orders', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); const orders = await getDropshipperOrders(); return c.json({ success: true, orders, total: orders.length }); });
app.get('/make-server-57095a78/dropshipper/errors', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); const errors = await getDropshipperErrors(Number(c.req.query('limit') || 100)); return c.json({ success: true, errors, total: errors.length }); });
app.post('/make-server-57095a78/dropshipper/sync-inventory', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json(await syncDropshipperInventory()); });
app.post('/make-server-57095a78/dropshipper/sync-tracking', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json(await syncDropshipperTracking()); });
app.get('/make-server-57095a78/dropshipper/providers', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, providers: (await getDropshipperProviders()).map(({ apiKey, ...provider }: any) => provider) }); });
app.get('/make-server-57095a78/dropshipper/catalog/staged', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, products: await getAllStagedProducts() }); });
app.get('/make-server-57095a78/dropshipper/catalog/stats', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, stats: await getStagingStats() }); });
app.get('/make-server-57095a78/dropshipper/catalog/categories', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, categories: await getStagedCategories() }); });
app.post('/make-server-57095a78/dropshipper/catalog/import-to-live', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); const body = await c.req.json(); return c.json(await importProductsToLive(Array.isArray(body.stagingIds) ? body.stagingIds : [])); });
app.delete('/make-server-57095a78/dropshipper/catalog/clear', async (c) => { const actor = await dropshipAdmin(c); if (!actor) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, cleared: await clearStagedProducts(c.req.query('providerId')) }); });
app.post('/make-server-57095a78/dropshipper/webhook/:kind', async (c) => { const body = await c.req.json(); const providerId = String(body.providerId || c.req.query('providerId') || ''); if (!providerId) return c.json({ error: 'providerId is required.' }, 400); const result = await handleDropshipperWebhook(providerId, body); return c.json(result, result.success ? 200 : 400); });

// ── CUSTOMER REVIEWS ─────────────────────────────────────────────────────────
const REVIEW_PREFIX = 'review:';
function publicReview(review: any) { const { customerEmail, moderationNote, ...safe } = review; return safe; }
app.get('/make-server-57095a78/reviews', async (c) => {
  try {
    const actor = await financialActor(c); const requested = String(c.req.query('status') || 'approved');
    const all = (await kv.getByPrefix(REVIEW_PREFIX)) || []; const serviceType = String(c.req.query('serviceType') || '').trim();
    const statusVisible = actor.admin && requested === 'all' ? all : all.filter((review: any) => review.status === 'approved');
    const reviews = serviceType ? statusVisible.filter((review: any) => String(review.serviceType || '') === serviceType) : statusVisible;
    return c.json({ success: true, reviews: reviews.map(publicReview).sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt))) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load reviews.' }, 500); }
});
app.post('/make-server-57095a78/reviews', async (c) => {
  try {
    const body = stripBase64(await c.req.json()); const name = String(body.customerName || '').trim(); const text = String(body.reviewText || '').trim(); const rating = Number(body.rating);
    if (!name || text.length < 10 || !Number.isFinite(rating) || rating < 1 || rating > 5) return c.json({ success: false, error: 'Name, a 10-character review, and a rating from 1 to 5 are required.' }, 400);
    const review = { id: `review_${crypto.randomUUID()}`, customerName: name.slice(0, 120), customerEmail: String(body.customerEmail || '').trim().toLowerCase(), reviewText: text.slice(0, 4000), reviewTitle: String(body.reviewTitle || '').trim().slice(0, 160), rating: Math.round(rating), serviceType: String(body.serviceType || '').slice(0, 120), status: 'pending', response: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(`${REVIEW_PREFIX}${review.id}`, review); return c.json({ success: true, review: publicReview(review) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to submit review.' }, 500); }
});
app.patch('/make-server-57095a78/reviews/:id', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const review = await kv.get(`${REVIEW_PREFIX}${c.req.param('id')}`) as any; if (!review) return c.json({ success: false, error: 'Review not found.' }, 404); const body = await c.req.json();
    const status = ['pending','approved','hidden','rejected'].includes(String(body.status)) ? body.status : review.status; const updated = { ...review, status, response: body.response === undefined ? review.response : String(body.response).slice(0, 4000), moderationNote: body.moderationNote === undefined ? review.moderationNote : String(body.moderationNote).slice(0, 1000), moderatedBy: actor.user.email, updatedAt: new Date().toISOString() };
    await kv.set(`${REVIEW_PREFIX}${updated.id}`, updated); return c.json({ success: true, review: publicReview(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to moderate review.' }, 500); }
});

// ── TECH ROSTER ──────────────────────────────────────────────────────────────
app.get('/make-server-57095a78/tech-tiers/config', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, tiers: (await kv.get('tech_tiers:config')) || [] }); });
app.post('/make-server-57095a78/tech-tiers/config', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const body = await c.req.json(); if (!Array.isArray(body.tiers)) return c.json({ error: 'tiers must be an array.' }, 400); await kv.set('tech_tiers:config', body.tiers); return c.json({ success: true, tiers: body.tiers }); });
app.get('/make-server-57095a78/tech-roster', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, techs: (await kv.getByPrefix('tech_roster:')) || [] }); });
app.post('/make-server-57095a78/tech-roster', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const tech = body.tech || {}; if (!String(tech.name || '').trim()) return c.json({ error: 'Technician name is required.' }, 400); const id = String(tech.id || crypto.randomUUID()); const current = await kv.get(`tech_roster:${id}`) as any; const saved = { ...current, ...stripBase64(tech), id, name: String(tech.name).trim(), updatedAt: new Date().toISOString(), createdAt: current?.createdAt || new Date().toISOString() }; await kv.set(`tech_roster:${id}`, saved); return c.json({ success: true, tech: saved }, current ? 200 : 201); });
app.delete('/make-server-57095a78/tech-roster/:id', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const id = c.req.param('id'); if (!await kv.get(`tech_roster:${id}`)) return c.json({ error: 'Technician not found.' }, 404); await kv.del(`tech_roster:${id}`); return c.json({ success: true }); });

// Legacy subcontractor onboarding now feeds the same application → CRM → intake pipeline.
app.post('/make-server-57095a78/subcontractors/register', async (c) => {
  try {
    const body = stripBase64(await c.req.json()); const personal = body.personalInfo || body.personal || {}; const business = body.businessInfo || body.business || {}; const service = body.serviceInfo || body.service || {};
    const { application, updated } = await saveApplicationAndCrm({ ...body, applicationType: 'subcontractor', name: body.name || personal.name || [personal.firstName, personal.lastName].filter(Boolean).join(' '), email: body.email || personal.email, phone: body.phone || personal.phone, companyName: body.companyName || business.companyName || business.name, serviceArea: body.serviceArea || service.serviceArea, licenseNumber: body.licenseNumber || service.licenseNumber || business.licenseNumber });
    return c.json({ success: true, applicationId: application.id, application, updated }, updated ? 200 : 201);
  } catch (error: any) { return c.json({ success: false, message: error.message || 'Unable to submit subcontractor registration.' }, 400); }
});

// ── QUOTE FOLLOW-UPS ─────────────────────────────────────────────────────────
app.post('/make-server-57095a78/follow-ups/schedule', async (c) => {
  try { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const body = await c.req.json(); if (!body.quoteId || !body.clientEmail) return c.json({ error: 'quoteId and clientEmail are required.' }, 400); const existing = (await kv.getByPrefix(`follow_up:${body.quoteId}:`)) || []; if (existing.length) return c.json({ success: true, duplicate: true, followUps: existing }); const now = Date.now(); const rows = [3,7].map(days => ({ id: `followup_${crypto.randomUUID()}`, quoteId: String(body.quoteId), workRequestId: body.workRequestId || null, clientName: String(body.clientName || ''), clientEmail: String(body.clientEmail).toLowerCase(), clientPhone: String(body.clientPhone || ''), serviceType: String(body.serviceType || ''), approvalUrl: String(body.approvalUrl || ''), quoteTotal: Number(body.quoteTotal || 0), dueAt: new Date(now + days * 86400000).toISOString(), status: 'scheduled', createdAt: new Date().toISOString(), createdBy: actor.user.email })); await Promise.all(rows.map(row => kv.set(`follow_up:${row.quoteId}:${row.id}`, row))); return c.json({ success: true, followUps: rows }, 201); }
  catch (error: any) { return c.json({ error: error.message || 'Unable to schedule follow-ups.' }, 500); }
});
app.get('/make-server-57095a78/follow-ups', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const followUps = (await kv.getByPrefix('follow_up:')) || []; return c.json({ success: true, followUps: followUps.sort((a: any,b: any) => String(a.dueAt).localeCompare(String(b.dueAt))) }); });
app.post('/make-server-57095a78/follow-ups/process', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const all = (await kv.getByPrefix('follow_up:')) || []; const now = new Date().toISOString(); const due = all.filter((row: any) => row.status === 'scheduled' && String(row.dueAt) <= now); await Promise.all(due.map((row: any) => kv.set(`follow_up:${row.quoteId}:${row.id}`, { ...row, status: 'due', processedAt: now, processedBy: actor.user.email }))); return c.json({ success: true, processed: due.length }); });

// ── CANONICAL SUBSCRIPTIONS ──────────────────────────────────────────────────
function subscriptionKey(id: string) { return `subscription:${id}`; }
function giftHourRequestKey(id: string) { return `gift_hour_request:${id}`; }
function ownsSubscription(record: any, email: string) { return String(record.stakeholderEmail || record.customerEmail || '').toLowerCase() === String(email || '').toLowerCase(); }
function nextRenewalDate(subscription: any, from: Date) {
  const date = new Date(from);
  date.setMonth(date.getMonth() + (subscription.billingCycle === 'annual' ? 12 : subscription.billingCycle === 'quarterly' ? 3 : 1));
  return date;
}
async function applyGiftHours(subscription: any, hours: number, reason: string, giftedBy: string, metadata: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const gift = { id: `GIFT-${crypto.randomUUID()}`, subscriptionId: subscription.id, hours, reason, workType: 'general', giftedBy, createdAt: now, ...metadata };
  const record = { ...subscription, hoursGifted: Number(subscription.hoursGifted || 0) + hours, hourGifts: [gift, ...(subscription.hourGifts || [])], updatedAt: now };
  await kv.set(subscriptionKey(record.id), record);
  await kv.set(`subscription_hour_gift:${gift.id}`, gift);
  return { record, gift };
}
const PORTAL_UPGRADE_PRICES: Record<string, number> = {
  'customer:customer pro': 29, 'customer:customer premium': 79,
  'vendor:vendor basic': 99, 'vendor:vendor professional': 199, 'vendor:vendor premium': 399, 'vendor:vendor elite': 799,
  'subcontractor:subcontractor basic': 49, 'subcontractor:subcontractor pro': 99, 'subcontractor:subcontractor enterprise': 199,
  'advertiser:advertiser starter': 199, 'advertiser:advertiser growth': 499, 'advertiser:advertiser enterprise': 999,
  'investor:investor premium': 299, 'employee:employee pro': 5,
  'property_manager:property_manager basic': 149, 'property_manager:property_manager professional': 299, 'property_manager:property_manager enterprise': 599,
  'landlord:landlord basic': 29, 'landlord:landlord premium': 79, 'condo_manager:condo_manager basic': 199, 'condo_manager:condo_manager premium': 399,
  'customer_maintenance:customer standard maintenance': 99, 'customer_maintenance:customer priority maintenance': 199, 'customer_maintenance:customer premium maintenance': 399,
  'vendor_maintenance:vendor standard maintenance': 99, 'vendor_maintenance:vendor priority maintenance': 199, 'vendor_maintenance:vendor premium maintenance': 399,
  'subcontractor_maintenance:subcontractor standard maintenance': 99, 'subcontractor_maintenance:subcontractor priority maintenance': 199, 'subcontractor_maintenance:subcontractor premium maintenance': 399,
  'advertiser_maintenance:advertiser standard maintenance': 99, 'advertiser_maintenance:advertiser priority maintenance': 199, 'advertiser_maintenance:advertiser premium maintenance': 399,
  'investor_maintenance:investor standard maintenance': 99, 'investor_maintenance:investor priority maintenance': 199, 'investor_maintenance:investor premium maintenance': 399,
  'employee_maintenance:employee standard maintenance': 99, 'employee_maintenance:employee priority maintenance': 199, 'employee_maintenance:employee premium maintenance': 399,
  'property_manager_maintenance:property_manager standard maintenance': 99, 'property_manager_maintenance:property_manager priority maintenance': 199, 'property_manager_maintenance:property_manager premium maintenance': 399,
  'landlord_maintenance:landlord standard maintenance': 99, 'landlord_maintenance:landlord priority maintenance': 199, 'landlord_maintenance:landlord premium maintenance': 399,
  'condo_manager_maintenance:condo_manager standard maintenance': 99, 'condo_manager_maintenance:condo_manager priority maintenance': 199, 'condo_manager_maintenance:condo_manager premium maintenance': 399,
};

app.post('/make-server-57095a78/subscriptions/checkout', async (c) => {
  try {
    const { user } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in before starting a subscription.' }, 401);
    const body = await c.req.json(); const plan = String(body.plan || 'premium').slice(0, 120); const amount = money(body.amount ?? 49); const requestedType = String(body.type || '').slice(0, 80); const subscriptionType = requestedType || 'customer';
    if (!plan || amount <= 0) return c.json({ success: false, error: 'A valid paid plan is required.' }, 400);
    if (requestedType) { const catalogAmount = PORTAL_UPGRADE_PRICES[`${requestedType}:${plan.toLowerCase()}`]; if (catalogAmount === undefined || money(catalogAmount) !== amount) return c.json({ success: false, error: 'The selected portal plan or price is invalid.' }, 400); }
    else if (plan !== 'premium' || amount !== 49) return c.json({ success: false, error: 'A valid paid plan is required.' }, 400);
    const now = new Date().toISOString(); const subscriptionId = `SUB-${crypto.randomUUID()}`;
    const subscription = { id: subscriptionId, type: 'customer', stakeholderId: user.id || user.email, stakeholderName: String(body.name || user.user_metadata?.full_name || user.email.split('@')[0]), stakeholderEmail: user.email, plan, status: 'pending_payment', billingCycle: body.billingCycle === 'annual' ? 'annual' : 'monthly', amount, startDate: now, renewalDate: new Date(Date.now() + (body.billingCycle === 'annual' ? 365 : 30) * 86400000).toISOString(), hoursIncluded: Number(body.hoursIncluded || 0), hoursUsed: 0, hoursRollover: 0, hoursGifted: 0, autoRenew: true, paymentMethod: 'stripe', createdAt: now, updatedAt: now, createdBy: user.email };
    const paymentId = crypto.randomUUID(); const appUrl = (Deno.env.get('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');
    const session = await stripeCheckoutSession(new URLSearchParams({ 'payment_method_types[]': 'card', mode: 'payment', success_url: `${appUrl}/customer-portal-app?tab=dashboard&payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${appUrl}/customer-portal-app?tab=dashboard&subscription=cancelled`, 'line_items[0][price_data][currency]': 'usd', 'line_items[0][price_data][product_data][name]': `Black Phoenix ${plan} subscription`, 'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), 'line_items[0][quantity]': '1', customer_email: user.email, 'metadata[payment_id]': paymentId, 'metadata[subscription_id]': subscriptionId }));
    const payment = { id: paymentId, subscriptionId, amount, status: 'pending_confirmation', customerEmail: user.email, stripeCheckoutSessionId: session.id, createdAt: now, updatedAt: now };
    await kv.set(subscriptionKey(subscriptionId), subscription); await kv.set(`payment:${paymentId}`, payment);
    return c.json({ success: true, subscription, paymentId, checkoutUrl: session.url }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to start subscription checkout.' }, 500); }
});

app.get('/make-server-57095a78/subscriptions', async (c) => { try { const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ error: 'Sign in required.' }, 401); const records = (await kv.getByPrefix('subscription:')) || []; return c.json({ success: true, subscriptions: admin ? records : records.filter((r: any) => ownsSubscription(r, user.email)) }); } catch (error: any) { return c.json({ error: error.message }, 500); } });
app.post('/make-server-57095a78/subscriptions/:id/checkout', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in before starting checkout.' }, 401);
    const subscription = await kv.get(subscriptionKey(c.req.param('id'))) as any;
    if (!subscription) return c.json({ success: false, error: 'Subscription not found.' }, 404);
    if (!admin && !ownsSubscription(subscription, user.email)) return c.json({ success: false, error: 'You may only pay your own subscription.' }, 403);
    const amount = money(subscription.amount); if (amount <= 0) return c.json({ success: false, error: 'This subscription does not have a payable amount.' }, 400);
    const now = new Date().toISOString(); const paymentId = crypto.randomUUID(); const appUrl = (Deno.env.get('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');
    const session = await stripeCheckoutSession(new URLSearchParams({ 'payment_method_types[]': 'card', mode: 'payment', success_url: `${appUrl}/customer-portal-app?tab=dashboard&payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${appUrl}/customer-portal-app?tab=dashboard&subscription=cancelled`, 'line_items[0][price_data][currency]': 'usd', 'line_items[0][price_data][product_data][name]': `Black Phoenix ${subscription.plan || 'subscription'} payment`, 'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), 'line_items[0][quantity]': '1', customer_email: user.email, 'metadata[payment_id]': paymentId, 'metadata[subscription_id]': subscription.id }));
    const payment = { id: paymentId, subscriptionId: subscription.id, amount, status: 'pending_confirmation', customerEmail: user.email, stripeCheckoutSessionId: session.id, createdAt: now, updatedAt: now };
    await kv.set(`payment:${paymentId}`, payment);
    await kv.set(subscriptionKey(subscription.id), { ...subscription, status: subscription.status === 'active' ? 'active' : 'pending_payment', paymentId, checkoutSessionId: session.id, updatedAt: now });
    return c.json({ success: true, paymentId, checkoutUrl: session.url });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to start secure checkout.' }, 500); }
});

app.post('/make-server-57095a78/subscriptions', async (c) => { try { const { user, admin } = await financialActor(c); if (!admin) return c.json({ error: 'Administrator access is required.' }, 403); const body = await c.req.json(); if (!body.stakeholderEmail || !body.plan || !(Number(body.amount) >= 0)) return c.json({ error: 'Stakeholder email, plan, and amount are required.' }, 400); const now = new Date().toISOString(); const id = String(body.id || `SUB-${crypto.randomUUID()}`); const record = { ...stripBase64(body), id, status: body.status || 'pending', createdAt: body.createdAt || now, updatedAt: now, createdBy: user.email, paymentHistory: body.paymentHistory || [] }; await kv.set(subscriptionKey(id), record); return c.json({ success: true, subscription: record }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); } });
app.post('/make-server-57095a78/subscriptions/:id/gift-hours', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required to gift hours.' }, 403);
    const subscription = await kv.get(subscriptionKey(c.req.param('id'))) as any; if (!subscription) return c.json({ success: false, error: 'Subscription not found.' }, 404);
    const body = await c.req.json(); const hours = Number(body.hours || 0); if (!Number.isFinite(hours) || hours <= 0) return c.json({ success: false, error: 'A positive number of hours is required.' }, 400);
    const { record, gift } = await applyGiftHours(subscription, hours, String(body.reason || 'Gifted hours'), user.email);
    return c.json({ success: true, subscription: record, gift });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to gift hours.' }, 500); }
});

app.get('/make-server-57095a78/gift-hour-requests', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const requests = (await kv.getByPrefix('gift_hour_request:')) || [];
    const visible = admin ? requests : requests.filter((request: any) => String(request.requestedBy || request.customerEmail || '').toLowerCase() === String(user.email).toLowerCase());
    return c.json({ success: true, requests: visible.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load gift-hour requests.' }, 500); }
});
app.post('/make-server-57095a78/gift-hour-requests', async (c) => {
  try {
    const { user } = await financialActor(c); if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const body = await c.req.json(); const subscriptionId = String(body.subscriptionId || ''); const hours = Number(body.hours || 0);
    if (!subscriptionId || !Number.isFinite(hours) || hours <= 0) return c.json({ success: false, error: 'A subscription and a positive number of hours are required.' }, 400);
    const subscription = await kv.get(subscriptionKey(subscriptionId)) as any; if (!subscription) return c.json({ success: false, error: 'Subscription not found.' }, 404);
    if (!ownsSubscription(subscription, user.email) && !(await intakeIsAdmin(user))) return c.json({ success: false, error: 'You may only request hours for your own subscription.' }, 403);
    const now = new Date().toISOString(); const request = { id: `GHR-${crypto.randomUUID()}`, subscriptionId, customerName: subscription.stakeholderName || subscription.customerName || '', customerEmail: subscription.stakeholderEmail || subscription.customerEmail || '', hours, reason: String(body.reason || ''), urgency: body.urgency === 'urgent' ? 'urgent' : 'standard', requestedBy: user.email, requestedAt: now, status: 'pending', createdAt: now, updatedAt: now };
    await kv.set(giftHourRequestKey(request.id), request); return c.json({ success: true, request }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create gift-hour request.' }, 500); }
});
app.patch('/make-server-57095a78/gift-hour-requests/:id', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const request = await kv.get(giftHourRequestKey(c.req.param('id'))) as any; if (!request) return c.json({ success: false, error: 'Gift-hour request not found.' }, 404);
    const body = await c.req.json(); const status = String(body.status || ''); if (!['approved', 'rejected'].includes(status)) return c.json({ success: false, error: 'Choose approved or rejected.' }, 400);
    if (request.status !== 'pending') return c.json({ success: false, error: 'This request has already been reviewed.' }, 409);
    const now = new Date().toISOString(); const updated = { ...request, status, reviewedBy: user.email, reviewedAt: now, reviewNotes: String(body.reviewNotes || body.notes || ''), updatedAt: now };
    if (status === 'approved') { const subscription = await kv.get(subscriptionKey(request.subscriptionId)) as any; if (!subscription) return c.json({ success: false, error: 'Subscription not found.' }, 404); const grant = await applyGiftHours(subscription, Number(request.hours), request.reason || 'Approved gifted hours request', user.email, { requestId: request.id }); (updated as any).giftId = grant.gift.id; }
    await kv.set(giftHourRequestKey(updated.id), updated); return c.json({ success: true, request: updated });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to review gift-hour request.' }, 500); }
});
function subscriptionHourBalance(subscription: any) {
  const included = Number(subscription.hoursIncluded || 0); const rollover = Number(subscription.hoursRollover || 0); const gifted = Number(subscription.hoursGifted || 0); const used = Number(subscription.hoursUsed || 0);
  const available = included + rollover + gifted;
  return { included, rollover, gifted, used, available, remaining: Math.max(0, available - used), overageHours: Math.max(0, used - available) };
}
app.get('/make-server-57095a78/subscriptions/:id/hours', async (c) => {
  try {
    const { user, admin } = await financialActor(c); const subscription = await kv.get(subscriptionKey(c.req.param('id'))) as any;
    if (!subscription) return c.json({ success: false, error: 'Subscription not found.' }, 404);
    if (!user?.email || (!admin && !ownsSubscription(subscription, user.email))) return c.json({ success: false, error: 'You may only view your own subscription hours.' }, 403);
    const transactions = ((await kv.getByPrefix(`subscription_hour_transaction:${subscription.id}:`)) || []).sort((a: any, b: any) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')));
    return c.json({ success: true, subscriptionId: subscription.id, balance: subscriptionHourBalance(subscription), transactions });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load subscription hours.' }, 500); }
});
app.post('/make-server-57095a78/subscriptions/:id/log-hours', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required to log service hours.' }, 403);
    const subscription = await kv.get(subscriptionKey(c.req.param('id'))) as any; if (!subscription) return c.json({ success: false, error: 'Subscription not found.' }, 404);
    if (!['active', 'past_due'].includes(String(subscription.status))) return c.json({ success: false, error: 'Hours can only be posted to an active subscription.' }, 409);
    const body = await c.req.json(); const hours = Number(body.hours || 0); if (!Number.isFinite(hours) || hours <= 0) return c.json({ success: false, error: 'A positive number of hours is required.' }, 400);
    const sourceId = String(body.sourceId || body.invoiceId || body.workOrderId || ''); const sourceKey = sourceId ? `subscription_hour_source:${subscription.id}:${sourceId}` : '';
    if (sourceKey) { const previous = await kv.get(sourceKey) as any; if (previous) return c.json({ success: true, duplicate: true, transaction: previous, balance: subscriptionHourBalance(subscription) }); }
    const now = new Date().toISOString(); const transaction = { id: `HT-${crypto.randomUUID()}`, subscriptionId: subscription.id, customerId: subscription.stakeholderId || subscription.stakeholderEmail || '', customerName: subscription.stakeholderName || subscription.stakeholderEmail || '', type: 'used', hours, reason: String(body.reason || body.description || 'Service work'), performedBy: user.email, date: String(body.date || now), createdAt: now, invoiceId: body.invoiceId || null, workOrderId: body.workOrderId || null, sourceId: sourceId || null };
    const record = { ...subscription, hoursUsed: Number(subscription.hoursUsed || 0) + hours, updatedAt: now, hourUsage: [transaction, ...(subscription.hourUsage || [])] };
    await kv.set(subscriptionKey(record.id), record); await kv.set(`subscription_hour_transaction:${record.id}:${transaction.id}`, transaction); if (sourceKey) await kv.set(sourceKey, transaction);
    return c.json({ success: true, transaction, subscription: record, balance: subscriptionHourBalance(record) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to post subscription hours.' }, 500); }
});

app.post('/make-server-57095a78/subscriptions/process-rollovers', async (c) => {
  try {
    const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const body = await c.req.json().catch(() => ({})); const asOf = new Date(body.asOf || Date.now()); if (Number.isNaN(asOf.getTime())) return c.json({ success: false, error: 'Invalid rollover date.' }, 400);
    const subscriptions = (await kv.getByPrefix('subscription:')) || []; let processed = 0; let totalHours = 0;
    for (const subscription of subscriptions) {
      if (!['active', 'past_due'].includes(String(subscription.status))) continue;
      const renewal = new Date(subscription.renewalDate || 0); if (Number.isNaN(renewal.getTime()) || renewal > asOf) continue;
      const available = Math.max(0, Number(subscription.hoursIncluded || 0) + Number(subscription.hoursRollover || 0) + Number(subscription.hoursGifted || 0) - Number(subscription.hoursUsed || 0));
      const cap = Number(subscription.rolloverCap); const carried = Number.isFinite(cap) && cap >= 0 ? Math.min(available, cap) : available;
      const now = new Date().toISOString(); let next = nextRenewalDate(subscription, renewal); while (next <= asOf) next = nextRenewalDate(subscription, next); const event = { id: `ROL-${crypto.randomUUID()}`, carriedHours: carried, availableHours: available, processedAt: now, processedBy: user.email, previousRenewalDate: renewal.toISOString(), nextRenewalDate: next.toISOString() };
      const record = { ...subscription, hoursRollover: carried, hoursGifted: 0, hoursUsed: 0, renewalDate: next.toISOString(), lastRolloverAt: now, rolloverHistory: [event, ...(subscription.rolloverHistory || [])], updatedAt: now };
      await kv.set(subscriptionKey(record.id), record); await kv.set(`subscription_rollover:${event.id}`, { ...event, subscriptionId: record.id }); processed += 1; totalHours += carried;
    }
    return c.json({ success: true, processed, totalHours });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to process subscription rollovers.' }, 500); }
});

app.patch('/make-server-57095a78/subscriptions/:id', async (c) => { try { const { user, admin } = await financialActor(c); const current = await kv.get(subscriptionKey(c.req.param('id'))) as any; if (!current) return c.json({ error: 'Subscription not found.' }, 404); if (!admin && (!user?.email || !ownsSubscription(current, user.email))) return c.json({ error: 'Not permitted.' }, 403); const body = await c.req.json(); const allowed = admin ? ['status','autoRenew','renewalDate','paymentMethod','hoursIncluded','hoursGifted','hoursRollover'] : ['autoRenew']; const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key))); const record = { ...current, ...patch, updatedAt: new Date().toISOString() }; await kv.set(subscriptionKey(record.id), record); return c.json({ success: true, subscription: record }); } catch (error: any) { return c.json({ error: error.message }, 500); } });
app.post('/make-server-57095a78/subscriptions/:id/renew', async (c) => { try { const { user, admin } = await financialActor(c); if (!admin) return c.json({ error: 'Administrator access is required.' }, 403); const current = await kv.get(subscriptionKey(c.req.param('id'))) as any; if (!current) return c.json({ error: 'Subscription not found.' }, 404); const paid = Boolean((await c.req.json()).paid); if (!paid) return c.json({ error: 'Renewal must be triggered only after verified payment.' }, 409); const date = new Date(current.renewalDate || Date.now()); date.setMonth(date.getMonth() + (current.billingCycle === 'annual' ? 12 : current.billingCycle === 'quarterly' ? 3 : 1)); const record = { ...current, status: 'active', renewalDate: date.toISOString(), renewedAt: new Date().toISOString(), renewedBy: user.email, updatedAt: new Date().toISOString() }; await kv.set(subscriptionKey(record.id), record); return c.json({ success: true, subscription: record }); } catch (error: any) { return c.json({ error: error.message }, 500); } });

// ── SUBCONTRACTOR BIDDING ────────────────────────────────────────────────────
app.get('/make-server-57095a78/quotes/:id/bids', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); return c.json({ success: true, bids: (await kv.get(`quote_bids:${c.req.param('id')}`)) || [] }); });
app.post('/make-server-57095a78/quotes/:id/request-bids', async (c) => { try { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const quote = await kv.get(`quote:${c.req.param('id')}`) as any; if (!quote) return c.json({ error: 'Quote not found.' }, 404); const body = await c.req.json(); const request = { id: `bid_request_${crypto.randomUUID()}`, quoteId: quote.id, workRequestId: body.workRequestId || null, status: 'requested', requestedAt: new Date().toISOString(), requestedBy: actor.user.email }; const requests = (await kv.get(`quote_bid_requests:${quote.id}`)) || []; await kv.set(`quote_bid_requests:${quote.id}`, [...requests, request]); return c.json({ success: true, request }); } catch (error: any) { return c.json({ error: error.message }, 500); } });
app.post('/make-server-57095a78/quotes/:id/send-to-customer', async (c) => { try { const actor = await financialActor(c); if (!actor.admin) return c.json({ error: 'Administrator access is required.' }, 403); const quote = await kv.get(`quote:${c.req.param('id')}`) as any; if (!quote) return c.json({ error: 'Quote not found.' }, 404); const sent = { ...quote, status: 'sent', sentAt: new Date().toISOString(), sentBy: actor.user.email, updatedAt: new Date().toISOString() }; await kv.set(`quote:${quote.id}`, sent); return c.json({ success: true, quote: sent }); } catch (error: any) { return c.json({ error: error.message }, 500); } });

// ── ACCESS REQUESTS ──────────────────────────────────────────────────────────
app.post('/make-server-57095a78/access-requests', async (c) => { try { const body = stripBase64(await c.req.json()); const email = String(body.email || '').trim().toLowerCase(); if (!email || !String(body.requestedPortal || body.portal || '').trim()) return c.json({ success: false, error: 'Email and requested portal are required.' }, 400); const id = `access_${crypto.randomUUID()}`; const request = { ...body, id, email, requestedPortal: body.requestedPortal || body.portal, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; await kv.set(`access_request:${id}`, request); return c.json({ success: true, request }, 201); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.get('/make-server-57095a78/access-requests', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403); return c.json({ success: true, requests: (await kv.getByPrefix('access_request:')) || [] }); });
app.patch('/make-server-57095a78/access-requests/:id', async (c) => { const actor = await financialActor(c); if (!actor.admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const existing = await kv.get(`access_request:${c.req.param('id')}`) as any; if (!existing) return c.json({ success: false, error: 'Access request not found.' }, 404); const body = await c.req.json(); const status = ['approved','rejected','pending'].includes(String(body.status)) ? body.status : existing.status; const request = { ...existing, status, reviewedBy: actor.user.email, reviewedAt: new Date().toISOString(), reviewNote: String(body.reviewNote || ''), updatedAt: new Date().toISOString() }; await kv.set(`access_request:${request.id}`, request); return c.json({ success: true, request }); });

// ── SUBCONTRACTOR BIDS + CUSTOMER GIVEAWAY ENTRIES ───────────────────────────
// Both workflows are account-scoped and immediately visible to Command Center
// operators through their dedicated KV records and admin alerts.
async function ensureBidAttachmentBucket() {
  const bucket = 'bid-attachments';
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets || []).some((item: any) => item.name === bucket)) {
    const { error } = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: 52428800, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'] });
    if (error && !String(error.message || '').toLowerCase().includes('already exists')) throw error;
  }
  return bucket;
}
app.post('/make-server-57095a78/subcontractor/bid-attachments', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.user?.id) return c.json({ success: false, error: 'Sign in before uploading a bid attachment.' }, 401);
    const form = await c.req.parseBody(); const file = form.file;
    if (!(file instanceof File)) return c.json({ success: false, error: 'Choose an image or video file.' }, 400);
    const isImage = file.type.startsWith('image/'); const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return c.json({ success: false, error: 'Only image and video attachments are supported.' }, 400);
    if (file.size > 50 * 1024 * 1024) return c.json({ success: false, error: 'Attachments are limited to 50MB.' }, 400);
    const bucket = await ensureBidAttachmentBucket(); const id = `ATT-${crypto.randomUUID()}`; const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'attachment'; const path = `${actor.user.id}/${id}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }); if (error) throw error;
    const attachment = { id, name: file.name.slice(0, 240), type: isVideo ? 'video' : 'image', mimeType: file.type, size: file.size, bucket, path, ownerUserId: actor.user.id, status: 'uploaded', uploadedAt: new Date().toISOString() };
    await kv.set(`subcontractor_bid_upload:${actor.user.id}:${id}`, attachment); await kv.set(`subcontractor_bid_upload_record:${id}`, attachment);
    return c.json({ success: true, attachment }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to upload attachment.' }, 500); }
});
app.delete('/make-server-57095a78/subcontractor/bid-attachments/:id', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.user?.id) return c.json({ success: false, error: 'Sign in before removing an attachment.' }, 401);
    const key = `subcontractor_bid_upload:${actor.user.id}:${c.req.param('id')}`; const attachment = await kv.get(key) as any; if (!attachment) return c.json({ success: false, error: 'Attachment not found.' }, 404); if (attachment.status === 'attached') return c.json({ success: false, error: 'Submitted bid attachments cannot be removed.' }, 409);
    await supabase.storage.from(attachment.bucket || 'bid-attachments').remove([attachment.path]); await kv.del(key); await kv.del(`subcontractor_bid_upload_record:${attachment.id}`); return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to remove attachment.' }, 500); }
});
app.get('/make-server-57095a78/subcontractor/bid-attachments/:id/download', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.user?.id) return c.json({ success: false, error: 'Sign in to view an attachment.' }, 401);
    const attachment = (await kv.get(`subcontractor_bid_upload:${actor.user.id}:${c.req.param('id')}`) as any) || (actor.admin ? await kv.get(`subcontractor_bid_upload_record:${c.req.param('id')}`) as any : null); if (!attachment) return c.json({ success: false, error: 'Attachment not found.' }, 404);
    const { data, error } = await supabase.storage.from(attachment.bucket || 'bid-attachments').createSignedUrl(attachment.path, 900); if (error || !data?.signedUrl) throw error || new Error('Unable to create a secure file link.');
    return c.json({ success: true, url: data.signedUrl, attachment: { id: attachment.id, name: attachment.name, type: attachment.type } });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to open attachment.' }, 500); }
});

app.get('/make-server-57095a78/subcontractor/bids', async (c) => {
  try { const actor = await financialActor(c); if (!actor.user?.id) return c.json({ success: false, error: 'Sign in to view your bids.' }, 401); const bids = (await kv.getByPrefix(`subcontractor_bid:${actor.user.id}:`)) || []; return c.json({ success: true, bids: bids.sort((a: any, b: any) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))) }); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load bids.' }, 500); }
});
app.post('/make-server-57095a78/subcontractor/bids', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.user?.id || !actor.user.email) return c.json({ success: false, error: 'Sign in before submitting a bid.' }, 401);
    const body = stripBase64(await c.req.json()); const jobId = String(body.jobId || '').trim().slice(0, 120); const jobTitle = String(body.jobTitle || '').trim().slice(0, 240); const amount = Number(body.amount);
    if (!jobId || !jobTitle || !Number.isFinite(amount) || amount <= 0) return c.json({ success: false, error: 'A job and a valid bid amount are required.' }, 400);
    const duplicateKey = `subcontractor_bid_job:${actor.user.id}:${jobId}`; const existingId = await kv.get(duplicateKey) as string | null;
    if (existingId) return c.json({ success: false, error: 'You already submitted a bid for this job.' }, 409);
    const now = new Date().toISOString(); const bid = { id: `BID-${crypto.randomUUID()}`, subcontractorUserId: actor.user.id, subcontractorEmail: String(actor.user.email).toLowerCase(), subcontractorName: String(actor.user.user_metadata?.full_name || actor.user.email).slice(0, 180), jobId, jobTitle, amount, notes: String(body.notes || '').trim().slice(0, 5000), duration: String(body.duration || '').trim().slice(0, 180), attachments: [], status: 'submitted', submittedAt: now, updatedAt: now };
    const requestedAttachments = Array.isArray(body.attachments) ? body.attachments : [];
    for (const item of requestedAttachments.slice(0, 10)) { const attachmentId = String(item?.id || ''); const attachment = await kv.get(`subcontractor_bid_upload:${actor.user.id}:${attachmentId}`) as any; if (!attachment || attachment.status !== 'uploaded') return c.json({ success: false, error: 'One or more bid attachments are unavailable. Upload them again before submitting.' }, 400); bid.attachments.push({ id: attachment.id, name: attachment.name, type: attachment.type, mimeType: attachment.mimeType, size: attachment.size }); await kv.set(`subcontractor_bid_upload:${actor.user.id}:${attachment.id}`, { ...attachment, status: 'attached', bidId: bid.id, attachedAt: now }); }
    await kv.set(`subcontractor_bid:${actor.user.id}:${bid.id}`, bid); await kv.set(duplicateKey, bid.id); await kv.set(`subcontractor_bid_record:${bid.id}`, bid);
    const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift({ id: `bid_alert_${crypto.randomUUID()}`, type: 'info', category: 'Subcontractor Bids', title: `New bid: ${jobTitle}`, description: `${bid.subcontractorName} submitted $${amount.toLocaleString()} for ${jobTitle}.`, status: 'unread', source: 'subcontractor-portal', data: { bidId: bid.id, jobId }, timestamp: now }); await kv.set('admin_alerts', alerts.slice(0, 200));
    return c.json({ success: true, bid }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to submit bid.' }, 500); }
});
app.get('/make-server-57095a78/giveaways/entries', async (c) => {
  try { const actor = await financialActor(c); if (!actor.user?.id) return c.json({ success: false, error: 'Sign in to view giveaway entries.' }, 401); const entries = actor.admin ? ((await kv.getByPrefix('giveaway_entry:')) || []) : ((await kv.getByPrefix(`giveaway_entry:${actor.user.id}:`)) || []); return c.json({ success: true, entries }); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load giveaway entries.' }, 500); }
});
app.post('/make-server-57095a78/giveaways/entries', async (c) => {
  try {
    const actor = await financialActor(c); if (!actor.user?.id || !actor.user.email) return c.json({ success: false, error: 'Sign in before entering a giveaway.' }, 401);
    const body = stripBase64(await c.req.json()); const giveawayId = String(body.giveawayId || '').trim().slice(0, 160); const giveawayTitle = String(body.giveawayTitle || '').trim().slice(0, 240);
    if (!giveawayId || !giveawayTitle) return c.json({ success: false, error: 'Giveaway details are required.' }, 400);
    const duplicateKey = `giveaway_entry_by_giveaway:${actor.user.id}:${giveawayId}`; if (await kv.get(duplicateKey)) return c.json({ success: false, error: 'You have already entered this giveaway.' }, 409);
    const now = new Date().toISOString(); const entry = { id: `GIVEAWAY-${crypto.randomUUID()}`, giveawayId, giveawayTitle, customerId: actor.user.id, customerEmail: String(actor.user.email).toLowerCase(), customerName: String(actor.user.user_metadata?.full_name || actor.user.email).slice(0, 180), enteredAt: now, status: 'entered' };
    await kv.set(`giveaway_entry:${actor.user.id}:${entry.id}`, entry); await kv.set(`giveaway_entry_record:${entry.id}`, entry); await kv.set(duplicateKey, entry.id);
    const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift({ id: `giveaway_alert_${crypto.randomUUID()}`, type: 'info', category: 'Giveaways', title: `Giveaway entry: ${giveawayTitle}`, description: `${entry.customerName} entered the giveaway.`, status: 'unread', source: 'customer-portal', data: { entryId: entry.id, giveawayId }, timestamp: now }); await kv.set('admin_alerts', alerts.slice(0, 200));
    return c.json({ success: true, entry }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to enter giveaway.' }, 500); }
});

// ── TERRITORY ROSTERS ────────────────────────────────────────────────────────
// Customer and subcontractor networks belong to the signed-in territory owner.
// They stay isolated by account and the customer intake is mirrored into the
// territory CRM so it is immediately searchable from that portal.
function territoryWorkspaceKey(userId: string) { return `territory_workspace:${userId}`; }
async function territoryActor(c: any) {
  const actor = await financialActor(c);
  return actor.user?.id ? actor : null;
}
function territorySettingsRecord(workspace: any, user: any) {
  const existing = workspace?.settings || {};
  const fallbackName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Territory Owner').slice(0, 180);
  return {
    territoryId: String(existing.territoryId || workspace?.territoryId || `TERR-${String(user?.id || '').replaceAll('-', '').slice(0, 8).toUpperCase() || 'NEW'}`),
    territoryName: String(existing.territoryName || workspace?.territoryName || 'My Territory').slice(0, 180),
    serviceState: String(existing.serviceState || workspace?.serviceState || '').slice(0, 64),
    ownerName: String(existing.ownerName || fallbackName).slice(0, 180),
    ownerEmail: String(existing.ownerEmail || user?.email || '').toLowerCase().slice(0, 254),
    updatedAt: existing.updatedAt || null,
  };
}
app.get('/make-server-57095a78/territory/settings', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in to view territory settings.' }, 401);
    const workspace = (await kv.get(territoryWorkspaceKey(actor.user.id)) as any) || { customers: [], subcontractors: [] };
    return c.json({ success: true, settings: territorySettingsRecord(workspace, actor.user) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load territory settings.' }, 500); }
});
app.patch('/make-server-57095a78/territory/settings', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in before saving territory settings.' }, 401);
    const body = stripBase64(await c.req.json()); const territoryName = String(body.territoryName || '').trim().slice(0, 180); const serviceState = String(body.serviceState || '').trim().slice(0, 64); const ownerName = String(body.ownerName || '').trim().slice(0, 180); const ownerEmail = String(body.ownerEmail || '').trim().toLowerCase().slice(0, 254);
    if (!territoryName || !serviceState || !ownerName || !ownerEmail) return c.json({ success: false, error: 'Territory name, service state, owner name, and owner contact email are required.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return c.json({ success: false, error: 'Enter a valid owner contact email.' }, 400);
    const key = territoryWorkspaceKey(actor.user.id); const workspace = (await kv.get(key) as any) || { customers: [], subcontractors: [] }; const now = new Date().toISOString();
    const settings = { ...territorySettingsRecord(workspace, actor.user), territoryName, serviceState, ownerName, ownerEmail, updatedAt: now, updatedBy: actor.user.email || actor.user.id };
    workspace.settings = settings; workspace.territoryId = settings.territoryId; workspace.territoryName = territoryName; workspace.serviceState = serviceState; workspace.updatedAt = now; await kv.set(key, workspace);
    await territoryAdminAlert(`Territory settings updated: ${territoryName}`, `${actor.user.email || 'A territory owner'} updated territory business settings.`, { territoryOwnerId: actor.user.id, territoryId: settings.territoryId });
    return c.json({ success: true, settings: stripBase64(settings) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save territory settings.' }, 500); }
});

function territoryCustomerRecord(input: any, actor: any) {
  const now = new Date().toISOString();
  return {
    id: `territory_customer_${crypto.randomUUID()}`,
    name: String(input?.name || '').trim().slice(0, 180),
    email: String(input?.email || '').trim().toLowerCase().slice(0, 254),
    phone: String(input?.phone || '').trim().slice(0, 64),
    serviceType: String(input?.serviceType || '').trim().slice(0, 180),
    status: 'active', totalSpent: 0,
    territoryOwnerId: actor.user.id, territoryOwnerEmail: String(actor.user.email || '').toLowerCase(),
    createdAt: now, updatedAt: now,
  };
}
function territorySubcontractorRecord(input: any, actor: any) {
  const now = new Date().toISOString();
  return {
    id: `territory_subcontractor_${crypto.randomUUID()}`,
    name: String(input?.name || '').trim().slice(0, 180),
    trade: String(input?.trade || '').trim().slice(0, 180),
    email: String(input?.email || '').trim().toLowerCase().slice(0, 254),
    phone: String(input?.phone || '').trim().slice(0, 64),
    status: 'pending', rating: 0, jobs: 0,
    territoryOwnerId: actor.user.id, territoryOwnerEmail: String(actor.user.email || '').toLowerCase(),
    createdAt: now, updatedAt: now,
  };
}
async function territoryAdminAlert(title: string, description: string, data: any) {
  const alerts = (await kv.get('admin_alerts') as any[]) || [];
  alerts.unshift({ id: `territory_alert_${crypto.randomUUID()}`, type: 'info', category: 'Territory Network', title, description, status: 'unread', source: 'territory-portal', data, timestamp: new Date().toISOString() });
  await kv.set('admin_alerts', alerts.slice(0, 200));
}
app.get('/make-server-57095a78/territory/customers', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in to view your customer roster.' }, 401);
    const workspace = (await kv.get(territoryWorkspaceKey(actor.user.id)) as any) || { customers: [], subcontractors: [] };
    return c.json({ success: true, customers: (workspace.customers || []).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load customers.' }, 500); }
});
app.post('/make-server-57095a78/territory/customers', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in before adding a customer.' }, 401);
    const customer = territoryCustomerRecord(stripBase64(await c.req.json()), actor);
    if (!customer.name || !customer.email) return c.json({ success: false, error: 'Customer name and email are required.' }, 400);
    const key = territoryWorkspaceKey(actor.user.id); const workspace = (await kv.get(key) as any) || { customers: [], subcontractors: [] };
    if ((workspace.customers || []).some((item: any) => String(item.email).toLowerCase() === customer.email)) return c.json({ success: false, error: 'This customer is already in your territory roster.' }, 409);
    workspace.customers = [customer, ...(workspace.customers || [])]; workspace.updatedAt = new Date().toISOString(); await kv.set(key, workspace);
    const crmKey = `portal_crm:territory:${actor.user.id}`; const crm = (await kv.get(crmKey) as any) || { contacts: [], interactions: [] };
    const matchingContact = (crm.contacts || []).some((contact: any) => String(contact.email || '').toLowerCase() === customer.email);
    if (!matchingContact) {
      crm.contacts = [{ id: `crm_${crypto.randomUUID()}`, name: customer.name, type: 'prospect', email: customer.email, phone: customer.phone, unit: '', property: customer.serviceType, status: 'active', notes: 'Created from Territory Owner customer roster.', tags: ['territory-customer'], lastContact: null, createdAt: customer.createdAt, updatedAt: customer.updatedAt }, ...(crm.contacts || [])];
      crm.updatedAt = customer.updatedAt; await kv.set(crmKey, crm);
    }
    await territoryAdminAlert(`Territory customer added: ${customer.name}`, `${actor.user.email || 'A territory owner'} added ${customer.email} to their customer roster.`, { customerId: customer.id, territoryOwnerId: actor.user.id });
    return c.json({ success: true, customer: stripBase64(customer) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add customer.' }, 500); }
});
app.get('/make-server-57095a78/territory/subcontractors', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in to view your subcontractor roster.' }, 401);
    const workspace = (await kv.get(territoryWorkspaceKey(actor.user.id)) as any) || { customers: [], subcontractors: [] };
    return c.json({ success: true, subcontractors: (workspace.subcontractors || []).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load subcontractors.' }, 500); }
});
app.post('/make-server-57095a78/territory/subcontractors', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in before adding a subcontractor.' }, 401);
    const subcontractor = territorySubcontractorRecord(stripBase64(await c.req.json()), actor);
    if (!subcontractor.name || !subcontractor.trade) return c.json({ success: false, error: 'Subcontractor name and trade are required.' }, 400);
    const key = territoryWorkspaceKey(actor.user.id); const workspace = (await kv.get(key) as any) || { customers: [], subcontractors: [] };
    const duplicate = (workspace.subcontractors || []).some((item: any) => String(item.name).toLowerCase() === subcontractor.name.toLowerCase() && String(item.trade).toLowerCase() === subcontractor.trade.toLowerCase());
    if (duplicate) return c.json({ success: false, error: 'This subcontractor is already in your roster for that trade.' }, 409);
    workspace.subcontractors = [subcontractor, ...(workspace.subcontractors || [])]; workspace.updatedAt = new Date().toISOString(); await kv.set(key, workspace);
    await territoryAdminAlert(`Territory subcontractor pending: ${subcontractor.name}`, `${actor.user.email || 'A territory owner'} added ${subcontractor.name} (${subcontractor.trade}) for review.`, { subcontractorId: subcontractor.id, territoryOwnerId: actor.user.id });
    return c.json({ success: true, subcontractor: stripBase64(subcontractor) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add subcontractor.' }, 500); }
});

app.delete('/make-server-57095a78/territory/customers/:id', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in before removing a customer.' }, 401);
    const key = territoryWorkspaceKey(actor.user.id); const workspace = (await kv.get(key) as any) || { customers: [], subcontractors: [] };
    const customer = (workspace.customers || []).find((item: any) => String(item.id) === String(c.req.param('id')));
    if (!customer) return c.json({ success: false, error: 'Customer not found in your territory roster.' }, 404);
    workspace.customers = (workspace.customers || []).filter((item: any) => String(item.id) !== String(customer.id)); workspace.updatedAt = new Date().toISOString(); await kv.set(key, workspace);
    if (customer.email) {
      const crmKey = `portal_crm:territory:${actor.user.id}`; const crm = (await kv.get(crmKey) as any) || { contacts: [], interactions: [] };
      const removedIds = new Set((crm.contacts || []).filter((contact: any) => String(contact.email || '').toLowerCase() === String(customer.email).toLowerCase()).map((contact: any) => contact.id));
      crm.contacts = (crm.contacts || []).filter((contact: any) => !removedIds.has(contact.id)); crm.interactions = (crm.interactions || []).filter((interaction: any) => !removedIds.has(interaction.contactId)); crm.updatedAt = new Date().toISOString(); await kv.set(crmKey, crm);
    }
    await territoryAdminAlert(`Territory customer removed: ${customer.name}`, `${actor.user.email || 'A territory owner'} removed ${customer.name} from their roster.`, { customerId: customer.id, territoryOwnerId: actor.user.id });
    return c.json({ success: true, customerId: customer.id });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to remove customer.' }, 500); }
});

async function updateTerritoryRosterStatus(c: any, kind: 'customers' | 'subcontractors') {
  const actor = await territoryActor(c);
  if (!actor) return c.json({ success: false, error: 'Sign in before updating this roster record.' }, 401);
  const body = stripBase64(await c.req.json()); const status = String(body.status || '').toLowerCase();
  if (!['active', 'rejected'].includes(status)) return c.json({ success: false, error: 'Choose active or rejected.' }, 400);
  const key = territoryWorkspaceKey(actor.user.id); const workspace = (await kv.get(key) as any) || { customers: [], subcontractors: [] };
  const field = kind === 'customers' ? 'customers' : 'subcontractors'; const rows = Array.isArray(workspace[field]) ? workspace[field] : [];
  const index = rows.findIndex((item: any) => String(item.id) === String(c.req.param('id')));
  if (index < 0) return c.json({ success: false, error: 'Roster record not found.' }, 404);
  const current = rows[index];
  if (current.status !== 'pending') return c.json({ success: false, error: 'Only pending roster records can be approved or rejected.' }, 409);
  const now = new Date().toISOString(); const record = { ...current, status, reviewedAt: now, reviewedBy: actor.user.email || actor.user.id, updatedAt: now };
  workspace[field] = rows.map((item: any, rowIndex: number) => rowIndex === index ? record : item); workspace.updatedAt = now; await kv.set(key, workspace);
  if (kind === 'customers' && record.email) {
    const crmKey = `portal_crm:territory:${actor.user.id}`; const crm = (await kv.get(crmKey) as any) || { contacts: [], interactions: [] };
    crm.contacts = (crm.contacts || []).map((contact: any) => String(contact.email || '').toLowerCase() === String(record.email).toLowerCase() ? { ...contact, status: status === 'active' ? 'active' : 'inactive', updatedAt: now, notes: `${contact.notes || ''}${contact.notes ? '\n' : ''}Territory roster ${status} on ${now}.` } : contact);
    crm.updatedAt = now; await kv.set(crmKey, crm);
  }
  await territoryAdminAlert(`Territory ${kind === 'customers' ? 'customer' : 'subcontractor'} ${status}: ${record.name}`, `${actor.user.email || 'A territory owner'} ${status === 'active' ? 'approved' : 'rejected'} ${record.name}.`, { rosterType: kind, rosterRecordId: record.id, territoryOwnerId: actor.user.id, status });
  return c.json({ success: true, record: stripBase64(record) });
}
app.patch('/make-server-57095a78/territory/customers/:id/status', async (c) => {
  try { return await updateTerritoryRosterStatus(c, 'customers'); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update customer status.' }, 500); }
});
app.patch('/make-server-57095a78/territory/subcontractors/:id/status', async (c) => {
  try { return await updateTerritoryRosterStatus(c, 'subcontractors'); }
  catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update subcontractor status.' }, 500); }
});

// Territory owners may view financial records only for customers in their own
// roster. This reuses the canonical subscription, invoice, payment, and hour
// records instead of copying financial state into the territory workspace.
app.get('/make-server-57095a78/territory/subscriptions', async (c) => {
  try {
    const actor = await territoryActor(c);
    if (!actor) return c.json({ success: false, error: 'Sign in to view territory subscriptions.' }, 401);
    const workspace = (await kv.get(territoryWorkspaceKey(actor.user.id)) as any) || { customers: [] };
    const customerEmails = new Set((workspace.customers || []).map((customer: any) => String(customer.email || '').toLowerCase()).filter(Boolean));
    if (!customerEmails.size) return c.json({ success: true, subscriptions: [], summary: { active: 0, paused: 0, mrr: 0, hoursRemaining: 0, invoicesDue: 0, paymentsReceived: 0 } });
    const [allSubscriptions, allInvoices, allPayments] = await Promise.all([
      kv.getByPrefix('subscription:'), kv.getByPrefix('invoice:'), kv.getByPrefix('payment:'),
    ]);
    const subscriptions = ((allSubscriptions || []) as any[]).filter((subscription: any) => customerEmails.has(String(subscription.stakeholderEmail || subscription.customerEmail || '').toLowerCase()));
    const subscriptionIds = new Set(subscriptions.map((subscription: any) => String(subscription.id)));
    const invoices = ((allInvoices || []) as any[]).filter((invoice: any) => subscriptionIds.has(String(invoice.subscriptionId || '')) || customerEmails.has(String(invoice.customerEmail || invoice.clientEmail || invoice.email || '').toLowerCase()));
    const payments = ((allPayments || []) as any[]).filter((payment: any) => subscriptionIds.has(String(payment.subscriptionId || '')) || customerEmails.has(String(payment.customerEmail || payment.clientEmail || payment.email || '').toLowerCase()));
    const invoiceBySubscription = new Map<string, any>(); for (const invoice of invoices) if (invoice.subscriptionId && !invoiceBySubscription.has(String(invoice.subscriptionId))) invoiceBySubscription.set(String(invoice.subscriptionId), invoice);
    const paymentBySubscription = new Map<string, any>(); for (const payment of payments) if (payment.subscriptionId && !paymentBySubscription.has(String(payment.subscriptionId))) paymentBySubscription.set(String(payment.subscriptionId), payment);
    const records = subscriptions.map((subscription: any) => ({ ...subscription, balance: subscriptionHourBalance(subscription), invoice: invoiceBySubscription.get(String(subscription.id)) || invoices.find((invoice: any) => String(invoice.id) === String(subscription.invoiceId || '')) || null, payment: paymentBySubscription.get(String(subscription.id)) || payments.find((payment: any) => String(payment.id) === String(subscription.paymentId || '')) || null }));
    const active = records.filter((record: any) => String(record.status).toLowerCase() === 'active');
    const paused = records.filter((record: any) => !['active', 'past_due'].includes(String(record.status).toLowerCase()));
    const paymentsReceived = payments.filter((payment: any) => ['paid', 'succeeded', 'complete', 'completed'].includes(String(payment.status || '').toLowerCase())).reduce((total: number, payment: any) => total + Number(payment.amount || payment.amountPaid || 0), 0);
    const invoicesDue = invoices.filter((invoice: any) => !['paid', 'void', 'cancelled'].includes(String(invoice.status || '').toLowerCase())).reduce((total: number, invoice: any) => total + Number(invoice.balance_due ?? invoice.total_amount ?? invoice.total ?? 0), 0);
    return c.json({ success: true, subscriptions: records.map(stripBase64), summary: { active: active.length, paused: paused.length, mrr: active.reduce((total: number, record: any) => total + Number(record.amount || 0), 0), hoursRemaining: active.reduce((total: number, record: any) => total + Number(record.balance?.remaining || 0), 0), invoicesDue, paymentsReceived } });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load territory subscriptions.' }, 500); }
});

// ── PORTAL CRM: CONTACTS & INTERACTIONS ───────────────────────────────────────
// These records are intentionally account-scoped.  Property, condo, landlord,
// and territory users may only read and modify their own CRM workspace.
const portalCrmTypes = new Set(['property-manager', 'condo-manager', 'landlord', 'territory']);
function portalCrmKey(portalType: string, userId: string) {
  return `portal_crm:${portalType}:${userId}`;
}
async function portalCrmActor(c: any, portalType: string) {
  const actor = await financialActor(c);
  return { ...actor, portalType: portalCrmTypes.has(portalType) ? portalType : null };
}
function cleanCrmContact(input: any, existing: any = null) {
  const type = ['tenant', 'owner', 'vendor', 'prospect'].includes(String(input?.type)) ? String(input.type) : 'prospect';
  const status = ['active', 'inactive', 'prospect'].includes(String(input?.status)) ? String(input.status) : 'prospect';
  const tags = Array.isArray(input?.tags) ? input.tags.map((tag: any) => String(tag).trim()).filter(Boolean).slice(0, 30) : [];
  const now = new Date().toISOString();
  return {
    id: existing?.id || `crm_${crypto.randomUUID()}`,
    name: String(input?.name || '').trim().slice(0, 180),
    type, email: String(input?.email || '').trim().toLowerCase().slice(0, 254),
    phone: String(input?.phone || '').trim().slice(0, 64),
    unit: String(input?.unit || '').trim().slice(0, 100),
    property: String(input?.property || '').trim().slice(0, 240),
    status, notes: String(input?.notes || '').trim().slice(0, 5000), tags,
    lastContact: existing?.lastContact || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}
app.get('/make-server-57095a78/portal-crm/:portalType', async (c) => {
  try {
    const actor = await portalCrmActor(c, c.req.param('portalType'));
    if (!actor.user?.id) return c.json({ success: false, error: 'Sign in to view CRM records.' }, 401);
    if (!actor.portalType) return c.json({ success: false, error: 'Invalid CRM workspace.' }, 400);
    const data = (await kv.get(portalCrmKey(actor.portalType, actor.user.id)) as any) || { contacts: [], interactions: [] };
    return c.json({ success: true, contacts: (data.contacts || []).map(stripBase64), interactions: (data.interactions || []).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load CRM records.' }, 500); }
});
app.post('/make-server-57095a78/portal-crm/:portalType/contacts', async (c) => {
  try {
    const actor = await portalCrmActor(c, c.req.param('portalType'));
    if (!actor.user?.id) return c.json({ success: false, error: 'Sign in before adding a contact.' }, 401);
    if (!actor.portalType) return c.json({ success: false, error: 'Invalid CRM workspace.' }, 400);
    const contact = cleanCrmContact(stripBase64(await c.req.json()));
    if (!contact.name) return c.json({ success: false, error: 'Contact name is required.' }, 400);
    const key = portalCrmKey(actor.portalType, actor.user.id); const data = (await kv.get(key) as any) || { contacts: [], interactions: [] };
    data.contacts = [contact, ...(data.contacts || [])]; data.updatedAt = new Date().toISOString(); await kv.set(key, data);
    return c.json({ success: true, contact: stripBase64(contact) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add contact.' }, 500); }
});
app.delete('/make-server-57095a78/portal-crm/:portalType/contacts/:id', async (c) => {
  try {
    const actor = await portalCrmActor(c, c.req.param('portalType'));
    if (!actor.user?.id) return c.json({ success: false, error: 'Sign in before deleting a contact.' }, 401);
    if (!actor.portalType) return c.json({ success: false, error: 'Invalid CRM workspace.' }, 400);
    const key = portalCrmKey(actor.portalType, actor.user.id); const data = (await kv.get(key) as any) || { contacts: [], interactions: [] };
    const present = (data.contacts || []).some((contact: any) => String(contact.id) === c.req.param('id'));
    if (!present) return c.json({ success: false, error: 'Contact not found.' }, 404);
    data.contacts = (data.contacts || []).filter((contact: any) => String(contact.id) !== c.req.param('id'));
    data.interactions = (data.interactions || []).filter((interaction: any) => String(interaction.contactId) !== c.req.param('id'));
    data.updatedAt = new Date().toISOString(); await kv.set(key, data);
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete contact.' }, 500); }
});
app.post('/make-server-57095a78/portal-crm/:portalType/contacts/:id/interactions', async (c) => {
  try {
    const actor = await portalCrmActor(c, c.req.param('portalType'));
    if (!actor.user?.id) return c.json({ success: false, error: 'Sign in before logging an interaction.' }, 401);
    if (!actor.portalType) return c.json({ success: false, error: 'Invalid CRM workspace.' }, 400);
    const key = portalCrmKey(actor.portalType, actor.user.id); const data = (await kv.get(key) as any) || { contacts: [], interactions: [] };
    const contactIndex = (data.contacts || []).findIndex((contact: any) => String(contact.id) === c.req.param('id'));
    if (contactIndex < 0) return c.json({ success: false, error: 'Contact not found.' }, 404);
    const body = stripBase64(await c.req.json()); const type = ['call', 'email', 'meeting', 'note'].includes(String(body.type)) ? String(body.type) : 'note'; const subject = String(body.subject || '').trim().slice(0, 300);
    if (!subject) return c.json({ success: false, error: 'Interaction subject is required.' }, 400);
    const date = new Date().toISOString().split('T')[0]; const interaction = { id: `interaction_${crypto.randomUUID()}`, contactId: c.req.param('id'), type, subject, notes: String(body.notes || '').trim().slice(0, 5000), date, createdAt: new Date().toISOString(), createdBy: actor.user.email || actor.user.id };
    data.interactions = [interaction, ...(data.interactions || [])]; data.contacts[contactIndex] = { ...data.contacts[contactIndex], lastContact: date, updatedAt: new Date().toISOString() }; data.updatedAt = new Date().toISOString(); await kv.set(key, data);
    return c.json({ success: true, interaction: stripBase64(interaction), contact: stripBase64(data.contacts[contactIndex]) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to log interaction.' }, 500); }
});

// ── MAINTENANCE PLAN DRAFTS & CUSTOM ITEMS ───────────────────────────────────
function maintenanceDraftKey(email: string) { return `maintenance_draft:${String(email).toLowerCase()}`; }
app.get('/make-server-57095a78/maintenance-draft/:email', async (c) => { try { const { user, admin } = await financialActor(c); const email = String(c.req.param('email')).toLowerCase(); if (!user?.email || (!admin && String(user.email).toLowerCase() !== email)) return c.json({ success: false, error: 'Sign in to view this plan draft.' }, 403); return c.json({ success: true, draft: (await kv.get(maintenanceDraftKey(email))) || null }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.post('/make-server-57095a78/maintenance-draft/:email', async (c) => { try { const { user, admin } = await financialActor(c); const email = String(c.req.param('email')).toLowerCase(); if (email !== 'guest' && (!user?.email || (!admin && String(user.email).toLowerCase() !== email))) return c.json({ success: false, error: 'Sign in to save this plan draft.' }, 403); const draft = stripBase64((await c.req.json()).draft || {}); const previous = await kv.get(maintenanceDraftKey(email)) as any; const items = Array.isArray(draft.customItems) ? draft.customItems.map((item: any) => { const prior = (previous?.customItems || []).find((row: any) => row.id === item.id); return prior?.status && prior.status !== 'pending_pricing' ? { ...item, status: prior.status, price: prior.price, reviewedBy: prior.reviewedBy, reviewedAt: prior.reviewedAt } : { ...item, status: ['approved','rejected'].includes(item.status) ? 'pending_pricing' : (item.status || 'pending_pricing') }; }) : []; const saved = { ...previous, ...draft, customItems: items, ownerEmail: email, updatedAt: new Date().toISOString(), createdAt: previous?.createdAt || new Date().toISOString() }; await kv.set(maintenanceDraftKey(email), saved); return c.json({ success: true, draft: saved }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
app.get('/make-server-57095a78/maintenance-drafts', async (c) => { const { admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403); return c.json({ success: true, drafts: (await kv.getByPrefix('maintenance_draft:')) || [] }); });
app.patch('/make-server-57095a78/maintenance-drafts/:email/custom-items/:id', async (c) => { try { const { user, admin } = await financialActor(c); if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const draft = await kv.get(maintenanceDraftKey(c.req.param('email'))) as any; if (!draft) return c.json({ success: false, error: 'Plan draft not found.' }, 404); const body = await c.req.json(); const status = String(body.status); if (!['approved','rejected','pending_pricing'].includes(status)) return c.json({ success: false, error: 'Invalid approval status.' }, 400); if (status === 'approved' && !(Number(body.price) >= 0)) return c.json({ success: false, error: 'Set a price before approving this item.' }, 400); let found = false; draft.customItems = (draft.customItems || []).map((item: any) => { if (item.id !== c.req.param('id')) return item; found = true; return { ...item, status, price: status === 'approved' ? Number(body.price) : item.price, reviewNote: String(body.reviewNote || ''), reviewedAt: new Date().toISOString(), reviewedBy: user.email }; }); if (!found) return c.json({ success: false, error: 'Custom item not found.' }, 404); draft.updatedAt = new Date().toISOString(); await kv.set(maintenanceDraftKey(c.req.param('email')), draft); return c.json({ success: true, draft }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });

Deno.serve(app.fetch);
