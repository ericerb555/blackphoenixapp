import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import serviceProviders from "./serviceProviders.tsx";
import aiBidRouter, { analyzeRequest, findMatchingProviders, calculateMatchScore, generateSummary, determineRecommendedAction } from "./aiBidRouter.tsx";
import providerBids from "./providerBids.tsx";
import { ordersRouter } from "./ecommerce-orders.tsx";
import { marketingAssetsRouter } from "./marketing-assets.tsx";
import { vendorProfileRouter } from "./vendor-profile.tsx";
import { notificationsRouter } from "./notifications.tsx";
import { cohortsRouter } from "./cohorts.tsx";
import { territoryCohortRouter } from "./territory-cohorts.tsx";
import { cohortSettingsRouter } from "./cohort-settings.tsx";
import { tenantsRouter } from "./tenants.tsx";
import { companyConfigRouter } from "./company-config.tsx";
import { blueprintRouter } from "./blueprint-export.tsx";
import aiRouter from "./ai-design.tsx";
import aiFloorPlanRouter from "./ai-floorplan.tsx";
import kitchenCabinetScheduleRouter from "./kitchen-cabinet-schedule.tsx";
import timeTrackingRouter from "./time-tracking.tsx";
import hourTransfersRouter from "./hour-transfers.tsx";
import paymentProcessingRouter from "./payment-processing.tsx";
import analytics from "./analytics-engine.tsx";
import seo from "./seo-automation.tsx";
import notifications from "./push-notifications.tsx";
import { apiGatewayRouter } from "./api-gateway.tsx";
import * as dropshipper from "./dropshipper.tsx";
import * as dropshipperConfig from "./dropshipper-config.tsx";
import * as dropshipperCatalog from "./dropshipper-catalog.tsx";
import * as productAdIntegration from "./product-ad-integration.tsx";
import materialsRouter from "./materials-api.tsx";
import authRouter from "./auth.tsx";
import emailSmsNotificationsRouter from "./email-sms-notifications.tsx";
import quoteRouter from "./quote-generator.tsx";
import planBuilderRouter from "./plan-builder.tsx";
import plansRouter from "./plans.tsx";
import techRosterRouter from "./tech-roster.tsx";
import quotesRouter from "./quotes.tsx";
import pipelineRouter from "./pipeline.tsx";
import companiesRouter from "./companies.tsx";
import brandsRouter from "./brands.tsx";
import mediaRouter from "./media-library.tsx";
import propertyManagementRouter from "./property-management.tsx";
import dataBackupRouter from "./data-backup.tsx";
import { zendropRouter } from "./zendrop.tsx";
import { imageUploadRouter } from "./image-upload.tsx";
import { stripeConnectRouter } from "./stripe-connect.tsx";
import { socialRouter } from "./social-media.tsx";

const app = new Hono();

// Override console.error to filter out AbortError messages from Supabase lock conflicts
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.join(' ');
  // Suppress AbortError messages related to Supabase lock conflicts
  if (errorMessage.includes('AbortError') || 
      errorMessage.includes('Lock broken') || 
      errorMessage.includes('steal')) {
    return; // Silently ignore these errors
  }
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

// Startup log
console.log("========================================");
console.log("🚀 Figma Make Server v4.5 STARTING...");
console.log("========================================");
console.log("📍 Project: plzsvzwwcdopnawtiwzm");
console.log("🔧 Function: server");
console.log("🌐 Route prefix: /make-server-57095a78");
console.log("⚡ DEPLOYMENT: FORCE REDEPLOY - DATA PERSISTENCE SYSTEM");
console.log("📦 Routers loaded:");
console.log("  - ecommerce orders router: ✓ ENABLED");
console.log("  - analytics engine: ✓");
console.log("  - seo automation: ✓");
console.log("  - push notifications: ✓");
console.log("  - api gateway (headless ecommerce): ✓");
console.log("  - dropshipper module: ✓");
console.log("  - product-ad-integration: ✓");
console.log("  - ai-floorplan (Phase 2 - Design Studio Pro): ✓");
console.log("  - vendorProfileRouter:", typeof vendorProfileRouter, vendorProfileRouter ? "✓" : "✗");
console.log("  - pipeline router: ✓ ENABLED");
console.log("  - companies router: ✓ ENABLED (KV Store)");
console.log("  - media library router: ✓ ENABLED");
console.log("  - data backup router: ✓ ENABLED");
console.log("========================================");

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Currency", "X-Language", "X-Base-URL"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Handle OPTIONS requests for all routes (CORS preflight)
app.options("/*", (c) => {
  console.log("✅ OPTIONS preflight handled for:", c.req.url);
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Currency, X-Language, X-Base-URL',
      'Access-Control-Max-Age': '600',
    },
  });
});

// Mount advanced backend modules
app.route("/", analytics);
app.route("/", seo);
app.route("/", notifications);
app.route("/", apiGatewayRouter);

// Mount authentication router
app.route("/", authRouter);

// Mount email and SMS notifications router
app.route("/", emailSmsNotificationsRouter);

// Mount quote generator router
app.route("/", quoteRouter);

// Mount pipeline router
app.route("/", pipelineRouter);

// Mount companies router
app.route("/", companiesRouter);

// Mount brands router
app.route("/", brandsRouter);

// Mount media library router
app.route("/", mediaRouter);

// Mount Zendrop router (verify, sync, status)
app.route("/", zendropRouter);

// Mount image upload router (moves base64 images to public Storage)
app.route("/", imageUploadRouter);

// Mount Stripe Connect router (two connected accounts, per-company routing)
app.route("/", stripeConnectRouter);

// Mount Social Media router (real Facebook/Instagram OAuth + publish)
app.route("/", socialRouter);

// Health check endpoint (main)
app.get("/make-server-57095a78/health", (c) => {
  console.log("✅ Health check successful - VERSION 4.5 with MEDIA LIBRARY");
  return c.json({ 
    status: "ok", 
    message: "Figma Make Server is running - HEALTHY", 
    timestamp: new Date().toISOString(),
    version: "4.8-SOCIAL-MEDIA",
    deployed: true,
    projectId: "plzsvzwwcdopnawtiwzm",
    functionName: "server",
    routersLoaded: {
      ecommerce: "inline",
      vendorProfile: !!vendorProfileRouter,
      bidRouter: "inline-at-line-95-MOVED",
      productAds: "inline-at-line-1007",
      zendrop: "✓ ENABLED",
      mediaLibrary: "✓ ENABLED",
      pipeline: "✓ ENABLED",
      companies: "✓ ENABLED",
      brands: "✓ ENABLED"
    }
  });
});

// Comprehensive Supabase diagnostics endpoint
app.get("/make-server-57095a78/diagnostics", async (c) => {
  console.log("🔍 Running comprehensive diagnostics...");
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    version: "4.5-MEDIA-LIBRARY-DEPLOYED",
    environment: {
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_ANON_KEY: !!Deno.env.get("SUPABASE_ANON_KEY"),
    },
    routes: {
      health: "✓ /make-server-57095a78/health",
      media_upload: "✓ /make-server-57095a78/media/upload",
      media_list: "✓ /make-server-57095a78/media",
      pipeline: "✓ /make-server-57095a78/pipeline/*",
      companies: "✓ /make-server-57095a78/companies",
    },
    storage: {
      bucket: "make-824f083c-media",
      status: "checking..."
    },
    cors: {
      enabled: true,
      allowOrigin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    }
  };
  
  // Test storage bucket access
  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      diagnostics.storage.status = `❌ Error: ${error.message}`;
    } else {
      const mediaBucket = buckets?.find(b => b.name === "make-824f083c-media");
      diagnostics.storage.status = mediaBucket 
        ? "✓ Bucket exists and accessible" 
        : "⚠️ Bucket not found (will be created on first upload)";
      diagnostics.storage.buckets = buckets?.map(b => b.name) || [];
    }
  } catch (error: any) {
    diagnostics.storage.status = `❌ Error: ${error.message}`;
  }
  
  return c.json(diagnostics);
});

// Root health check (alternative)
app.get("/health", (c) => {
  console.log("✅ Root health check successful - v4.0");
  return c.json({ 
    status: "ok", 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    version: "4.0",
    deployed: true
  });
});

// Absolute root endpoint for testing
app.get("/", (c) => {
  console.log("✅ Root endpoint hit!");
  return c.json({ 
    status: "ok", 
    message: "Figma Make Server v4.0 is running",
    endpoints: {
      health: ["/health", "/make-server-57095a78/health"],
      productAds: "/make-server-57095a78/product-ads/available-products"
    },
    timestamp: new Date().toISOString()
  });
});

// Cart API test endpoint
app.get("/make-server-57095a78/cart/test", (c) => {
  console.log("✅ Cart API test endpoint hit!");
  return c.json({ 
    status: "ok", 
    message: "Cart API is accessible",
    timestamp: new Date().toISOString(),
    corsEnabled: true
  });
});

// SIMPLE TEST - No dependencies
app.get("/make-server-57095a78/simple-test", (c) => {
  return c.text("Hello from simple test!");
});

// Seed Pipeline Data - Generate sample projects with contracts and payment schedules
app.post("/make-server-57095a78/seed-pipeline-data", async (c) => {
  console.log("🌱 Seed pipeline data endpoint called");
  
  try {
    const sampleProjects = [
      // QUOTE DRAFT STAGE
      {
        id: `PROJ-${Date.now()}-1`,
        itemNumber: `WR-2026-001`,
        stage: 'quote-draft',
        customerName: 'Emma Thompson',
        customerEmail: 'emma.t@example.com',
        customerPhone: '(555) 111-2222',
        location: '456 Maple Drive, Austin, TX',
        serviceType: 'Deck Construction',
        title: 'Outdoor Deck Installation',
        description: 'New 400 sq ft composite deck with built-in seating and pergola',
        estimatedValue: 18500,
        priority: 'medium',
        createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Tom Wilson',
        quote: {
          quoteNumber: 'Q-2026-001',
          status: 'draft',
          laborCost: 8500,
          materialCost: 9000,
          totalCost: 18500,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },
      {
        id: `PROJ-${Date.now()}-2`,
        itemNumber: `WR-2026-002`,
        stage: 'quote-draft',
        customerName: 'David Park',
        customerEmail: 'david.park@example.com',
        customerPhone: '(555) 222-3333',
        location: '789 Pine Street, Seattle, WA',
        serviceType: 'Roof Repair',
        title: 'Emergency Roof Leak Repair',
        description: 'Repair storm damage and replace damaged shingles on south side',
        estimatedValue: 5800,
        priority: 'high',
        createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Sarah Miller',
        quote: {
          quoteNumber: 'Q-2026-002',
          status: 'draft',
          laborCost: 3200,
          materialCost: 2400,
          totalCost: 5800,
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },

      // QUOTE SENT STAGE
      {
        id: `PROJ-${Date.now()}-3`,
        itemNumber: `WR-2026-003`,
        stage: 'quote-sent',
        customerName: 'Jennifer Lee',
        customerEmail: 'jennifer.lee@example.com',
        customerPhone: '(555) 333-4444',
        location: '321 Cedar Avenue, Denver, CO',
        serviceType: 'Basement Finishing',
        title: 'Basement Renovation & Finishing',
        description: 'Complete basement finish with family room, bedroom, bathroom, and wet bar',
        estimatedValue: 55000,
        priority: 'medium',
        createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Mike Chen',
        quote: {
          quoteNumber: 'Q-2026-003',
          status: 'sent',
          sentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 32000,
          materialCost: 21000,
          totalCost: 55000,
          validUntil: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },
      {
        id: `PROJ-${Date.now()}-4`,
        itemNumber: `WR-2026-004`,
        stage: 'quote-sent',
        customerName: 'Robert Martinez',
        customerEmail: 'robert.m@example.com',
        customerPhone: '(555) 444-5555',
        location: '654 Birch Lane, Phoenix, AZ',
        serviceType: 'HVAC Installation',
        title: 'Central AC System Replacement',
        description: 'Replace old HVAC system with new high-efficiency central air conditioning',
        estimatedValue: 12500,
        priority: 'high',
        createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Lisa Park',
        quote: {
          quoteNumber: 'Q-2026-004',
          status: 'sent',
          sentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 4500,
          materialCost: 7500,
          totalCost: 12500,
          validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },

      // QUOTE APPROVED STAGE
      {
        id: `PROJ-${Date.now()}-5`,
        itemNumber: `WR-2026-005`,
        stage: 'quote-approved',
        customerName: 'Amanda White',
        customerEmail: 'amanda.white@example.com',
        customerPhone: '(555) 555-6666',
        location: '987 Willow Court, Boston, MA',
        serviceType: 'Window Replacement',
        title: 'Energy-Efficient Window Installation',
        description: 'Replace 12 windows with double-pane energy-efficient windows',
        estimatedValue: 24000,
        priority: 'medium',
        createdDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Tom Wilson',
        quote: {
          quoteNumber: 'Q-2026-005',
          status: 'approved',
          sentDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          approvedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 9000,
          materialCost: 14500,
          totalCost: 24000,
          validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },

      // CONTRACT STAGE
      {
        id: `PROJ-${Date.now()}-6`,
        itemNumber: `WR-2026-006`,
        stage: 'contract',
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah.j@example.com',
        customerPhone: '(555) 123-4567',
        location: '742 Evergreen Terrace, Springfield',
        serviceType: 'Kitchen Remodel',
        title: 'Complete Kitchen Renovation',
        description: 'Full kitchen remodel including new cabinets, countertops, appliances, and flooring',
        estimatedValue: 45000,
        priority: 'high',
        createdDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Mike Chen',
        quote: {
          quoteNumber: 'Q-2026-006',
          status: 'approved',
          sentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          approvedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 22000,
          materialCost: 22000,
          totalCost: 45000,
        },
        contract: {
          id: `CT-${Date.now()}-1`,
          contractNumber: `CT-2026-001`,
          contractType: 'standard',
          signedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'Sarah Johnson',
          customerSignature: 'Sarah Johnson',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Standard construction contract terms and conditions...',
          status: 'signed',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Initial Deposit (30%)',
              percentage: 30,
              amount: 13500,
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'progress',
              description: 'Progress Payment (40%)',
              percentage: 40,
              amount: 18000,
              milestone: '50% project completion',
              status: 'pending'
            },
            {
              id: 'PS-3',
              type: 'completion',
              description: 'Final Payment (30%)',
              percentage: 30,
              amount: 13500,
              milestone: 'Project completion and approval',
              status: 'pending'
            }
          ]
        }
      },
      {
        id: `PROJ-${Date.now()}-7`,
        itemNumber: `WR-2026-007`,
        stage: 'contract',
        customerName: 'Michael Rodriguez',
        customerEmail: 'michael.r@example.com',
        customerPhone: '(555) 234-5678',
        location: '123 Oak Street, Portland, OR',
        serviceType: 'Bathroom Remodel',
        title: 'Master Bathroom Upgrade',
        description: 'Complete master bathroom renovation with walk-in shower, dual vanity, and heated floors',
        estimatedValue: 68000,
        priority: 'high',
        createdDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Lisa Park',
        quote: {
          quoteNumber: 'Q-2026-007',
          status: 'approved',
          sentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          approvedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 35000,
          materialCost: 32000,
          totalCost: 68000,
        },
        contract: {
          id: `CT-${Date.now()}-2`,
          contractNumber: `CT-2026-002`,
          contractType: 'soroban-smart-contract',
          signedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'Michael Rodriguez',
          customerSignature: 'Michael Rodriguez',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Soroban Smart Contract terms and conditions...',
          status: 'active',
          sorobanContractId: 'CDQWERTYUIOPASDFGHJKLZXCVBNM1234567890QWERTYUI',
          sorobanTransactionHash: '9876543210abcdefghijklmnopqrstuvwxyz0123456789',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Smart Contract Deposit (25%)',
              percentage: 25,
              amount: 17000,
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'milestone',
              description: 'Milestone 1 - Demolition Complete (15%)',
              percentage: 15,
              amount: 10200,
              milestone: 'Demolition and site prep verified',
              status: 'paid'
            },
            {
              id: 'PS-3',
              type: 'milestone',
              description: 'Milestone 2 - Rough-In Complete (20%)',
              percentage: 20,
              amount: 13600,
              milestone: 'Electrical and plumbing rough-in inspected',
              status: 'pending'
            },
            {
              id: 'PS-4',
              type: 'milestone',
              description: 'Milestone 3 - Installation Complete (20%)',
              percentage: 20,
              amount: 13600,
              milestone: 'Cabinets, counters, fixtures installed',
              status: 'pending'
            },
            {
              id: 'PS-5',
              type: 'completion',
              description: 'Final Payment (20%)',
              percentage: 20,
              amount: 13600,
              milestone: 'Final inspection passed and customer approval',
              status: 'pending'
            }
          ]
        }
      },

      // INVOICE STAGE
      {
        id: `PROJ-${Date.now()}-8`,
        itemNumber: `WR-2026-008`,
        stage: 'invoice',
        customerName: 'Patricia Davis',
        customerEmail: 'patricia.d@example.com',
        customerPhone: '(555) 777-8888',
        location: '159 Spruce Road, Nashville, TN',
        serviceType: 'Fence Installation',
        title: 'Privacy Fence Installation',
        description: 'Install 200ft cedar privacy fence with two gates',
        estimatedValue: 8500,
        priority: 'medium',
        createdDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Tom Wilson',
        quote: {
          quoteNumber: 'Q-2026-008',
          status: 'approved',
          sentDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          approvedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 4000,
          materialCost: 4300,
          totalCost: 8500,
        },
        contract: {
          id: `CT-${Date.now()}-3`,
          contractNumber: `CT-2026-003`,
          contractType: 'standard',
          signedDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'Patricia Davis',
          customerSignature: 'Patricia Davis',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Standard construction contract terms and conditions...',
          status: 'completed',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Initial Deposit (50%)',
              percentage: 50,
              amount: 4250,
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'completion',
              description: 'Final Payment (50%)',
              percentage: 50,
              amount: 4250,
              milestone: 'Project completion',
              status: 'invoiced'
            }
          ]
        },
        invoice: {
          invoiceNumber: 'INV-2026-001',
          invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalAmount: 8500,
          amountPaid: 4250,
          amountDue: 4250,
          status: 'sent'
        }
      },
      {
        id: `PROJ-${Date.now()}-9`,
        itemNumber: `WR-2026-009`,
        stage: 'invoice',
        customerName: 'James Cooper',
        customerEmail: 'james.cooper@example.com',
        customerPhone: '(555) 888-9999',
        location: '753 Elm Street, Chicago, IL',
        serviceType: 'Flooring Installation',
        title: 'Hardwood Floor Installation',
        description: 'Install oak hardwood flooring throughout main level (1,200 sq ft)',
        estimatedValue: 15000,
        priority: 'low',
        createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Sarah Miller',
        quote: {
          quoteNumber: 'Q-2026-009',
          status: 'approved',
          sentDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
          approvedDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
          laborCost: 6000,
          materialCost: 8800,
          totalCost: 15000,
        },
        contract: {
          id: `CT-${Date.now()}-4`,
          contractNumber: `CT-2026-004`,
          contractType: 'standard',
          signedDate: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'James Cooper',
          customerSignature: 'James Cooper',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Standard construction contract terms and conditions...',
          status: 'completed',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Initial Deposit (40%)',
              percentage: 40,
              amount: 6000,
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'completion',
              description: 'Final Payment (60%)',
              percentage: 60,
              amount: 9000,
              milestone: 'Installation complete and approved',
              status: 'invoiced'
            }
          ]
        },
        invoice: {
          invoiceNumber: 'INV-2026-002',
          invoiceDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalAmount: 15000,
          amountPaid: 6000,
          amountDue: 9000,
          status: 'sent'
        }
      }
    ];

    // Save projects to KV store
    let savedCount = 0;
    for (const project of sampleProjects) {
      const key = `pipeline_${project.id}`;
      await kv.set(key, project);
      savedCount++;
      console.log(`✅ Saved project: ${project.itemNumber}`);
    }

    console.log(`✅ Seeded ${savedCount} sample projects with payment schedules`);
    
    return c.json({
      success: true,
      count: savedCount,
      message: `Successfully seeded ${savedCount} sample projects with payment schedules`
    });
  } catch (error: any) {
    console.error("❌ Error seeding pipeline data:", error);
    return c.json({
      success: false,
      error: error.message,
      count: 0
    }, 500);
  }
});

// ============================================================================
// PIPELINE MANAGEMENT API - INLINE (for reliable CORS)
// ============================================================================

console.log("📋 ========================================");
console.log("📋 REGISTERING PIPELINE ENDPOINTS INLINE");
console.log("📋 Location: /make-server-57095a78/pipeline/*");
console.log("📋 ========================================");

