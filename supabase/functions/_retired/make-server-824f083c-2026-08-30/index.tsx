import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from "./kv_store.tsx";
import portalApplicationsRouter from "./portal-applications.tsx";
import portalConfigRouter from "./portal-config.tsx";
import subcontractorCompaniesRouter from "./subcontractor-companies.tsx";
import vendorsRouter from "./vendors.tsx";
import customersRouter from "./customers.tsx";
import businessCustomersRouter from "./business-customers.tsx";
import suppliersRouter from "./suppliers.tsx";
import partnersRouter from "./partners.tsx";
import cadRouter from "./cad.tsx";
import paymentHandler from "./payment-handler.ts";
import promotionsRouter from "./promotions.tsx";
import rotationRouter from "./rotation.tsx";
import timeTrackingRouter from "./time-tracking.tsx";
import usersRouter from "./users.tsx";
import authRouter from "./auth-routes.ts";
import paymentsTransactionsRouter from "./payments-transactions.ts";
import paymentsMethodsRouter from "./payments-methods.ts";
import paymentsRefundsRouter from "./payments-refunds.ts";
import paymentsSchedulesRouter from "./payments-schedules.ts";
import paymentsAnalyticsRouter from "./payments-analytics.ts";
import paymentsReceiptsRouter from "./payments-receipts.ts";
import paymentsWebhooksRouter from "./payments-webhooks.ts";
import paymentsBatchRouter from "./payments-batch.ts";
import schedulingAppointmentsRouter from "./scheduling-appointments.ts";
import schedulingAvailabilityRouter from "./scheduling-availability.ts";
import schedulingResourcesRouter from "./scheduling-resources.ts";
import schedulingAnalyticsRouter from "./scheduling-analytics.ts";
import schedulingNotificationsRouter from "./scheduling-notifications.ts";
import inventoryEquipmentRouter from "./inventory-equipment.ts";
import inventoryItemsRouter from "./inventory-items.ts";
import inventoryPurchaseOrdersRouter from "./inventory-purchase-orders.ts";
import inventoryVendorsRouter from "./inventory-vendors.ts";
import inventoryAnalyticsRouter from "./inventory-analytics.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 600,
    credentials: true,
  })
);

console.log("🚀 Server initializing...");

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Create storage buckets on startup
async function initializeStorageBuckets() {
  const buckets = [
    'make-824f083c-applications',
    'make-824f083c-designs',
    'make-824f083c-media'
  ];
  
  try {
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    
    for (const bucketName of buckets) {
      const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        });
        
        // Ignore 409 conflict errors (bucket already exists)
        if (error && error.statusCode !== '409') {
          console.error(`❌ Error creating bucket ${bucketName}:`, error.message);
        } else if (!error) {
          console.log(`✅ Created storage bucket: ${bucketName}`);
        } else {
          console.log(`ℹ️  Bucket ${bucketName} already exists`);
        }
      } else {
        console.log(`ℹ️  Bucket ${bucketName} already exists`);
      }
    }
  } catch (error) {
    console.error('❌ Error initializing storage buckets:', error);
  }
}

// Initialize on startup
initializeStorageBuckets().catch(console.error);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/make-server-824f083c/health", (c) => {
  console.log("✅ Health check endpoint called");
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString() 
  });
});

// ============================================================================
// ADVERTISING ENDPOINTS (INLINE FOR NOW)
// ============================================================================

// Test endpoint
app.get("/make-server-824f083c/advertising/test", (c) => {
  console.log("✅ Advertising test endpoint called");
  return c.json({ 
    status: "advertising is working",
    timestamp: new Date().toISOString()
  });
});

// Get all advertising products
app.get("/make-server-824f083c/advertising/products", (c) => {
  console.log("📦 GET /advertising/products called");
  
  const products = [
    {
      id: 'homepage-banner',
      type: 'banner',
      category: 'one-time',
      name: 'Homepage Banner Ad',
      description: '3-month campaign - Premium banner placement on homepage',
      price: 899,
      billingPeriod: 'one-time',
      features: [
        '✅ Prime homepage placement',
        '✅ Desktop + mobile visibility',
        '✅ 90-day campaign duration',
        '✅ Performance analytics',
      ],
      specs: {
        dimensions: '1200x400px',
        format: 'JPG, PNG, GIF',
        campaignLength: '90 days',
      },
    },
    {
      id: 'search-sponsored',
      type: 'sponsored',
      category: 'one-time',
      name: 'Search Results Sponsorship',
      description: '3-month campaign - Featured listing in search results',
      price: 599,
      billingPeriod: 'one-time',
      features: [
        '✅ Top search placement',
        '✅ "Sponsored" badge',
        '✅ 90-day campaign',
        '✅ Click tracking',
      ],
      specs: {
        placement: 'Top 3 results',
        keywords: 'Up to 10',
        campaignLength: '90 days',
      },
    },
  ];
  
  console.log(`Returning ${products.length} products`);
  return c.json({ products });
});