// POST Create pipeline item
app.post("/make-server-57095a78/pipeline/items", async (c) => {
  console.log("📋 POST /pipeline/items called");
  try {
    const body = await c.req.json();
    console.log("[Pipeline] Creating new item:", body.itemNumber || body.id);
    
    const item = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`pipeline_${item.id}`, item);
    console.log("✅ Pipeline item created:", item.id);
    
    return c.json({ 
      success: true,
      item 
    });
  } catch (error) {
    console.error("❌ Error creating pipeline item:", error);
    return c.json({ 
      success: false,
      error: "Failed to create pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// GET all pipeline items
app.get("/make-server-57095a78/pipeline/items", async (c) => {
  console.log("📋 GET /pipeline/items called");
  try {
    const items = await kv.getByPrefix("pipeline_");
    console.log(`[Pipeline] Found ${items?.length || 0} pipeline items`);
    
    return c.json({ 
      success: true,
      items: items || [],
      count: items?.length || 0
    });
  } catch (error) {
    console.error("❌ Error fetching pipeline items:", error);
    return c.json({ 
      success: false,
      error: "Failed to fetch pipeline items", 
      details: String(error) 
    }, 500);
  }
});

// PUT Update pipeline item
app.put("/make-server-57095a78/pipeline/items/:id", async (c) => {
  console.log("📋 PUT /pipeline/items/:id called");
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    console.log(`[Pipeline] Updating item: ${id}`);
    
    const existing = await kv.get(`pipeline_${id}`);
    
    if (!existing) {
      return c.json({ 
        success: false,
        error: "Pipeline item not found" 
      }, 404);
    }
    
    const updated = {
      ...existing,
      ...body,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`pipeline_${id}`, updated);
    console.log("✅ Pipeline item updated:", id);
    
    return c.json({ 
      success: true,
      item: updated 
    });
  } catch (error) {
    console.error("❌ Error updating pipeline item:", error);
    return c.json({ 
      success: false,
      error: "Failed to update pipeline item", 
      details: String(error) 
    }, 500);
  }
});

// Pipeline health check
app.get("/make-server-57095a78/pipeline/health", (c) => {
  console.log("✅ Pipeline health check");
  return c.json({ 
    success: true,
    status: "healthy",
    service: "pipeline-api-inline",
    timestamp: new Date().toISOString()
  });
});

console.log("✅ Pipeline endpoints registered inline");

// ============================================================================
// AI BID ROUTING ENGINE - INLINE ENDPOINTS (MOVED TO TOP)
// ============================================================================

console.log("📍 ========================================");
console.log("📍 REGISTERING AI BID ROUTER INLINE ENDPOINTS");
console.log("📍 Location: /make-server-57095a78/bid-router/*");
console.log("📍 ========================================");

// Simple GET test endpoint
app.get("/make-server-57095a78/bid-router/test", (c) => {
  console.log("✅ Bid Router Test endpoint hit!");
  return c.json({ 
    success: true, 
    message: "AI Bid Router GET endpoint is working!",
    timestamp: new Date().toISOString()
  });
});

// Simple POST test endpoint
app.post("/make-server-57095a78/bid-router/simple-test", async (c) => {
  console.log("✅ Bid Router Simple POST test endpoint hit!");
  try {
    const body = await c.req.json();
    return c.json({ 
      success: true, 
      message: "Bid Router POST endpoint working!",
      received: body
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

console.log("✅ Bid router test endpoints registered successfully at top of file");

// ============================================================================
// ECOMMERCE PRODUCTS API - INLINE (bypassing router imports)
// ============================================================================

// GET all products
app.get("/make-server-57095a78/products", async (c) => {
  console.log("🛍️ GET /products called");
  try {
    const url = new URL(c.req.url);
    const isActive = url.searchParams.get('isActive');
    const vendorId = url.searchParams.get('vendorId');
    const category = url.searchParams.get('category');
    
    console.log("Query params:", { isActive, vendorId, category });
    
    // Get all products from KV store
    let allProducts = await kv.getByPrefix('product_');
    console.log(`Found ${allProducts.length} total products in KV`);
    
    // Apply filters
    let products = allProducts;
    
    if (isActive === 'true') {
      products = products.filter((p: any) => p.isActive === true);
    }
    
    if (vendorId) {
      products = products.filter((p: any) => p.vendorId === vendorId);
    }
    
    if (category) {
      products = products.filter((p: any) => p.category === category);
    }
    
    console.log(`Returning ${products.length} filtered products`);
    
    return c.json({
      success: true,
      products,
      total: products.length,
      page: 1,
      limit: products.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: 'Failed to fetch products', details: String(error) }, 500);
  }
});

// Note: vendor-directory route is handled by vendorProfileRouter mounted below

// POST seed test data
app.post("/make-server-57095a78/seed-ecommerce-data", async (c) => {
  console.log("🌱 POST /seed-ecommerce-data called");
  try {
    // Create test vendor
    const testVendor = {
      id: 'vendor_test_hardware',
      vendorId: 'vendor_test_hardware',
      businessName: 'Test Hardware & Supply Co.',
      companyName: 'Test Hardware & Supply Co.',
      description: 'Premium construction materials, tools, and equipment for contractors and DIY enthusiasts',
      businessDescription: 'Premium construction materials, tools, and equipment for contractors and DIY enthusiasts',
      logoUrl: 'https://images.unsplash.com/photo-1504253163759-c23fccaebb55?w=200&h=200&fit=crop',
      companyLogo: 'https://images.unsplash.com/photo-1504253163759-c23fccaebb55?w=200&h=200&fit=crop',
      category: 'Hardware & Tools',
      businessCategory: 'Hardware & Tools',
      profileStatus: 'active',
      rating: 4.7,
      totalReviews: 156,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set('vendor_portal_vendor_test_hardware', testVendor);
    await kv.set('vendor_vendor_test_hardware', testVendor);
    console.log("✓ Created test vendor");
    
    // Create test products
    const testProducts = [
      {
        id: 'product_drill_001',
        vendorId: 'vendor_test_hardware',
        vendorName: 'Test Hardware & Supply Co.',
        name: 'Professional 20V Cordless Drill Kit',
        description: 'Heavy-duty cordless drill with 2 batteries, charger, and carrying case. Perfect for professionals.',
        category: 'Power Tools',
        price: 149.99,
        inventoryQuantity: 45,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600',
        isActive: true,
        isFeatured: true,
        slug: 'professional-20v-cordless-drill-kit',
        viewCount: 234,
        orderCount: 67,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['power tools', 'cordless', 'drill', 'professional'],
        sku: 'DRL-20V-PRO',
        weight: '4.2 lbs',
      },
      {
        id: 'product_saw_002',
        vendorId: 'vendor_test_hardware',
        vendorName: 'Test Hardware & Supply Co.',
        name: '10" Professional Circular Saw',
        description: 'Powerful 15-amp circular saw for cutting lumber, plywood, and more. Includes laser guide.',
        category: 'Power Tools',
        price: 109.99,
        inventoryQuantity: 32,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600',
        isActive: true,
        isFeatured: true,
        slug: '10-inch-professional-circular-saw',
        viewCount: 189,
        orderCount: 43,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['saw', 'cutting', 'power tools', 'circular saw'],
        sku: 'SAW-10-PRO',
        weight: '8.5 lbs',
      },
      {
        id: 'product_helmet_003',
        vendorId: 'vendor_test_hardware',
        vendorName: 'Test Hardware & Supply Co.',
        name: 'OSHA-Approved Safety Hard Hat',
        description: 'Type 1 Class E hard hat with adjustable suspension. Meets ANSI Z89.1 standards.',
        category: 'Safety Equipment',
        price: 29.99,
        inventoryQuantity: 150,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1583225214464-9296029427aa?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1583225214464-9296029427aa?w=600',
        isActive: true,
        isFeatured: false,
        slug: 'osha-approved-safety-hard-hat',
        viewCount: 445,
        orderCount: 234,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['safety', 'ppe', 'hard hat', 'construction'],
        sku: 'SAFE-HAT-001',
        weight: '0.8 lbs',
      },
      {
        id: 'product_gloves_004',
        vendorId: 'vendor_test_hardware',
        vendorName: 'Test Hardware & Supply Co.',
        name: 'Heavy-Duty Work Gloves (12-Pack)',
        description: 'Durable leather palm work gloves with reinforced fingertips. One dozen pairs.',
        category: 'Safety Equipment',
        price: 39.99,
        inventoryQuantity: 88,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1581992652564-02d275cf5824?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1581992652564-02d275cf5824?w=600',
        isActive: true,
        isFeatured: false,
        slug: 'heavy-duty-work-gloves-12-pack',
        viewCount: 312,
        orderCount: 145,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['safety', 'gloves', 'ppe', 'work wear'],
        sku: 'SAFE-GLV-12PK',
        weight: '2.1 lbs',
      },
      {
        id: 'product_tape_005',
        vendorId: 'vendor_test_hardware',
        vendorName: 'Test Hardware & Supply Co.',
        name: '25ft Professional Tape Measure',
        description: 'Heavy-duty tape measure with magnetic tip and belt clip. Easy-read blade.',
        category: 'Hand Tools',
        price: 19.99,
        inventoryQuantity: 200,
        trackInventory: true,
        images: ['https://images.unsplash.com/photo-1598987845401-46dd82ea2912?w=600'],
        primaryImage: 'https://images.unsplash.com/photo-1598987845401-46dd82ea2912?w=600',
        isActive: true,
        isFeatured: false,
        slug: '25ft-professional-tape-measure',
        viewCount: 267,
        orderCount: 198,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['measuring', 'hand tools', 'tape measure'],
        sku: 'TOOL-TAPE-25',
        weight: '0.5 lbs',
      },
    ];
    
    for (const product of testProducts) {
      await kv.set(`product_${product.id}`, product);
    }
    console.log(`✓ Created ${testProducts.length} test products`);
    
    return c.json({
      success: true,
      message: 'Test eCommerce data seeded successfully',
      created: {
        vendors: 1,
        products: testProducts.length,
      },
    });
  } catch (error) {
    console.error("Error seeding data:", error);
    return c.json({ error: 'Failed to seed data', details: String(error) }, 500);
  }
});

// TEST ENDPOINT - Direct products test
app.get("/make-server-57095a78/products-test", async (c) => {
  console.log("🧪 Test products endpoint called");
  return c.json({ 
    status: "ok", 
    message: "Test endpoint working",
    note: "This endpoint confirms the server is receiving requests at /make-server-57095a78/"
  });
});

// ============================================================================
// ECOMMERCE CART API - INLINE
// ============================================================================

// Helper functions for cart
const generateCartId = () => `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateCartItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const calculateCartTotals = (items: any[]) => {
  return items.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);
};

// POST /make-server-57095a78/cart/add - Add item to cart
app.post("/make-server-57095a78/cart/add", async (c) => {
  console.log("🛒 POST /cart/add called");
  console.log("Request headers:", c.req.header());
  try {
    const { sessionId, productId, quantity } = await c.req.json();
    console.log("Cart add request:", { sessionId, productId, quantity });

    if (!sessionId || !productId || !quantity || quantity < 1) {
      return c.json({ error: 'Missing required fields: sessionId, productId, quantity' }, 400);
    }

    // Get product details
    const product = await kv.get(`product_${productId}`);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    if (!product.isActive) {
      return c.json({ error: 'Product is not available' }, 400);
    }

    // Check inventory
    if (product.trackInventory && product.inventoryQuantity < quantity) {
      return c.json({ 
        error: 'Insufficient inventory', 
        available: product.inventoryQuantity 
      }, 400);
    }

    // Get or create cart
    const cartKey = `cart_${sessionId}`;
    let cart = await kv.get(cartKey);

    if (!cart) {
      cart = {
        id: generateCartId(),
        customerId: sessionId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex((item: any) => item.productId === productId);

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check inventory for new quantity
      if (product.trackInventory && product.inventoryQuantity < newQuantity) {
        return c.json({ 
          error: 'Insufficient inventory for requested quantity', 
          available: product.inventoryQuantity 
        }, 400);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      const cartItem = {
        id: generateCartItemId(),
        productId: product.id,
        productName: product.name,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        price: product.price,
        quantity,
        productImage: product.primaryImage || product.images[0] || '',
      };
      cart.items.push(cartItem);
    }

    // Recalculate totals
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    // Save cart
    await kv.set(cartKey, cart);

    console.log("✅ Item added to cart successfully");
    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return c.json({ error: 'Failed to add to cart', details: String(error) }, 500);
  }
});

// GET /make-server-57095a78/cart/:sessionId - Get cart
app.get("/make-server-57095a78/cart/:sessionId", async (c) => {
  console.log("🛒 GET /cart/:sessionId called");
  try {
    const sessionId = c.req.param('sessionId');
    console.log("Fetching cart for session:", sessionId);
    const cartKey = `cart_${sessionId}`;
    let cart = await kv.get(cartKey);

    if (!cart) {
      // Create new empty cart
      cart = {
        id: generateCartId(),
        customerId: sessionId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(cartKey, cart);
    }

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return c.json({ error: 'Failed to fetch cart', details: String(error) }, 500);
  }
});

// PUT /make-server-57095a78/cart/update - Update cart item quantity
app.put("/make-server-57095a78/cart/update", async (c) => {
  console.log("🛒 PUT /cart/update called");
  try {
    const { sessionId, itemId, quantity } = await c.req.json();

    if (!sessionId || !itemId || !quantity || quantity < 1) {
      return c.json({ error: 'Missing required fields: sessionId, itemId, quantity' }, 400);
    }

    const cartKey = `cart_${sessionId}`;
    const cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    const itemIndex = cart.items.findIndex((item: any) => item.id === itemId);
    if (itemIndex === -1) {
      return c.json({ error: 'Item not found in cart' }, 404);
    }

    // Get product to check inventory
    const product = await kv.get(`product_${cart.items[itemIndex].productId}`);
    if (product && product.trackInventory && product.inventoryQuantity < quantity) {
      return c.json({ 
        error: 'Insufficient inventory', 
        available: product.inventoryQuantity 
      }, 400);
    }

    cart.items[itemIndex].quantity = quantity;
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    return c.json({ error: 'Failed to update cart', details: String(error) }, 500);
  }
});

// DELETE /make-server-57095a78/cart/remove - Remove item from cart
app.delete("/make-server-57095a78/cart/remove", async (c) => {
  console.log("🛒 DELETE /cart/remove called");
  try {
    const { sessionId, itemId } = await c.req.json();

    if (!sessionId || !itemId) {
      return c.json({ error: 'Missing required fields: sessionId, itemId' }, 400);
    }

    const cartKey = `cart_${sessionId}`;
    const cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    cart.items = cart.items.filter((item: any) => item.id !== itemId);
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error removing item:', error);
    return c.json({ error: 'Failed to remove item', details: String(error) }, 500);
  }
});

// DELETE /make-server-57095a78/cart/clear - Clear entire cart
app.delete("/make-server-57095a78/cart/clear", async (c) => {
  console.log("🛒 DELETE /cart/clear called");
  try {
    const { sessionId } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: 'Missing required field: sessionId' }, 400);
    }

    const cartKey = `cart_${sessionId}`;
    const cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    cart.items = [];
    cart.subtotal = 0;
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return c.json({ error: 'Failed to clear cart', details: String(error) }, 500);
  }
});

// ============================================================================
// DROPSHIPPER INTEGRATION API - MODULAR PLUGIN
// ============================================================================

// Dropshipper Configuration

// GET dropshipper config
app.get("/make-server-57095a78/dropshipper/config", async (c) => {
  try {
    const config = await dropshipperConfig.getConfig();
    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching dropshipper config:', error);
    return c.json({ error: 'Failed to fetch config', details: String(error) }, 500);
  }
});

// POST initialize dropshipper with default config
app.post("/make-server-57095a78/dropshipper/initialize", async (c) => {
  try {
    console.log('[Dropshipper] Initializing with default config...');
    
    // Set as disabled by default
    await dropshipperConfig.setEnabled(false);
    
    // Initialize with empty providers list
    await kv.set('dropshipper_config:providers', JSON.stringify([]));
    
    const config = await dropshipperConfig.getConfig();
    console.log('[Dropshipper] Initialized successfully');
    
    return c.json({ 
      success: true, 
      config,
      message: 'Dropshipper initialized with default config'
    });
  } catch (error) {
    console.error('Error initializing dropshipper:', error);
    return c.json({ error: 'Failed to initialize', details: String(error) }, 500);
  }
});

// POST enable/disable dropshipper module
app.post("/make-server-57095a78/dropshipper/toggle", async (c) => {
  try {
    const { enabled } = await c.req.json();
    await dropshipperConfig.setEnabled(enabled);
    console.log(`[Dropshipper] Module ${enabled ? 'enabled' : 'disabled'}`);
    return c.json({ success: true, enabled });
  } catch (error) {
    console.error('Error toggling dropshipper:', error);
    return c.json({ error: 'Failed to toggle module', details: String(error) }, 500);
  }
});

// POST add/update provider
app.post("/make-server-57095a78/dropshipper/providers", async (c) => {
  try {
    const provider = await c.req.json();
    await dropshipperConfig.saveProvider(provider);
    console.log(`[Dropshipper] Provider saved: ${provider.name}`);
    return c.json({ success: true, provider });
  } catch (error) {
    console.error('Error saving provider:', error);
    return c.json({ error: 'Failed to save provider', details: String(error) }, 500);
  }
});

// DELETE provider
app.delete("/make-server-57095a78/dropshipper/providers/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await dropshipperConfig.removeProvider(id);
    console.log(`[Dropshipper] Provider removed: ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error removing provider:', error);
    return c.json({ error: 'Failed to remove provider', details: String(error) }, 500);
  }
});

// Inventory Sync

// POST manual inventory sync
app.post("/make-server-57095a78/dropshipper/sync-inventory", async (c) => {
  try {
    console.log('[Dropshipper] Manual inventory sync triggered');
    const result = await dropshipper.syncInventory();
    return c.json({ success: result.success, ...result });
  } catch (error) {
    console.error('Error syncing inventory:', error);
    return c.json({ error: 'Failed to sync inventory', details: String(error) }, 500);
  }
});

// GET all dropshipper inventory
app.get("/make-server-57095a78/dropshipper/inventory", async (c) => {
  try {
    const inventory = await dropshipper.getAllInventory();
    return c.json({ success: true, inventory, total: inventory.length });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return c.json({ error: 'Failed to fetch inventory', details: String(error) }, 500);
  }
});

// GET inventory item by SKU
app.get("/make-server-57095a78/dropshipper/inventory/:sku", async (c) => {
  try {
    const sku = c.req.param('sku');
    const item = await dropshipper.getInventoryItem(sku);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }
    return c.json({ success: true, item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return c.json({ error: 'Failed to fetch item', details: String(error) }, 500);
  }
});

// POST check stock availability
app.post("/make-server-57095a78/dropshipper/check-stock", async (c) => {
  try {
    const { sku, quantity } = await c.req.json();
    const available = await dropshipper.checkStock(sku, quantity);
    return c.json({ success: true, available, sku, quantity });
  } catch (error) {
    console.error('Error checking stock:', error);
    return c.json({ error: 'Failed to check stock', details: String(error) }, 500);
  }
});

// Order Forwarding

// POST forward order to dropshipper (automatically called on checkout)
app.post("/make-server-57095a78/dropshipper/forward-order", async (c) => {
  try {
    const order = await c.req.json();
    console.log(`[Dropshipper] Forwarding order: ${order.orderId}`);
    const result = await dropshipper.forwardOrder(order);
    return c.json(result);
  } catch (error) {
    console.error('Error forwarding order:', error);
    return c.json({ error: 'Failed to forward order', details: String(error) }, 500);
  }
});

// GET dropshipper order status
app.get("/make-server-57095a78/dropshipper/orders/:orderId", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const order = await dropshipper.getOrder(orderId);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return c.json({ error: 'Failed to fetch order', details: String(error) }, 500);
  }
});

// GET all dropshipper orders
app.get("/make-server-57095a78/dropshipper/orders", async (c) => {
  try {
    const orders = await dropshipper.getAllOrders();
    return c.json({ success: true, orders, total: orders.length });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return c.json({ error: 'Failed to fetch orders', details: String(error) }, 500);
  }
});

// Tracking

// GET tracking info for order
app.get("/make-server-57095a78/dropshipper/tracking/:orderId", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const tracking = await dropshipper.getTracking(orderId);
    if (!tracking) {
      return c.json({ error: 'Tracking not available' }, 404);
    }
    return c.json({ success: true, tracking });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    return c.json({ error: 'Failed to fetch tracking', details: String(error) }, 500);
  }
});

// POST sync all tracking
app.post("/make-server-57095a78/dropshipper/sync-tracking", async (c) => {
  try {
    console.log('[Dropshipper] Manual tracking sync triggered');
    const result = await dropshipper.syncAllTracking();
    return c.json({ success: result.success, ...result });
  } catch (error) {
    console.error('Error syncing tracking:', error);
    return c.json({ error: 'Failed to sync tracking', details: String(error) }, 500);
  }
});

// Webhooks

// POST webhook receiver (called by dropshipper providers)
app.post("/make-server-57095a78/dropshipper/webhook/:providerId", async (c) => {
  try {
    const providerId = c.req.param('providerId');
    const webhookData = await c.req.json();
    console.log(`[Dropshipper] Webhook received from provider: ${providerId}`);
    const result = await dropshipper.handleWebhook(providerId, webhookData);
    return c.json(result);
  } catch (error) {
    console.error('Error handling webhook:', error);
    return c.json({ error: 'Failed to handle webhook', details: String(error) }, 500);
  }
});

// Error Logs

// GET error logs
app.get("/make-server-57095a78/dropshipper/errors", async (c) => {
  try {
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const errors = await dropshipper.getErrors(limit);
    return c.json({ success: true, errors, total: errors.length });
  } catch (error) {
    console.error('Error fetching errors:', error);
    return c.json({ error: 'Failed to fetch errors', details: String(error) }, 500);
  }
});

// ============================================================================
// DROPSHIPPER CATALOG IMPORT API - Product Staging & Selection
// ============================================================================

// POST import catalog from provider
app.post("/make-server-57095a78/dropshipper/catalog/import/:providerId", async (c) => {
  try {
    const providerId = c.req.param('providerId');
    console.log(`[Catalog Import] Importing catalog from provider: ${providerId}`);
    const result = await dropshipperCatalog.importCatalogFromProvider(providerId);
    return c.json({ success: result.success, ...result });
  } catch (error) {
    console.error('Error importing catalog:', error);
    return c.json({ error: 'Failed to import catalog', details: String(error) }, 500);
  }
});

// GET all staged products
app.get("/make-server-57095a78/dropshipper/catalog/staged", async (c) => {
  try {
    const url = new URL(c.req.url);
    const filters = {
      providerId: url.searchParams.get('providerId') || undefined,
      category: url.searchParams.get('category') || undefined,
      importedToLive: url.searchParams.get('importedToLive') === 'true' ? true : 
                       url.searchParams.get('importedToLive') === 'false' ? false : undefined,
      search: url.searchParams.get('search') || undefined,
    };

    const products = await dropshipperCatalog.getAllStagedProducts(filters);
    return c.json({ success: true, products, total: products.length });
  } catch (error) {
    console.error('Error fetching staged products:', error);
    return c.json({ error: 'Failed to fetch products', details: String(error) }, 500);
  }
});

// GET single staged product
app.get("/make-server-57095a78/dropshipper/catalog/staged/:stagingId", async (c) => {
  try {
    const stagingId = c.req.param('stagingId');
    const product = await dropshipperCatalog.getStagedProduct(stagingId);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching staged product:', error);
    return c.json({ error: 'Failed to fetch product', details: String(error) }, 500);
  }
});

// GET staged categories
app.get("/make-server-57095a78/dropshipper/catalog/categories", async (c) => {
  try {
    const categories = await dropshipperCatalog.getStagedCategories();
    return c.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories', details: String(error) }, 500);
  }
});

// GET staging stats
app.get("/make-server-57095a78/dropshipper/catalog/stats", async (c) => {
  try {
    const stats = await dropshipperCatalog.getStagingStats();
    return c.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats', details: String(error) }, 500);
  }
});

// POST import selected products to live catalog
app.post("/make-server-57095a78/dropshipper/catalog/import-to-live", async (c) => {
  try {
    const { stagingIds } = await c.req.json();
    
    if (!stagingIds || !Array.isArray(stagingIds)) {
      return c.json({ error: 'stagingIds array required' }, 400);
    }

    console.log(`[Catalog] Importing ${stagingIds.length} products to live catalog`);
    const result = await dropshipperCatalog.importProductsToLive(stagingIds);
    
    return c.json({ success: result.success, ...result });
  } catch (error) {
    console.error('Error importing to live:', error);
    return c.json({ error: 'Failed to import products', details: String(error) }, 500);
  }
});

// PUT update live product from staged
app.put("/make-server-57095a78/dropshipper/catalog/update-live/:stagingId", async (c) => {
  try {
    const stagingId = c.req.param('stagingId');
    const result = await dropshipperCatalog.updateLiveProductFromStaged(stagingId);
    return c.json(result);
  } catch (error) {
    console.error('Error updating live product:', error);
    return c.json({ error: 'Failed to update product', details: String(error) }, 500);
  }
});

// DELETE remove staged product
app.delete("/make-server-57095a78/dropshipper/catalog/staged/:stagingId", async (c) => {
  try {
    const stagingId = c.req.param('stagingId');
    await dropshipperCatalog.removeStagedProduct(stagingId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error removing staged product:', error);
    return c.json({ error: 'Failed to remove product', details: String(error) }, 500);
  }
});

// DELETE clear all staged products
app.delete("/make-server-57095a78/dropshipper/catalog/clear", async (c) => {
  try {
    const url = new URL(c.req.url);
    const providerId = url.searchParams.get('providerId') || undefined;
    
    const count = await dropshipperCatalog.clearStagedProducts(providerId);
    return c.json({ success: true, cleared: count });
  } catch (error) {
    console.error('Error clearing staged products:', error);
    return c.json({ error: 'Failed to clear products', details: String(error) }, 500);
  }
});

// DELETE remove from live catalog
app.delete("/make-server-57095a78/dropshipper/catalog/live/:productId", async (c) => {
  try {
    const productId = c.req.param('productId');
    const result = await dropshipperCatalog.removeProductFromLive(productId);
    return c.json(result);
  } catch (error) {
    console.error('Error removing from live:', error);
    return c.json({ error: 'Failed to remove product', details: String(error) }, 500);
  }
});

// GET import logs
app.get("/make-server-57095a78/dropshipper/catalog/logs", async (c) => {
  try {
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const logs = await dropshipperCatalog.getImportLogs(limit);
    return c.json({ success: true, logs, total: logs.length });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return c.json({ error: 'Failed to fetch logs', details: String(error) }, 500);
  }
});

// ============================================================================
// PRODUCT-TO-AD INTEGRATION API - Create ads from dropshipper products
// ============================================================================

// GET imported products available for ads
app.get("/make-server-57095a78/product-ads/available-products", async (c) => {
  try {
    const url = new URL(c.req.url);
    const filters = {
      category: url.searchParams.get('category') || undefined,
      provider: url.searchParams.get('provider') || undefined,
      search: url.searchParams.get('search') || undefined,
      minPrice: url.searchParams.get('minPrice') ? parseFloat(url.searchParams.get('minPrice')!) : undefined,
      maxPrice: url.searchParams.get('maxPrice') ? parseFloat(url.searchParams.get('maxPrice')!) : undefined,
    };
    
    const products = await productAdIntegration.getImportedProducts(filters);
    return c.json({ success: true, products, total: products.length });
  } catch (error) {
    console.error('Error fetching products for ads:', error);
    return c.json({ error: 'Failed to fetch products', details: String(error) }, 500);
  }
});

// GET ad templates
app.get("/make-server-57095a78/product-ads/templates", async (c) => {
  try {
    const templates = await productAdIntegration.getAdTemplates();
    return c.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return c.json({ error: 'Failed to fetch templates', details: String(error) }, 500);
  }
});

// POST create ad from product
app.post("/make-server-57095a78/product-ads/create", async (c) => {
  try {
    const { productId, templateId, options, customContent } = await c.req.json();
    
    if (!productId || !templateId) {
      return c.json({ error: 'productId and templateId required' }, 400);
    }
    
    const result = await productAdIntegration.createProductAd(productId, templateId, options, customContent);
    return c.json(result);
  } catch (error) {
    console.error('Error creating product ad:', error);
    return c.json({ error: 'Failed to create ad', details: String(error) }, 500);
  }
});

// POST create bulk ads
app.post("/make-server-57095a78/product-ads/create-bulk", async (c) => {
  try {
    const { productIds, templateId, options } = await c.req.json();
    
    if (!productIds || !Array.isArray(productIds) || !templateId) {
      return c.json({ error: 'productIds array and templateId required' }, 400);
    }
    
    const result = await productAdIntegration.createBulkProductAds(productIds, templateId, options);
    return c.json({ success: result.success, ...result });
  } catch (error) {
    console.error('Error creating bulk ads:', error);
    return c.json({ error: 'Failed to create ads', details: String(error) }, 500);
  }
});

// GET all product ads
app.get("/make-server-57095a78/product-ads", async (c) => {
  try {
    const url = new URL(c.req.url);
    const filters = {
      status: url.searchParams.get('status') as any || undefined,
      productId: url.searchParams.get('productId') || undefined,
      templateId: url.searchParams.get('templateId') || undefined,
    };
    
    const ads = await productAdIntegration.getProductAds(filters);
    return c.json({ success: true, ads, total: ads.length });
  } catch (error) {
    console.error('Error fetching product ads:', error);
    return c.json({ error: 'Failed to fetch ads', details: String(error) }, 500);
  }
});

// GET single product ad
app.get("/make-server-57095a78/product-ads/:adId", async (c) => {
  try {
    const adId = c.req.param('adId');
    const ad = await productAdIntegration.getProductAd(adId);
    
    if (!ad) {
      return c.json({ error: 'Ad not found' }, 404);
    }
    
    return c.json({ success: true, ad });
  } catch (error) {
    console.error('Error fetching product ad:', error);
    return c.json({ error: 'Failed to fetch ad', details: String(error) }, 500);
  }
});

// PUT update product ad
app.put("/make-server-57095a78/product-ads/:adId", async (c) => {
  try {
    const adId = c.req.param('adId');
    const updates = await c.req.json();
    
    const result = await productAdIntegration.updateProductAd(adId, updates);
    return c.json(result);
  } catch (error) {
    console.error('Error updating product ad:', error);
    return c.json({ error: 'Failed to update ad', details: String(error) }, 500);
  }
});

// DELETE product ad
app.delete("/make-server-57095a78/product-ads/:adId", async (c) => {
  try {
    const adId = c.req.param('adId');
    await productAdIntegration.deleteProductAd(adId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting product ad:', error);
    return c.json({ error: 'Failed to delete ad', details: String(error) }, 500);
  }
});

// POST refresh product data in ad
app.post("/make-server-57095a78/product-ads/:adId/refresh", async (c) => {
  try {
    const adId = c.req.param('adId');
    const result = await productAdIntegration.refreshProductInAd(adId);
    return c.json(result);
  } catch (error) {
    console.error('Error refreshing product in ad:', error);
    return c.json({ error: 'Failed to refresh product', details: String(error) }, 500);
  }
});

// GET ad statistics
app.get("/make-server-57095a78/product-ads/stats/overview", async (c) => {
  try {
    const stats = await productAdIntegration.getAdStats();
    return c.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching ad stats:', error);
    return c.json({ error: 'Failed to fetch stats', details: String(error) }, 500);
  }
});

// Root endpoint
app.get("/", (c) => {
  return c.json({ 
    status: "ok",
    message: "Figma Make Server", 
    version: "1.0.0",
    endpoints: [
      "/make-server-57095a78/health",
      "/make-server-57095a78/subscriptions",
      "/make-server-57095a78/customers",
      "/make-server-57095a78/work-orders",
      "/make-server-57095a78/invoices",
      "/make-server-57095a78/white-label-clients",
      "/make-server-57095a78/init"
    ]
  });
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

// Get all subscriptions
app.get("/make-server-57095a78/subscriptions", async (c) => {
  try {
    const subscriptions = await kv.getByPrefix("subscription:");
    return c.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return c.json({ error: "Failed to fetch subscriptions" }, 500);
  }
});

// Get single subscription
app.get("/make-server-57095a78/subscriptions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const subscription = await kv.get(`subscription:${id}`);
    if (!subscription) {
      return c.json({ error: "Subscription not found" }, 404);
    }
    return c.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return c.json({ error: "Failed to fetch subscription" }, 500);
  }
});

// Create subscription
app.post("/make-server-57095a78/subscriptions", async (c) => {
  try {
    const data = await c.req.json();
    const id = `SUB-${data.type.charAt(0).toUpperCase()}-${Date.now()}`;
    const subscription = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`subscription:${id}`, subscription);
    console.log("Created subscription:", id);
    return c.json(subscription);
  } catch (error) {
    console.error("Error creating subscription:", error);
    return c.json({ error: "Failed to create subscription" }, 500);
  }
});

// Update subscription
app.put("/make-server-57095a78/subscriptions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`subscription:${id}`);
    if (!existing) {
      return c.json({ error: "Subscription not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`subscription:${id}`, updated);
    console.log("Updated subscription:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return c.json({ error: "Failed to update subscription" }, 500);
  }
});

// Update subscription
app.put("/make-server-57095a78/subscriptions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`subscription:${id}`);
    if (!existing) {
      return c.json({ error: "Subscription not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`subscription:${id}`, updated);
    console.log("Updated subscription:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return c.json({ error: "Failed to update subscription" }, 500);
  }
});

// Delete subscription
app.delete("/make-server-57095a78/subscriptions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`subscription:${id}`);
    console.log("Deleted subscription:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return c.json({ error: "Failed to delete subscription" }, 500);
  }
});

// Gift hours to subscription (Owner only - direct)
app.post("/make-server-57095a78/subscriptions/:id/gift-hours", async (c) => {
  try {
    const id = c.req.param("id");
    const { hours, reason, giftedBy } = await c.req.json();
    const subscription = await kv.get(`subscription:${id}`);
    if (!subscription) {
      return c.json({ error: "Subscription not found" }, 404);
    }
    
    const updatedSub = {
      ...subscription,
      hoursGifted: (subscription.hoursGifted || 0) + hours,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`subscription:${id}`, updatedSub);
    
    // Log transaction
    const transactionId = `HT-${Date.now()}`;
    const transaction = {
      id: transactionId,
      subscriptionId: id,
      customerId: subscription.stakeholderId,
      customerName: subscription.stakeholderName,
      type: 'gifted',
      hours,
      reason,
      performedBy: giftedBy || 'Owner',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await kv.set(`hour-transaction:${transactionId}`, transaction);
    
    console.log(`Gifted ${hours} hours to subscription ${id} by ${giftedBy || 'Owner'}`);
    return c.json({ success: true, subscription: updatedSub });
  } catch (error) {
    console.error("Error gifting hours:", error);
    return c.json({ error: "Failed to gift hours" }, 500);
  }
});

// ============================================================================
// GIFT HOURS REQUESTS & APPROVALS
// ============================================================================

// Get all gift hours requests
app.get("/make-server-57095a78/gift-hours-requests", async (c) => {
  try {
    const requests = await kv.getByPrefix("gift-request:");
    return c.json(requests);
  } catch (error) {
    console.error("Error fetching gift hours requests:", error);
    return c.json({ error: "Failed to fetch requests" }, 500);
  }
});

// Create gift hours request
app.post("/make-server-57095a78/gift-hours-requests", async (c) => {
  try {
    const data = await c.req.json();
    const id = `GHR-${Date.now()}`;
    
    // Get subscription details
    const subscription = await kv.get(`subscription:${data.subscriptionId}`);
    if (!subscription) {
      return c.json({ error: "Subscription not found" }, 404);
    }
    
    const request = {
      ...data,
      id,
      customerName: subscription.stakeholderName,
      customerEmail: subscription.stakeholderEmail,
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`gift-request:${id}`, request);
    console.log(`Created gift hours request ${id} for ${request.hours} hours`);
    return c.json(request);
  } catch (error) {
    console.error("Error creating gift hours request:", error);
    return c.json({ error: "Failed to create request" }, 500);
  }
});

// Approve gift hours request
app.post("/make-server-57095a78/gift-hours-requests/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const { reviewedBy, notes } = await c.req.json();
    
    const request = await kv.get(`gift-request:${id}`);
    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }
    
    if (request.status !== 'pending') {
      return c.json({ error: "Request already processed" }, 400);
    }
    
    // Update request status
    const updatedRequest = {
      ...request,
      status: 'approved',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`gift-request:${id}`, updatedRequest);
    
    // Gift the hours to the subscription
    const subscription = await kv.get(`subscription:${request.subscriptionId}`);
    if (subscription) {
      const updatedSub = {
        ...subscription,
        hoursGifted: (subscription.hoursGifted || 0) + request.hours,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`subscription:${request.subscriptionId}`, updatedSub);
      
      // Log transaction
      const transactionId = `HT-${Date.now()}`;
      await kv.set(`hour-transaction:${transactionId}`, {
        id: transactionId,
        subscriptionId: request.subscriptionId,
        customerId: subscription.stakeholderId,
        customerName: subscription.stakeholderName,
        type: 'gifted',
        hours: request.hours,
        reason: `${request.reason} (Approved by ${reviewedBy})`,
        performedBy: reviewedBy,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    
    console.log(`Approved gift hours request ${id} by ${reviewedBy}`);
    return c.json(updatedRequest);
  } catch (error) {
    console.error("Error approving gift hours request:", error);
    return c.json({ error: "Failed to approve request" }, 500);
  }
});

// Reject gift hours request
app.post("/make-server-57095a78/gift-hours-requests/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const { reviewedBy, notes } = await c.req.json();
    
    const request = await kv.get(`gift-request:${id}`);
    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }
    
    if (request.status !== 'pending') {
      return c.json({ error: "Request already processed" }, 400);
    }
    
    const updatedRequest = {
      ...request,
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`gift-request:${id}`, updatedRequest);
    
    console.log(`Rejected gift hours request ${id} by ${reviewedBy}`);
    return c.json(updatedRequest);
  } catch (error) {
    console.error("Error rejecting gift hours request:", error);
    return c.json({ error: "Failed to reject request" }, 500);
  }
});

// Get hour transactions for subscription
app.get("/make-server-57095a78/subscriptions/:id/hours", async (c) => {
  try {
    const id = c.req.param("id");
    const allTransactions = await kv.getByPrefix("hour-transaction:");
    const filtered = allTransactions.filter((t: any) => t.subscriptionId === id);
    return c.json(filtered);
  } catch (error) {
    console.error("Error fetching hour transactions:", error);
    return c.json({ error: "Failed to fetch hour transactions" }, 500);
  }
});

// ============================================================================
// SUBCONTRACTOR REGISTRATION
// ============================================================================

// Register new subcontractor
app.post("/make-server-57095a78/subcontractors/register", async (c) => {
  console.log("📝 POST /subcontractors/register called");
  try {
    const data = await c.req.json();
    
    // Generate unique subcontractor ID
    const subcontractorId = `SUB-${Date.now()}`;
    
    // Create subcontractor record
    const subcontractor = {
      id: subcontractorId,
      contractorType: data.contractorType,
      selectedTrade: data.selectedTrade,
      selectedSpecialty: data.selectedSpecialty,
      subscriptionPlan: data.subscriptionPlan,
      personalInfo: data.personalInfo,
      businessInfo: data.businessInfo,
      serviceInfo: data.serviceInfo,
      certifications: data.certifications,
      status: 'pending-verification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to KV store
    await kv.set(`subcontractor:${subcontractorId}`, subcontractor);
    
    // Create subscription if not free plan
    if (data.subscriptionPlan !== 'free') {
      const subscriptionId = `SUBSUB-${Date.now()}`;
      const planHours = {
        'starter': 3,
        'professional': 6,
        'gold': 8
      };
      
      const subscription = {
        id: subscriptionId,
        stakeholderId: subcontractorId,
        stakeholderType: 'subcontractor',
        stakeholderName: `${data.personalInfo.firstName} ${data.personalInfo.lastName}`,
        plan: data.subscriptionPlan,
        status: 'active',
        hoursIncluded: planHours[data.subscriptionPlan] || 0,
        hoursUsed: 0,
        hoursRemaining: planHours[data.subscriptionPlan] || 0,
        hoursRolledOver: 0,
        hoursGifted: 0,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await kv.set(`subscription:${subscriptionId}`, subscription);
      
      // Link subscription to subcontractor
      await kv.set(`subcontractor-subscription:${subcontractorId}`, subscriptionId);
    }
    
    console.log(`✅ Subcontractor ${subcontractorId} registered successfully`);
    
    return c.json({
      success: true,
      subcontractorId,
      message: 'Registration successful! Your account is pending verification.'
    });
  } catch (error) {
    console.error("Error registering subcontractor:", error);
    return c.json({ 
      success: false,
      error: "Registration failed. Please try again." 
    }, 500);
  }
});

// ============================================================================
// EMPLOYEE APPLICATIONS
// ============================================================================

// Submit employee application
app.post("/make-server-57095a78/employee-applications", async (c) => {
  console.log("📝 POST /employee-applications called");
  try {
    const data = await c.req.json();
    
    // Generate unique application ID
    const applicationId = `EMP-APP-${Date.now()}`;
    
    // Create employee application record
    const application = {
      id: applicationId,
      // Personal Info
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      
      // Position & Experience
      desiredPosition: data.desiredPosition,
      experienceLevel: data.experienceLevel,
      yearsExperience: data.yearsExperience,
      
      // Skills
      selectedSkills: data.selectedSkills,
      
      // Certifications & Licenses
      certifications: data.certifications,
      licenses: data.licenses,
      osha: data.osha,
      
      // Availability
      availableStartDate: data.availableStartDate,
      fullTime: data.fullTime,
      partTime: data.partTime,
      contract: data.contract,
      
      // Additional Info
      hourlyRate: data.hourlyRate,
      references: data.references,
      additionalInfo: data.additionalInfo,
      
      // Metadata
      status: 'pending',
      submittedAt: data.submittedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to KV store
    await kv.set(`employee-application:${applicationId}`, application);
    
    // Add to applications list for easy retrieval
    const applicationsList = await kv.get('employee-applications-list') || [];
    applicationsList.unshift(applicationId);
    await kv.set('employee-applications-list', applicationsList);
    
    console.log(`✅ Employee application ${applicationId} submitted successfully`);
    
    return c.json({
      success: true,
      applicationId,
      message: 'Application submitted successfully! We\'ll contact you within 2-3 business days.'
    });
  } catch (error) {
    console.error("Error submitting employee application:", error);
    return c.json({ 
      success: false,
      error: "Application submission failed. Please try again." 
    }, 500);
  }
});

// Get all employee applications (admin)
app.get("/make-server-57095a78/employee-applications", async (c) => {
  try {
    const applicationsList = await kv.get('employee-applications-list') || [];
    const applications = [];
    
    for (const appId of applicationsList) {
      const app = await kv.get(`employee-application:${appId}`);
      if (app) {
        applications.push(app);
      }
    }
    
    return c.json({ applications });
  } catch (error) {
    console.error("Error fetching employee applications:", error);
    return c.json({ error: "Failed to fetch applications" }, 500);
  }
});

// Get employee application by ID
app.get("/make-server-57095a78/employee-applications/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const application = await kv.get(`employee-application:${id}`);
    
    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }
    
    return c.json(application);
  } catch (error) {
    console.error("Error fetching employee application:", error);
    return c.json({ error: "Failed to fetch application" }, 500);
  }
});

// Update employee application status (admin)
app.patch("/make-server-57095a78/employee-applications/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const application = await kv.get(`employee-application:${id}`);
    
    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }
    
    const updatedApplication = {
      ...application,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`employee-application:${id}`, updatedApplication);
    
    return c.json({
      success: true,
      application: updatedApplication
    });
  } catch (error) {
    console.error("Error updating employee application:", error);
    return c.json({ error: "Failed to update application" }, 500);
  }
});

// Get subcontractor by ID
app.get("/make-server-57095a78/subcontractors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const subcontractor = await kv.get(`subcontractor:${id}`);
    
    if (!subcontractor) {
      return c.json({ error: "Subcontractor not found" }, 404);
    }
    
    return c.json(subcontractor);
  } catch (error) {
    console.error("Error fetching subcontractor:", error);
    return c.json({ error: "Failed to fetch subcontractor" }, 500);
  }
});

// Get all subcontractors
app.get("/make-server-57095a78/subcontractors", async (c) => {
  try {
    const subcontractors = await kv.getByPrefix("subcontractor:");
    return c.json({ subcontractors });
  } catch (error) {
    console.error("Error fetching subcontractors:", error);
    return c.json({ error: "Failed to fetch subcontractors" }, 500);
  }
});