// Get all ad campaigns
app.get("/make-server-824f083c/advertising/ads", async (c) => {
  try {
    console.log("📊 GET /advertising/ads called");
    const campaigns = await kv.getByPrefix("ad-campaign:");
    console.log(`Found ${campaigns.length} ad campaigns`);
    return c.json({ ads: campaigns });
  } catch (error) {
    console.error("❌ Error fetching ads:", error);
    return c.json({ error: "Failed to fetch advertisements", details: error.message }, 500);
  }
});

// Create new ad campaign
app.post("/make-server-824f083c/advertising/ads", async (c) => {
  try {
    console.log("✏️ POST /advertising/ads called");
    const ad = await c.req.json();
    
    const id = ad.id || `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const campaign = {
      ...ad,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`ad-campaign:${id}`, campaign);
    console.log(`✅ Created ad campaign: ${id}`);
    
    return c.json(campaign, 201);
  } catch (error) {
    console.error("❌ Error creating ad:", error);
    return c.json({ error: "Failed to create advertisement", details: error.message }, 500);
  }
});

// Update ad campaign
app.put("/make-server-824f083c/advertising/ads/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`✏️ PUT /advertising/ads/${id} called`);
    
    const updates = await c.req.json();
    const existing = await kv.get(`ad-campaign:${id}`);
    
    if (!existing) {
      console.log(`❌ Ad campaign not found: ${id}`);
      return c.json({ error: "Advertisement not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`ad-campaign:${id}`, updated);
    console.log(`✅ Updated ad campaign: ${id}`);
    
    return c.json(updated);
  } catch (error) {
    console.error("❌ Error updating ad:", error);
    return c.json({ error: "Failed to update advertisement", details: error.message }, 500);
  }
});

// Delete ad campaign
app.delete("/make-server-824f083c/advertising/ads/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`🗑️ DELETE /advertising/ads/${id} called`);
    
    await kv.del(`ad-campaign:${id}`);
    console.log(`✅ Deleted ad campaign: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting ad:", error);
    return c.json({ error: "Failed to delete advertisement", details: error.message }, 500);
  }
});

// ============================================================================
// ACTIVITY TRACKING ENDPOINTS
// ============================================================================

// Get all activities
app.get("/make-server-824f083c/activities", async (c) => {
  try {
    console.log("📊 GET /activities called");
    const activities = await kv.getByPrefix("activity:");
    console.log(`Found ${activities.length} activities`);
    return c.json({ activities });
  } catch (error) {
    console.error("❌ Error fetching activities:", error);
    return c.json({ error: "Failed to fetch activities", details: error.message }, 500);
  }
});

// ============================================================================
// OAUTH CONNECTIONS ENDPOINTS
// ============================================================================

// Get all OAuth connections
app.get("/make-server-824f083c/oauth/connections", async (c) => {
  try {
    console.log("🔗 GET /oauth/connections called");
    const connections = await kv.getByPrefix("oauth-connection:");
    console.log(`Found ${connections.length} OAuth connections`);
    return c.json({ connections });
  } catch (error) {
    console.error("❌ Error fetching OAuth connections:", error);
    return c.json({ error: "Failed to fetch OAuth connections", details: error.message }, 500);
  }
});

// Create OAuth connection
app.post("/make-server-824f083c/oauth/connections", async (c) => {
  try {
    console.log("✏️ POST /oauth/connections called");
    const connectionData = await c.req.json();
    
    const id = connectionData.id || `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connection = {
      ...connectionData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`oauth-connection:${id}`, connection);
    console.log(`✅ Created OAuth connection: ${id}`);
    
    return c.json(connection, 201);
  } catch (error) {
    console.error("❌ Error creating OAuth connection:", error);
    return c.json({ error: "Failed to create OAuth connection", details: error.message }, 500);
  }
});

// Delete OAuth connection
app.delete("/make-server-824f083c/oauth/connections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`🗑️ DELETE /oauth/connections/${id} called`);
    
    await kv.del(`oauth-connection:${id}`);
    console.log(`✅ Deleted OAuth connection: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting OAuth connection:", error);
    return c.json({ error: "Failed to delete OAuth connection", details: error.message }, 500);
  }
});

// Create new activity
app.post("/make-server-824f083c/activities", async (c) => {
  try {
    console.log("✏️ POST /activities called");
    const activityData = await c.req.json();
    
    const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activity = {
      ...activityData,
      id,
      timestamp: new Date().toISOString(),
    };
    
    await kv.set(`activity:${id}`, activity);
    console.log(`✅ Created activity: ${id}`);
    
    return c.json(activity, 201);
  } catch (error) {
    console.error("❌ Error creating activity:", error);
    return c.json({ error: "Failed to create activity", details: error.message }, 500);
  }
});

// ============================================================================
// JOB APPLICATIONS ENDPOINTS
// ============================================================================

// Submit job application with file uploads
app.post("/make-server-824f083c/applications/submit", async (c) => {
  try {
    const body = await c.req.json();
    console.log("📝 Application submission received");

    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const applicantFolder = `applications/${applicationId}`;

    // Handle portfolio image uploads if present
    let portfolioUrls: string[] = [];
    if (body.portfolioImages && Array.isArray(body.portfolioImages)) {
      for (let i = 0; i < body.portfolioImages.length; i++) {
        const imageData = body.portfolioImages[i];
        
        // In a real implementation, you'd decode base64 and upload
        // For now, we'll store the metadata
        const imagePath = `${applicantFolder}/portfolio_${i + 1}.jpg`;
        portfolioUrls.push(imagePath);
      }
    }

    // Store application data in KV store
    const applicationData = {
      id: applicationId,
      ...body,
      portfolioUrls,
      portfolioImages: undefined, // Remove base64 data after processing
      submittedAt: new Date().toISOString(),
      status: 'pending',
      folder: applicantFolder
    };

    await kv.set(`application:${applicationId}`, applicationData);
    await kv.set(`application:latest`, applicationId);

    // Add to applications list
    const existingApps = await kv.get('applications:list') || [];
    await kv.set('applications:list', [applicationId, ...existingApps]);

    console.log(`✅ Application ${applicationId} saved to folder: ${applicantFolder}`);

    // Simple AI recommendation based on skills
    let recommendation = 'review';
    const skillsCount = body.skills?.length || 0;
    const hasPortfolio = portfolioUrls.length > 0;
    const hasReferences = body.references?.length > 0;

    if (skillsCount >= 5 && hasPortfolio && hasReferences) {
      recommendation = 'fast-track';
    } else if (skillsCount >= 3 || hasPortfolio) {
      recommendation = 'interview';
    }

    return c.json({
      success: true,
      applicationId,
      folder: applicantFolder,
      recommendation,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error("Error submitting application:", error);
    return c.json({ error: "Failed to submit application", details: error.message }, 500);
  }
});

// Get all applications
app.get("/make-server-824f083c/applications/list", async (c) => {
  try {
    const appIds = await kv.get('applications:list') || [];
    const applications = [];

    for (const appId of appIds.slice(0, 50)) { // Limit to 50 recent
      const app = await kv.get(`application:${appId}`);
      if (app) applications.push(app);
    }

    return c.json({ applications, count: applications.length });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return c.json({ error: "Failed to fetch applications" }, 500);
  }
});

// Get single application
app.get("/make-server-824f083c/applications/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const application = await kv.get(`application:${id}`);

    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }

    return c.json({ application });
  } catch (error) {
    console.error("Error fetching application:", error);
    return c.json({ error: "Failed to fetch application" }, 500);
  }
});

// ============================================================================
// DESIGN CENTER & MEDIA ENDPOINTS
// ============================================================================