// Process monthly rollovers
app.post("/make-server-57095a78/subscriptions/process-rollovers", async (c) => {
  try {
    const subscriptions = await kv.getByPrefix("subscription:");
    let processed = 0;
    let totalHours = 0;
    
    for (const sub of subscriptions) {
      if (sub.status === 'active' && sub.hoursIncluded) {
        const remainingHours = (sub.hoursIncluded - (sub.hoursUsed || 0));
        if (remainingHours > 0) {
          const updatedSub = {
            ...sub,
            hoursRollover: (sub.hoursRollover || 0) + remainingHours,
            hoursUsed: 0,
            updatedAt: new Date().toISOString(),
          };
          await kv.set(`subscription:${sub.id}`, updatedSub);
          processed++;
          totalHours += remainingHours;
          
          // Log transaction
          const transactionId = `HT-${Date.now()}-${processed}`;
          await kv.set(`hour-transaction:${transactionId}`, {
            id: transactionId,
            subscriptionId: sub.id,
            customerId: sub.stakeholderId,
            customerName: sub.stakeholderName,
            type: 'rollover',
            hours: remainingHours,
            reason: 'Monthly rollover',
            performedBy: 'System',
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    
    console.log(`Processed ${processed} rollovers, total ${totalHours} hours`);
    return c.json({ processed, totalHours });
  } catch (error) {
    console.error("Error processing rollovers:", error);
    return c.json({ error: "Failed to process rollovers" }, 500);
  }
});

// ============================================================================
// REFERRALS
// ============================================================================

app.get("/make-server-57095a78/referrals", async (c) => {
  try {
    const referrals = await kv.getByPrefix("referral:");
    return c.json(referrals);
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return c.json({ error: "Failed to fetch referrals" }, 500);
  }
});

app.post("/make-server-57095a78/referrals", async (c) => {
  try {
    const data = await c.req.json();
    const id = `REF-${Date.now()}`;
    const referral = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`referral:${id}`, referral);
    console.log("Created referral:", id);
    return c.json(referral);
  } catch (error) {
    console.error("Error creating referral:", error);
    return c.json({ error: "Failed to create referral" }, 500);
  }
});

app.put("/make-server-57095a78/referrals/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`referral:${id}`);
    if (!existing) {
      return c.json({ error: "Referral not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`referral:${id}`, updated);
    console.log("Updated referral:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating referral:", error);
    return c.json({ error: "Failed to update referral" }, 500);
  }
});

// ============================================================================
// GIFT CARDS
// ============================================================================

app.get("/make-server-57095a78/giftcards", async (c) => {
  try {
    const giftCards = await kv.getByPrefix("giftcard:");
    return c.json(giftCards);
  } catch (error) {
    console.error("Error fetching gift cards:", error);
    return c.json({ error: "Failed to fetch gift cards" }, 500);
  }
});

app.get("/make-server-57095a78/giftcards/:code", async (c) => {
  try {
    const code = c.req.param("code");
    const giftCard = await kv.get(`giftcard:${code}`);
    if (!giftCard) {
      return c.json({ error: "Gift card not found" }, 404);
    }
    return c.json(giftCard);
  } catch (error) {
    console.error("Error fetching gift card:", error);
    return c.json({ error: "Failed to fetch gift card" }, 500);
  }
});

app.post("/make-server-57095a78/giftcards", async (c) => {
  try {
    const data = await c.req.json();
    const id = `GC-${Date.now()}`;
    const code = `GIFT-${data.type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const giftCard = {
      ...data,
      id,
      code,
      balance: data.value,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`giftcard:${code}`, giftCard);
    console.log("Created gift card:", code);
    return c.json(giftCard);
  } catch (error) {
    console.error("Error creating gift card:", error);
    return c.json({ error: "Failed to create gift card" }, 500);
  }
});

app.post("/make-server-57095a78/giftcards/:code/redeem", async (c) => {
  try {
    const code = c.req.param("code");
    const { amount } = await c.req.json();
    const giftCard = await kv.get(`giftcard:${code}`);
    if (!giftCard) {
      return c.json({ error: "Gift card not found" }, 404);
    }
    if (giftCard.status !== 'active') {
      return c.json({ error: "Gift card is not active" }, 400);
    }
    if (giftCard.balance < amount) {
      return c.json({ error: "Insufficient balance" }, 400);
    }
    
    const newBalance = giftCard.balance - amount;
    const updated = {
      ...giftCard,
      balance: newBalance,
      status: newBalance === 0 ? 'redeemed' : 'active',
      redeemedDate: !giftCard.redeemedDate ? new Date().toISOString() : giftCard.redeemedDate,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`giftcard:${code}`, updated);
    console.log(`Redeemed ${amount} from gift card ${code}`);
    return c.json(updated);
  } catch (error) {
    console.error("Error redeeming gift card:", error);
    return c.json({ error: "Failed to redeem gift card" }, 500);
  }
});

// ============================================================================
// CUSTOMERS
// ============================================================================

app.get("/make-server-57095a78/customers", async (c) => {
  try {
    const customers = await kv.getByPrefix("customer:");
    // Return empty array if no customers found instead of error
    return c.json(customers || []);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return c.json({ error: "Failed to fetch customers" }, 500);
  }
});

// Get customer count and stats
app.get("/make-server-57095a78/customers/count", async (c) => {
  try {
    const customers = await kv.getByPrefix("customer:");
    const count = customers.length;
    
    // Calculate basic stats
    const activeCount = customers.filter((c: any) => c.status === 'active').length;
    const trend = count > 0 ? '+12%' : '0%'; // Mock trend for now
    
    return c.json({ 
      success: true,
      count, 
      trend,
      activeCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching customer count:", error);
    return c.json({ error: "Failed to fetch customer count" }, 500);
  }
});

app.get("/make-server-57095a78/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const customer = await kv.get(`customer:${id}`);
    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    return c.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return c.json({ error: "Failed to fetch customer" }, 500);
  }
});

app.post("/make-server-57095a78/customers", async (c) => {
  try {
    const data = await c.req.json();
    const id = `CUST-${Date.now()}`;
    const customer = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`customer:${id}`, customer);
    console.log("Created customer:", id);
    return c.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return c.json({ error: "Failed to create customer" }, 500);
  }
});

app.put("/make-server-57095a78/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`customer:${id}`);
    if (!existing) {
      return c.json({ error: "Customer not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`customer:${id}`, updated);
    console.log("Updated customer:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating customer:", error);
    return c.json({ error: "Failed to update customer" }, 500);
  }
});

app.delete("/make-server-57095a78/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`customer:${id}`);
    console.log("Deleted customer:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return c.json({ error: "Failed to delete customer" }, 500);
  }
});

app.post("/make-server-57095a78/customers/initialize", async (c) => {
  try {
    console.log("Initializing customers with sample data");
    const existing = await kv.getByPrefix("customer:");
    if (existing.length > 0) {
      return c.json({ message: "Customers already initialized", count: existing.length });
    }
    const sampleCustomers = [
      { id: '1', customer_number: 'CUST-001', first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', phone: '(555) 123-4567', company: 'Tech Corp Solutions', status: 'active', total_spent: 45000, project_count: 3, rating: 5, tags: ['premium', 'commercial'], city: 'Austin', state: 'TX', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' },
      { id: '2', customer_number: 'CUST-002', first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@gmail.com', phone: '(555) 234-5678', company: 'BuildCo Properties', status: 'vip', total_spent: 125000, project_count: 8, rating: 5, tags: ['vip', 'residential'], city: 'Denver', state: 'CO', created_at: '2023-11-20T14:30:00Z', updated_at: '2024-02-10T09:15:00Z' },
      { id: '3', customer_number: 'CUST-003', first_name: 'Michael', last_name: 'Davis', email: 'mdavis@company.com', phone: '(555) 345-6789', status: 'lead', total_spent: 0, project_count: 0, rating: 0, tags: ['lead', 'potential'], city: 'Seattle', state: 'WA', created_at: '2024-02-18T16:45:00Z', updated_at: '2024-02-18T16:45:00Z' }
    ];
    for (const customer of sampleCustomers) {
      await kv.set(`customer:${customer.id}`, customer);
    }
    console.log(`Initialized ${sampleCustomers.length} sample customers`);
    return c.json({ success: true, message: "Sample customers initialized", count: sampleCustomers.length });
  } catch (error) {
    console.error("Error initializing customers:", error);
    return c.json({ error: "Failed to initialize customers" }, 500);
  }
});

// ============================================================================
// JOBS / WORK ORDERS COUNT
// ============================================================================

// Get active jobs count for dashboard
app.get("/make-server-57095a78/jobs/active-count", async (c) => {
  console.log("📊 GET /jobs/active-count called");
  try {
    const workOrders = await kv.getByPrefix("workorder:");
    const activeCount = workOrders.filter((wo: any) => 
      wo.status === 'in_progress' || wo.status === 'scheduled' || wo.status === 'pending'
    ).length;
    
    const totalCount = workOrders.length;
    const trend = totalCount > 0 ? '+8%' : '0%'; // Mock trend for now
    
    console.log(`✅ Active jobs: ${activeCount}/${totalCount}`);
    
    return c.json({ 
      success: true,
      count: activeCount,
      total: totalCount,
      trend,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching active jobs count:", error);
    return c.json({ error: "Failed to fetch active jobs count" }, 500);
  }
});

// ============================================================================
// EMPLOYEES / TEAM COUNT
// ============================================================================

// Get employees count for dashboard
app.get("/make-server-57095a78/employees/count", async (c) => {
  console.log("📊 GET /employees/count called");
  try {
    const employees = await kv.getByPrefix("employee:");
    const count = employees.length;
    
    // Calculate basic stats
    const activeCount = employees.filter((e: any) => e.status === 'active').length;
    const trend = count > 0 ? '+5%' : '0%'; // Mock trend for now
    
    console.log(`✅ Employees: ${count} (${activeCount} active)`);
    
    return c.json({ 
      success: true,
      count, 
      trend,
      activeCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching employees count:", error);
    return c.json({ error: "Failed to fetch employees count" }, 500);
  }
});

// ============================================================================
// WORK ORDERS
// ============================================================================

app.get("/make-server-57095a78/workorders", async (c) => {
  try {
    const workOrders = await kv.getByPrefix("workorder:");
    return c.json(workOrders);
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return c.json({ error: "Failed to fetch work orders" }, 500);
  }
});

app.get("/make-server-57095a78/workorders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const workOrder = await kv.get(`workorder:${id}`);
    if (!workOrder) {
      return c.json({ error: "Work order not found" }, 404);
    }
    return c.json(workOrder);
  } catch (error) {
    console.error("Error fetching work order:", error);
    return c.json({ error: "Failed to fetch work order" }, 500);
  }
});

app.post("/make-server-57095a78/workorders", async (c) => {
  try {
    const data = await c.req.json();
    const id = `WO-${Date.now()}`;
    const workOrder = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`workorder:${id}`, workOrder);
    console.log("Created work order:", id);
    return c.json(workOrder);
  } catch (error) {
    console.error("Error creating work order:", error);
    return c.json({ error: "Failed to create work order" }, 500);
  }
});

app.put("/make-server-57095a78/workorders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`workorder:${id}`);
    if (!existing) {
      return c.json({ error: "Work order not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`workorder:${id}`, updated);
    console.log("Updated work order:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating work order:", error);
    return c.json({ error: "Failed to update work order" }, 500);
  }
});

// ============================================================================
// BUSINESS PROFILES
// ============================================================================

app.get("/make-server-57095a78/business-profiles", async (c) => {
  try {
    const profiles = await kv.getByPrefix("business_profile:");
    return c.json(profiles || []);
  } catch (error) {
    console.error("Error fetching business profiles:", error);
    return c.json({ error: "Failed to fetch business profiles" }, 500);
  }
});

app.get("/make-server-57095a78/business-profiles/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const profile = await kv.get(`business_profile:${id}`);
    if (!profile) {
      return c.json({ error: "Business profile not found" }, 404);
    }
    return c.json(profile);
  } catch (error) {
    console.error("Error fetching business profile:", error);
    return c.json({ error: "Failed to fetch business profile" }, 500);
  }
});

app.post("/make-server-57095a78/business-profiles", async (c) => {
  try {
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const profile = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`business_profile:${id}`, profile);
    console.log("Created business profile:", id);
    return c.json(profile);
  } catch (error) {
    console.error("Error creating business profile:", error);
    return c.json({ error: "Failed to create business profile" }, 500);
  }
});

app.put("/make-server-57095a78/business-profiles/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`business_profile:${id}`);
    if (!existing) {
      return c.json({ error: "Business profile not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`business_profile:${id}`, updated);
    console.log("Updated business profile:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating business profile:", error);
    return c.json({ error: "Failed to update business profile" }, 500);
  }
});

app.delete("/make-server-57095a78/business-profiles/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`business_profile:${id}`);
    console.log("Deleted business profile:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting business profile:", error);
    return c.json({ error: "Failed to delete business profile" }, 500);
  }
});

// ============================================================================
// CONTRACTS
// ============================================================================

app.get("/make-server-57095a78/contracts", async (c) => {
  try {
    const contracts = await kv.getByPrefix("contract:");
    return c.json(contracts || []);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return c.json({ error: "Failed to fetch contracts" }, 500);
  }
});

app.get("/make-server-57095a78/contracts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const contract = await kv.get(`contract:${id}`);
    if (!contract) {
      return c.json({ error: "Contract not found" }, 404);
    }
    return c.json(contract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    return c.json({ error: "Failed to fetch contract" }, 500);
  }
});

app.post("/make-server-57095a78/contracts", async (c) => {
  try {
    const data = await c.req.json();
    const id = `CONTRACT-${Date.now()}`;
    const contract = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`contract:${id}`, contract);
    console.log("Created contract:", id);
    return c.json(contract);
  } catch (error) {
    console.error("Error creating contract:", error);
    return c.json({ error: "Failed to create contract" }, 500);
  }
});

app.put("/make-server-57095a78/contracts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`contract:${id}`);
    if (!existing) {
      return c.json({ error: "Contract not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`contract:${id}`, updated);
    console.log("Updated contract:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating contract:", error);
    return c.json({ error: "Failed to update contract" }, 500);
  }
});

app.delete("/make-server-57095a78/contracts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`contract:${id}`);
    console.log("Deleted contract:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return c.json({ error: "Failed to delete contract" }, 500);
  }
});

// ============================================================================
// INVOICES
// ============================================================================

app.get("/make-server-57095a78/invoices", async (c) => {
  try {
    const userId = c.req.query('userId');
    const invoices = await kv.getByPrefix("invoice:");

    // CRITICAL: Filter by userId - each user should only see their own invoices
    let filtered = invoices || [];
    if (userId) {
      filtered = filtered.filter((inv: any) =>
        inv.userId === userId ||
        inv.user_id === userId ||
        inv.customerId === userId ||
        inv.customer_id === userId
      );
      console.log(`✅ Filtered invoices for user ${userId}: ${filtered.length} of ${invoices.length} total`);
    }

    return c.json(filtered);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return c.json({ error: "Failed to fetch invoices" }, 500);
  }
});

app.get("/make-server-57095a78/invoices/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const invoice = await kv.get(`invoice:${id}`);
    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }
    return c.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return c.json({ error: "Failed to fetch invoice" }, 500);
  }
});

app.post("/make-server-57095a78/invoices", async (c) => {
  try {
    const data = await c.req.json();
    const id = `INV-${Date.now()}`;
    const invoice = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`invoice:${id}`, invoice);
    console.log("Created invoice:", id);
    return c.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return c.json({ error: "Failed to create invoice" }, 500);
  }
});

app.put("/make-server-57095a78/invoices/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`invoice:${id}`);
    if (!existing) {
      return c.json({ error: "Invoice not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`invoice:${id}`, updated);
    console.log("Updated invoice:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return c.json({ error: "Failed to update invoice" }, 500);
  }
});

// ============================================================================
// SUBCONTRACTORS
// ============================================================================

app.get("/make-server-57095a78/subcontractors", async (c) => {
  try {
    const subcontractors = await kv.getByPrefix("subcontractor:");
    return c.json(subcontractors);
  } catch (error) {
    console.error("Error fetching subcontractors:", error);
    return c.json({ error: "Failed to fetch subcontractors" }, 500);
  }
});

app.post("/make-server-57095a78/subcontractors", async (c) => {
  try {
    const data = await c.req.json();
    const id = `SUB-${Date.now()}`;
    const subcontractor = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`subcontractor:${id}`, subcontractor);
    console.log("Created subcontractor:", id);
    return c.json(subcontractor);
  } catch (error) {
    console.error("Error creating subcontractor:", error);
    return c.json({ error: "Failed to create subcontractor" }, 500);
  }
});

app.put("/make-server-57095a78/subcontractors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`subcontractor:${id}`);
    if (!existing) {
      return c.json({ error: "Subcontractor not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`subcontractor:${id}`, updated);
    console.log("Updated subcontractor:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating subcontractor:", error);
    return c.json({ error: "Failed to update subcontractor" }, 500);
  }
});

// ============================================================================
// VENDORS
// ============================================================================

app.get("/make-server-57095a78/vendors", async (c) => {
  try {
    const vendors = await kv.getByPrefix("vendor:");
    return c.json({ vendors }); // Wrap in object
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return c.json({ error: "Failed to fetch vendors" }, 500);
  }
});

// Get vendor status overview
app.get("/make-server-57095a78/vendors/status", async (c) => {
  try {
    const vendors = await kv.getByPrefix("vendor:");
    
    const status = {
      totalVendors: vendors.length,
      activeVendors: vendors.filter((v: any) => v.status === 'active').length,
      pendingVendors: vendors.filter((v: any) => v.status === 'pending').length,
      apiIntegrations: vendors.filter((v: any) => v.apiEnabled).length,
      advertisers: vendors.filter((v: any) => v.isAdvertiser).length,
    };
    
    return c.json({ status });
  } catch (error) {
    console.error("Error fetching vendor status:", error);
    return c.json({ error: "Failed to fetch vendor status" }, 500);
  }
});

// Test vendor API connection
app.post("/make-server-57095a78/vendors/:id/test", async (c) => {
  try {
    const vendorId = c.req.param('id');
    const vendor = await kv.get(`vendor:${vendorId}`);
    
    if (!vendor) {
      return c.json({ error: "Vendor not found" }, 404);
    }
    
    // Simulate API test
    const testResult = {
      success: true,
      vendor: vendor.name,
      apiType: vendor.apiType || 'REST',
      responseTime: Math.floor(Math.random() * 500) + 100,
      message: 'Connection successful'
    };
    
    return c.json(testResult);
  } catch (error) {
    console.error("Error testing vendor:", error);
    return c.json({ 
      success: false,
      error: "Failed to test vendor connection",
      message: error.message 
    }, 500);
  }
});

app.post("/make-server-57095a78/vendors", async (c) => {
  try {
    const data = await c.req.json();
    const id = `VEN-${Date.now()}`;
    const vendor = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`vendor:${id}`, vendor);
    console.log("Created vendor:", id);
    return c.json(vendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    return c.json({ error: "Failed to create vendor" }, 500);
  }
});

// Initialize vendors with sample data
app.post("/make-server-57095a78/vendors/initialize", async (c) => {
  try {
    const existing = await kv.getByPrefix("vendor:");
    
    if (existing.length > 0) {
      return c.json({ 
        success: true, 
        message: "Vendors already initialized",
        count: existing.length 
      });
    }

    const sampleVendors = [
      {
        id: 'VEN-001',
        name: 'Home Depot',
        category: 'Building Materials',
        status: 'active',
        apiEnabled: true,
        apiType: 'REST',
        isAdvertiser: true,
        contactEmail: 'api@homedepot.com',
        website: 'https://www.homedepot.com',
        description: 'Leading home improvement retailer',
        commission: 5.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'VEN-002',
        name: "Lowe's",
        category: 'Building Materials',
        status: 'active',
        apiEnabled: true,
        apiType: 'REST',
        isAdvertiser: true,
        contactEmail: 'api@lowes.com',
        website: 'https://www.lowes.com',
        description: 'Home improvement and appliances',
        commission: 4.5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'VEN-003',
        name: 'Grainger',
        category: 'Industrial Supplies',
        status: 'active',
        apiEnabled: true,
        apiType: 'REST',
        isAdvertiser: false,
        contactEmail: 'api@grainger.com',
        website: 'https://www.grainger.com',
        description: 'Industrial supplies and equipment',
        commission: 3.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'VEN-004',
        name: 'Ferguson',
        category: 'Plumbing & HVAC',
        status: 'active',
        apiEnabled: false,
        apiType: null,
        isAdvertiser: true,
        contactEmail: 'sales@ferguson.com',
        website: 'https://www.ferguson.com',
        description: 'Plumbing and HVAC supplies',
        commission: 6.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'VEN-005',
        name: 'Electrical Wholesale',
        category: 'Electrical',
        status: 'pending',
        apiEnabled: false,
        apiType: null,
        isAdvertiser: false,
        contactEmail: 'contact@ewholesale.com',
        website: 'https://www.electricalwholesale.com',
        description: 'Electrical supplies and components',
        commission: 4.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const vendor of sampleVendors) {
      await kv.set(`vendor:${vendor.id}`, vendor);
    }

    console.log(`Initialized ${sampleVendors.length} sample vendors`);
    return c.json({ 
      success: true, 
      message: "Vendors initialized with sample data",
      count: sampleVendors.length,
      vendors: sampleVendors
    });
  } catch (error) {
    console.error("Error initializing vendors:", error);
    return c.json({ error: "Failed to initialize vendors" }, 500);
  }
});

// ============================================================================
// ADVERTISERS
// ============================================================================

app.get("/make-server-57095a78/advertisers", async (c) => {
  try {
    const advertisers = await kv.getByPrefix("advertiser:");
    return c.json(advertisers);
  } catch (error) {
    console.error("Error fetching advertisers:", error);
    return c.json({ error: "Failed to fetch advertisers" }, 500);
  }
});

app.post("/make-server-57095a78/advertisers", async (c) => {
  try {
    const data = await c.req.json();
    const id = `ADV-${Date.now()}`;
    const advertiser = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`advertiser:${id}`, advertiser);
    console.log("Created advertiser:", id);
    return c.json(advertiser);
  } catch (error) {
    console.error("Error creating advertiser:", error);
    return c.json({ error: "Failed to create advertiser" }, 500);
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

app.get("/make-server-57095a78/analytics/subscriptions", async (c) => {
  try {
    const subscriptions = await kv.getByPrefix("subscription:");
    
    const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active');
    const totalRevenue = activeSubscriptions.reduce((sum: number, s: any) => sum + s.amount, 0);
    
    // Calculate revenue by type
    const revenueByType: Record<string, number> = {};
    activeSubscriptions.forEach((s: any) => {
      revenueByType[s.type] = (revenueByType[s.type] || 0) + s.amount;
    });
    
    // Mock growth data - in production, calculate from historical data
    const revenueGrowth = [
      { month: 'Aug', revenue: totalRevenue * 0.6, subscriptions: Math.floor(activeSubscriptions.length * 0.6) },
      { month: 'Sep', revenue: totalRevenue * 0.7, subscriptions: Math.floor(activeSubscriptions.length * 0.7) },
      { month: 'Oct', revenue: totalRevenue * 0.8, subscriptions: Math.floor(activeSubscriptions.length * 0.8) },
      { month: 'Nov', revenue: totalRevenue * 0.9, subscriptions: Math.floor(activeSubscriptions.length * 0.9) },
      { month: 'Dec', revenue: totalRevenue * 0.95, subscriptions: Math.floor(activeSubscriptions.length * 0.95) },
      { month: 'Jan', revenue: totalRevenue, subscriptions: activeSubscriptions.length }
    ];
    
    return c.json({
      totalRevenue,
      monthlyRecurringRevenue: totalRevenue,
      activeSubscriptions: activeSubscriptions.length,
      churnRate: 2.3,
      averageRevenuePerUser: activeSubscriptions.length > 0 ? totalRevenue / activeSubscriptions.length : 0,
      customerLifetimeValue: 2244,
      revenueByType,
      revenueGrowth
    });
  } catch (error) {
    console.error("Error fetching subscription analytics:", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

app.get("/make-server-57095a78/analytics/referrals", async (c) => {
  try {
    const referrals = await kv.getByPrefix("referral:");
    
    const completedReferrals = referrals.filter((r: any) => r.status === 'completed' || r.status === 'paid');
    const totalRewards = referrals.reduce((sum: number, r: any) => sum + r.rewardAmount, 0);
    const conversionValue = completedReferrals.reduce((sum: number, r: any) => sum + (r.conversionValue || 0), 0);
    
    return c.json({
      totalReferrals: referrals.length,
      completedReferrals: completedReferrals.length,
      totalRewards,
      conversionValue,
      conversionRate: referrals.length > 0 ? (completedReferrals.length / referrals.length) * 100 : 0
    });
  } catch (error) {
    console.error("Error fetching referral analytics:", error);
    return c.json({ error: "Failed to fetch referral analytics" }, 500);
  }
});

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

app.get("/make-server-57095a78/plans", async (c) => {
  try {
    const plans = await kv.getByPrefix("plan:");
    return c.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    return c.json({ error: "Failed to fetch plans" }, 500);
  }
});

app.get("/make-server-57095a78/plans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const plan = await kv.get(`plan:${id}`);
    if (!plan) {
      return c.json({ error: "Plan not found" }, 404);
    }
    return c.json(plan);
  } catch (error) {
    console.error("Error fetching plan:", error);
    return c.json({ error: "Failed to fetch plan" }, 500);
  }
});

app.post("/make-server-57095a78/plans", async (c) => {
  try {
    const data = await c.req.json();
    const id = `PLAN-${data.category.charAt(0).toUpperCase()}-${Date.now()}`;
    const plan = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`plan:${id}`, plan);
    console.log("Created plan:", id);
    return c.json(plan);
  } catch (error) {
    console.error("Error creating plan:", error);
    return c.json({ error: "Failed to create plan" }, 500);
  }
});

app.put("/make-server-57095a78/plans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`plan:${id}`);
    if (!existing) {
      return c.json({ error: "Plan not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`plan:${id}`, updated);
    console.log("Updated plan:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating plan:", error);
    return c.json({ error: "Failed to update plan" }, 500);
  }
});

app.delete("/make-server-57095a78/plans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`plan:${id}`);
    console.log("Deleted plan:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return c.json({ error: "Failed to delete plan" }, 500);
  }
});

// ============================================================================
// SUBSCRIPTION PAYMENT PROCESSING
// ============================================================================

// Process subscription payment
app.post("/make-server-57095a78/subscription-payment/process", async (c) => {
  try {
    const { subscriptionId, paymentMethodId } = await c.req.json();
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    
    if (!subscription) {
      return c.json({ success: false, error: "Subscription not found" }, 404);
    }

    // Create payment record
    const paymentId = `PAY-${Date.now()}`;
    const payment = {
      id: paymentId,
      subscriptionId,
      subscriptionName: subscription.plan,
      stakeholderName: subscription.stakeholderName,
      amount: subscription.amount,
      dueDate: subscription.nextBillingDate,
      status: 'processing',
      paymentMethod: paymentMethodId || 'default',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate payment processing (in production, integrate with Stripe/etc)
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      payment.status = 'paid';
      payment.paymentDate = new Date().toISOString();
      payment.transactionId = `TXN-${Date.now()}`;
      
      // Update subscription
      subscription.hoursUsed = 0; // Reset hours on successful payment
      subscription.updatedAt = new Date().toISOString();
      await kv.set(`subscription:${subscriptionId}`, subscription);
    } else {
      payment.status = 'failed';
      payment.failureReason = 'Payment declined by payment provider';
    }

    await kv.set(`payment:${paymentId}`, payment);
    console.log("Processed payment:", paymentId, payment.status);

    return c.json({
      success: payment.status === 'paid',
      transactionId: payment.transactionId,
      error: payment.failureReason
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return c.json({ success: false, error: "Failed to process payment" }, 500);
  }
});

// Schedule subscription payment
app.post("/make-server-57095a78/subscription-payment/schedule", async (c) => {
  try {
    const { subscriptionId, dueDate } = await c.req.json();
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    
    if (!subscription) {
      return c.json({ success: false, error: "Subscription not found" }, 404);
    }

    const paymentId = `PAY-${Date.now()}`;
    const payment = {
      id: paymentId,
      subscriptionId,
      subscriptionName: subscription.plan,
      stakeholderName: subscription.stakeholderName,
      amount: subscription.amount,
      dueDate,
      status: 'scheduled',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`payment:${paymentId}`, payment);
    console.log("Scheduled payment:", paymentId);

    return c.json({ success: true, paymentId });
  } catch (error) {
    console.error("Error scheduling payment:", error);
    return c.json({ success: false, error: "Failed to schedule payment" }, 500);
  }
});

// Retry failed payment
app.post("/make-server-57095a78/subscription-payment/retry", async (c) => {
  try {
    const { paymentRecordId } = await c.req.json();
    const payment = await kv.get(`payment:${paymentRecordId}`);
    
    if (!payment) {
      return c.json({ success: false, error: "Payment record not found" }, 404);
    }

    payment.status = 'retrying';
    payment.retryCount = (payment.retryCount || 0) + 1;
    payment.updatedAt = new Date().toISOString();

    // Simulate retry (in production, use real payment gateway)
    const success = Math.random() > 0.3; // 70% success on retry

    if (success) {
      payment.status = 'paid';
      payment.paymentDate = new Date().toISOString();
      payment.transactionId = `TXN-${Date.now()}`;
    } else {
      payment.status = 'failed';
      payment.failureReason = 'Retry failed: Payment declined';
      // Schedule next retry (exponential backoff)
      const nextRetry = new Date();
      nextRetry.setDate(nextRetry.getDate() + Math.pow(2, payment.retryCount));
      payment.nextRetryDate = nextRetry.toISOString();
    }

    await kv.set(`payment:${paymentRecordId}`, payment);
    console.log("Retried payment:", paymentRecordId, payment.status);

    return c.json({ success: payment.status === 'paid', payment });
  } catch (error) {
    console.error("Error retrying payment:", error);
    return c.json({ success: false, error: "Failed to retry payment" }, 500);
  }
});

// Get payment history for subscription
app.get("/make-server-57095a78/subscription-payment/history/:subscriptionId", async (c) => {
  try {
    const subscriptionId = c.req.param("subscriptionId");
    const allPayments = await kv.getByPrefix("payment:");
    const payments = allPayments.filter(p => p.subscriptionId === subscriptionId);
    
    // Sort by date descending
    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ payments });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return c.json({ error: "Failed to fetch payment history" }, 500);
  }
});

// Get payment alerts
app.get("/make-server-57095a78/subscription-payment/alerts", async (c) => {
  try {
    const alerts = await kv.getByPrefix("payment-alert:");
    
    // Sort by priority and date
    alerts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return c.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return c.json({ error: "Failed to fetch alerts" }, 500);
  }
});

// Get payment statistics
app.get("/make-server-57095a78/subscription-payment/stats", async (c) => {
  try {
    const payments = await kv.getByPrefix("payment:");
    const subscriptions = await kv.getByPrefix("subscription:");
    
    const stats = {
      totalScheduled: payments.filter(p => p.status === 'scheduled').length,
      totalPaid: payments.filter(p => p.status === 'paid').length,
      totalFailed: payments.filter(p => p.status === 'failed').length,
      totalOverdue: payments.filter(p => p.status === 'overdue').length,
      successRate: 0,
      averagePaymentTime: 2,
      monthlyRecurringRevenue: 0,
      annualRecurringRevenue: 0,
      churnRate: 0,
      collectionRate: 0,
    };

    // Calculate success rate
    const totalProcessed = stats.totalPaid + stats.totalFailed;
    if (totalProcessed > 0) {
      stats.successRate = (stats.totalPaid / totalProcessed) * 100;
    }

    // Calculate MRR and ARR
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    stats.monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      if (sub.billingCycle === 'monthly') return sum + sub.amount;
      if (sub.billingCycle === 'quarterly') return sum + (sub.amount / 3);
      if (sub.billingCycle === 'annual') return sum + (sub.amount / 12);
      return sum;
    }, 0);
    stats.annualRecurringRevenue = stats.monthlyRecurringRevenue * 12;

    // Calculate collection rate
    if (stats.totalScheduled > 0) {
      stats.collectionRate = (stats.totalPaid / (stats.totalPaid + stats.totalOverdue)) * 100;
    }

    // Calculate churn rate (simplified)
    const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled').length;
    if (subscriptions.length > 0) {
      stats.churnRate = (cancelledSubs / subscriptions.length) * 100;
    }

    return c.json({ stats });
  } catch (error) {
    console.error("Error calculating stats:", error);
    return c.json({ error: "Failed to calculate stats" }, 500);
  }
});

// Get upcoming payments (next 30 days)
app.get("/make-server-57095a78/subscription-payment/upcoming", async (c) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const payments = await kv.getByPrefix("payment:");
    const upcoming = payments.filter(p => {
      if (p.status !== 'scheduled' && p.status !== 'processing') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate >= now && dueDate <= thirtyDaysFromNow;
    });

    // Sort by due date ascending
    upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return c.json({ payments: upcoming });
  } catch (error) {
    console.error("Error fetching upcoming payments:", error);
    return c.json({ error: "Failed to fetch upcoming payments" }, 500);
  }
});

// Get overdue payments
app.get("/make-server-57095a78/subscription-payment/overdue", async (c) => {
  try {
    const now = new Date();
    const payments = await kv.getByPrefix("payment:");
    
    const overdue = payments.filter(p => {
      if (p.status === 'paid') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate < now;
    });

    // Update status to overdue
    for (const payment of overdue) {
      if (payment.status !== 'overdue') {
        payment.status = 'overdue';
        payment.updatedAt = new Date().toISOString();
        await kv.set(`payment:${payment.id}`, payment);

        // Create alert
        const alertId = `ALERT-${Date.now()}-${Math.random()}`;
        const alert = {
          id: alertId,
          type: 'overdue',
          subscriptionId: payment.subscriptionId,
          subscriptionName: payment.subscriptionName,
          stakeholderName: payment.stakeholderName,
          message: `Payment of ${payment.amount} is overdue. Due date was ${new Date(payment.dueDate).toLocaleDateString()}`,
          amount: payment.amount,
          dueDate: payment.dueDate,
          priority: 'high',
          read: false,
          createdAt: new Date().toISOString(),
        };
        await kv.set(`payment-alert:${alertId}`, alert);
      }
    }

    // Sort by days overdue (most overdue first)
    overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return c.json({ payments: overdue });
  } catch (error) {
    console.error("Error fetching overdue payments:", error);
    return c.json({ error: "Failed to fetch overdue payments" }, 500);
  }
});

// Mark alert as read
app.post("/make-server-57095a78/subscription-payment/alerts/:id/read", async (c) => {
  try {
    const id = c.req.param("id");
    const alert = await kv.get(`payment-alert:${id}`);
    
    if (!alert) {
      return c.json({ error: "Alert not found" }, 404);
    }

    alert.read = true;
    alert.updatedAt = new Date().toISOString();
    await kv.set(`payment-alert:${id}`, alert);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking alert as read:", error);
    return c.json({ error: "Failed to mark alert as read" }, 500);
  }
});

// Pause subscription billing
app.post("/make-server-57095a78/subscription-payment/pause", async (c) => {
  try {
    const { subscriptionId, reason } = await c.req.json();
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    
    if (!subscription) {
      return c.json({ success: false, error: "Subscription not found" }, 404);
    }

    subscription.status = 'paused';
    subscription.pauseReason = reason;
    subscription.pausedAt = new Date().toISOString();
    subscription.updatedAt = new Date().toISOString();
    await kv.set(`subscription:${subscriptionId}`, subscription);

    console.log("Paused billing for subscription:", subscriptionId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error pausing billing:", error);
    return c.json({ success: false, error: "Failed to pause billing" }, 500);
  }
});

// Resume subscription billing
app.post("/make-server-57095a78/subscription-payment/resume", async (c) => {
  try {
    const { subscriptionId } = await c.req.json();
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    
    if (!subscription) {
      return c.json({ success: false, error: "Subscription not found" }, 404);
    }

    subscription.status = 'active';
    subscription.resumedAt = new Date().toISOString();
    subscription.updatedAt = new Date().toISOString();
    await kv.set(`subscription:${subscriptionId}`, subscription);

    console.log("Resumed billing for subscription:", subscriptionId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error resuming billing:", error);
    return c.json({ success: false, error: "Failed to resume billing" }, 500);
  }
});

// Update payment method
app.post("/make-server-57095a78/subscription-payment/update-method", async (c) => {
  try {
    const { subscriptionId, paymentMethodId } = await c.req.json();
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    
    if (!subscription) {
      return c.json({ success: false, error: "Subscription not found" }, 404);
    }

    subscription.paymentMethodId = paymentMethodId;
    subscription.updatedAt = new Date().toISOString();
    await kv.set(`subscription:${subscriptionId}`, subscription);

    console.log("Updated payment method for subscription:", subscriptionId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating payment method:", error);
    return c.json({ success: false, error: "Failed to update payment method" }, 500);
  }
});

// Generate invoice
app.post("/make-server-57095a78/subscription-payment/generate-invoice", async (c) => {
  try {
    const { paymentRecordId } = await c.req.json();
    const payment = await kv.get(`payment:${paymentRecordId}`);
    
    if (!payment) {
      return c.json({ success: false, error: "Payment not found" }, 404);
    }

    // In production, generate actual PDF invoice
    const invoiceUrl = `/invoices/${paymentRecordId}.pdf`;
    
    console.log("Generated invoice for payment:", paymentRecordId);
    return c.json({ success: true, invoiceUrl });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return c.json({ success: false, error: "Failed to generate invoice" }, 500);
  }
});

// ============================================================================
// PROJECTS
// ============================================================================

// Get project stats (MUST come before /projects/:id route)
app.get("/make-server-57095a78/projects/stats", async (c) => {
  try {
    const projects = await kv.getByPrefix("project:");
    
    if (!projects || projects.length === 0) {
      return c.json({
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        on_hold: 0,
        urgent: 0,
        totalEstimatedRevenue: 0,
        totalActualRevenue: 0,
      });
    }
    
    const stats = {
      total: projects.length,
      pending: projects.filter(p => p.status === 'pending').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length,
      urgent: projects.filter(p => p.priority === 'urgent').length,
      totalEstimatedRevenue: projects.reduce((sum, p) => sum + (p.estimated_cost || 0), 0),
      totalActualRevenue: projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0),
    };
    
    return c.json(stats);
  } catch (error) {
    console.error("Error fetching project stats:", error);
    return c.json({ error: "Failed to fetch project stats" }, 500);
  }
});

// Get all projects
app.get("/make-server-57095a78/projects", async (c) => {
  try {
    const projects = await kv.getByPrefix("project:");
    
    // Get query parameters for filtering
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const assignedTo = c.req.query('assigned_to');
    const customerId = c.req.query('customer_id');
    const search = c.req.query('search');
    
    let filtered = projects || [];
    
    if (status && status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }
    if (priority) {
      filtered = filtered.filter(p => p.priority === priority);
    }
    if (assignedTo) {
      filtered = filtered.filter(p => p.assigned_to === assignedTo);
    }
    if (customerId) {
      filtered = filtered.filter(p => p.customer_id === customerId);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.project_number?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by created_at descending
    filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return c.json(filtered);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ error: "Failed to fetch projects" }, 500);
  }
});

// Get single project
app.get("/make-server-57095a78/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return c.json({ error: "Failed to fetch project" }, 500);
  }
});

// Create project
app.post("/make-server-57095a78/projects", async (c) => {
  try {
    const data = await c.req.json();
    const allProjects = await kv.getByPrefix("project:");
    const projectNumber = `WO-${String(allProjects.length + 1).padStart(4, '0')}`;
    
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    const project = {
      ...data,
      id,
      project_number: projectNumber,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      materials_needed: data.materials_needed || [],
      tags: data.tags || [],
      created_at: now,
      updated_at: now,
    };
    
    await kv.set(`project:${id}`, project);
    console.log("Created project:", id);
    return c.json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

// Update project
app.put("/make-server-57095a78/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`project:${id}`);
    if (!existing) {
      return c.json({ error: "Project not found" }, 404);
    }
    
    // Handle status change timestamps
    if (data.status === 'in_progress' && !data.start_date) {
      data.start_date = new Date().toISOString();
    } else if (data.status === 'completed' && !data.completion_date) {
      data.completion_date = new Date().toISOString();
    }
    
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    await kv.set(`project:${id}`, updated);
    console.log("Updated project:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    return c.json({ error: "Failed to update project" }, 500);
  }
});

// Delete project
app.delete("/make-server-57095a78/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`project:${id}`);
    console.log("Deleted project:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return c.json({ error: "Failed to delete project" }, 500);
  }
});

// ============================================================================
// WORK REQUESTS
// ============================================================================

// Get all work requests
app.get("/make-server-57095a78/work-requests", async (c) => {
  try {
    const workRequests = await kv.getByPrefix("work_request:");
    
    const status = c.req.query('status');
    const userId = c.req.query('userId'); // Get userId from query param
    let filtered = workRequests || [];
    
    // CRITICAL: Filter by userId - each user should only see their own work requests
    if (userId) {
      filtered = filtered.filter(r => 
        r.userId === userId || 
        r.user_id === userId || 
        r.customerId === userId || 
        r.submittedBy === userId
      );
    }
    
    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }
    
    // Sort by created_at descending
    filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return c.json(filtered);
  } catch (error) {
    console.error("Error fetching work requests:", error);
    return c.json({ error: "Failed to fetch work requests" }, 500);
  }
});

// Get unread work request count (must be before :id route)
app.get("/make-server-57095a78/work-requests/unread-count", async (c) => {
  try {
    const userId = c.req.query('userId');
    const workRequests = await kv.getByPrefix("work_request:");
    
    let filtered = workRequests;
    // Filter by userId if provided
    if (userId) {
      filtered = workRequests.filter((req: any) => 
        req.userId === userId || 
        req.user_id === userId || 
        req.customerId === userId || 
        req.submittedBy === userId
      );
    }
    
    const unreadCount = filtered.filter((req: any) => !req.isRead).length;
    return c.json({ count: unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return c.json({ error: "Failed to fetch unread count" }, 500);
  }
});

// Get recent work requests (last hour)
app.get("/make-server-57095a78/work-requests/recent", async (c) => {
  try {
    const userId = c.req.query('userId');
    const workRequests = await kv.getByPrefix("work_request:");
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    let filtered = workRequests;
    // Filter by userId if provided
    if (userId) {
      filtered = workRequests.filter((req: any) => 
        req.userId === userId || 
        req.user_id === userId || 
        req.customerId === userId || 
        req.submittedBy === userId
      );
    }
    
    const recentRequests = filtered.filter((req: any) => {
      const submittedTime = new Date(req.submittedDate || req.created_at).getTime();
      return submittedTime > oneHourAgo;
    });
    
    return c.json(recentRequests);
  } catch (error) {
    console.error("Error fetching recent requests:", error);
    return c.json({ error: "Failed to fetch recent requests" }, 500);
  }
});

// Mark work requests as read
app.post("/make-server-57095a78/work-requests/mark-read", async (c) => {
  try {
    const workRequests = await kv.getByPrefix("work_request:");
    
    // Update all unread requests to read
    for (const req of workRequests) {
      if (!req.isRead) {
        await kv.set(`work_request:${req.id}`, { ...req, isRead: true });
      }
    }
    
    return c.json({ success: true, message: "All work requests marked as read" });
  } catch (error) {
    console.error("Error marking as read:", error);
    return c.json({ error: "Failed to mark as read" }, 500);
  }
});

// Get single work request (must be after specific routes)
app.get("/make-server-57095a78/work-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const workRequest = await kv.get(`work_request:${id}`);
    if (!workRequest) {
      return c.json({ error: "Work request not found" }, 404);
    }
    return c.json(workRequest);
  } catch (error) {
    console.error("Error fetching work request:", error);
    return c.json({ error: "Failed to fetch work request" }, 500);
  }
});

// Create work request
app.post("/make-server-57095a78/work-requests", async (c) => {
  try {
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const workRequest = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    
    await kv.set(`work_request:${id}`, workRequest);
    console.log("Created work request:", id);
    return c.json(workRequest);
  } catch (error) {
    console.error("Error creating work request:", error);
    return c.json({ error: "Failed to create work request" }, 500);
  }
});

// Update work request
app.put("/make-server-57095a78/work-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`work_request:${id}`);
    if (!existing) {
      return c.json({ error: "Work request not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    await kv.set(`work_request:${id}`, updated);
    console.log("Updated work request:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating work request:", error);
    return c.json({ error: "Failed to update work request" }, 500);
  }
});

// Delete work request
app.delete("/make-server-57095a78/work-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`work_request:${id}`);
    console.log("Deleted work request:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting work request:", error);
    return c.json({ error: "Failed to delete work request" }, 500);
  }
});

// ============================================================================
// WHITE-LABEL CLIENT MANAGEMENT
// ============================================================================

// Get all white-label clients
app.get("/make-server-57095a78/white-label/clients", async (c) => {
  try {
    console.log("Fetching all white-label clients");
    const clients = await kv.getByPrefix("white-label:client:");
    
    // Sort by creation date (newest first)
    const sortedClients = clients.sort((a, b) => {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
    
    console.log(`Found ${clients.length} white-label clients`);
    return c.json({ success: true, clients: sortedClients });
  } catch (error) {
    console.error("Error fetching white-label clients:", error);
    return c.json({ success: false, error: "Failed to fetch clients" }, 500);
  }
});

// ============================================================================
// APPLICATION FORM MANAGEMENT
// ============================================================================

// Get application form configuration
app.get("/make-server-57095a78/application-form-config", async (c) => {
  try {
    console.log("Fetching application form config");
    let config = await kv.get("application_form_config");
    
    // Return default config if none exists
    if (!config) {
      config = {
        formTitle: "Skilled Trades Application",
        formDescription: "Join our team of professional tradespeople",
        successMessage: "Thank you for applying! We'll review your application and get back to you soon.",
        notificationEmail: "",
        autoReplyEnabled: false,
        fields: [
          { id: "firstName", type: "text", label: "First Name", required: true, placeholder: "John" },
          { id: "lastName", type: "text", label: "Last Name", required: true, placeholder: "Doe" },
          { id: "email", type: "email", label: "Email Address", required: true, placeholder: "john@example.com" },
          { id: "phone", type: "phone", label: "Phone Number", required: true, placeholder: "(555) 123-4567" },
          { id: "address", type: "text", label: "Address", required: false, placeholder: "123 Main St" },
          { id: "city", type: "text", label: "City", required: false, placeholder: "New York" },
          { id: "state", type: "text", label: "State", required: false, placeholder: "NY" },
          { id: "zipCode", type: "text", label: "Zip Code", required: false, placeholder: "10001" },
          { id: "yearsExperience", type: "number", label: "Years of Experience", required: true, placeholder: "5" },
          { id: "trade", type: "dropdown", label: "Primary Trade", required: true, options: ["Carpentry", "Electrical", "Plumbing", "HVAC", "Masonry", "Roofing", "Painting", "Drywall", "Flooring", "Concrete"] },
          { id: "availability", type: "dropdown", label: "Availability", required: true, options: ["Full-time", "Part-time", "Contract", "Flexible"] },
          { id: "certifications", type: "textarea", label: "Certifications & Licenses", required: false, placeholder: "List any relevant certifications..." },
          { id: "resume", type: "file", label: "Resume/CV", required: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    return c.json({ success: true, config });
  } catch (error) {
    console.error("Error fetching form config:", error);
    return c.json({ error: "Failed to fetch form config", details: String(error) }, 500);
  }
});

// Save application form configuration
app.post("/make-server-57095a78/application-form-config", async (c) => {
  try {
    const config = await c.req.json();
    config.updatedAt = new Date().toISOString();
    
    if (!config.createdAt) {
      config.createdAt = new Date().toISOString();
    }
    
    await kv.set("application_form_config", config);
    console.log("Application form config saved");
    
    return c.json({ success: true, config });
  } catch (error) {
    console.error("Error saving form config:", error);
    return c.json({ error: "Failed to save form config", details: String(error) }, 500);
  }
});

// Submit application
app.post("/make-server-57095a78/applications", async (c) => {
  try {
    const applicationData = await c.req.json();
    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const application = {
      id,
      ...applicationData,
      status: "new",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`application:${id}`, application);
    console.log(`Application submitted: ${id}`);
    
    return c.json({ success: true, application });
  } catch (error) {
    console.error("Error submitting application:", error);
    return c.json({ error: "Failed to submit application", details: String(error) }, 500);
  }
});

// Get all applications
app.get("/make-server-57095a78/applications", async (c) => {
  try {
    const applications = await kv.getByPrefix("application:");
    
    // Sort by submission date (newest first)
    const sortedApplications = applications.sort((a, b) => {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
    
    console.log(`Found ${applications.length} applications`);
    return c.json({ success: true, applications: sortedApplications, total: applications.length });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return c.json({ error: "Failed to fetch applications", details: String(error) }, 500);
  }
});

// Update application status
app.patch("/make-server-57095a78/applications/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const application = await kv.get(`application:${id}`);
    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }
    
    const updatedApplication = {
      ...application,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`application:${id}`, updatedApplication);
    console.log(`Application ${id} updated`);
    
    return c.json({ success: true, application: updatedApplication });
  } catch (error) {
    console.error("Error updating application:", error);
    return c.json({ error: "Failed to update application", details: String(error) }, 500);
  }
});

// Get single white-label client
app.get("/make-server-57095a78/white-label/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`Fetching white-label client: ${id}`);
    
    const client = await kv.get(`white-label:client:${id}`);
    
    if (!client) {
      console.log(`White-label client not found: ${id}`);
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    console.log(`Found white-label client: ${id}`);
    return c.json({ success: true, client });
  } catch (error) {
    console.error(`Error fetching white-label client:`, error);
    return c.json({ success: false, error: "Failed to fetch client" }, 500);
  }
});

// Create new white-label client
app.post("/make-server-57095a78/white-label/clients", async (c) => {
  try {
    const data = await c.req.json();
    console.log("Creating new white-label client:", data.companyName);
    
    // Generate client ID
    const clientCount = (await kv.getByPrefix("white-label:client:")).length;
    const id = `WL-${String(clientCount + 1).padStart(3, "0")}`;
    
    // Create client configuration
    const client = {
      id,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone || "",
      website: data.website || "",
      status: "setup",
      plan: data.plan || "enterprise",
      monthlyFee: data.monthlyFee || 799,
      setupFee: data.setupFee || 1999,
      signupDate: new Date().toISOString(),
      createdDate: new Date().toISOString(),
      lastUpdatedDate: new Date().toISOString(),
      
      // Branding defaults
      branding: {
        appName: data.appName || data.companyName,
        primaryColor: data.primaryColor || "#ea580c",
        secondaryColor: data.secondaryColor || "#0A0A0A",
        accentColor: data.accentColor || "#FF6B00",
        bundleId: data.bundleId || `com.${data.companyName.toLowerCase().replace(/\s+/g, "")}.app`,
        packageName: data.bundleId || `com.${data.companyName.toLowerCase().replace(/\s+/g, "")}.app`,
        backgroundColor: "#0A0A0A",
        textColor: "#FFFFFF",
        appDescription: data.appDescription || `${data.companyName} Customer Portal`,
        appDescriptionLong: data.appDescriptionLong || `Manage your projects and services with ${data.companyName}`,
        keywords: data.keywords || [data.companyName.toLowerCase(), "service", "portal"],
        category: data.category || "Business",
        supportEmail: data.email,
        supportPhone: data.phone || ""
      },
      
      // Contact info
      contact: {
        contactName: data.contactName,
        contactEmail: data.email,
        contactPhone: data.phone || "",
        companyName: data.companyName,
        companyWebsite: data.website || "",
        preferredContactMethod: "email",
        timezone: "America/New_York",
        language: "en"
      },
      
      // App Store initial state
      appStore: {
        iosStatus: "not-submitted",
        androidStatus: "not-submitted",
        buildStatus: "idle"
      },
      
      // Initial stats
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        userGrowthRate: 0,
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        averageSessionDuration: 0,
        sessionsPerUser: 0,
        downloads: 0,
        downloadsThisMonth: 0,
        rating: 0,
        reviews: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        revenueGrowthRate: 0,
        crashRate: 0,
        apiErrorRate: 0,
        averageLoadTime: 0,
        uptime: 99.9
      },
      
      // Features (all disabled by default, enable based on plan)
      features: {
        customerPortal: true,
        subcontractorPortal: data.features?.subcontractorPortal || false,
        employeePortal: data.features?.employeePortal || false,
        vendorPortal: data.features?.vendorPortal || false,
        investorPortal: false,
        landlordPortal: false,
        condoAssociationPortal: false,
        advertiserPortal: false,
        projectManagement: true,
        quoteManagement: true,
        invoicing: true,
        payments: true,
        scheduling: true,
        messaging: data.features?.messaging || true,
        notifications: true,
        fileSharing: true,
        analytics: data.features?.analytics || true,
        reporting: true,
        customBranding: true,
        apiAccess: data.features?.apiAccess || false,
        webhooks: false,
        sso: false,
        twoFactorAuth: false,
        paymentGateways: {
          stripe: true,
          square: false,
          paypal: false,
          authorize: false
        },
        emailIntegrations: {
          sendgrid: false,
          mailgun: false,
          smtp: true
        },
        crmIntegrations: {
          salesforce: false,
          hubspot: false,
          pipedrive: false
        },
        aiAssistant: false,
        aiWorkflowAutomation: false,
        aiPredictiveAnalytics: false,
        customModules: []
      },
      
      // Billing
      billing: {
        planType: data.plan || "enterprise",
        monthlyFee: data.monthlyFee || 799,
        setupFee: data.setupFee || 1999,
        billingStatus: "current",
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: data.setupFee || 1999,
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextPaymentAmount: data.monthlyFee || 799,
        paymentMethod: "credit-card",
        totalRevenue: data.setupFee || 1999,
        lifetimeValue: (data.monthlyFee || 799) * 60, // 5 years
        contractStartDate: new Date().toISOString(),
        contractTerm: 12,
        autoRenewal: true,
        invoices: []
      },
      
      // Technical configuration
      technical: {
        apiKeys: {
          production: `wl_prod_${generateApiKey()}`,
          sandbox: `wl_test_${generateApiKey()}`
        },
        customDomainVerified: false,
        sslCertificateIssued: false,
        dnsConfigured: false
      },
      
      // Support
      support: {
        supportTickets: 0,
        averageResponseTime: 2,
        customerSatisfaction: 5
      },
      
      // Health scores
      healthScore: 100,
      churnRisk: "low",
      npsScore: 10,
      
      // Notes and activity
      notes: `Client onboarded on ${new Date().toLocaleDateString()}`,
      activityLog: [
        {
          date: new Date().toISOString(),
          user: "System",
          action: "Client Created",
          details: `White-label client ${id} created for ${data.companyName}`
        }
      ]
    };
    
    // Save to KV store
    await kv.set(`white-label:client:${id}`, client);
    
    console.log(`White-label client created: ${id} - ${data.companyName}`);
    return c.json({ success: true, client }, 201);
  } catch (error) {
    console.error("Error creating white-label client:", error);
    return c.json({ success: false, error: "Failed to create client" }, 500);
  }
});

// Update white-label client
app.put("/make-server-57095a78/white-label/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    console.log(`Updating white-label client: ${id}`);
    
    const existing = await kv.get(`white-label:client:${id}`);
    
    if (!existing) {
      console.log(`White-label client not found: ${id}`);
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    // Deep merge updates
    const updated = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      lastUpdatedDate: new Date().toISOString(),
      branding: {
        ...existing.branding,
        ...(updates.branding || {})
      },
      features: {
        ...existing.features,
        ...(updates.features || {})
      },
      stats: {
        ...existing.stats,
        ...(updates.stats || {})
      },
      appStore: {
        ...existing.appStore,
        ...(updates.appStore || {})
      },
      billing: {
        ...existing.billing,
        ...(updates.billing || {})
      },
      activityLog: [
        ...(existing.activityLog || []),
        {
          date: new Date().toISOString(),
          user: "Admin",
          action: "Client Updated",
          details: `Client configuration updated`
        }
      ]
    };
    
    await kv.set(`white-label:client:${id}`, updated);
    
    console.log(`White-label client updated: ${id}`);
    return c.json({ success: true, client: updated });
  } catch (error) {
    console.error(`Error updating white-label client:`, error);
    return c.json({ success: false, error: "Failed to update client" }, 500);
  }
});

// Delete white-label client
app.delete("/make-server-57095a78/white-label/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`Deleting white-label client: ${id}`);
    
    const existing = await kv.get(`white-label:client:${id}`);
    
    if (!existing) {
      console.log(`White-label client not found: ${id}`);
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    // Soft delete - mark as cancelled
    const updated = {
      ...existing,
      status: "cancelled",
      lastUpdatedDate: new Date().toISOString(),
      activityLog: [
        ...(existing.activityLog || []),
        {
          date: new Date().toISOString(),
          user: "Admin",
          action: "Client Deleted",
          details: `Client marked as cancelled`
        }
      ]
    };
    
    await kv.set(`white-label:client:${id}`, updated);
    
    console.log(`White-label client deleted: ${id}`);
    return c.json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    console.error(`Error deleting white-label client:`, error);
    return c.json({ success: false, error: "Failed to delete client" }, 500);
  }
});

// Update client branding
app.put("/make-server-57095a78/white-label/clients/:id/branding", async (c) => {
  try {
    const id = c.req.param("id");
    const brandingUpdates = await c.req.json();
    console.log(`Updating branding for client: ${id}`);
    
    const existing = await kv.get(`white-label:client:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    const updated = {
      ...existing,
      branding: {
        ...existing.branding,
        ...brandingUpdates
      },
      lastUpdatedDate: new Date().toISOString(),
      activityLog: [
        ...(existing.activityLog || []),
        {
          date: new Date().toISOString(),
          user: "Admin",
          action: "Branding Updated",
          details: `Client branding configuration updated`
        }
      ]
    };
    
    await kv.set(`white-label:client:${id}`, updated);
    
    console.log(`Branding updated for client: ${id}`);
    return c.json({ success: true, client: updated });
  } catch (error) {
    console.error(`Error updating branding:`, error);
    return c.json({ success: false, error: "Failed to update branding" }, 500);
  }
});

// Update client features
app.put("/make-server-57095a78/white-label/clients/:id/features", async (c) => {
  try {
    const id = c.req.param("id");
    const featureUpdates = await c.req.json();
    console.log(`Updating features for client: ${id}`);
    
    const existing = await kv.get(`white-label:client:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    const updated = {
      ...existing,
      features: {
        ...existing.features,
        ...featureUpdates
      },
      lastUpdatedDate: new Date().toISOString(),
      activityLog: [
        ...(existing.activityLog || []),
        {
          date: new Date().toISOString(),
          user: "Admin",
          action: "Features Updated",
          details: `Client feature configuration updated`
        }
      ]
    };
    
    await kv.set(`white-label:client:${id}`, updated);
    
    console.log(`Features updated for client: ${id}`);
    return c.json({ success: true, client: updated });
  } catch (error) {
    console.error(`Error updating features:`, error);
    return c.json({ success: false, error: "Failed to update features" }, 500);
  }
});

// Trigger build for client
app.post("/make-server-57095a78/white-label/clients/:id/build", async (c) => {
  try {
    const id = c.req.param("id");
    const { platform } = await c.req.json(); // 'ios' | 'android' | 'both'
    console.log(`Triggering build for client: ${id}, platform: ${platform}`);
    
    const existing = await kv.get(`white-label:client:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    // Create build job
    const buildId = `BUILD-${Date.now()}`;
    const buildJob = {
      id: buildId,
      clientId: id,
      platform: platform || "both",
      status: "queued",
      queuedAt: new Date().toISOString(),
      logs: [`Build queued for ${platform || "both"} platforms`]
    };
    
    // Save build job
    await kv.set(`white-label:build:${buildId}`, buildJob);
    
    // Update client status
    const updated = {
      ...existing,
      status: "building",
      appStore: {
        ...existing.appStore,
        buildStatus: "queued",
        lastBuildDate: new Date().toISOString()
      },
      activityLog: [
        ...(existing.activityLog || []),
        {
          date: new Date().toISOString(),
          user: "System",
          action: "Build Triggered",
          details: `Build ${buildId} queued for ${platform || "both"} platforms`
        }
      ]
    };
    
    await kv.set(`white-label:client:${id}`, updated);
    
    console.log(`Build triggered: ${buildId} for client ${id}`);
    return c.json({ success: true, buildId, message: "Build queued successfully" });
  } catch (error) {
    console.error(`Error triggering build:`, error);
    return c.json({ success: false, error: "Failed to trigger build" }, 500);
  }
});

// Get build status
app.get("/make-server-57095a78/white-label/builds/:buildId", async (c) => {
  try {
    const buildId = c.req.param("buildId");
    console.log(`Fetching build status: ${buildId}`);
    
    const build = await kv.get(`white-label:build:${buildId}`);
    
    if (!build) {
      return c.json({ success: false, error: "Build not found" }, 404);
    }
    
    return c.json({ success: true, build });
  } catch (error) {
    console.error(`Error fetching build status:`, error);
    return c.json({ success: false, error: "Failed to fetch build status" }, 500);
  }
});

// Get client statistics summary
app.get("/make-server-57095a78/white-label/stats", async (c) => {
  try {
    console.log("Calculating white-label statistics");
    const clients = await kv.getByPrefix("white-label:client:");
    
    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter((c: any) => c.status === "active").length,
      setupClients: clients.filter((c: any) => c.status === "setup" || c.status === "building").length,
      pendingClients: clients.filter((c: any) => c.status === "pending").length,
      suspendedClients: clients.filter((c: any) => c.status === "suspended").length,
      monthlyRevenue: clients.reduce((sum: number, c: any) => 
        c.billing?.billingStatus === "current" ? sum + (c.billing?.monthlyFee || 0) : sum, 0
      ),
      totalRevenue: clients.reduce((sum: number, c: any) => 
        sum + (c.billing?.totalRevenue || 0), 0
      ),
      lifetimeValue: clients.reduce((sum: number, c: any) => 
        sum + (c.billing?.lifetimeValue || 0), 0
      ),
      totalUsers: clients.reduce((sum: number, c: any) => 
        sum + (c.stats?.totalUsers || 0), 0
      ),
      activeUsers: clients.reduce((sum: number, c: any) => 
        sum + (c.stats?.activeUsers || 0), 0
      ),
      totalDownloads: clients.reduce((sum: number, c: any) => 
        sum + (c.stats?.downloads || 0), 0
      ),
      averageRating: (() => {
        const ratedClients = clients.filter((c: any) => (c.stats?.rating || 0) > 0);
        if (ratedClients.length === 0) return 0;
        const sum = ratedClients.reduce((sum: number, c: any) => sum + (c.stats?.rating || 0), 0);
        return sum / ratedClients.length;
      })(),
      iosLiveApps: clients.filter((c: any) => c.appStore?.iosStatus === "live").length,
      androidLiveApps: clients.filter((c: any) => c.appStore?.androidStatus === "live").length,
      buildsInProgress: clients.filter((c: any) => c.status === "building").length
    };
    
    console.log("White-label statistics calculated:", stats);
    return c.json({ success: true, stats });
  } catch (error) {
    console.error("Error calculating statistics:", error);
    return c.json({ success: false, error: "Failed to calculate statistics" }, 500);
  }
});

// Initialize with sample data if empty
app.post("/make-server-57095a78/white-label/initialize", async (c) => {
  try {
    console.log("Initializing white-label system with sample data");
    
    const existing = await kv.getByPrefix("white-label:client:");
    
    if (existing.length > 0) {
      return c.json({ 
        success: false, 
        message: "System already initialized with data",
        clientCount: existing.length 
      });
    }
    
    // Create sample clients
    const sampleClients = [
      {
        companyName: "ABC Plumbing Inc.",
        contactName: "John Smith",
        email: "john@abcplumbing.com",
        phone: "555-0123",
        website: "https://abcplumbing.com",
        appName: "ABC Plumbing",
        primaryColor: "#0066CC",
        secondaryColor: "#004999",
        accentColor: "#FF6B00",
        plan: "enterprise",
        monthlyFee: 799,
        setupFee: 1999
      },
      {
        companyName: "Smith HVAC Services",
        contactName: "Sarah Johnson",
        email: "sarah@smithhvac.com",
        phone: "555-0456",
        website: "https://smithhvac.com",
        appName: "Smith HVAC",
        primaryColor: "#CC0000",
        secondaryColor: "#990000",
        accentColor: "#FFD700",
        plan: "enterprise",
        monthlyFee: 799,
        setupFee: 1999
      },
      {
        companyName: "Metro Roofing Corp",
        contactName: "Mike Davis",
        email: "mike@metroroofing.com",
        phone: "555-0789",
        appName: "Metro Roofing",
        primaryColor: "#2C3E50",
        secondaryColor: "#1A252F",
        accentColor: "#E74C3C",
        plan: "enterprise",
        monthlyFee: 799,
        setupFee: 1999
      }
    ];
    
    const createdClients = [];
    
    for (const clientData of sampleClients) {
      // Create client using the same logic as POST endpoint
      const clientCount = createdClients.length;
      const id = `WL-${String(clientCount + 1).padStart(3, "0")}`;
      
      const client = {
        id,
        ...clientData,
        status: clientCount === 0 ? "active" : clientCount === 1 ? "building" : "setup",
        signupDate: new Date(Date.now() - clientCount * 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date(Date.now() - clientCount * 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdatedDate: new Date().toISOString(),
        goLiveDate: clientCount === 0 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        
        branding: {
          appName: clientData.appName,
          primaryColor: clientData.primaryColor,
          secondaryColor: clientData.secondaryColor,
          accentColor: clientData.accentColor,
          bundleId: `com.${clientData.companyName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.app`,
          packageName: `com.${clientData.companyName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.app`,
          backgroundColor: "#0A0A0A",
          textColor: "#FFFFFF",
          appDescription: `${clientData.companyName} Customer Portal`,
          appDescriptionLong: `Manage your projects and services with ${clientData.companyName}`,
          keywords: [clientData.companyName.toLowerCase(), "service", "portal"],
          category: "Business",
          supportEmail: clientData.email,
          supportPhone: clientData.phone,
          customDomain: clientCount === 0 ? `app.${clientData.website?.replace("https://", "")}` : undefined
        },
        
        contact: {
          contactName: clientData.contactName,
          contactEmail: clientData.email,
          contactPhone: clientData.phone,
          companyName: clientData.companyName,
          companyWebsite: clientData.website,
          preferredContactMethod: "email",
          timezone: "America/New_York",
          language: "en"
        },
        
        appStore: {
          iosStatus: clientCount === 0 ? "live" : clientCount === 1 ? "in-review" : "not-submitted",
          iosVersion: clientCount === 0 ? "1.2.3" : undefined,
          iosAppId: clientCount === 0 ? "123456789" : undefined,
          androidStatus: clientCount === 0 ? "live" : "not-submitted",
          androidVersion: clientCount === 0 ? "1.2.3" : undefined,
          androidAppId: clientCount === 0 ? clientData.appName.toLowerCase().replace(/\s+/g, ".") : undefined,
          buildStatus: "idle",
          lastSubmissionDate: clientCount <= 1 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : undefined
        },
        
        stats: {
          totalUsers: clientCount === 0 ? 1245 : 0,
          activeUsers: clientCount === 0 ? 834 : 0,
          newUsersThisMonth: clientCount === 0 ? 124 : 0,
          userGrowthRate: clientCount === 0 ? 12.5 : 0,
          dailyActiveUsers: clientCount === 0 ? 345 : 0,
          weeklyActiveUsers: clientCount === 0 ? 678 : 0,
          monthlyActiveUsers: clientCount === 0 ? 834 : 0,
          averageSessionDuration: clientCount === 0 ? 12.5 : 0,
          sessionsPerUser: clientCount === 0 ? 8.3 : 0,
          downloads: clientCount === 0 ? 2156 : 0,
          downloadsThisMonth: clientCount === 0 ? 234 : 0,
          rating: clientCount === 0 ? 4.8 : 0,
          reviews: clientCount === 0 ? 234 : 0,
          monthlyRevenue: clientCount === 0 ? clientData.monthlyFee : 0,
          totalRevenue: clientCount === 0 ? 9588 : clientData.setupFee,
          revenueGrowthRate: 0,
          crashRate: 0.01,
          apiErrorRate: 0.05,
          averageLoadTime: 850,
          uptime: 99.9
        },
        
        features: {
          customerPortal: true,
          subcontractorPortal: clientCount === 1,
          employeePortal: clientCount === 1,
          vendorPortal: false,
          investorPortal: false,
          landlordPortal: false,
          condoAssociationPortal: false,
          advertiserPortal: false,
          projectManagement: true,
          quoteManagement: true,
          invoicing: true,
          payments: true,
          scheduling: true,
          messaging: true,
          notifications: true,
          fileSharing: true,
          analytics: true,
          reporting: true,
          customBranding: true,
          apiAccess: clientCount === 1,
          webhooks: false,
          sso: false,
          twoFactorAuth: false,
          paymentGateways: { stripe: true, square: false, paypal: false, authorize: false },
          emailIntegrations: { sendgrid: false, mailgun: false, smtp: true },
          crmIntegrations: { salesforce: false, hubspot: false, pipedrive: false },
          aiAssistant: false,
          aiWorkflowAutomation: false,
          aiPredictiveAnalytics: false,
          customModules: []
        },
        
        billing: {
          planType: clientData.plan,
          monthlyFee: clientData.monthlyFee,
          setupFee: clientData.setupFee,
          billingStatus: "current",
          lastPaymentDate: new Date(Date.now() - clientCount * 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastPaymentAmount: clientCount === 0 ? clientData.monthlyFee : clientData.setupFee,
          nextPaymentDate: new Date(Date.now() + (30 - clientCount * 7) * 24 * 60 * 60 * 1000).toISOString(),
          nextPaymentAmount: clientData.monthlyFee,
          paymentMethod: "credit-card",
          paymentMethodDetails: `****${1234 + clientCount}`,
          totalRevenue: clientCount === 0 ? 9588 : clientData.setupFee,
          lifetimeValue: clientData.monthlyFee * 60,
          contractStartDate: new Date(Date.now() - clientCount * 7 * 24 * 60 * 60 * 1000).toISOString(),
          contractTerm: 12,
          autoRenewal: true,
          invoices: []
        },
        
        technical: {
          apiKeys: {
            production: `wl_prod_${generateApiKey()}`,
            sandbox: `wl_test_${generateApiKey()}`
          },
          customDomainVerified: clientCount === 0,
          sslCertificateIssued: clientCount === 0,
          dnsConfigured: clientCount === 0
        },
        
        support: {
          supportTickets: clientCount === 0 ? 12 : 0,
          averageResponseTime: 2,
          customerSatisfaction: 5
        },
        
        healthScore: 100 - clientCount * 5,
        churnRisk: "low",
        npsScore: 10 - clientCount,
        
        notes: `Sample client created for demonstration`,
        activityLog: [
          {
            date: new Date(Date.now() - clientCount * 7 * 24 * 60 * 60 * 1000).toISOString(),
            user: "System",
            action: "Client Created",
            details: `Sample white-label client ${id} created`
          }
        ]
      };
      
      await kv.set(`white-label:client:${id}`, client);
      createdClients.push(client);
    }
    
    console.log(`Initialized ${createdClients.length} sample white-label clients`);
    return c.json({ 
      success: true, 
      message: "System initialized with sample data",
      clients: createdClients 
    });
  } catch (error) {
    console.error("Error initializing system:", error);
    return c.json({ success: false, error: "Failed to initialize system" }, 500);
  }
});

// ============================================================================
// KEY-VALUE STORE API
// ============================================================================

// Get value by key
app.get("/make-server-57095a78/kv/get/:key", async (c) => {
  try {
    const key = decodeURIComponent(c.req.param("key"));
    const value = await kv.get(key);
    return c.json({ value });
  } catch (error) {
    console.error("KV get error:", error);
    return c.json({ error: "Failed to get value" }, 500);
  }
});

// Set key-value pair
app.post("/make-server-57095a78/kv/set", async (c) => {
  try {
    const { key, value } = await c.req.json();
    await kv.set(key, value);
    return c.json({ success: true });
  } catch (error) {
    console.error("KV set error:", error);
    return c.json({ error: "Failed to set value" }, 500);
  }
});

// Test endpoint for KV prefix
app.get("/make-server-57095a78/kv/prefix-test", async (c) => {
  console.log("[KV] Prefix test endpoint hit!");
  return c.json({ 
    success: true, 
    message: "KV prefix endpoint is reachable",
    timestamp: new Date().toISOString()
  });
});

// Get values by prefix
app.get("/make-server-57095a78/kv/prefix/:prefix", async (c) => {
  try {
    const prefix = decodeURIComponent(c.req.param("prefix"));
    console.log(`[KV] Getting values by prefix: "${prefix}"`);
    const values = await kv.getByPrefix(prefix);
    console.log(`[KV] Found ${values?.length || 0} values with prefix "${prefix}"`);
    return c.json({ values });
  } catch (error) {
    console.error("KV getByPrefix error:", error);
    return c.json({ error: "Failed to get values by prefix", details: String(error) }, 500);
  }
});

// Delete key
app.delete("/make-server-57095a78/kv/delete/:key", async (c) => {
  try {
    const key = decodeURIComponent(c.req.param("key"));
    await kv.del(key);
    return c.json({ success: true });
  } catch (error) {
    console.error("KV delete error:", error);
    return c.json({ error: "Failed to delete value" }, 500);
  }
});

// Simplified REST-style KV routes
// GET /kv/{key} - Get value by key
app.get("/make-server-57095a78/kv/:key", async (c) => {
  try {
    const key = decodeURIComponent(c.req.param("key"));
    const value = await kv.get(key);
    return c.json(value);
  } catch (error) {
    console.error("KV get error:", error);
    return c.json({ error: "Failed to get value" }, 500);
  }
});

// POST /kv/{key} - Set value by key
app.post("/make-server-57095a78/kv/:key", async (c) => {
  try {
    const key = decodeURIComponent(c.req.param("key"));
    const value = await c.req.json();
    await kv.set(key, value);
    return c.json({ success: true });
  } catch (error) {
    console.error("KV set error:", error);
    return c.json({ error: "Failed to set value" }, 500);
  }
});

// ============================================================================
// DOCUMENT UPLOAD - Company Documents
// ============================================================================

app.post("/make-server-57095a78/upload-document", async (c) => {
  try {
    const { file, fileName, fileType, companyId } = await c.req.json();
    
    if (!file || !fileName || !companyId) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    // For now, store the base64 file in KV store
    // In production, this would upload to Supabase Storage
    const fileKey = `company_file_${companyId}_${Date.now()}_${fileName}`;
    
    await kv.set(fileKey, {
      file,
      fileName,
      fileType,
      companyId,
      uploadedAt: new Date().toISOString()
    });
    
    // Return a URL to access the file
    const url = `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-57095a78/document/${encodeURIComponent(fileKey)}`;
    
    console.log(`📄 Document uploaded: ${fileName} for company ${companyId}`);
    
    return c.json({ 
      success: true, 
      url,
      fileName 
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return c.json({ error: "Failed to upload document" }, 500);
  }
});

// Get uploaded document
app.get("/make-server-57095a78/document/:key", async (c) => {
  try {
    const key = decodeURIComponent(c.req.param("key"));
    const fileData = await kv.get(key);
    
    if (!fileData) {
      return c.json({ error: "Document not found" }, 404);
    }
    
    // Return the base64 file
    return c.json(fileData);
  } catch (error) {
    console.error("Document fetch error:", error);
    return c.json({ error: "Failed to fetch document" }, 500);
  }
});

// ============================================================================
// MATERIALS HUB - Live Vendor Integration
// ============================================================================

// Get all materials
app.get("/make-server-57095a78/materials", async (c) => {
  try {
    const materials = await kv.getByPrefix('material:');
    return c.json({ success: true, materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get material by ID
app.get("/make-server-57095a78/materials/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const material = await kv.get(`material:${id}`);
    
    if (!material) {
      return c.json({ success: false, error: 'Material not found' }, 404);
    }
    
    return c.json({ success: true, material });
  } catch (error) {
    console.error('Error fetching material:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create or update material
app.post("/make-server-57095a78/materials", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...materialData } = body;
    
    const material = {
      ...materialData,
      id: id || `MAT-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`material:${material.id}`, material);
    
    return c.json({ success: true, material });
  } catch (error) {
    console.error('Error saving material:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete material
app.delete("/make-server-57095a78/materials/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`material:${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting material:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Import from vendor
app.post("/make-server-57095a78/materials/import/:vendor", async (c) => {
  try {
    const vendor = c.req.param('vendor');
    const body = await c.req.json();
    const { searchTerm, category } = body;
    
    const VENDOR_APIS: Record<string, { name: string; apiUrl: string }> = {
      'home-depot': { name: 'Home Depot', apiUrl: 'https://api.homedepot.com' },
      'lowes': { name: "Lowe's", apiUrl: 'https://api.lowes.com' },
      'ferguson': { name: 'Ferguson', apiUrl: 'https://api.ferguson.com' },
      'grainger': { name: 'Grainger', apiUrl: 'https://api.grainger.com' },
    };
    
    if (!VENDOR_APIS[vendor]) {
      return c.json({ success: false, error: 'Unknown vendor' }, 400);
    }
    
    // Generate mock vendor data
    const categories = ['HVAC', 'Plumbing', 'Electrical', 'Kitchen', 'Bathroom', 'Flooring', 'Roofing', 'Windows', 'Doors', 'Fixtures'];
    const selectedCategory = category || categories[Math.floor(Math.random() * categories.length)];
    
    const items = [];
    const itemCount = Math.floor(Math.random() * 20) + 10;
    
    for (let i = 0; i < itemCount; i++) {
      items.push({
        vendorSku: `${vendor.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        name: `${selectedCategory} ${searchTerm || 'Item'} ${i + 1}`,
        description: `Professional grade ${selectedCategory.toLowerCase()} material from ${VENDOR_APIS[vendor].name}`,
        category: selectedCategory,
        price: (Math.random() * 500 + 50).toFixed(2),
        listPrice: (Math.random() * 700 + 100).toFixed(2),
        manufacturer: ['Brand A', 'Brand B', 'Brand C', 'Brand D'][Math.floor(Math.random() * 4)],
        model: `MODEL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        upc: Math.floor(Math.random() * 1000000000000).toString(),
        inStock: Math.random() > 0.2,
        quantity: Math.floor(Math.random() * 500),
        location: ['Warehouse A', 'Warehouse B', 'Warehouse C'][Math.floor(Math.random() * 3)],
        leadTime: Math.random() > 0.7 ? `${Math.floor(Math.random() * 14 + 1)} days` : 'In stock',
        weight: `${(Math.random() * 50 + 1).toFixed(2)} lbs`,
        dimensions: `${Math.floor(Math.random() * 24 + 6)}"L x ${Math.floor(Math.random() * 24 + 6)}"W x ${Math.floor(Math.random() * 24 + 6)}"H`,
        warranty: ['1 Year', '2 Years', '5 Years', '10 Years', 'Lifetime'][Math.floor(Math.random() * 5)],
        certifications: ['UL Listed', 'Energy Star', 'NSF Certified', 'ISO 9001'][Math.floor(Math.random() * 4)],
        images: [`https://source.unsplash.com/400x400/?${selectedCategory.toLowerCase()}&sig=${i}`],
        vendor: VENDOR_APIS[vendor].name,
        vendorKey: vendor,
      });
    }
    
    // Store vendor catalog data
    await kv.set(`vendor_catalog:${vendor}:${Date.now()}`, {
      vendor,
      searchTerm,
      category,
      results: items,
      importedAt: new Date().toISOString(),
    });
    
    return c.json({ 
      success: true, 
      data: items,
      vendor: VENDOR_APIS[vendor].name
    });
  } catch (error) {
    console.error('Error importing from vendor:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get live pricing for a material
app.post("/make-server-57095a78/materials/pricing/:vendor", async (c) => {
  try {
    const vendor = c.req.param('vendor');
    const body = await c.req.json();
    const { sku, productId } = body;
    
    const VENDOR_APIS: Record<string, { name: string }> = {
      'home-depot': { name: 'Home Depot' },
      'lowes': { name: "Lowe's" },
      'ferguson': { name: 'Ferguson' },
      'grainger': { name: 'Grainger' },
    };
    
    if (!VENDOR_APIS[vendor]) {
      return c.json({ success: false, error: 'Unknown vendor' }, 400);
    }
    
    const pricingData = {
      sku,
      productId,
      vendor: VENDOR_APIS[vendor].name,
      price: (Math.random() * 500 + 50).toFixed(2),
      currency: 'USD',
      inStock: Math.random() > 0.2,
      quantity: Math.floor(Math.random() * 500),
      lastUpdated: new Date().toISOString(),
      leadTime: Math.random() > 0.7 ? `${Math.floor(Math.random() * 14 + 1)} days` : 'In stock',
      location: ['Warehouse A', 'Warehouse B', 'Warehouse C'][Math.floor(Math.random() * 3)],
    };
    
    return c.json({ success: true, data: pricingData });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Check availability across multiple vendors
app.post("/make-server-57095a78/materials/availability", async (c) => {
  try {
    const body = await c.req.json();
    const { materialName, sku } = body;
    
    const VENDOR_APIS = [
      { name: 'Home Depot', key: 'home-depot' },
      { name: "Lowe's", key: 'lowes' },
      { name: 'Ferguson', key: 'ferguson' },
      { name: 'Grainger', key: 'grainger' },
    ];
    
    const availabilityData = VENDOR_APIS.map(vendor => ({
      vendor: vendor.name,
      vendorKey: vendor.key,
      available: Math.random() > 0.3,
      price: (Math.random() * 500 + 50).toFixed(2),
      quantity: Math.floor(Math.random() * 500),
      leadTime: Math.random() > 0.7 ? `${Math.floor(Math.random() * 14 + 1)} days` : 'Same day',
      shippingCost: (Math.random() * 50).toFixed(2),
      lastChecked: new Date().toISOString(),
    }));
    
    // Sort by price
    availabilityData.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return c.json({ success: true, data: availabilityData });
  } catch (error) {
    console.error('Error checking availability:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Bulk import materials
app.post("/make-server-57095a78/materials/bulk-import", async (c) => {
  try {
    const body = await c.req.json();
    const { materials } = body;
    
    const imported = [];
    
    for (const material of materials) {
      const newMaterial = {
        ...material,
        id: material.id || `MAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        importedAt: new Date().toISOString(),
        status: 'active',
      };
      
      await kv.set(`material:${newMaterial.id}`, newMaterial);
      imported.push(newMaterial);
    }
    
    return c.json({ success: true, imported, count: imported.length });
  } catch (error) {
    console.error('Error bulk importing materials:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Helper function to generate API keys
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Helper function to generate verification token
function generateVerificationToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================================
// DOMAIN MANAGEMENT
// ============================================================================

// Get all domains
app.get("/make-server-57095a78/domains", async (c) => {
  try {
    console.log("📡 Fetching all domains");
    const domains = await kv.getByPrefix("domain:");
    
    // Ensure we always return a valid array
    const validDomains = Array.isArray(domains) ? domains : [];
    
    console.log(`✅ Found ${validDomains.length} domains`);
    return c.json(validDomains);
  } catch (error) {
    console.error("❌ Error fetching domains:", error);
    return c.json({ error: "Failed to fetch domains", details: error.message }, 500);
  }
});

// Add new domain
app.post("/make-server-57095a78/domains", async (c) => {
  try {
    const { domain, verificationMethod } = await c.req.json();
    
    console.log(`🌐 Adding new domain: ${domain}`);
    
    // Check if domain already exists
    const existingDomains = await kv.getByPrefix("domain:");
    const domainExists = existingDomains.some((d: any) => d.domain === domain);
    
    if (domainExists) {
      return c.json({ error: "Domain already exists" }, 400);
    }
    
    // Generate unique ID and verification token
    const domainId = `domain:${Date.now()}`;
    const verificationToken = generateVerificationToken();
    
    // Determine if this should be primary (first domain)
    const isPrimary = existingDomains.length === 0;
    
    // Create domain configuration
    const domainConfig = {
      id: domainId,
      domain,
      status: 'pending',
      isPrimary,
      sslEnabled: false,
      verificationToken,
      verificationMethod: verificationMethod || 'dns',
      dnsRecords: [
        {
          type: 'CNAME',
          name: '@',
          value: 'plzsvzwwcdopnawtiwzm.supabase.co',
          ttl: 3600
        },
        {
          type: 'CNAME',
          name: 'www',
          value: 'plzsvzwwcdopnawtiwzm.supabase.co',
          ttl: 3600
        },
        {
          type: 'TXT',
          name: '_domain-verification',
          value: `domain-verification=${verificationToken}`,
          ttl: 3600
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(domainId, domainConfig);
    console.log(`✅ Domain added: ${domain}`);
    
    return c.json(domainConfig);
  } catch (error) {
    console.error("❌ Error adding domain:", error);
    return c.json({ 
      error: "Failed to add domain",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Verify domain
app.post("/make-server-57095a78/domains/:id/verify", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`🔍 Verifying domain: ${id}`);
    
    const domain = await kv.get(id);
    if (!domain) {
      return c.json({ error: "Domain not found" }, 404);
    }
    
    // In a real implementation, this would check DNS records or HTML file
    // For now, we'll simulate verification
    
    // Simulate DNS check (in production, use DNS lookup library)
    const verified = true; // Placeholder - would actually check DNS
    
    if (verified) {
      const updated = {
        ...domain,
        status: 'verified',
        sslEnabled: true,
        verifiedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(id, updated);
      console.log(`✅ Domain verified: ${domain.domain}`);
      
      return c.json({ verified: true, domain: updated });
    } else {
      const updated = {
        ...domain,
        status: 'failed',
        lastChecked: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(id, updated);
      console.log(`❌ Domain verification failed: ${domain.domain}`);
      
      return c.json({ 
        verified: false, 
        error: "DNS records not configured correctly. Please check your DNS settings."
      });
    }
  } catch (error) {
    console.error("❌ Error verifying domain:", error);
    return c.json({ 
      verified: false,
      error: "Failed to verify domain" 
    }, 500);
  }
});

// Set primary domain
app.post("/make-server-57095a78/domains/:id/set-primary", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`⭐ Setting primary domain: ${id}`);
    
    const domain = await kv.get(id);
    if (!domain) {
      return c.json({ error: "Domain not found" }, 404);
    }
    
    if (domain.status !== 'verified') {
      return c.json({ error: "Can only set verified domains as primary" }, 400);
    }
    
    // Remove primary flag from all domains
    const allDomains = await kv.getByPrefix("domain:");
    for (const d of allDomains) {
      if (d.isPrimary && d.id !== id) {
        await kv.set(d.id, {
          ...d,
          isPrimary: false,
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    // Set this domain as primary
    const updated = {
      ...domain,
      isPrimary: true,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(id, updated);
    console.log(`✅ Primary domain set: ${domain.domain}`);
    
    return c.json({ success: true, domain: updated });
  } catch (error) {
    console.error("❌ Error setting primary domain:", error);
    return c.json({ error: "Failed to set primary domain" }, 500);
  }
});

// Delete domain
app.delete("/make-server-57095a78/domains/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`🗑️  Deleting domain: ${id}`);
    
    const domain = await kv.get(id);
    if (!domain) {
      return c.json({ error: "Domain not found" }, 404);
    }
    
    if (domain.isPrimary) {
      return c.json({ error: "Cannot delete primary domain. Set another domain as primary first." }, 400);
    }
    
    await kv.del(id);
    console.log(`✅ Domain deleted: ${domain.domain}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting domain:", error);
    return c.json({ error: "Failed to delete domain" }, 500);
  }
});

// Check DNS configuration
app.get("/make-server-57095a78/domains/check-dns", async (c) => {
  try {
    const domain = c.req.query("domain");
    
    if (!domain) {
      return c.json({ error: "Domain parameter required" }, 400);
    }
    
    console.log(`🔍 Checking DNS for: ${domain}`);
    
    // In a real implementation, this would perform actual DNS lookups
    // For now, we'll simulate it
    const configured = Math.random() > 0.5; // Placeholder
    
    return c.json({
      configured,
      records: [
        { type: 'CNAME', configured: configured },
        { type: 'TXT', configured: configured }
      ]
    });
  } catch (error) {
    console.error("❌ Error checking DNS:", error);
    return c.json({ error: "Failed to check DNS" }, 500);
  }
});

// Export all domains
app.get("/make-server-57095a78/domains/export", async (c) => {
  try {
    console.log("📦 Exporting all domains");
    const domains = await kv.getByPrefix("domain:");
    
    // Clean up domain data for export (remove sensitive info)
    const exportData = domains.map((d: any) => ({
      domain: d.domain,
      status: d.status,
      isPrimary: d.isPrimary,
      sslEnabled: d.sslEnabled,
      verificationMethod: d.verificationMethod,
      createdAt: d.createdAt,
      verifiedAt: d.verifiedAt,
      lastChecked: d.lastChecked
    }));
    
    console.log(`✅ Exported ${exportData.length} domains`);
    return c.json(exportData);
  } catch (error) {
    console.error("❌ Error exporting domains:", error);
    return c.json({ error: "Failed to export domains" }, 500);
  }
});

// Bulk import domains
app.post("/make-server-57095a78/domains/bulk-import", async (c) => {
  try {
    const { domains: domainsToImport } = await c.req.json();
    
    if (!Array.isArray(domainsToImport)) {
      return c.json({ error: "Domains must be an array" }, 400);
    }
    
    console.log(`📥 Bulk importing ${domainsToImport.length} domains`);
    
    const results = {
      success: [] as string[],
      failed: [] as { domain: string; error: string }[],
      skipped: [] as string[]
    };
    
    // Get existing domains to check for duplicates
    const existingDomains = await kv.getByPrefix("domain:");
    const existingDomainNames = existingDomains.map((d: any) => d.domain);
    
    for (const domainData of domainsToImport) {
      try {
        if (!domainData.domain) {
          results.failed.push({ domain: 'unknown', error: 'Missing domain name' });
          continue;
        }
        
        // Check if domain already exists
        if (existingDomainNames.includes(domainData.domain)) {
          results.skipped.push(domainData.domain);
          continue;
        }
        
        // Generate unique ID and verification token
        const domainId = `domain:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const verificationToken = generateVerificationToken();
        
        // Create domain configuration
        const domainConfig = {
          id: domainId,
          domain: domainData.domain,
          status: 'pending',
          isPrimary: false,
          sslEnabled: false,
          verificationToken,
          verificationMethod: domainData.verificationMethod || 'dns',
          dnsRecords: [
            {
              type: 'CNAME',
              name: '@',
              value: 'plzsvzwwcdopnawtiwzm.supabase.co',
              ttl: 3600
            },
            {
              type: 'CNAME',
              name: 'www',
              value: 'plzsvzwwcdopnawtiwzm.supabase.co',
              ttl: 3600
            },
            {
              type: 'TXT',
              name: '_domain-verification',
              value: `domain-verification=${verificationToken}`,
              ttl: 3600
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await kv.set(domainId, domainConfig);
        results.success.push(domainData.domain);
        
      } catch (error) {
        results.failed.push({ 
          domain: domainData.domain, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`✅ Bulk import complete: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`);
    
    return c.json({
      success: true,
      results,
      summary: {
        total: domainsToImport.length,
        imported: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      }
    });
  } catch (error) {
    console.error("❌ Error bulk importing domains:", error);
    return c.json({ 
      error: "Failed to bulk import domains",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Bulk verify domains
app.post("/make-server-57095a78/domains/bulk-verify", async (c) => {
  try {
    const { domainIds } = await c.req.json();
    
    if (!Array.isArray(domainIds)) {
      return c.json({ error: "Domain IDs must be an array" }, 400);
    }
    
    console.log(`🔍 Bulk verifying ${domainIds.length} domains`);
    
    const results = {
      verified: [] as string[],
      failed: [] as string[]
    };
    
    for (const id of domainIds) {
      try {
        const domain = await kv.get(id);
        if (!domain) {
          results.failed.push(id);
          continue;
        }
        
        // Simulate verification (in production, check actual DNS)
        const verified = true;
        
        if (verified) {
          const updated = {
            ...domain,
            status: 'verified',
            sslEnabled: true,
            verifiedAt: new Date().toISOString(),
            lastChecked: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await kv.set(id, updated);
          results.verified.push(domain.domain);
        } else {
          results.failed.push(domain.domain);
        }
      } catch (error) {
        results.failed.push(id);
      }
    }
    
    console.log(`✅ Bulk verification complete: ${results.verified.length} verified, ${results.failed.length} failed`);
    
    return c.json({
      success: true,
      results,
      summary: {
        total: domainIds.length,
        verified: results.verified.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    console.error("❌ Error bulk verifying domains:", error);
    return c.json({ error: "Failed to bulk verify domains" }, 500);
  }
});

// Bulk delete domains
app.post("/make-server-57095a78/domains/bulk-delete", async (c) => {
  try {
    const { domainIds } = await c.req.json();
    
    if (!Array.isArray(domainIds)) {
      return c.json({ error: "Domain IDs must be an array" }, 400);
    }
    
    console.log(`🗑️  Bulk deleting ${domainIds.length} domains`);
    
    const results = {
      deleted: [] as string[],
      failed: [] as { domain: string; error: string }[]
    };
    
    for (const id of domainIds) {
      try {
        const domain = await kv.get(id);
        if (!domain) {
          results.failed.push({ domain: id, error: 'Domain not found' });
          continue;
        }
        
        if (domain.isPrimary) {
          results.failed.push({ domain: domain.domain, error: 'Cannot delete primary domain' });
          continue;
        }
        
        await kv.del(id);
        results.deleted.push(domain.domain);
      } catch (error) {
        results.failed.push({ 
          domain: id, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`✅ Bulk deletion complete: ${results.deleted.length} deleted, ${results.failed.length} failed`);
    
    return c.json({
      success: true,
      results,
      summary: {
        total: domainIds.length,
        deleted: results.deleted.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    console.error("❌ Error bulk deleting domains:", error);
    return c.json({ error: "Failed to bulk delete domains" }, 500);
  }
});

// ============================================================================
// EMAIL SENDING
// ============================================================================

// Send invoice email
app.post("/make-server-57095a78/send-invoice-email", async (c) => {
  try {
    const { to, subject, body, attachmentBase64, attachmentName } = await c.req.json();
    
    console.log(`📧 Sending invoice email to: ${to}`);
    
    // For now, we'll simulate email sending since actual email requires SMTP setup
    // In production, you would integrate with SendGrid, AWS SES, or similar service
    
    // Log the email details
    console.log("Email Details:");
    console.log("  To:", to);
    console.log("  Subject:", subject);
    console.log("  Body length:", body?.length || 0);
    console.log("  Has attachment:", !!attachmentBase64);
    console.log("  Attachment name:", attachmentName);
    
    // Store email in KV for history
    const emailId = `email:${Date.now()}`;
    const emailRecord = {
      id: emailId,
      to,
      subject,
      body,
      hasAttachment: !!attachmentBase64,
      attachmentName,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };
    
    await kv.set(emailId, emailRecord);
    
    // TODO: Actual email integration
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'));
    // const msg = {
    //   to,
    //   from: 'billing@yourdomain.com',
    //   subject,
    //   html: body,
    //   attachments: attachmentBase64 ? [{
    //     content: attachmentBase64.split(',')[1],
    //     filename: attachmentName,
    //     type: 'application/pdf',
    //     disposition: 'attachment'
    //   }] : []
    // };
    // await sgMail.send(msg);
    
    console.log("✅ Email logged successfully (simulated send)");
    
    return c.json({
      success: true,
      message: "Email logged successfully. In production, this would send via SMTP/SendGrid.",
      emailId,
      note: "To enable actual email sending, configure SMTP settings or integrate with SendGrid/AWS SES."
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return c.json({ 
      error: "Failed to send email", 
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get email history
app.get("/make-server-57095a78/emails", async (c) => {
  try {
    const emails = await kv.getByPrefix("email:");
    return c.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return c.json({ error: "Failed to fetch email history" }, 500);
  }
});

// ============================================================================
// SERVICES
// ============================================================================

// Get all services
app.get("/make-server-57095a78/services", async (c) => {
  try {
    const services = await kv.getByPrefix("service:");
    return c.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return c.json({ error: "Failed to fetch services" }, 500);
  }
});

// Get single service
app.get("/make-server-57095a78/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const service = await kv.get(`service:${id}`);
    if (!service) {
      return c.json({ error: "Service not found" }, 404);
    }
    return c.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    return c.json({ error: "Failed to fetch service" }, 500);
  }
});

// Create service
app.post("/make-server-57095a78/services", async (c) => {
  try {
    const data = await c.req.json();
    const id = `SVC-${Date.now()}`;
    const service = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`service:${id}`, service);
    console.log("Created service:", id);
    return c.json(service);
  } catch (error) {
    console.error("Error creating service:", error);
    return c.json({ error: "Failed to create service" }, 500);
  }
});

// Update service
app.put("/make-server-57095a78/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`service:${id}`);
    if (!existing) {
      return c.json({ error: "Service not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`service:${id}`, updated);
    console.log("Updated service:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating service:", error);
    return c.json({ error: "Failed to update service" }, 500);
  }
});

// Delete service
app.delete("/make-server-57095a78/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`service:${id}`);
    console.log("Deleted service:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return c.json({ error: "Failed to delete service" }, 500);
  }
});

// ============================================================================
// USERS
// ============================================================================

// Get all users
app.get("/make-server-57095a78/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    return c.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get single user
app.get("/make-server-57095a78/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// Create user
app.post("/make-server-57095a78/users", async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id || `USR-${Date.now()}`;
    const user = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`user:${id}`, user);
    console.log("Created user:", id);
    return c.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Update user
app.put("/make-server-57095a78/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`user:${id}`);
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`user:${id}`, updated);
    console.log("Updated user:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

// Delete user
app.delete("/make-server-57095a78/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`user:${id}`);
    console.log("Deleted user:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// ============================================================================
// QUOTES
// ============================================================================

// Get all quotes
app.get("/make-server-57095a78/quotes", async (c) => {
  try {
    console.log("📋 Fetching all quotes...");
    const userId = c.req.query('userId');
    const quotes = await kv.getByPrefix("quote:");

    // CRITICAL: Filter by userId - each user should only see their own quotes
    let filtered = Array.isArray(quotes) ? quotes : [];
    if (userId) {
      filtered = filtered.filter((quote: any) =>
        quote.userId === userId ||
        quote.user_id === userId ||
        quote.customerId === userId ||
        quote.customer_id === userId
      );
      console.log(`✅ Filtered quotes for user ${userId}: ${filtered.length} of ${quotes.length} total`);
    }

    console.log(`✅ Found ${filtered.length} quotes`);
    return c.json(filtered);
  } catch (error) {
    console.error("❌ Error fetching quotes:", error);
    return c.json({ error: `Failed to fetch quotes: ${error.message}` }, 500);
  }
});

// Get single quote
app.get("/make-server-57095a78/quotes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const quote = await kv.get(`quote:${id}`);
    if (!quote) {
      return c.json({ error: "Quote not found" }, 404);
    }
    return c.json(quote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    return c.json({ error: "Failed to fetch quote" }, 500);
  }
});

// Create quote
app.post("/make-server-57095a78/quotes", async (c) => {
  try {
    const data = await c.req.json();
    const id = `QUO-${Date.now()}`;
    const quote = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`quote:${id}`, quote);
    console.log("Created quote:", id);
    return c.json(quote);
  } catch (error) {
    console.error("Error creating quote:", error);
    return c.json({ error: "Failed to create quote" }, 500);
  }
});

// Delete quote
app.delete("/make-server-57095a78/quotes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`quote:${id}`);
    console.log("Deleted quote:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting quote:", error);
    return c.json({ error: "Failed to delete quote" }, 500);
  }
});

// ============================================================================
// TIME ENTRIES
// ============================================================================

// Get all time entries
app.get("/make-server-57095a78/time-entries", async (c) => {
  try {
    const timeEntries = await kv.getByPrefix("time_entry:");
    return c.json(timeEntries);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return c.json({ error: "Failed to fetch time entries" }, 500);
  }
});

// Get single time entry
app.get("/make-server-57095a78/time-entries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const timeEntry = await kv.get(`time_entry:${id}`);
    if (!timeEntry) {
      return c.json({ error: "Time entry not found" }, 404);
    }
    return c.json(timeEntry);
  } catch (error) {
    console.error("Error fetching time entry:", error);
    return c.json({ error: "Failed to fetch time entry" }, 500);
  }
});

// Create time entry
app.post("/make-server-57095a78/time-entries", async (c) => {
  try {
    const data = await c.req.json();
    const id = `TE-${Date.now()}`;
    const timeEntry = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`time_entry:${id}`, timeEntry);
    console.log("Created time entry:", id);
    return c.json(timeEntry);
  } catch (error) {
    console.error("Error creating time entry:", error);
    return c.json({ error: "Failed to create time entry" }, 500);
  }
});

// Update time entry
app.put("/make-server-57095a78/time-entries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`time_entry:${id}`);
    if (!existing) {
      return c.json({ error: "Time entry not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`time_entry:${id}`, updated);
    console.log("Updated time entry:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating time entry:", error);
    return c.json({ error: "Failed to update time entry" }, 500);
  }
});

// Delete time entry
app.delete("/make-server-57095a78/time-entries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`time_entry:${id}`);
    console.log("Deleted time entry:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return c.json({ error: "Failed to delete time entry" }, 500);
  }
});

// ============================================================================
// DATA MANAGEMENT - Clear all test data
// ============================================================================

// Clear all data (DANGER: This will delete everything!)
app.post("/make-server-57095a78/admin/clear-all-data", async (c) => {
  try {
    console.log("🗑️  CLEARING ALL DATA - This will delete everything!");
    
    // Define all prefixes to clear
    const prefixes = [
      "subscription:",
      "customer:",
      "workorder:",
      "invoice:",
      "quote:",
      "referral:",
      "giftcard:",
      "gift-request:",
      "hour-transaction:",
      "subcontractor:",
      "vendor:",
      "advertiser:",
      "plan:",
      "stakeholder:",
      "project:",
      "user:",
      "role:",
      "company:",
      "domain:",
      "payment:",
      "material:",
      "catalog:",
      "crm_contact:",
      "crm_company:",
      "crm_deal:",
      "crm_property:",
      "crm_association:",
      "ai_catalog_job:",
      "ai_crm_import_job:",
      "time_entry:",
      "white_label_client:"
    ];
    
    let totalDeleted = 0;
    const deletedByPrefix: Record<string, number> = {};
    
    // Clear each prefix
    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      deletedByPrefix[prefix] = items.length;
      totalDeleted += items.length;
      
      // Delete all items with this prefix
      const keys = items.map((item: any) => {
        // Extract the key from the item
        if (item.id) {
          return `${prefix}${item.id}`;
        }
        return null;
      }).filter((key: string | null) => key !== null);
      
      if (keys.length > 0) {
        await kv.mdel(keys as string[]);
      }
      
      console.log(`  Cleared ${items.length} items with prefix: ${prefix}`);
    }
    
    console.log(`✅ Successfully cleared ${totalDeleted} total items from database`);
    
    return c.json({
      success: true,
      message: "All data has been cleared from the database",
      totalDeleted,
      deletedByPrefix,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error clearing data:", error);
    return c.json({ error: "Failed to clear data", details: error.message }, 500);
  }
});

// Get data statistics
app.get("/make-server-57095a78/admin/data-stats", async (c) => {
  try {
    const prefixes = [
      "subscription:",
      "customer:",
      "workorder:",
      "invoice:",
      "quote:",
      "referral:",
      "giftcard:",
      "gift-request:",
      "hour-transaction:",
      "subcontractor:",
      "vendor:",
      "advertiser:",
      "plan:",
      "stakeholder:",
      "project:",
      "user:",
      "role:",
      "company:",
      "domain:",
      "payment:",
      "material:",
      "catalog:",
      "crm_contact:",
      "crm_company:",
      "crm_deal:",
      "crm_property:",
      "crm_association:",
      "ai_catalog_job:",
      "ai_crm_import_job:",
      "time_entry:",
      "white_label_client:"
    ];
    
    const stats: Record<string, number> = {};
    let totalItems = 0;
    
    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      stats[prefix] = items.length;
      totalItems += items.length;
    }
    
    return c.json({
      totalItems,
      itemsByPrefix: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching data stats:", error);
    return c.json({ error: "Failed to fetch data stats" }, 500);
  }
});

// ============================================================================
// ADMIN ALERTS - Real-time monitoring support
// ============================================================================

// Create or update admin alert
app.post("/make-server-57095a78/admin-alerts", async (c) => {
  try {
    const alert = await c.req.json();
    await kv.set(`admin_alert:${alert.id}`, alert);
    console.log(`✅ Created admin alert: ${alert.title}`);
    return c.json({ success: true, alert });
  } catch (error) {
    console.error("Error creating admin alert:", error);
    return c.json({ error: "Failed to create alert" }, 500);
  }
});

// Get all admin alerts
app.get("/make-server-57095a78/admin-alerts", async (c) => {
  try {
    const alerts = await kv.getByPrefix("admin_alert:");
    return c.json(alerts);
  } catch (error) {
    console.error("Error fetching admin alerts:", error);
    return c.json({ error: "Failed to fetch alerts" }, 500);
  }
});

// ============================================================================
// BIG BOX PRODUCTS - Materials Hub Integration
// ============================================================================

import bigBoxProducts from "./bigBoxProducts.tsx";
app.route("/make-server-57095a78/big-box-products", bigBoxProducts);

// ============================================================================
// PRODUCT DATA SOURCES - Multi-Source Product Integration
// ============================================================================

import productSources from "./productSources.tsx";
app.route("/make-server-57095a78/product-sources", productSources);

// ============================================================================
// UNIFIED PRODUCT SEARCH - Search Across All Sources
// ============================================================================

import unifiedProductSearch from "./unifiedProductSearch.tsx";
app.route("/make-server-57095a78/products", unifiedProductSearch);

// ============================================================================
// SYSTEM CLEANUP - Data Management & Optimization
// ============================================================================

import cleanup from "./cleanup.tsx";
app.route("/make-server-57095a78/cleanup", cleanup);

// ============================================================================
// LABOR RATES CONFIGURATION - Quote Generation Settings
// ============================================================================

import laborRatesRouter from "./labor-rates.tsx";

// Add explicit CORS handling for labor-rates endpoints
app.options("/make-server-57095a78/labor-rates/*", (c) => {
  return c.text("", 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
});

app.route("/make-server-57095a78/labor-rates", laborRatesRouter);

// ============================================================================
// AI BLUEPRINT ANALYSIS - GPT-4 Vision Analysis
// ============================================================================

import aiBlueprintRouter from "./ai-blueprint-analysis.tsx";
app.route("/make-server-57095a78/ai", aiBlueprintRouter);

// ============================================================================
// QUOTE FROM BLUEPRINT - Auto-generate quotes from AI blueprint analysis
// ============================================================================

import quoteFromBlueprintRouter from "./quote-from-blueprint.tsx";
app.route("/make-server-57095a78/quotes", quoteFromBlueprintRouter);

// ============================================================================
// DATA BACKUP & PERSISTENCE - Prevent Data Loss
// ============================================================================

app.route("/make-server-57095a78/data", dataBackupRouter);

// ============================================================================
// OWNER EXECUTIVE DASHBOARD - Platform Owner Management
// ============================================================================

import { 
  requireOwnerAccess,
  getAllCompanies,
  getCompanyMetrics,
  updateCompanyBranding,
  getRevenueReport,
  getUsersReport,
  getAIUsageReport,
  getAccessLogs
} from "./owner-executive.tsx";

// All owner routes require owner access
app.get("/make-server-57095a78/owner/companies", requireOwnerAccess, getAllCompanies);
app.get("/make-server-57095a78/owner/company/:companyId/metrics", requireOwnerAccess, getCompanyMetrics);
app.put("/make-server-57095a78/owner/company/:companyId/branding", requireOwnerAccess, updateCompanyBranding);
app.get("/make-server-57095a78/owner/reports/revenue", requireOwnerAccess, getRevenueReport);
app.get("/make-server-57095a78/owner/reports/users", requireOwnerAccess, getUsersReport);
app.get("/make-server-57095a78/owner/reports/ai-usage", requireOwnerAccess, getAIUsageReport);
app.get("/make-server-57095a78/owner/access-logs", requireOwnerAccess, getAccessLogs);

// ============================================================================
// PAYMENT LOCKOUT & NOTIFICATION SYSTEM
// ============================================================================

// Check all accounts for overdue payments (called daily via cron or manually)
app.post("/make-server-57095a78/payment/check-overdue", async (c) => {
  try {
    console.log("🔍 Checking for overdue payment accounts...");
    
    const customers = await kv.getByPrefix("customer:");
    const now = new Date();
    const overdueAccounts = [];
    const lockedAccounts = [];
    
    for (const customer of customers) {
      if (!customer.value) continue;
      
      const lastPaymentDate = customer.value.lastPaymentDate 
        ? new Date(customer.value.lastPaymentDate) 
        : new Date(customer.value.createdAt);
      
      const daysSincePayment = Math.floor((now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = daysSincePayment - (customer.value.billingCycleDays || 30);
      
      if (daysOverdue > 0) {
        // Account is overdue
        const accountStatus = {
          customerId: customer.value.id,
          customerName: customer.value.name,
          email: customer.value.email,
          daysOverdue,
          lastPaymentDate: customer.value.lastPaymentDate,
          amountDue: customer.value.balanceDue || 0,
          isLocked: daysOverdue >= 10
        };
        
        overdueAccounts.push(accountStatus);
        
        // Lock account if 10+ days overdue
        if (daysOverdue >= 10 && !customer.value.accountLocked) {
          customer.value.accountLocked = true;
          customer.value.lockedAt = now.toISOString();
          customer.value.lockReason = `Payment overdue by ${daysOverdue} days`;
          await kv.set(`customer:${customer.value.id}`, customer.value);
          lockedAccounts.push(accountStatus);
          console.log(`🔒 Locked account: ${customer.value.name} (${daysOverdue} days overdue)`);
        }
        
        // Record notification
        const notificationId = `notification:${customer.value.id}:${Date.now()}`;
        await kv.set(notificationId, {
          customerId: customer.value.id,
          type: daysOverdue >= 10 ? 'account_locked' : 'payment_overdue',
          message: daysOverdue >= 10 
            ? `Your account has been locked due to payment overdue by ${daysOverdue} days. Please contact us immediately.`
            : `Your payment is ${daysOverdue} days overdue. Please make a payment to avoid service interruption.`,
          daysOverdue,
          amountDue: customer.value.balanceDue || 0,
          sentAt: now.toISOString(),
          read: false
        });
      }
    }
    
    console.log(`✅ Payment check complete: ${overdueAccounts.length} overdue, ${lockedAccounts.length} newly locked`);
    
    return c.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        totalChecked: customers.length,
        overdueAccounts: overdueAccounts.length,
        newlyLocked: lockedAccounts.length
      },
      overdueAccounts,
      lockedAccounts
    });
  } catch (error) {
    console.error("❌ Error checking overdue payments:", error);
    return c.json({ error: "Failed to check overdue payments", details: error.message }, 500);
  }
});

// Get customer account status (check if locked)
app.get("/make-server-57095a78/payment/account-status/:customerId", async (c) => {
  try {
    const customerId = c.req.param("customerId");
    const customer = await kv.get(`customer:${customerId}`);
    
    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    
    const lastPaymentDate = customer.lastPaymentDate 
      ? new Date(customer.lastPaymentDate) 
      : new Date(customer.createdAt);
    
    const now = new Date();
    const daysSincePayment = Math.floor((now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysOverdue = daysSincePayment - (customer.billingCycleDays || 30);
    
    return c.json({
      customerId: customer.id,
      customerName: customer.name,
      accountLocked: customer.accountLocked || false,
      lockedAt: customer.lockedAt || null,
      lockReason: customer.lockReason || null,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      lastPaymentDate: customer.lastPaymentDate,
      balanceDue: customer.balanceDue || 0,
      billingCycleDays: customer.billingCycleDays || 30,
      willLockInDays: daysOverdue > 0 && daysOverdue < 10 ? 10 - daysOverdue : 0
    });
  } catch (error) {
    console.error("❌ Error fetching account status:", error);
    return c.json({ error: "Failed to fetch account status", details: error.message }, 500);
  }
});

// Get notifications for a customer
app.get("/make-server-57095a78/payment/notifications/:customerId", async (c) => {
  try {
    const customerId = c.req.param("customerId");
    const allNotifications = await kv.getByPrefix("notification:");
    
    const customerNotifications = allNotifications
      .filter(n => n.value && n.value.customerId === customerId)
      .map(n => n.value)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    
    return c.json(customerNotifications);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return c.json({ error: "Failed to fetch notifications", details: error.message }, 500);
  }
});

// Unlock account (owner/admin only - manual override)
app.post("/make-server-57095a78/payment/unlock-account/:customerId", async (c) => {
  try {
    const customerId = c.req.param("customerId");
    const customer = await kv.get(`customer:${customerId}`);
    
    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    
    customer.accountLocked = false;
    customer.unlockedAt = new Date().toISOString();
    customer.lockReason = null;
    await kv.set(`customer:${customerId}`, customer);
    
    // Create unlock notification
    const notificationId = `notification:${customerId}:${Date.now()}`;
    await kv.set(notificationId, {
      customerId,
      type: 'account_unlocked',
      message: 'Your account has been unlocked. Thank you for your payment.',
      sentAt: new Date().toISOString(),
      read: false
    });
    
    console.log(`🔓 Unlocked account: ${customer.name}`);
    
    return c.json({ 
      success: true, 
      message: "Account unlocked successfully",
      customer 
    });
  } catch (error) {
    console.error("❌ Error unlocking account:", error);
    return c.json({ error: "Failed to unlock account", details: error.message }, 500);
  }
});

// Get all overdue accounts (for dashboard monitoring)
app.get("/make-server-57095a78/payment/overdue-accounts", async (c) => {
  try {
    const customers = await kv.getByPrefix("customer:");
    const now = new Date();
    const overdueAccounts = [];
    
    for (const customer of customers) {
      if (!customer.value) continue;
      
      const lastPaymentDate = customer.value.lastPaymentDate 
        ? new Date(customer.value.lastPaymentDate) 
        : new Date(customer.value.createdAt);
      
      const daysSincePayment = Math.floor((now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = daysSincePayment - (customer.value.billingCycleDays || 30);
      
      if (daysOverdue > 0) {
        overdueAccounts.push({
          customerId: customer.value.id,
          customerName: customer.value.name,
          email: customer.value.email,
          phone: customer.value.phone,
          daysOverdue,
          lastPaymentDate: customer.value.lastPaymentDate,
          amountDue: customer.value.balanceDue || 0,
          accountLocked: customer.value.accountLocked || false,
          lockedAt: customer.value.lockedAt || null,
          willLockInDays: daysOverdue < 10 ? 10 - daysOverdue : 0
        });
      }
    }
    
    // Sort by days overdue (most critical first)
    overdueAccounts.sort((a, b) => b.daysOverdue - a.daysOverdue);
    
    return c.json({
      totalOverdue: overdueAccounts.length,
      totalLocked: overdueAccounts.filter(a => a.accountLocked).length,
      criticalAccounts: overdueAccounts.filter(a => a.daysOverdue >= 10).length,
      warningAccounts: overdueAccounts.filter(a => a.daysOverdue < 10).length,
      accounts: overdueAccounts
    });
  } catch (error) {
    console.error("❌ Error fetching overdue accounts:", error);
    return c.json({ error: "Failed to fetch overdue accounts", details: error.message }, 500);
  }
});

// Record a payment and unlock if applicable
app.post("/make-server-57095a78/payment/record-payment", async (c) => {
  try {
    const { customerId, amount, paymentMethod, invoiceId } = await c.req.json();
    
    if (!customerId || !amount) {
      return c.json({ error: "customerId and amount are required" }, 400);
    }
    
    const customer = await kv.get(`customer:${customerId}`);
    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }
    
    const now = new Date();
    
    // Update customer payment info
    customer.lastPaymentDate = now.toISOString();
    customer.balanceDue = Math.max(0, (customer.balanceDue || 0) - amount);
    
    // Unlock if locked and balance is paid
    const wasLocked = customer.accountLocked;
    if (customer.accountLocked && customer.balanceDue === 0) {
      customer.accountLocked = false;
      customer.unlockedAt = now.toISOString();
      customer.lockReason = null;
    }
    
    await kv.set(`customer:${customerId}`, customer);
    
    // Record payment transaction
    const paymentId = `payment:${customerId}:${Date.now()}`;
    await kv.set(paymentId, {
      id: paymentId,
      customerId,
      amount,
      paymentMethod: paymentMethod || 'unknown',
      invoiceId: invoiceId || null,
      recordedAt: now.toISOString(),
      unlockedAccount: wasLocked
    });
    
    // Create payment received notification
    const notificationId = `notification:${customerId}:${Date.now()}`;
    await kv.set(notificationId, {
      customerId,
      type: 'payment_received',
      message: wasLocked 
        ? `Payment of $${amount} received. Your account has been unlocked.`
        : `Payment of $${amount} received. Thank you!`,
      amount,
      sentAt: now.toISOString(),
      read: false
    });
    
    console.log(`💰 Payment recorded: ${customer.name} - $${amount}${wasLocked ? ' (account unlocked)' : ''}`);
    
    return c.json({
      success: true,
      payment: {
        id: paymentId,
        amount,
        customerId,
        recordedAt: now.toISOString()
      },
      customer: {
        id: customer.id,
        name: customer.name,
        balanceDue: customer.balanceDue,
        accountLocked: customer.accountLocked,
        wasUnlocked: wasLocked
      }
    });
  } catch (error) {
    console.error("❌ Error recording payment:", error);
    return c.json({ error: "Failed to record payment", details: error.message }, 500);
  }
});

// ============================================================================
// WASTE & DISPOSAL TRACKING
// ============================================================================

// Get all waste entries
app.get("/make-server-57095a78/waste-entries", async (c) => {
  try {
    const entries = await kv.getByPrefix("waste-entry:");
    return c.json(entries);
  } catch (error) {
    console.error("Error fetching waste entries:", error);
    return c.json({ error: "Failed to fetch waste entries" }, 500);
  }
});

// Create waste entry
app.post("/make-server-57095a78/waste-entries", async (c) => {
  try {
    const data = await c.req.json();
    const id = `WE-${Date.now()}`;
    const entry = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`waste-entry:${id}`, entry);
    console.log("Created waste entry:", id);
    return c.json(entry);
  } catch (error) {
    console.error("Error creating waste entry:", error);
    return c.json({ error: "Failed to create waste entry" }, 500);
  }
});

// Update waste entry
app.put("/make-server-57095a78/waste-entries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`waste-entry:${id}`);
    if (!existing) {
      return c.json({ error: "Waste entry not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`waste-entry:${id}`, updated);
    console.log("Updated waste entry:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating waste entry:", error);
    return c.json({ error: "Failed to update waste entry" }, 500);
  }
});

// Get dump runs
app.get("/make-server-57095a78/dump-runs", async (c) => {
  try {
    const runs = await kv.getByPrefix("dump-run:");
    return c.json(runs);
  } catch (error) {
    console.error("Error fetching dump runs:", error);
    return c.json({ error: "Failed to fetch dump runs" }, 500);
  }
});

// Create dump run
app.post("/make-server-57095a78/dump-runs", async (c) => {
  try {
    const data = await c.req.json();
    const id = `DR-${Date.now()}`;
    const run = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`dump-run:${id}`, run);
    console.log("Created dump run:", id);
    return c.json(run);
  } catch (error) {
    console.error("Error creating dump run:", error);
    return c.json({ error: "Failed to create dump run" }, 500);
  }
});

// ============================================================================
// CHANGE ORDERS
// ============================================================================

// Get all change orders
app.get("/make-server-57095a78/change-orders", async (c) => {
  try {
    const orders = await kv.getByPrefix("change-order:");
    return c.json(orders);
  } catch (error) {
    console.error("Error fetching change orders:", error);
    return c.json({ error: "Failed to fetch change orders" }, 500);
  }
});

// Get single change order
app.get("/make-server-57095a78/change-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const order = await kv.get(`change-order:${id}`);
    if (!order) {
      return c.json({ error: "Change order not found" }, 404);
    }
    return c.json(order);
  } catch (error) {
    console.error("Error fetching change order:", error);
    return c.json({ error: "Failed to fetch change order" }, 500);
  }
});

// Create change order
app.post("/make-server-57095a78/change-orders", async (c) => {
  try {
    const data = await c.req.json();
    const id = `CO-${Date.now()}`;
    const order = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`change-order:${id}`, order);
    console.log("Created change order:", id);
    return c.json(order);
  } catch (error) {
    console.error("Error creating change order:", error);
    return c.json({ error: "Failed to create change order" }, 500);
  }
});

// Update change order (approval/rejection)
app.put("/make-server-57095a78/change-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`change-order:${id}`);
    if (!existing) {
      return c.json({ error: "Change order not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`change-order:${id}`, updated);
    console.log("Updated change order:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating change order:", error);
    return c.json({ error: "Failed to update change order" }, 500);
  }
});

// Approve change order
app.post("/make-server-57095a78/change-orders/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const { approvedBy, notes } = await c.req.json();
    const order = await kv.get(`change-order:${id}`);
    if (!order) {
      return c.json({ error: "Change order not found" }, 404);
    }
    const updated = {
      ...order,
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
      approvalNotes: notes,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`change-order:${id}`, updated);
    console.log("Approved change order:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error approving change order:", error);
    return c.json({ error: "Failed to approve change order" }, 500);
  }
});

// Reject change order
app.post("/make-server-57095a78/change-orders/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const { reason } = await c.req.json();
    const order = await kv.get(`change-order:${id}`);
    if (!order) {
      return c.json({ error: "Change order not found" }, 404);
    }
    const updated = {
      ...order,
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`change-order:${id}`, updated);
    console.log("Rejected change order:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error rejecting change order:", error);
    return c.json({ error: "Failed to reject change order" }, 500);
  }
});

// ============================================================================
// WEATHER & JOB DELAY TRACKING
// ============================================================================

// Get all job sites
app.get("/make-server-57095a78/job-sites", async (c) => {
  try {
    const sites = await kv.getByPrefix("job-site:");
    return c.json(sites);
  } catch (error) {
    console.error("Error fetching job sites:", error);
    return c.json({ error: "Failed to fetch job sites" }, 500);
  }
});

// Get weather alerts
app.get("/make-server-57095a78/weather-alerts", async (c) => {
  try {
    const alerts = await kv.getByPrefix("weather-alert:");
    return c.json(alerts);
  } catch (error) {
    console.error("Error fetching weather alerts:", error);
    return c.json({ error: "Failed to fetch weather alerts" }, 500);
  }
});

// Acknowledge weather alert
app.post("/make-server-57095a78/weather-alerts/:id/acknowledge", async (c) => {
  try {
    const id = c.req.param("id");
    const alert = await kv.get(`weather-alert:${id}`);
    if (!alert) {
      return c.json({ error: "Alert not found" }, 404);
    }
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    await kv.set(`weather-alert:${id}`, alert);
    console.log("Acknowledged weather alert:", id);
    return c.json(alert);
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    return c.json({ error: "Failed to acknowledge alert" }, 500);
  }
});

// Get all job delays
app.get("/make-server-57095a78/job-delays", async (c) => {
  try {
    const delays = await kv.getByPrefix("job-delay:");
    return c.json(delays);
  } catch (error) {
    console.error("Error fetching job delays:", error);
    return c.json({ error: "Failed to fetch job delays" }, 500);
  }
});

// Create job delay
app.post("/make-server-57095a78/job-delays", async (c) => {
  try {
    const data = await c.req.json();
    const id = `JD-${Date.now()}`;
    const delay = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`job-delay:${id}`, delay);
    console.log("Created job delay:", id);
    return c.json(delay);
  } catch (error) {
    console.error("Error creating job delay:", error);
    return c.json({ error: "Failed to create job delay" }, 500);
  }
});

// Update job delay
app.put("/make-server-57095a78/job-delays/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`job-delay:${id}`);
    if (!existing) {
      return c.json({ error: "Job delay not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`job-delay:${id}`, updated);
    console.log("Updated job delay:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating job delay:", error);
    return c.json({ error: "Failed to update job delay" }, 500);
  }
});

// Get schedule adjustments
app.get("/make-server-57095a78/schedule-adjustments", async (c) => {
  try {
    const adjustments = await kv.getByPrefix("schedule-adjustment:");
    return c.json(adjustments);
  } catch (error) {
    console.error("Error fetching schedule adjustments:", error);
    return c.json({ error: "Failed to fetch schedule adjustments" }, 500);
  }
});

// Create schedule adjustment
app.post("/make-server-57095a78/schedule-adjustments", async (c) => {
  try {
    const data = await c.req.json();
    const id = `SA-${Date.now()}`;
    const adjustment = {
      ...data,
      id,
      status: 'suggested',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`schedule-adjustment:${id}`, adjustment);
    console.log("Created schedule adjustment:", id);
    return c.json(adjustment);
  } catch (error) {
    console.error("Error creating schedule adjustment:", error);
    return c.json({ error: "Failed to create schedule adjustment" }, 500);
  }
});

// Approve/reject schedule adjustment
app.put("/make-server-57095a78/schedule-adjustments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { status, notes } = await c.req.json();
    const adjustment = await kv.get(`schedule-adjustment:${id}`);
    if (!adjustment) {
      return c.json({ error: "Schedule adjustment not found" }, 404);
    }
    const updated = {
      ...adjustment,
      status,
      notes,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`schedule-adjustment:${id}`, updated);
    console.log("Updated schedule adjustment:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating schedule adjustment:", error);
    return c.json({ error: "Failed to update schedule adjustment" }, 500);
  }
});

// ============================================================================
// CHANGE ORDERS API
// ============================================================================

// Get all change orders
app.get("/make-server-57095a78/change-orders", async (c) => {
  try {
    console.log("📝 Fetching change orders");
    const orders = await kv.getByPrefix("change_order:");
    return c.json({ success: true, changeOrders: orders });
  } catch (error) {
    console.error("❌ Error fetching change orders:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single change order
app.get("/make-server-57095a78/change-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`📝 Fetching change order: ${id}`);
    const order = await kv.get(`change_order:${id}`);
    
    if (!order) {
      return c.json({ success: false, error: "Change order not found" }, 404);
    }
    
    return c.json({ success: true, changeOrder: order });
  } catch (error) {
    console.error("❌ Error fetching change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create change order
app.post("/make-server-57095a78/change-orders", async (c) => {
  try {
    const orderData = await c.req.json();
    const orderId = orderData.id || `co_${Date.now()}`;
    const key = `change_order:${orderId}`;
    
    const newOrder = {
      id: orderId,
      ...orderData,
      createdAt: orderData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(key, newOrder);
    console.log("✅ Change order created:", orderId);
    
    return c.json({ success: true, orderId, changeOrder: newOrder });
  } catch (error) {
    console.error("❌ Error creating change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update change order
app.put("/make-server-57095a78/change-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const key = `change_order:${id}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ success: false, error: "Change order not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(key, updated);
    console.log("✅ Change order updated:", id);
    
    return c.json({ success: true, changeOrder: updated });
  } catch (error) {
    console.error("❌ Error updating change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete change order
app.delete("/make-server-57095a78/change-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const key = `change_order:${id}`;
    
    await kv.del(key);
    console.log("✅ Change order deleted:", id);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Approve change order (admin)
app.post("/make-server-57095a78/change-orders/:id/admin-approve", async (c) => {
  try {
    const id = c.req.param("id");
    const { approvedBy } = await c.req.json();
    const key = `change_order:${id}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ success: false, error: "Change order not found" }, 404);
    }
    
    const updated = {
      ...existing,
      status: "pending_customer",
      adminApprovedBy: approvedBy || "Admin User",
      adminApprovedAt: new Date().toISOString(),
      timeline: [
        ...(existing.timeline || []),
        {
          date: new Date().toISOString(),
          action: "Admin Approved",
          by: approvedBy || "Admin User",
          note: "Approved for customer review"
        }
      ],
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(key, updated);
    console.log("✅ Change order admin approved:", id);
    
    return c.json({ success: true, changeOrder: updated });
  } catch (error) {
    console.error("❌ Error approving change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Approve change order (customer)
app.post("/make-server-57095a78/change-orders/:id/customer-approve", async (c) => {
  try {
    const id = c.req.param("id");
    const { approvedBy, signature } = await c.req.json();
    const key = `change_order:${id}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ success: false, error: "Change order not found" }, 404);
    }
    
    const updated = {
      ...existing,
      status: "customer_approved",
      customerApprovedAt: new Date().toISOString(),
      customerSignature: signature,
      timeline: [
        ...(existing.timeline || []),
        {
          date: new Date().toISOString(),
          action: "Customer Approved",
          by: approvedBy || existing.customerName,
          note: "Customer approved via portal"
        }
      ],
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(key, updated);
    console.log("✅ Change order customer approved:", id);
    
    return c.json({ success: true, changeOrder: updated });
  } catch (error) {
    console.error("❌ Error customer approving change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Reject change order
app.post("/make-server-57095a78/change-orders/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const { rejectedBy, reason } = await c.req.json();
    const key = `change_order:${id}`;
    
    const existing = await kv.get(key);
    if (!existing) {
      return c.json({ success: false, error: "Change order not found" }, 404);
    }
    
    const updated = {
      ...existing,
      status: "rejected",
      rejectedBy: rejectedBy || "User",
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      timeline: [
        ...(existing.timeline || []),
        {
          date: new Date().toISOString(),
          action: "Rejected",
          by: rejectedBy || "User",
          note: reason
        }
      ],
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(key, updated);
    console.log("✅ Change order rejected:", id);
    
    return c.json({ success: true, changeOrder: updated });
  } catch (error) {
    console.error("❌ Error rejecting change order:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-57095a78/schedule-adjustments/:id/:action", async (c) => {
  try {
    const id = c.req.param("id");
    const action = c.req.param("action");
    const adjustment = await kv.get(`schedule-adjustment:${id}`);
    if (!adjustment) {
      return c.json({ error: "Schedule adjustment not found" }, 404);
    }
    adjustment.status = action === 'approve' ? 'approved' : 'rejected';
    adjustment.updatedAt = new Date().toISOString();
    await kv.set(`schedule-adjustment:${id}`, adjustment);
    console.log(`${action}d schedule adjustment:`, id);
    return c.json(adjustment);
  } catch (error) {
    console.error("Error updating schedule adjustment:", error);
    return c.json({ error: "Failed to update schedule adjustment" }, 500);
  }
});

// ============================================
// RATING & REVIEW SYSTEM ROUTES
// ============================================

// Submit customer rating after payment
app.post("/make-server-57095a78/ratings/submit", async (c) => {
  try {
    const ratingData = await c.req.json();
    console.log("📝 Submitting customer rating:", ratingData);
    
    const ratingId = `rating:${Date.now()}`;
    
    // Store the complete rating submission
    await kv.set(ratingId, {
      id: ratingId,
      ...ratingData,
      createdAt: new Date().toISOString(),
      status: 'pending' // pending, approved, flagged
    });
    
    // Update individual worker ratings
    if (ratingData.workerRatings && Array.isArray(ratingData.workerRatings)) {
      for (const workerRating of ratingData.workerRatings) {
        const workerKey = `worker-rating:${workerRating.workerId}`;
        const existingRatings = await kv.get(workerKey) || { ratings: [], totalRatings: 0, averageRating: 0 };
        
        const newRatings = [
          ...existingRatings.ratings,
          {
            ratingId,
            rating: workerRating.rating,
            comment: workerRating.comment,
            projectName: ratingData.projectName,
            customerName: ratingData.customerName || 'Anonymous',
            date: new Date().toISOString()
          }
        ];
        
        const totalRatings = newRatings.length;
        const averageRating = newRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
        
        await kv.set(workerKey, {
          workerId: workerRating.workerId,
          workerName: workerRating.workerName,
          workerRole: workerRating.workerRole,
          ratings: newRatings,
          totalRatings,
          averageRating: Math.round(averageRating * 10) / 10,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    console.log("✅ Rating submitted successfully:", ratingId);
    return c.json({ success: true, ratingId });
  } catch (error) {
    console.error("❌ Error submitting rating:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get worker ratings
app.get("/make-server-57095a78/ratings/worker/:workerId", async (c) => {
  try {
    const workerId = c.req.param("workerId");
    console.log("📊 Fetching ratings for worker:", workerId);
    
    const workerRatings = await kv.get(`worker-rating:${workerId}`);
    
    if (!workerRatings) {
      return c.json({
        workerId,
        ratings: [],
        totalRatings: 0,
        averageRating: 0
      });
    }
    
    console.log("✅ Worker ratings retrieved:", workerId);
    return c.json(workerRatings);
  } catch (error) {
    console.error("❌ Error fetching worker ratings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all ratings (with filters)
app.get("/make-server-57095a78/ratings/all", async (c) => {
  try {
    const status = c.req.query("status"); // pending, approved, flagged, all
    console.log("📋 Fetching all ratings, status filter:", status);
    
    const allRatings = await kv.getByPrefix("rating:");
    
    let filteredRatings = allRatings;
    if (status && status !== 'all') {
      filteredRatings = allRatings.filter((r: any) => r.status === status);
    }
    
    console.log(`✅ Retrieved ${filteredRatings.length} ratings`);
    return c.json({ ratings: filteredRatings, total: filteredRatings.length });
  } catch (error) {
    console.error("❌ Error fetching ratings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update rating status (approve/flag)
app.put("/make-server-57095a78/ratings/:ratingId/status", async (c) => {
  try {
    const ratingId = c.req.param("ratingId");
    const { status } = await c.req.json(); // 'approved' or 'flagged'
    console.log(`📝 Updating rating ${ratingId} status to:`, status);
    
    const rating = await kv.get(ratingId);
    if (!rating) {
      return c.json({ success: false, error: "Rating not found" }, 404);
    }
    
    rating.status = status;
    rating.updatedAt = new Date().toISOString();
    
    await kv.set(ratingId, rating);
    
    console.log("✅ Rating status updated:", ratingId);
    return c.json({ success: true, rating });
  } catch (error) {
    console.error("❌ Error updating rating status:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all worker stats
app.get("/make-server-57095a78/ratings/workers/stats", async (c) => {
  try {
    console.log("📊 Fetching all worker statistics");
    
    const allWorkerRatings = await kv.getByPrefix("worker-rating:");
    
    const stats = allWorkerRatings.map((wr: any) => ({
      workerId: wr.workerId,
      workerName: wr.workerName,
      workerRole: wr.workerRole,
      averageRating: wr.averageRating,
      totalRatings: wr.totalRatings,
      recentRatings: wr.ratings.slice(-5), // Last 5 ratings
      lastUpdated: wr.lastUpdated
    }));
    
    console.log(`✅ Retrieved stats for ${stats.length} workers`);
    return c.json({ workers: stats, total: stats.length });
  } catch (error) {
    console.error("❌ Error fetching worker stats:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Send review request
app.post("/make-server-57095a78/ratings/request-review", async (c) => {
  try {
    const requestData = await c.req.json();
    console.log("📧 Creating review request:", requestData);
    
    const requestId = `review-request:${Date.now()}`;
    
    await kv.set(requestId, {
      id: requestId,
      ...requestData,
      status: 'sent',
      sentAt: new Date().toISOString()
    });
    
    console.log("✅ Review request created:", requestId);
    return c.json({ success: true, requestId });
  } catch (error) {
    console.error("❌ Error creating review request:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get review requests
app.get("/make-server-57095a78/ratings/review-requests", async (c) => {
  try {
    console.log("📋 Fetching review requests");
    
    const requests = await kv.getByPrefix("review-request:");
    
    console.log(`✅ Retrieved ${requests.length} review requests`);
    return c.json({ requests, total: requests.length });
  } catch (error) {
    console.error("❌ Error fetching review requests:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================================================
// MESSAGING SYSTEM
// ============================================================================

import * as messaging from "./messaging.tsx";

// Get all conversations for a user
app.get("/make-server-57095a78/messaging/conversations/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const conversations = await messaging.getConversationsForUser(userId);
    console.log(`✅ Retrieved ${conversations.length} conversations for user ${userId}`);
    return c.json(conversations);
  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    return c.json({ error: "Failed to fetch conversations" }, 500);
  }
});

// Get messages for a conversation
app.get("/make-server-57095a78/messaging/conversations/:conversationId/messages", async (c) => {
  try {
    const conversationId = c.req.param("conversationId");
    const messages = await messaging.getMessagesForConversation(conversationId);
    console.log(`✅ Retrieved ${messages.length} messages for conversation ${conversationId}`);
    return c.json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

// Create a new conversation
app.post("/make-server-57095a78/messaging/conversations", async (c) => {
  try {
    const data = await c.req.json();
    const conversation = await messaging.createConversation(data);
    console.log(`✅ Created conversation: ${conversation.id}`);
    return c.json(conversation);
  } catch (error) {
    console.error("❌ Error creating conversation:", error);
    return c.json({ error: "Failed to create conversation" }, 500);
  }
});

// Find or create direct conversation
app.post("/make-server-57095a78/messaging/conversations/direct", async (c) => {
  try {
    const { user1Id, user1Name, user2Id, user2Name } = await c.req.json();
    const conversation = await messaging.findOrCreateDirectConversation(
      user1Id,
      user1Name,
      user2Id,
      user2Name
    );
    console.log(`✅ Found/created direct conversation: ${conversation.id}`);
    return c.json(conversation);
  } catch (error) {
    console.error("❌ Error finding/creating conversation:", error);
    return c.json({ error: "Failed to find/create conversation" }, 500);
  }
});

// Send a message
app.post("/make-server-57095a78/messaging/messages", async (c) => {
  try {
    const data = await c.req.json();
    const message = await messaging.sendMessage(data);
    console.log(`✅ Sent message: ${message.id}`);
    return c.json(message);
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Mark messages as read
app.post("/make-server-57095a78/messaging/conversations/:conversationId/read", async (c) => {
  try {
    const conversationId = c.req.param("conversationId");
    const { userId } = await c.req.json();
    await messaging.markMessagesAsRead(conversationId, userId);
    console.log(`✅ Marked messages as read for user ${userId} in conversation ${conversationId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    return c.json({ error: "Failed to mark messages as read" }, 500);
  }
});

// Delete a message
app.delete("/make-server-57095a78/messaging/messages/:conversationId/:messageId", async (c) => {
  try {
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");
    await messaging.deleteMessage(conversationId, messageId);
    console.log(`✅ Deleted message: ${messageId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    return c.json({ error: "Failed to delete message" }, 500);
  }
});

// Get unread count for a user
app.get("/make-server-57095a78/messaging/unread/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const count = await messaging.getUnreadCount(userId);
    return c.json({ count });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    return c.json({ error: "Failed to get unread count" }, 500);
  }
});

// Search messages
app.get("/make-server-57095a78/messaging/search/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const query = c.req.query("q") || "";
    const messages = await messaging.searchMessages(userId, query);
    console.log(`✅ Found ${messages.length} messages for query: ${query}`);
    return c.json(messages);
  } catch (error) {
    console.error("❌ Error searching messages:", error);
    return c.json({ error: "Failed to search messages" }, 500);
  }
});

// ============================================================================
// PROJECTS - Project Management
// ============================================================================

app.get("/make-server-57095a78/projects", async (c) => {
  try {
    const projects = await kv.getByPrefix("project:");
    return c.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ error: "Failed to fetch projects" }, 500);
  }
});

app.get("/make-server-57095a78/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return c.json({ error: "Failed to fetch project" }, 500);
  }
});

app.post("/make-server-57095a78/projects", async (c) => {
  try {
    const data = await c.req.json();
    const id = `PROJ-${Date.now()}`;
    const project = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`project:${id}`, project);
    console.log("Created project:", id);
    return c.json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

app.put("/make-server-57095a78/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`project:${id}`);
    if (!existing) {
      return c.json({ error: "Project not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`project:${id}`, updated);
    console.log("Updated project:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    return c.json({ error: "Failed to update project" }, 500);
  }
});

app.delete("/make-server-57095a78/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`project:${id}`);
    console.log("Deleted project:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return c.json({ error: "Failed to delete project" }, 500);
  }
});

// ============================================================================
// EMPLOYEES - Employee Management
// ============================================================================

app.get("/make-server-57095a78/employees", async (c) => {
  try {
    const employees = await kv.getByPrefix("employee:");
    return c.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return c.json({ error: "Failed to fetch employees" }, 500);
  }
});

app.get("/make-server-57095a78/employees/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const employee = await kv.get(`employee:${id}`);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }
    return c.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return c.json({ error: "Failed to fetch employee" }, 500);
  }
});

app.post("/make-server-57095a78/employees", async (c) => {
  try {
    const data = await c.req.json();
    const id = `EMP-${Date.now()}`;
    const employee = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`employee:${id}`, employee);
    console.log("Created employee:", id);
    return c.json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    return c.json({ error: "Failed to create employee" }, 500);
  }
});

app.put("/make-server-57095a78/employees/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`employee:${id}`);
    if (!existing) {
      return c.json({ error: "Employee not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`employee:${id}`, updated);
    console.log("Updated employee:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating employee:", error);
    return c.json({ error: "Failed to update employee" }, 500);
  }
});

// ============================================================================
// RATINGS & REVIEWS - 5-Star Rating System
// ============================================================================

app.get("/make-server-57095a78/ratings", async (c) => {
  try {
    const ratings = await kv.getByPrefix("rating:");
    return c.json(ratings);
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return c.json({ error: "Failed to fetch ratings" }, 500);
  }
});

app.get("/make-server-57095a78/ratings/project/:projectId", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const allRatings = await kv.getByPrefix("rating:");
    const projectRatings = allRatings.filter((r: any) => r.projectId === projectId);
    return c.json(projectRatings);
  } catch (error) {
    console.error("Error fetching project ratings:", error);
    return c.json({ error: "Failed to fetch project ratings" }, 500);
  }
});

app.post("/make-server-57095a78/ratings", async (c) => {
  try {
    const data = await c.req.json();
    const id = `RAT-${Date.now()}`;
    const rating = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`rating:${id}`, rating);
    console.log("Created rating:", id);
    return c.json(rating);
  } catch (error) {
    console.error("Error creating rating:", error);
    return c.json({ error: "Failed to create rating" }, 500);
  }
});

// ============================================================================
// EXPENSES - Expense Tracking with Receipt Upload
// ============================================================================

app.get("/make-server-57095a78/expenses", async (c) => {
  try {
    const expenses = await kv.getByPrefix("expense:");
    return c.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return c.json({ error: "Failed to fetch expenses" }, 500);
  }
});

app.get("/make-server-57095a78/expenses/project/:projectId", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const allExpenses = await kv.getByPrefix("expense:");
    const projectExpenses = allExpenses.filter((e: any) => e.projectId === projectId);
    return c.json(projectExpenses);
  } catch (error) {
    console.error("Error fetching project expenses:", error);
    return c.json({ error: "Failed to fetch project expenses" }, 500);
  }
});

app.post("/make-server-57095a78/expenses", async (c) => {
  try {
    const data = await c.req.json();
    const id = `EXP-${Date.now()}`;
    const expense = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`expense:${id}`, expense);
    console.log("Created expense:", id);
    return c.json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    return c.json({ error: "Failed to create expense" }, 500);
  }
});

app.put("/make-server-57095a78/expenses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`expense:${id}`);
    if (!existing) {
      return c.json({ error: "Expense not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`expense:${id}`, updated);
    console.log("Updated expense:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating expense:", error);
    return c.json({ error: "Failed to update expense" }, 500);
  }
});

// ============================================================================
// CHANGE ORDERS - Change Order Management
// ============================================================================

app.get("/make-server-57095a78/change-orders", async (c) => {
  try {
    const changeOrders = await kv.getByPrefix("change-order:");
    return c.json(changeOrders);
  } catch (error) {
    console.error("Error fetching change orders:", error);
    return c.json({ error: "Failed to fetch change orders" }, 500);
  }
});

app.get("/make-server-57095a78/change-orders/project/:projectId", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const allChangeOrders = await kv.getByPrefix("change-order:");
    const projectChangeOrders = allChangeOrders.filter((co: any) => co.projectId === projectId);
    return c.json(projectChangeOrders);
  } catch (error) {
    console.error("Error fetching project change orders:", error);
    return c.json({ error: "Failed to fetch project change orders" }, 500);
  }
});

app.post("/make-server-57095a78/change-orders", async (c) => {
  try {
    const data = await c.req.json();
    const id = `CO-${Date.now()}`;
    const changeOrder = {
      ...data,
      id,
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`change-order:${id}`, changeOrder);
    console.log("Created change order:", id);
    return c.json(changeOrder);
  } catch (error) {
    console.error("Error creating change order:", error);
    return c.json({ error: "Failed to create change order" }, 500);
  }
});

app.put("/make-server-57095a78/change-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`change-order:${id}`);
    if (!existing) {
      return c.json({ error: "Change order not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`change-order:${id}`, updated);
    console.log("Updated change order:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating change order:", error);
    return c.json({ error: "Failed to update change order" }, 500);
  }
});

// ============================================================================
// WEATHER INTEGRATION - Weather Data for Jobs
// ============================================================================

app.get("/make-server-57095a78/weather/current/:location", async (c) => {
  try {
    const location = c.req.param("location");
    // In production, integrate with OpenWeatherMap or similar API
    // For now, return mock data
    const weather = {
      location,
      temperature: 72,
      conditions: "Partly Cloudy",
      humidity: 65,
      windSpeed: 8,
      precipitation: 10,
      forecast: "No rain expected",
      isSafe: true,
      timestamp: new Date().toISOString()
    };
    return c.json(weather);
  } catch (error) {
    console.error("Error fetching weather:", error);
    return c.json({ error: "Failed to fetch weather data" }, 500);
  }
});

// ============================================================================
// EMERGENCY ON-CALL - Emergency Service Requests
// ============================================================================

app.get("/make-server-57095a78/emergency-requests", async (c) => {
  try {
    const requests = await kv.getByPrefix("emergency:");
    return c.json(requests);
  } catch (error) {
    console.error("Error fetching emergency requests:", error);
    return c.json({ error: "Failed to fetch emergency requests" }, 500);
  }
});

app.post("/make-server-57095a78/emergency-requests", async (c) => {
  try {
    const data = await c.req.json();
    const id = `EMR-${Date.now()}`;
    const request = {
      ...data,
      id,
      status: 'pending',
      priority: data.priority || 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`emergency:${id}`, request);
    console.log("Created emergency request:", id);
    return c.json(request);
  } catch (error) {
    console.error("Error creating emergency request:", error);
    return c.json({ error: "Failed to create emergency request" }, 500);
  }
});

// ============================================================================
// CALENDAR EVENTS - Enterprise Calendar System
// ============================================================================

// Calendar health check
app.get("/make-server-57095a78/calendar/health", (c) => {
  console.log("✅ Calendar health check successful");
  return c.json({ status: "ok", message: "Calendar API is working" });
});

// Get all calendar events
app.get("/make-server-57095a78/calendar/events", async (c) => {
  console.log("📅 Fetching all calendar events");
  try {
    const events = await kv.getByPrefix("calendar-event:");
    // Ensure we always return an array
    const eventsArray = Array.isArray(events) ? events : [];
    console.log(`📅 Found ${eventsArray.length} calendar events`);
    return c.json(eventsArray);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return c.json({ error: "Failed to fetch calendar events" }, 500);
  }
});

// Get events by date range
app.get("/make-server-57095a78/calendar/events/range", async (c) => {
  try {
    const { start, end } = c.req.query();
    const allEvents = await kv.getByPrefix("calendar-event:");
    
    if (!start || !end) {
      return c.json(allEvents);
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const filteredEvents = allEvents.filter((event: any) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return eventStart <= endDate && eventEnd >= startDate;
    });
    
    return c.json(filteredEvents);
  } catch (error) {
    console.error("Error fetching events by range:", error);
    return c.json({ error: "Failed to fetch events by range" }, 500);
  }
});

// Get single event
app.get("/make-server-57095a78/calendar/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const event = await kv.get(`calendar-event:${id}`);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }
    return c.json(event);
  } catch (error) {
    console.error("Error fetching calendar event:", error);
    return c.json({ error: "Failed to fetch calendar event" }, 500);
  }
});

// Create calendar event
app.post("/make-server-57095a78/calendar/events", async (c) => {
  try {
    const data = await c.req.json();
    const id = `EVT-${Date.now()}`;
    const event = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`calendar-event:${id}`, event);
    console.log("Created calendar event:", id);
    return c.json(event);
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return c.json({ error: "Failed to create calendar event" }, 500);
  }
});

// Update calendar event
app.put("/make-server-57095a78/calendar/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`calendar-event:${id}`);
    if (!existing) {
      return c.json({ error: "Event not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`calendar-event:${id}`, updated);
    console.log("Updated calendar event:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return c.json({ error: "Failed to update calendar event" }, 500);
  }
});

// Delete calendar event
app.delete("/make-server-57095a78/calendar/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`calendar-event:${id}`);
    console.log("Deleted calendar event:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return c.json({ error: "Failed to delete calendar event" }, 500);
  }
});

// Get events by type
app.get("/make-server-57095a78/calendar/events/type/:type", async (c) => {
  try {
    const type = c.req.param("type");
    const allEvents = await kv.getByPrefix("calendar-event:");
    const filteredEvents = allEvents.filter((event: any) => event.type === type);
    return c.json(filteredEvents);
  } catch (error) {
    console.error("Error fetching events by type:", error);
    return c.json({ error: "Failed to fetch events by type" }, 500);
  }
});

// Get events by project
app.get("/make-server-57095a78/calendar/events/project/:projectId", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const allEvents = await kv.getByPrefix("calendar-event:");
    const projectEvents = allEvents.filter((event: any) => event.projectId === projectId);
    return c.json(projectEvents);
  } catch (error) {
    console.error("Error fetching project events:", error);
    return c.json({ error: "Failed to fetch project events" }, 500);
  }
});

// ============================================================================
// SERVICE PROVIDER & LEAD GENERATION ROUTES
// ============================================================================
app.route("/make-server-57095a78/service-providers", serviceProviders);

// ============================================================================
// AI BID ROUTING ENGINE - INLINE ENDPOINTS
// ============================================================================

console.log("📍 ========================================");
console.log("📍 REGISTERING AI BID ROUTER INLINE ENDPOINTS");
console.log("📍 Location: /make-server-57095a78/bid-router/*");
console.log("📍 ========================================");

// Simple test endpoint without any imports
app.get("/make-server-57095a78/bid-router/test", (c) => {
  console.log("✅ Test endpoint hit!");
  return c.json({ 
    success: true, 
    message: "AI Bid Router endpoints are working!",
    timestamp: new Date().toISOString()
  });
});

// Simpler POST endpoint for testing
app.post("/make-server-57095a78/bid-router/simple-test", async (c) => {
  console.log("✅ Simple POST test endpoint hit!");
  try {
    const body = await c.req.json();
    return c.json({ 
      success: true, 
      message: "POST endpoint working!",
      received: body
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

console.log("✅ Bid router test endpoints registered successfully");

// POST /make-server-57095a78/bid-router/ai-analyze - Analyze a request
app.post("/make-server-57095a78/bid-router/ai-analyze", async (c) => {
  console.log("🤖 AI Analysis endpoint called");
  try {
    let requestBody;
    try {
      requestBody = await c.req.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error in /ai-analyze:', jsonError);
      return c.json({ 
        error: 'Invalid JSON in request body', 
        details: String(jsonError)
      }, 400);
    }

    const { title, description, requirements, type } = requestBody;

    if (!title || !description) {
      return c.json({ error: 'Title and description required' }, 400);
    }

    // Perform AI analysis
    const analysis = analyzeRequest({ title, description, requirements, type });

    // Find matching providers
    const matchingProviders = await findMatchingProviders(analysis);

    console.log(`🤖 AI Analysis: ${analysis.needType} | Categories: ${analysis.categories.join(', ')} | ${matchingProviders.length} matches`);

    return c.json({
      success: true,
      analysis: {
        ...analysis,
        summary: generateSummary(analysis, matchingProviders)
      },
      matchingProviders: matchingProviders.slice(0, 10),
      recommendedAction: determineRecommendedAction(analysis, matchingProviders)
    });

  } catch (error: any) {
    console.error('❌ Error in AI analysis:', error);
    return c.json({ error: 'Analysis failed', details: error.message }, 500);
  }
});

// POST /make-server-57095a78/bid-router/ai-route - Auto-route a request
app.post("/make-server-57095a78/bid-router/ai-route", async (c) => {
  try {
    let requestBody;
    try {
      requestBody = await c.req.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error in /ai-route:', jsonError);
      return c.json({ 
        error: 'Invalid JSON in request body', 
        details: String(jsonError)
      }, 400);
    }

    const { requestId, title, description, requirements, type, autoSend, budget, customerInfo } = requestBody;

    // Perform analysis
    const analysis = analyzeRequest({ title, description, requirements, type });
    const matchingProviders = await findMatchingProviders(analysis);

    // Create bid opportunity
    const opportunity = {
      id: requestId,
      title,
      description,
      requirements: requirements || [],
      type: type || 'quote',
      status: 'open',
      createdAt: new Date().toISOString(),
      analysis,
      matchedProviders: matchingProviders.slice(0, 10),
      budget: budget || null,
      customerInfo: customerInfo || null,
      responses: {},
      bidCount: 0,
      declinedProviders: []
    };

    await kv.set(`bid_opportunity:${requestId}`, opportunity);

    // Store analysis result
    const analysisRecord = {
      requestId,
      timestamp: new Date().toISOString(),
      analysis,
      matchingProviders: matchingProviders.slice(0, 10),
      autoRouted: autoSend === true
    };

    await kv.set(`ai_analysis:${requestId}`, analysisRecord);

    // If auto-send is enabled, notify providers
    if (autoSend && matchingProviders.length > 0) {
      const notificationPromises = matchingProviders.slice(0, 5).map(async (provider: any) => {
        console.log(`📧 Notifying ${provider.name} (${provider.type}) about ${title}`);
        
        const providerKey = provider.type === 'subcontractor' 
          ? `subcontractor:${provider.id}`
          : `service_provider:${provider.id}`;
        
        const providerData = await kv.get(providerKey);
        if (providerData) {
          providerData.leadsReceived = (providerData.leadsReceived || 0) + 1;
          providerData.lastLeadDate = new Date().toISOString();
          await kv.set(providerKey, providerData);
        }
      });

      await Promise.all(notificationPromises);
    }

    return c.json({
      success: true,
      message: autoSend 
        ? `Request analyzed and routed to ${Math.min(5, matchingProviders.length)} providers`
        : 'Request analyzed successfully',
      analysis,
      opportunityId: requestId,
      providersNotified: autoSend ? Math.min(5, matchingProviders.length) : 0,
      topMatches: matchingProviders.slice(0, 5)
    });

  } catch (error: any) {
    console.error('❌ Error in AI routing:', error);
    return c.json({ error: 'Routing failed', details: error.message }, 500);
  }
});

// GET /make-server-57095a78/bid-router/ai-analysis/:requestId
app.get("/make-server-57095a78/bid-router/ai-analysis/:requestId", async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const analysis = await kv.get(`ai_analysis:${requestId}`);

    if (!analysis) {
      return c.json({ error: 'Analysis not found' }, 404);
    }

    return c.json({
      success: true,
      analysis
    });

  } catch (error: any) {
    console.error('❌ Error fetching analysis:', error);
    return c.json({ error: 'Failed to fetch analysis' }, 500);
  }
});

// ============================================================================
// PROVIDER BID SUBMISSION & MANAGEMENT
// ============================================================================
app.route("/make-server-57095a78/provider-bids", providerBids);

// ============================================================================
// WORK REQUEST DRAFTS - AUTO-SAVE SYSTEM
// ============================================================================
console.log("📝 Registering Work Request Draft endpoints...");

// POST /make-server-57095a78/work-request-drafts/save
app.post("/make-server-57095a78/work-request-drafts/save", async (c) => {
  try {
    const draft = await c.req.json();
    const { draftId, userId, formData, currentStep, lastSaved, createdAt } = draft;

    if (!draftId) {
      return c.json({ error: 'Draft ID is required' }, 400);
    }

    // Store in KV with composite key
    const key = userId 
      ? `work_request_draft:${userId}:${draftId}`
      : `work_request_draft:anonymous:${draftId}`;

    await kv.set(key, {
      draftId,
      userId,
      formData,
      currentStep,
      lastSaved,
      createdAt
    });

    console.log(`✅ Work request draft saved: ${key}`);

    return c.json({ 
      success: true, 
      draftId,
      lastSaved
    });

  } catch (error: any) {
    console.error('❌ Error saving work request draft:', error);
    return c.json({ error: 'Failed to save draft', details: error.message }, 500);
  }
});

// GET /make-server-57095a78/work-request-drafts/:draftId
app.get("/make-server-57095a78/work-request-drafts/:draftId", async (c) => {
  try {
    const draftId = c.req.param('draftId');
    
    // Try to get user from auth header (optional)
    let userId = null;
    try {
      const authHeader = c.req.header('Authorization');
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        // For now, we'll allow anonymous drafts too
        // In production, you'd verify the token here
      }
    } catch (e) {
      // Ignore auth errors for draft retrieval
    }

    // Try with userId first, then anonymous
    let draft = null;
    if (userId) {
      draft = await kv.get(`work_request_draft:${userId}:${draftId}`);
    }
    
    if (!draft) {
      draft = await kv.get(`work_request_draft:anonymous:${draftId}`);
    }

    if (!draft) {
      return c.json({ error: 'Draft not found' }, 404);
    }

    console.log(`✅ Work request draft retrieved: ${draftId}`);
    return c.json(draft);

  } catch (error: any) {
    console.error('❌ Error retrieving work request draft:', error);
    return c.json({ error: 'Failed to retrieve draft', details: error.message }, 500);
  }
});

// DELETE /make-server-57095a78/work-request-drafts/:draftId
app.delete("/make-server-57095a78/work-request-drafts/:draftId", async (c) => {
  try {
    const draftId = c.req.param('draftId');
    
    // Try to get user from auth header (optional)
    let userId = null;
    
    // Try deleting both possible keys
    if (userId) {
      await kv.del(`work_request_draft:${userId}:${draftId}`);
    }
    await kv.del(`work_request_draft:anonymous:${draftId}`);

    console.log(`✅ Work request draft deleted: ${draftId}`);
    return c.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error deleting work request draft:', error);
    return c.json({ error: 'Failed to delete draft', details: error.message }, 500);
  }
});

console.log("✅ Work Request Draft endpoints registered");

// ============================================================================
// ECOMMERCE - PRODUCTS, CART, ORDERS
// ============================================================================
console.log("📦 Mounting eCommerce routers...");

// eCommerce routers are now inline (see endpoints above)
console.log("  ✓ Products endpoints: INLINE");
console.log("  ✓ Vendor directory endpoints: INLINE");
console.log("  ✓ Seed data endpoint: INLINE");

// Mount notifications router
app.route("/make-server-57095a78", notificationsRouter);
console.log("  ✓ Notifications router mounted at /make-server-57095a78");

// ============================================================================
// MARKETING ASSETS - AI GENERATION
// ============================================================================
app.route("/make-server-57095a78", marketingAssetsRouter);

// ============================================================================
// VENDOR PROFILES - PUBLIC STOREFRONTS
// ============================================================================
app.route("/make-server-57095a78", vendorProfileRouter);

// ============================================================================
// COHORT MANAGEMENT - ENTERPRISE SUBSCRIPTION & PRICING SYSTEM
// ============================================================================
app.route("/make-server-57095a78", cohortsRouter);

// ============================================================================
// TERRITORY-BASED COHORT MANAGEMENT - GEOGRAPHIC CAPACITY MANAGEMENT
// ============================================================================
app.route("/make-server-57095a78", territoryCohortRouter);

// ============================================================================
// COHORT SETTINGS - EDITABLE CAPACITY LIMITS & PRICING
// ============================================================================
app.route("/make-server-57095a78", cohortSettingsRouter);

// ============================================================================
// TENANT MANAGEMENT - MULTI-TENANT RBAC SYSTEM
// ============================================================================
app.route("/make-server-57095a78", tenantsRouter);

// ============================================================================
// COMPANY CONFIGURATION - HEADQUARTERS & SETTINGS
// ============================================================================
app.route("/make-server-57095a78", companyConfigRouter);

// ============================================================================
// PROPERTY MANAGEMENT CRM - CONDO, LANDLORD, PROPERTY MANAGER
// ============================================================================
app.route("/make-server-57095a78/property-management", propertyManagementRouter);
console.log("  ✓ Property Management CRM router mounted");

// Test endpoint for property management (inline to verify routing)
app.get("/make-server-57095a78/property-management-test", (c) => {
  console.log("✅ Property Management test endpoint hit!");
  return c.json({
    success: true,
    message: "Property Management routing is working!",
    timestamp: new Date().toISOString()
  });
});

// INLINE: Health check for property management
app.get("/make-server-57095a78/property-management/health", (c) => {
  console.log("✅ [INLINE] Property Management health check");
  return c.json({
    success: true,
    status: "healthy",
    module: "property-management-inline",
    timestamp: new Date().toISOString()
  });
});

// INLINE: Pending counts endpoint (bypassing router for testing)
app.get("/make-server-57095a78/property-management/pending-counts", async (c) => {
  console.log("📊 [INLINE] Pending counts endpoint called");
  try {
    // Get all work requests by type
    console.log("📊 Fetching condo requests...");
    const condoRequests = await kv.getByPrefix("condo_work_request:");
    console.log(`📊 Found ${condoRequests.length} condo requests`);
    
    console.log("📊 Fetching landlord requests...");
    const landlordRequests = await kv.getByPrefix("landlord_work_request:");
    console.log(`📊 Found ${landlordRequests.length} landlord requests`);
    
    console.log("📊 Fetching property manager requests...");
    const pmRequests = await kv.getByPrefix("pm_work_request:");
    console.log(`📊 Found ${pmRequests.length} PM requests`);
    
    // Count pending approvals for each type
    const condoPending = condoRequests.filter((r: any) => r.status === "pending_approval").length;
    const landlordPending = landlordRequests.filter((r: any) => r.status === "pending_approval").length;
    const pmPending = pmRequests.filter((r: any) => r.status === "pending_approval").length;
    
    console.log(`📊 Pending counts - Condo: ${condoPending}, Landlord: ${landlordPending}, PM: ${pmPending}`);
    
    const counts = {
      total: condoPending + landlordPending + pmPending,
      condo: condoPending,
      landlord: landlordPending,
      propertyManager: pmPending
    };
    
    console.log("✅ [INLINE] Pending counts response:", counts);
    return c.json({ success: true, data: counts });
  } catch (error) {
    console.error("❌ [INLINE] Error fetching pending counts:", error);
    return c.json({ success: false, error: "Failed to fetch pending approval counts", details: String(error) }, 500);
  }
});

// ============================================================================
// BLUEPRINT EXPORT - CAD/DESIGN PLAN EXPORT SYSTEM
// ============================================================================
app.route("/", blueprintRouter);

// ============================================================================
// AI QUOTE GENERATOR - LABOR & MATERIALS ESTIMATION (INLINE)
// ============================================================================

// Test endpoint to verify route is accessible
app.get("/make-server-57095a78/api/generate-quote-test", (c) => {
  console.log('[AI Quote Generator] Test endpoint hit!');
  return c.json({
    status: 'ok',
    message: 'AI Quote Generator endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

app.post("/make-server-57095a78/api/generate-quote", async (c) => {
  console.log('[AI Quote Generator] ========== REQUEST RECEIVED ==========');
  console.log('[AI Quote Generator] Headers:', c.req.header());
  
  try {
    const body = await c.req.json();
    const { quoteNumber, customerName, serviceType, description, workRequestData } = body;

    console.log('[AI Quote Generator] Generating quote for:', quoteNumber);
    console.log('[AI Quote Generator] Service Type:', serviceType);

    // Check if API key is available
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('[AI Quote Generator] ERROR: OPENAI_API_KEY not found in environment');
      throw new Error('OpenAI API key not configured');
    }
    console.log('[AI Quote Generator] API key found:', apiKey ? 'YES' : 'NO');

    // Import OpenAI dynamically
    const OpenAI = (await import('npm:openai@4')).default;
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Build context from available data
    const context = `
Service Type: ${serviceType}
Description: ${description}
${workRequestData ? `
Additional Details:
- Complexity: ${workRequestData.complexityLevel || 'N/A'}
- Duration Estimate: ${workRequestData.duration || 'N/A'} hours
- Requires Permit: ${workRequestData.requiresPermit ? 'Yes' : 'No'}
- Equipment Needed: ${workRequestData.equipment?.join(', ') || 'N/A'}
` : ''}
`;

    // Generate labor tasks
    const laborPrompt = `You are an expert construction estimator. Based on the following project details, generate a detailed list of labor tasks required.

${context}

For each labor task, provide:
1. A clear description of the work (e.g., "Licensed Electrician - Panel Upgrade & Wiring")
2. Estimated hours required
3. Hourly rate (use industry-standard rates for 2026)

Return ONLY a JSON array of objects with this exact format:
[
  {
    "description": "Task description",
    "hours": number,
    "rate": number
  }
]

Be comprehensive but realistic. Include all necessary skilled labor. Typical project should have 3-8 labor line items.`;

    const materialsPrompt = `You are an expert construction estimator. Based on the following project details, generate a detailed materials list.

${context}

For each material item, provide:
1. A clear description (e.g., "200A Main Electrical Panel", "500ft 12/2 Romex Wire")
2. Quantity needed
3. Unit price (use realistic 2026 prices)

Return ONLY a JSON array of objects with this exact format:
[
  {
    "description": "Material description with specifications",
    "quantity": number,
    "unitPrice": number
  }
]

Be comprehensive and specific. Include all necessary materials, supplies, and consumables. Typical project should have 5-15 material line items.`;

    console.log('[AI Quote Generator] Calling OpenAI API...');

    // Call OpenAI in parallel for speed
    const [laborResponse, materialsResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator. You provide detailed, accurate estimates in JSON format only. No markdown, no explanations, just valid JSON.'
          },
          {
            role: 'user',
            content: laborPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator. You provide detailed, accurate estimates in JSON format only. No markdown, no explanations, just valid JSON.'
          },
          {
            role: 'user',
            content: materialsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    ]);

    console.log('[AI Quote Generator] OpenAI responses received');

    // Parse responses
    let laborItems = [];
    let materialItems = [];

    try {
      const laborText = laborResponse.choices[0].message.content?.trim() || '[]';
      const cleanLaborText = laborText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      laborItems = JSON.parse(cleanLaborText);
    } catch (error) {
      console.error('[AI Quote Generator] Error parsing labor response:', error);
      laborItems = [
        {
          description: `${serviceType} - Professional Labor`,
          hours: 40,
          rate: 85
        }
      ];
    }

    try {
      const materialsText = materialsResponse.choices[0].message.content?.trim() || '[]';
      const cleanMaterialsText = materialsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      materialItems = JSON.parse(cleanMaterialsText);
    } catch (error) {
      console.error('[AI Quote Generator] Error parsing materials response:', error);
      materialItems = [
        {
          description: `${serviceType} - Materials & Supplies`,
          quantity: 1,
          unitPrice: 2500
        }
      ];
    }

    // Calculate totals
    const laborTotal = laborItems.reduce((sum, item) => 
      sum + (item.hours * item.rate), 0);
    const materialsTotal = materialItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0);
    const grandTotal = laborTotal + materialsTotal;

    console.log('[AI Quote Generator] Generated:', {
      laborItems: laborItems.length,
      materialItems: materialItems.length,
      grandTotal
    });

    return c.json({
      success: true,
      laborItems,
      materialItems,
      summary: `Total estimate: $${grandTotal.toLocaleString()} (${laborItems.length} labor tasks, ${materialItems.length} materials)`,
      totals: {
        labor: laborTotal,
        materials: materialsTotal,
        grandTotal
      }
    });

  } catch (error) {
    console.error('[AI Quote Generator] Error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to generate quote',
      laborItems: [],
      materialItems: []
    }, 500);
  }
});

console.log("  ✓ AI Quote Generator endpoint registered at /make-server-57095a78/api/generate-quote");

// ============================================================================
// AI DESIGN GENERATION - FLOOR PLAN AI ASSISTANT
// ============================================================================
app.route("/make-server-57095a78/ai", aiRouter);

// ============================================================================
// AI FLOOR PLAN GENERATION - VIDEO/IMAGE TO FLOOR PLAN
// ============================================================================
app.route("/make-server-57095a78/ai-floorplan", aiFloorPlanRouter);

// ============================================================================
// KITCHEN CABINET SCHEDULE GENERATION
// ============================================================================
app.route("/make-server-57095a78/cabinet-schedule", kitchenCabinetScheduleRouter);

// ============================================================================
// AI PLAN BUILDER - CUSTOM SUBSCRIPTION / MAINTENANCE PLAN GENERATION
// ============================================================================
app.route("/make-server-57095a78/plan-builder", planBuilderRouter);

// ============================================================================
// PLANS - PERSISTENCE, REAL-TIME TRACKING, SEARCH, CROSS-SYSTEM LINKING
// ============================================================================
app.route("/", plansRouter);

// Tech roster & tier rates (full route prefixes declared inside the router)
app.route("/", techRosterRouter);

// Quotes / estimates & invoices (persistence + assign-customer-later)
app.route("/", quotesRouter);

// ============================================================================
// TIME TRACKING - EMPLOYEE PUNCH IN/OUT WITH GPS
// ============================================================================
app.route("/make-server-57095a78/time-tracking", timeTrackingRouter);

// ============================================================================
// HOUR TRANSFERS - CUSTOMER-TO-CUSTOMER WITH ADMIN APPROVAL
// ============================================================================
app.route("/make-server-57095a78/hour-transfers", hourTransfersRouter);

// ============================================================================
// PAYMENT PROCESSING - UNIFIED ECOMMERCE & SUBSCRIPTION PAYMENTS
// ============================================================================
app.route("/make-server-57095a78/payment", paymentProcessingRouter);

// ============================================================================
// DESIGN STUDIO PRO - PROJECT & QUOTE INTEGRATION
// ============================================================================

// Recent projects for Design Studio
app.get("/make-server-57095a78/studio/recent-projects", async (c) => {
  try {
    const recentProjects = await kv.getByPrefix("studio:recent:");
    return c.json({ 
      success: true,
      projects: recentProjects || []
    });
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    return c.json({ error: "Failed to fetch recent projects" }, 500);
  }
});

// Save recent project
app.post("/make-server-57095a78/studio/save-recent", async (c) => {
  try {
    const body = await c.req.json();
    const { quoteId, quoteNumber, customerName, lastOpened } = body;

    const key = `studio:recent:${quoteId}`;
    await kv.set(key, {
      id: quoteId,
      quoteNumber,
      customerName,
      lastOpened,
      openCount: ((await kv.get(key))?.openCount || 0) + 1
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving recent project:", error);
    return c.json({ error: "Failed to save recent project" }, 500);
  }
});

// Get project info with media, notes, and work request
app.get("/make-server-57095a78/studio/project-info/:quoteId", async (c) => {
  try {
    const quoteId = c.req.param("quoteId");

    // Fetch quote details
    const quote = await kv.get(`quote:${quoteId}`);
    if (!quote) {
      return c.json({ error: "Quote not found" }, 404);
    }

    // Fetch associated media
    const allMedia = await kv.getByPrefix("media:");
    const projectMedia = allMedia.filter((m: any) => m.quoteId === quoteId);
    const photos = projectMedia.filter((m: any) => m.type === "photo");
    const videos = projectMedia.filter((m: any) => m.type === "video");

    // Fetch notes
    const allNotes = await kv.getByPrefix("note:");
    const projectNotes = allNotes.filter((n: any) => n.quoteId === quoteId);

    // Fetch work request
    const allWorkRequests = await kv.getByPrefix("work-request:");
    const workRequest = allWorkRequests.find((wr: any) => wr.quoteId === quoteId);

    return c.json({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      projectType: quote.projectType,
      status: quote.status,
      totalAmount: quote.totalAmount || 0,
      createdAt: quote.createdAt,
      description: quote.description,
      photos: photos || [],
      videos: videos || [],
      notes: projectNotes || [],
      workRequest: workRequest || null
    });
  } catch (error) {
    console.error("Error fetching project info:", error);
    return c.json({ error: "Failed to fetch project info" }, 500);
  }
});

// Save studio project (floor plan data)
app.post("/make-server-57095a78/studio/save-project", async (c) => {
  try {
    const body = await c.req.json();
    const { quoteId, elements, projectData } = body;

    const key = `studio:project:${quoteId}`;
    await kv.set(key, {
      quoteId,
      elements,
      projectData,
      lastSaved: new Date().toISOString()
    });

    return c.json({ 
      success: true,
      message: "Project saved successfully"
    });
  } catch (error) {
    console.error("Error saving studio project:", error);
    return c.json({ error: "Failed to save project" }, 500);
  }
});

// Load studio project
app.get("/make-server-57095a78/studio/load-project/:quoteId", async (c) => {
  try {
    const quoteId = c.req.param("quoteId");
    const project = await kv.get(`studio:project:${quoteId}`);

    if (!project) {
      return c.json({ 
        success: false,
        message: "No saved project found"
      }, 404);
    }

    return c.json({
      success: true,
      project
    });
  } catch (error) {
    console.error("Error loading studio project:", error);
    return c.json({ error: "Failed to load project" }, 500);
  }
});

// ============================================================================
// STRUCTURAL DESIGN - Section 1: Base Functionality Routes
// ============================================================================

console.log("🏗️  Registering Structural Design endpoints...");

// Save structural design project
app.post("/make-server-57095a78/structural-design/save", async (c) => {
  try {
    const project = await c.req.json();
    const { id, name, elements, annotations, layers, createdAt, updatedAt } = project;

    const key = `structural-design:${id}`;
    await kv.set(key, {
      id,
      name,
      elements,
      annotations,
      layers,
      createdAt,
      updatedAt
    });

    return c.json({ 
      success: true,
      message: "Structural design project saved successfully",
      projectId: id
    });
  } catch (error) {
    console.error("Error saving structural design project:", error);
    return c.json({ error: "Failed to save structural design project" }, 500);
  }
});

// Load structural design project
app.get("/make-server-57095a78/structural-design/:projectId", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const project = await kv.get(`structural-design:${projectId}`);

    if (!project) {
      return c.json({ 
        success: false,
        message: "Structural design project not found"
      }, 404);
    }

    return c.json({
      success: true,
      project
    });
  } catch (error) {
    console.error("Error loading structural design project:", error);
    return c.json({ error: "Failed to load structural design project" }, 500);
  }
});

// List all structural design projects
app.get("/make-server-57095a78/structural-design", async (c) => {
  try {
    const projects = await kv.getByPrefix("structural-design:");
    
    return c.json({
      success: true,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        elementCount: p.elements?.length || 0
      }))
    });
  } catch (error) {
    console.error("Error listing structural design projects:", error);
    return c.json({ error: "Failed to list structural design projects" }, 500);
  }
});

console.log("  ✓ Structural Design endpoints registered");

// ============================================================================
// ECOMMERCE ORDERS - ORDER MANAGEMENT & FULFILLMENT
// ============================================================================
app.route("/make-server-57095a78", ordersRouter);
console.log("  ✓ Orders router mounted at /make-server-57095a78");

// ============================================================================
// MATERIALS API - Home Depot, Lowe's, Grainger Integration
// ============================================================================
app.route("/make-server-57095a78/materials", materialsRouter);
console.log("  ✓ Materials API router mounted at /make-server-57095a78/materials");

// ============================================================================
// CATCH-ALL FOR DEBUGGING - Must be last!
// ============================================================================
app.all("*", (c) => {
  const path = c.req.path;
  const method = c.req.method;
  console.log(`⚠️  Unhandled route: ${method} ${path}`);
  return c.json({ 
    error: "Not Found", 
    path,
    method,
    message: "This endpoint does not exist. Check the URL and try again.",
    availableEndpoints: [
      "/",
      "/health",
      "/make-server-57095a78/health",
      "/make-server-57095a78/subscriptions",
      "/make-server-57095a78/customers",
      "/make-server-57095a78/big-box-products/search",
      "/make-server-57095a78/owner/companies",
      "/make-server-57095a78/owner/reports/revenue",
      "/make-server-57095a78/admin/data-stats",
      "/make-server-57095a78/admin/clear-all-data",
      "/make-server-57095a78/calendar/events"
    ]
  }, 404);
});

console.log("========================================");
console.log("✅ Figma Make Server v4.0 Initialized!");
console.log("========================================");
console.log("📍 Project: plzsvzwwcdopnawtiwzm");
console.log("🔧 Function: server");
console.log("🌐 Health endpoints:");
console.log("   - /make-server-57095a78/health");
console.log("   - /health");
console.log("📦 Product Ads endpoints ready:");
console.log("   - /make-server-57095a78/product-ads/available-products");
console.log("   - /make-server-57095a78/product-ads/templates");
console.log("   - /make-server-57095a78/product-ads/create-bulk");
// ============================================================================
// CONTENT MANAGEMENT API
// ============================================================================

// Create content piece
app.post("/make-server-57095a78/content/create", async (c) => {
  console.log("📝 POST /content/create called");
  try {
    const body = await c.req.json();
    const { contentPiece } = body;
    
    if (!contentPiece || !contentPiece.id || !contentPiece.company_id) {
      return c.json({ error: "Invalid content piece data" }, 400);
    }
    
    // Store in KV store
    const key = `content_piece:${contentPiece.company_id}:${contentPiece.id}`;
    await kv.set(key, contentPiece);
    
    console.log(`✓ Content piece created: ${key}`);
    return c.json({ success: true, id: contentPiece.id });
  } catch (error) {
    console.error("❌ Error creating content piece:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all content pieces for a company
app.get("/make-server-57095a78/content/list/:companyId", async (c) => {
  console.log("📝 GET /content/list called");
  try {
    const companyId = c.req.param("companyId");
    
    if (!companyId) {
      return c.json({ error: "Company ID required" }, 400);
    }
    
    // Get all content pieces for this company
    const prefix = `content_piece:${companyId}:`;
    const kvPieces = await kv.getByPrefix(prefix);
    const pieces = kvPieces.map((item: any) => item.value);
    
    console.log(`✓ Found ${pieces.length} content pieces for company ${companyId}`);
    return c.json({ success: true, pieces });
  } catch (error) {
    console.error("❌ Error listing content pieces:", error);
    return c.json({ error: String(error) }, 500);
  }
});

console.log("📝 Content Management endpoints ready:");
console.log("   - /make-server-57095a78/content/create");
console.log("   - /make-server-57095a78/content/list/:companyId");

// ============================================================================
// MOBILE PORTALS
// ============================================================================

// Get all mobile portals
app.get("/make-server-57095a78/mobile-portals", async (c) => {
  try {
    const portals = await kv.getByPrefix("mobile-portal:");
    console.log("📱 Retrieved mobile portals:", portals.length);
    return c.json({ portals });
  } catch (error) {
    console.error("Error fetching mobile portals:", error);
    return c.json({ error: "Failed to fetch mobile portals", portals: [] }, 500);
  }
});

// Get single mobile portal
app.get("/make-server-57095a78/mobile-portals/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const portal = await kv.get(`mobile-portal:${id}`);
    if (!portal) {
      return c.json({ error: "Portal not found" }, 404);
    }
    return c.json(portal);
  } catch (error) {
    console.error("Error fetching mobile portal:", error);
    return c.json({ error: "Failed to fetch mobile portal" }, 500);
  }
});

// Create mobile portal
app.post("/make-server-57095a78/mobile-portals", async (c) => {
  try {
    const data = await c.req.json();
    const id = `PORTAL-${Date.now()}`;
    const portal = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
    };
    await kv.set(`mobile-portal:${id}`, portal);
    console.log("📱 Created mobile portal:", id);
    return c.json(portal);
  } catch (error) {
    console.error("Error creating mobile portal:", error);
    return c.json({ error: "Failed to create mobile portal" }, 500);
  }
});

// Update mobile portal
app.patch("/make-server-57095a78/mobile-portals/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await kv.get(`mobile-portal:${id}`);
    if (!existing) {
      return c.json({ error: "Portal not found" }, 404);
    }
    const updated = {
      ...existing,
      ...data,
      id,
      updated_at: new Date().toISOString(),
    };
    await kv.set(`mobile-portal:${id}`, updated);
    console.log("📱 Updated mobile portal:", id);
    return c.json(updated);
  } catch (error) {
    console.error("Error updating mobile portal:", error);
    return c.json({ error: "Failed to update mobile portal" }, 500);
  }
});

// Delete mobile portal
app.delete("/make-server-57095a78/mobile-portals/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`mobile-portal:${id}`);
    console.log("📱 Deleted mobile portal:", id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting mobile portal:", error);
    return c.json({ error: "Failed to delete mobile portal" }, 500);
  }
});

console.log("📱 Mobile Portal Management endpoints ready:");
console.log("   - GET    /make-server-57095a78/mobile-portals");
console.log("   - GET    /make-server-57095a78/mobile-portals/:id");
console.log("   - POST   /make-server-57095a78/mobile-portals");
console.log("   - PATCH  /make-server-57095a78/mobile-portals/:id");
console.log("   - DELETE /make-server-57095a78/mobile-portals/:id");

// ============================================================================
// QUOTE TO CONTRACT - WORKFLOW SYSTEM
// ============================================================================

console.log("📋 Registering Quote to Contract endpoints...");

// POST /make-server-57095a78/quotes/create - Create quote from work request
app.post("/make-server-57095a78/quotes/create", async (c) => {
  try {
    const { workRequestId, quote } = await c.req.json();
    console.log(`Creating quote for work request: ${workRequestId}`);

    if (!workRequestId || !quote) {
      return c.json({ error: 'Missing required fields: workRequestId, quote' }, 400);
    }

    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const quoteData = {
      id: quoteId,
      workRequestId,
      ...quote,
      customerApprovalStatus: 'pending',
      convertedToContract: false,
      subBids: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quote_${quoteId}`, quoteData);
    console.log(`Quote created successfully: ${quoteId}`);

    return c.json({ success: true, quote: quoteData });
  } catch (error) {
    console.error('Error creating quote:', error);
    return c.json({ error: 'Failed to create quote', details: String(error) }, 500);
  }
});

// GET /make-server-57095a78/quotes/:id - Get quote by ID
app.get("/make-server-57095a78/quotes/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const quote = await kv.get(`quote_${id}`);

    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    return c.json({ success: true, quote });
  } catch (error) {
    console.error('Error fetching quote:', error);
    return c.json({ error: 'Failed to fetch quote', details: String(error) }, 500);
  }
});

// GET /make-server-57095a78/quotes/work-request/:workRequestId - Get quotes by work request
app.get("/make-server-57095a78/quotes/work-request/:workRequestId", async (c) => {
  try {
    const workRequestId = c.req.param('workRequestId');
    const allQuotes = await kv.getByPrefix('quote_');
    const quotes = allQuotes.filter((q: any) => q.workRequestId === workRequestId);

    return c.json({ success: true, quotes, total: quotes.length });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return c.json({ error: 'Failed to fetch quotes', details: String(error) }, 500);
  }
});

// PUT /make-server-57095a78/quotes/:id - Update quote
app.put("/make-server-57095a78/quotes/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existing = await kv.get(`quote_${id}`);
    if (!existing) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quote_${id}`, updated);
    console.log(`Quote updated: ${id}`);

    return c.json({ success: true, quote: updated });
  } catch (error) {
    console.error('Error updating quote:', error);
    return c.json({ error: 'Failed to update quote', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/quotes/:id/send-to-sub - Send bid request to subcontractor
app.post("/make-server-57095a78/quotes/:id/send-to-sub", async (c) => {
  try {
    const quoteId = c.req.param('id');
    const { subcontractorId, subcontractorName, workScope, materials, labor, dueDate } = await c.req.json();
    
    console.log(`Sending bid request to ${subcontractorName} for quote: ${quoteId}`);

    const quote = await kv.get(`quote_${quoteId}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    const bidRequestId = `bid_request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bidRequest = {
      id: bidRequestId,
      quoteId,
      subcontractorId,
      subcontractorName,
      workScope,
      materials,
      labor,
      dueDate,
      status: 'sent',
      sentAt: new Date().toISOString()
    };

    // Add bid request to quote's subBids array
    const updatedQuote = {
      ...quote,
      subBids: [...(quote.subBids || []), bidRequest],
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quote_${quoteId}`, updatedQuote);
    await kv.set(`bid_request_${bidRequestId}`, bidRequest);

    console.log(`Bid request sent: ${bidRequestId}`);
    return c.json({ success: true, bidRequest, quote: updatedQuote });
  } catch (error) {
    console.error('Error sending bid request:', error);
    return c.json({ error: 'Failed to send bid request', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/quotes/:id/receive-bid - Receive bid from subcontractor
app.post("/make-server-57095a78/quotes/:id/receive-bid", async (c) => {
  try {
    const quoteId = c.req.param('id');
    const { bidRequestId, bidAmount, bidNotes, estimatedDuration } = await c.req.json();
    
    console.log(`Receiving bid for quote: ${quoteId}, bid request: ${bidRequestId}`);

    const quote = await kv.get(`quote_${quoteId}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    // Update the bid request in the quote
    const updatedSubBids = (quote.subBids || []).map((bid: any) => 
      bid.id === bidRequestId 
        ? {
            ...bid,
            status: 'received',
            bidAmount,
            bidNotes,
            estimatedDuration,
            receivedAt: new Date().toISOString()
          }
        : bid
    );

    const updatedQuote = {
      ...quote,
      subBids: updatedSubBids,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quote_${quoteId}`, updatedQuote);
    console.log(`Bid received and saved: ${bidRequestId}`);

    return c.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Error receiving bid:', error);
    return c.json({ error: 'Failed to receive bid', details: String(error) }, 500);
  }
});

// GET /make-server-57095a78/quotes/:id/bids - Get all bids for a quote
app.get("/make-server-57095a78/quotes/:id/bids", async (c) => {
  try {
    const quoteId = c.req.param('id');
    console.log(`Getting bids for quote: ${quoteId}`);

    // Get all bid requests for this quote
    const bidRequests = await kv.getByPrefix(`bid_request_quote_${quoteId}_`);
    
    // Get all received bids
    const bids = await kv.getByPrefix(`bid_response_quote_${quoteId}_`);
    
    console.log(`Found ${bids.length} bids for quote ${quoteId}`);

    return c.json({ 
      success: true, 
      bids: bids.map((bid: any) => ({
        id: bid.id,
        subcontractorName: bid.subcontractorName,
        subcontractorEmail: bid.subcontractorEmail,
        subcontractorPhone: bid.subcontractorPhone || 'N/A',
        company: bid.company || bid.subcontractorName,
        bidAmount: bid.bidAmount,
        estimatedDuration: bid.estimatedDuration || 'Not specified',
        notes: bid.bidNotes || '',
        status: bid.status || 'pending',
        submittedAt: bid.submittedAt,
        rating: bid.rating || null
      }))
    });
  } catch (error) {
    console.error('Error getting bids:', error);
    return c.json({ error: 'Failed to get bids', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/quotes/:id/request-bids - Request bids from subcontractors
app.post("/make-server-57095a78/quotes/:id/request-bids", async (c) => {
  try {
    const quoteId = c.req.param('id');
    const { workRequestId } = await c.req.json();
    
    console.log(`Requesting bids for quote: ${quoteId}`);

    // Get the quote
    const quote = await kv.get(`quote_${quoteId}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    // Get list of qualified subcontractors (for now, create sample ones)
    // In production, you'd query actual subcontractor database
    const subcontractors = [
      {
        id: 'sub_001',
        name: 'Elite Construction Co.',
        email: 'bids@eliteconstruction.com',
        phone: '(555) 123-4567',
        specialty: 'General Construction'
      },
      {
        id: 'sub_002',
        name: 'Premium Contractors LLC',
        email: 'quotes@premiumcontractors.com',
        phone: '(555) 234-5678',
        specialty: 'Commercial Build-Outs'
      },
      {
        id: 'sub_003',
        name: 'Quality Build Services',
        email: 'bidding@qualitybuild.com',
        phone: '(555) 345-6789',
        specialty: 'Residential & Commercial'
      }
    ];

    // Send bid requests to all subcontractors
    const bidRequestPromises = subcontractors.map(async (sub) => {
      const bidRequestId = `bidreq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const bidRequest = {
        id: bidRequestId,
        quoteId,
        workRequestId,
        subcontractorId: sub.id,
        subcontractorName: sub.name,
        subcontractorEmail: sub.email,
        subcontractorPhone: sub.phone,
        workScope: quote.description || 'See quote details',
        materials: quote.materials || [],
        labor: quote.labor || [],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'sent',
        sentAt: new Date().toISOString()
      };

      await kv.set(`bid_request_quote_${quoteId}_${bidRequestId}`, bidRequest);
      
      console.log(`Bid request sent to ${sub.name}: ${bidRequestId}`);
      
      // Here you would send an actual email
      // For demo, we'll auto-create some sample bids after a delay
      setTimeout(async () => {
        const sampleBid = {
          id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          bidRequestId,
          quoteId,
          subcontractorId: sub.id,
          subcontractorName: sub.name,
          subcontractorEmail: sub.email,
          subcontractorPhone: sub.phone,
          company: sub.name,
          bidAmount: quote.totalCost ? quote.totalCost * (0.85 + Math.random() * 0.15) : 25000,
          estimatedDuration: `${Math.floor(5 + Math.random() * 10)} business days`,
          bidNotes: `We can complete this ${quote.serviceType || 'project'} with our experienced team. Includes all materials and labor as specified.`,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          rating: 4 + Math.random()
        };
        
        await kv.set(`bid_response_quote_${quoteId}_${sampleBid.id}`, sampleBid);
        console.log(`Sample bid created from ${sub.name}`);
      }, 2000 + Math.random() * 3000);

      return bidRequest;
    });

    const bidRequests = await Promise.all(bidRequestPromises);

    return c.json({ 
      success: true, 
      message: `Bid requests sent to ${subcontractors.length} subcontractors`,
      bidRequests
    });
  } catch (error) {
    console.error('Error requesting bids:', error);
    return c.json({ error: 'Failed to request bids', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/quotes/:id/send-to-customer - Send quote to customer for approval
app.post("/make-server-57095a78/quotes/:id/send-to-customer", async (c) => {
  try {
    const quoteId = c.req.param('id');
    const { customerEmail, message } = await c.req.json();
    
    console.log(`Sending quote to customer: ${customerEmail}`);

    const quote = await kv.get(`quote_${quoteId}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    const updatedQuote = {
      ...quote,
      customerApprovalStatus: 'pending',
      sentToCustomerAt: new Date().toISOString(),
      customerEmail,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quote_${quoteId}`, updatedQuote);
    console.log(`Quote sent to customer for approval: ${quoteId}`);

    // Here you would integrate with email service
    // For now, just log it
    console.log(`Email would be sent to: ${customerEmail}`);
    console.log(`Message: ${message}`);

    return c.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Error sending quote to customer:', error);
    return c.json({ error: 'Failed to send quote', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/quotes/:id/approve - Customer approves quote
app.post("/make-server-57095a78/quotes/:id/approve", async (c) => {
  try {
    const quoteId = c.req.param('id');
    const { customerSignature, approvalNotes } = await c.req.json();
    
    console.log(`Customer approving quote: ${quoteId}`);

    const quote = await kv.get(`quote_${quoteId}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    const updatedQuote = {
      ...quote,
      customerApprovalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      customerSignature,
      approvalNotes,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quote_${quoteId}`, updatedQuote);
    console.log(`Quote approved by customer: ${quoteId}`);

    return c.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Error approving quote:', error);
    return c.json({ error: 'Failed to approve quote', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/quotes/:id/convert-to-contract - Convert approved quote to contract
app.post("/make-server-57095a78/quotes/:id/convert-to-contract", async (c) => {
  try {
    const quoteId = c.req.param('id');
    
    console.log(`Converting quote to contract: ${quoteId}`);

    const quote = await kv.get(`quote_${quoteId}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    if (quote.customerApprovalStatus !== 'approved') {
      return c.json({ error: 'Quote must be approved before converting to contract' }, 400);
    }

    const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contract = {
      id: contractId,
      quoteId,
      workRequestId: quote.workRequestId,
      materials: quote.materials,
      labor: quote.labor,
      processSteps: quote.processSteps,
      totalCost: quote.totalCost,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save contract
    await kv.set(`contract_${contractId}`, contract);

    // Update quote to mark as converted
    const updatedQuote = {
      ...quote,
      convertedToContract: true,
      contractId,
      updatedAt: new Date().toISOString()
    };
    await kv.set(`quote_${quoteId}`, updatedQuote);

    console.log(`Contract created: ${contractId}`);
    return c.json({ success: true, contract, quote: updatedQuote });
  } catch (error) {
    console.error('Error converting to contract:', error);
    return c.json({ error: 'Failed to convert to contract', details: String(error) }, 500);
  }
});

// POST /make-server-57095a78/designs/save-to-work-request - Save design changes back to work request
app.post("/make-server-57095a78/designs/save-to-work-request", async (c) => {
  try {
    const { workRequestId, floorPlanData, designChanges } = await c.req.json();
    
    console.log(`Saving design changes to work request: ${workRequestId}`);

    if (!workRequestId || !floorPlanData) {
      return c.json({ error: 'Missing required fields: workRequestId, floorPlanData' }, 400);
    }

    // In a real implementation, you would update the work request in the database
    // For now, we'll just save the design data
    const designKey = `design_${workRequestId}`;
    const designData = {
      workRequestId,
      floorPlanData,
      designChanges,
      savedAt: new Date().toISOString()
    };

    await kv.set(designKey, designData);
    console.log(`Design saved for work request: ${workRequestId}`);

    return c.json({ success: true, design: designData });
  } catch (error) {
    console.error('Error saving design:', error);
    return c.json({ error: 'Failed to save design', details: String(error) }, 500);
  }
});

// GET /make-server-57095a78/designs/work-request/:workRequestId - Get design for work request
app.get("/make-server-57095a78/designs/work-request/:workRequestId", async (c) => {
  try {
    const workRequestId = c.req.param('workRequestId');
    const design = await kv.get(`design_${workRequestId}`);

    if (!design) {
      return c.json({ error: 'Design not found' }, 404);
    }

    return c.json({ success: true, design });
  } catch (error) {
    console.error('Error fetching design:', error);
    return c.json({ error: 'Failed to fetch design', details: String(error) }, 500);
  }
});

console.log("✅ Quote to Contract endpoints registered:");
console.log("   - POST   /make-server-57095a78/quotes/create");
console.log("   - GET    /make-server-57095a78/quotes/:id");
console.log("   - GET    /make-server-57095a78/quotes/work-request/:workRequestId");
console.log("   - PUT    /make-server-57095a78/quotes/:id");
console.log("   - GET    /make-server-57095a78/quotes/:id/bids");
console.log("   - POST   /make-server-57095a78/quotes/:id/request-bids");
console.log("   - POST   /make-server-57095a78/quotes/:id/send-to-sub");
console.log("   - POST   /make-server-57095a78/quotes/:id/receive-bid");
console.log("   - POST   /make-server-57095a78/quotes/:id/send-to-customer");
console.log("   - POST   /make-server-57095a78/quotes/:id/approve");
console.log("   - POST   /make-server-57095a78/quotes/:id/convert-to-contract");
console.log("   - POST   /make-server-57095a78/designs/save-to-work-request");
console.log("   - GET    /make-server-57095a78/designs/work-request/:workRequestId");

console.log("🚀 Starting Deno server with Hono app...");
console.log("✓ Server is now listening for requests");
console.log("========================================\n");

Deno.serve(app.fetch);