// Create new design
app.post("/make-server-824f083c/designs/create", async (c) => {
  try {
    const body = await c.req.json();
    const designId = `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const designData = {
      id: designId,
      ...body,
      createdAt: new Date().toISOString(),
      folder: `designs/${designId}`
    };

    await kv.set(`design:${designId}`, designData);

    const existingDesigns = await kv.get('designs:list') || [];
    await kv.set('designs:list', [designId, ...existingDesigns]);

    return c.json({ success: true, designId, design: designData });
  } catch (error) {
    console.error("Error creating design:", error);
    return c.json({ error: "Failed to create design" }, 500);
  }
});

// Get all designs
app.get("/make-server-824f083c/designs/list", async (c) => {
  try {
    const designIds = await kv.get('designs:list') || [];
    const designs = [];

    for (const designId of designIds) {
      const design = await kv.get(`design:${designId}`);
      if (design) designs.push(design);
    }

    return c.json({ designs, count: designs.length });
  } catch (error) {
    console.error("Error fetching designs:", error);
    return c.json({ error: "Failed to fetch designs" }, 500);
  }
});

// Save social media post
app.post("/make-server-824f083c/media/save", async (c) => {
  try {
    const body = await c.req.json();
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const mediaData = {
      id: mediaId,
      ...body,
      createdAt: new Date().toISOString(),
      folder: `media/${mediaId}`
    };

    await kv.set(`media:${mediaId}`, mediaData);

    const existingMedia = await kv.get('media:list') || [];
    await kv.set('media:list', [mediaId, ...existingMedia]);

    return c.json({ success: true, mediaId, media: mediaData });
  } catch (error) {
    console.error("Error saving media:", error);
    return c.json({ error: "Failed to save media" }, 500);
  }
});

// Get all media
app.get("/make-server-824f083c/media/list", async (c) => {
  try {
    const mediaIds = await kv.get('media:list') || [];
    const mediaItems = [];

    for (const mediaId of mediaIds) {
      const media = await kv.get(`media:${mediaId}`);
      if (media) mediaItems.push(media);
    }

    return c.json({ media: mediaItems, count: mediaItems.length });
  } catch (error) {
    console.error("Error fetching media:", error);
    return c.json({ error: "Failed to fetch media" }, 500);
  }
});

// ============================================================================
// BRANDING ROUTES - Get user branding profiles for advertising widgets
// ============================================================================
app.get("/make-server-824f083c/branding/vendor", async (c) => {
  try {
    console.log("📊 GET /branding/vendor called");
    const vendors = await kv.getByPrefix("vendor:") || [];
    console.log(`Found ${vendors.length} vendors`);
    return c.json(vendors);
  } catch (error) {
    console.error("❌ Error fetching vendor branding:", error);
    return c.json({ error: "Failed to fetch vendor branding", details: error.message }, 500);
  }
});

app.get("/make-server-824f083c/branding/advertiser", async (c) => {
  try {
    console.log("📊 GET /branding/advertiser called");
    const advertisers = await kv.getByPrefix("advertiser:") || [];
    console.log(`Found ${advertisers.length} advertisers`);
    return c.json(advertisers);
  } catch (error) {
    console.error("❌ Error fetching advertiser branding:", error);
    return c.json({ error: "Failed to fetch advertiser branding", details: error.message }, 500);
  }
});

app.get("/make-server-824f083c/branding/subcontractor", async (c) => {
  try {
    console.log("📊 GET /branding/subcontractor called");
    const subcontractors = await kv.getByPrefix("subcontractor:") || [];
    console.log(`Found ${subcontractors.length} subcontractors`);
    return c.json(subcontractors);
  } catch (error) {
    console.error("❌ Error fetching subcontractor branding:", error);
    return c.json({ error: "Failed to fetch subcontractor branding", details: error.message }, 500);
  }
});

// ============================================================================
// PORTAL APPLICATIONS ROUTES
// ============================================================================
app.route('/make-server-824f083c/portal-applications', portalApplicationsRouter);

// ============================================================================
// PORTAL CONFIGURATION ROUTES
// ============================================================================
app.route('/make-server-824f083c/portal-config', portalConfigRouter);

// ============================================================================
// AUTH ROUTES
// ============================================================================
app.route('/make-server-824f083c/auth', authRouter);

// ============================================================================
// USERS ROUTES
// ============================================================================
app.route('/make-server-824f083c/users', usersRouter);

// ============================================================================
// SUBCONTRACTOR COMPANIES ROUTES
// ============================================================================
app.route('/make-server-824f083c/subcontractor-companies', subcontractorCompaniesRouter);

// ============================================================================
// VENDORS ROUTES
// ============================================================================
app.route('/make-server-824f083c/vendors', vendorsRouter);

// ============================================================================
// CUSTOMERS ROUTES
// ============================================================================
app.route('/make-server-824f083c/customers', customersRouter);

// ============================================================================
// BUSINESS CUSTOMERS ROUTES
// ============================================================================
app.route('/make-server-824f083c/business-customers', businessCustomersRouter);

// ============================================================================
// SUPPLIERS ROUTES
// ============================================================================
app.route('/make-server-824f083c/suppliers', suppliersRouter);

// ============================================================================
// PARTNERS ROUTES
// ============================================================================
app.route('/make-server-824f083c/partners', partnersRouter);

// ============================================================================
// CAD DESIGN SYSTEM ROUTES
// ============================================================================
app.route('/make-server-824f083c/cad', cadRouter);

// ============================================================================
// PAYMENT PROCESSING ROUTES
// ============================================================================
app.route('/make-server-824f083c/payments', paymentHandler);

// ============================================================================
// PROMOTIONS ROUTES
// ============================================================================
app.route('/make-server-824f083c/promotions', promotionsRouter);

// ============================================================================
// ROTATION CONTENT ROUTES
// ============================================================================
app.route('/', rotationRouter);

// ============================================================================
// TIME TRACKING ROUTES
// ============================================================================
app.route('/make-server-824f083c', timeTrackingRouter);

// ============================================================================
// PAYMENTS ROUTES
// ============================================================================
app.route('/make-server-824f083c/payments', paymentsTransactionsRouter);
app.route('/make-server-824f083c/payments', paymentsMethodsRouter);
app.route('/make-server-824f083c/payments', paymentsRefundsRouter);
app.route('/make-server-824f083c/payments', paymentsSchedulesRouter);
app.route('/make-server-824f083c/payments', paymentsAnalyticsRouter);
app.route('/make-server-824f083c/payments', paymentsReceiptsRouter);
app.route('/make-server-824f083c/payments', paymentsWebhooksRouter);
app.route('/make-server-824f083c/payments', paymentsBatchRouter);

// ============================================================================
// INVOICE ROUTES
// ============================================================================
const invoicesRouter = (await import("./invoices.ts")).default;
app.route('/make-server-824f083c/invoices', invoicesRouter);

// ============================================================================
// PAYMENT ROUTES
// ============================================================================
const paymentsRouter = (await import("./payments.ts")).default;
app.route('/make-server-824f083c/invoices/payments', paymentsRouter);

// ============================================================================
// PDF GENERATOR ROUTES
// ============================================================================
const pdfGeneratorRouter = (await import("./pdf-generator.ts")).default;
app.route('/make-server-824f083c/invoices/pdf', pdfGeneratorRouter);

// ============================================================================
// EMAIL SERVICE ROUTES
// ============================================================================
const emailServiceRouter = (await import("./email-service.ts")).default;
app.route('/make-server-824f083c/invoices/email', emailServiceRouter);

// ============================================================================
// BULK OPERATIONS ROUTES
// ============================================================================
const bulkOperationsRouter = (await import("./bulk-operations.ts")).default;
app.route('/make-server-824f083c/invoices/bulk', bulkOperationsRouter);

// ============================================================================
// RECURRING INVOICE PROCESSOR ROUTES
// ============================================================================
const recurringProcessorRouter = (await import("./recurring-processor.ts")).default;
app.route('/make-server-824f083c/invoices/recurring', recurringProcessorRouter);

// ============================================================================
// INVOICE TEMPLATES ROUTES
// ============================================================================
const invoiceTemplatesRouter = (await import("./invoice-templates.ts")).default;
app.route('/make-server-824f083c/invoices/templates', invoiceTemplatesRouter);

// ============================================================================
// TAX CONFIGURATION ROUTES
// ============================================================================
const taxConfigsRouter = (await import("./tax-configs.ts")).default;
app.route('/make-server-824f083c/invoices/tax-configs', taxConfigsRouter);

// ============================================================================
// SCHEDULING ROUTES
// ============================================================================
app.route('/make-server-824f083c/scheduling/appointments', schedulingAppointmentsRouter);
app.route('/make-server-824f083c/scheduling/availability', schedulingAvailabilityRouter);
app.route('/make-server-824f083c/scheduling/resources', schedulingResourcesRouter);
app.route('/make-server-824f083c/scheduling', schedulingAnalyticsRouter);
app.route('/make-server-824f083c/scheduling/notifications', schedulingNotificationsRouter);

// ============================================================================
// INVENTORY ROUTES
// ============================================================================
app.route('/make-server-824f083c/inventory', inventoryEquipmentRouter);
app.route('/make-server-824f083c/inventory', inventoryItemsRouter);
app.route('/make-server-824f083c/inventory', inventoryPurchaseOrdersRouter);
app.route('/make-server-824f083c/inventory', inventoryVendorsRouter);
app.route('/make-server-824f083c/inventory', inventoryAnalyticsRouter);

// ============================================================================
// COMPANY PROFILE ROUTES
// ============================================================================
// Get company profile
app.get('/make-server-824f083c/company-profile/:companyId', async (c) => {
  const companyId = c.req.param('companyId');
  const data = await kv.get(`company_profile_${companyId}`);
  return c.json(data || {});
});

// Save company profile
app.put('/make-server-824f083c/company-profile/:companyId', async (c) => {
  const companyId = c.req.param('companyId');
  const profileData = await c.req.json();
  await kv.set(`company_profile_${companyId}`, profileData);
  return c.json({ success: true });
});

// Get company documents
app.get('/make-server-824f083c/company-documents/:companyId', async (c) => {
  const companyId = c.req.param('companyId');
  const docs = await kv.get(`company_docs_${companyId}`);
  return c.json(docs || []);
});

// Save company documents
app.put('/make-server-824f083c/company-documents/:companyId', async (c) => {
  const companyId = c.req.param('companyId');
  const docs = await c.req.json();
  await kv.set(`company_docs_${companyId}`, docs);
  return c.json({ success: true });
});

// Get bank accounts
app.get('/make-server-824f083c/company-banks/:companyId', async (c) => {
  const companyId = c.req.param('companyId');
  const banks = await kv.get(`company_banks_${companyId}`);
  return c.json(banks || []);
});

// Save bank accounts
app.put('/make-server-824f083c/company-banks/:companyId', async (c) => {
  const companyId = c.req.param('companyId');
  const banks = await c.req.json();
  await kv.set(`company_banks_${companyId}`, banks);
  return c.json({ success: true });
});

// ============================================================================
// KV STORE ENDPOINTS
// ============================================================================

// Get a single value from KV store
app.get('/make-server-824f083c/kv/get', async (c) => {
  try {
    const key = c.req.query('key');
    
    if (!key) {
      return c.json({ error: 'Key parameter is required' }, 400);
    }
    
    console.log(`📦 GET /kv/get - key: ${key}`);
    const value = await kv.get(key);
    
    return c.json({ key, value });
  } catch (error) {
    console.error('❌ Error getting KV value:', error);
    return c.json({ error: 'Failed to get value', details: error.message }, 500);
  }
});

// Set a value in KV store
app.post('/make-server-824f083c/kv/set', async (c) => {
  try {
    const { key, value } = await c.req.json();
    
    if (!key) {
      return c.json({ error: 'Key is required' }, 400);
    }
    
    console.log(`📝 POST /kv/set - key: ${key}`);
    await kv.set(key, value);
    
    return c.json({ success: true, key });
  } catch (error) {
    console.error('❌ Error setting KV value:', error);
    return c.json({ error: 'Failed to set value', details: error.message }, 500);
  }
});

// Delete a value from KV store
app.delete('/make-server-824f083c/kv/delete', async (c) => {
  try {
    const key = c.req.query('key');
    
    if (!key) {
      return c.json({ error: 'Key parameter is required' }, 400);
    }
    
    console.log(`🗑️ DELETE /kv/delete - key: ${key}`);
    await kv.del(key);
    
    return c.json({ success: true, key });
  } catch (error) {
    console.error('❌ Error deleting KV value:', error);
    return c.json({ error: 'Failed to delete value', details: error.message }, 500);
  }
});

// Get multiple values by prefix
app.get('/make-server-824f083c/kv/prefix', async (c) => {
  try {
    const prefix = c.req.query('prefix');
    
    if (!prefix) {
      return c.json({ error: 'Prefix parameter is required' }, 400);
    }
    
    console.log(`📦 GET /kv/prefix - prefix: ${prefix}`);
    const values = await kv.getByPrefix(prefix);
    
    return c.json({ prefix, values, count: values.length });
  } catch (error) {
    console.error('❌ Error getting KV values by prefix:', error);
    return c.json({ error: 'Failed to get values', details: error.message }, 500);
  }
});

console.log("✅ Server configured, starting...");
Deno.serve(app.fetch);
