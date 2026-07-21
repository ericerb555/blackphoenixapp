import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import plansRouter from "./plans.tsx";
import { entitlementsRouter } from "./entitlements.tsx";
import paymentProcessingRouter from "./payment-processing.tsx";
import hourTransfersRouter from "./hour-transfers.tsx";
import timeTrackingRouter from "./time-tracking.tsx";
import quotesRouter from "./quotes.tsx";
import deliverablesRouter from "./deliverables.tsx";
import designProjectsRouter from "./design-projects.tsx";
import projectVisionRouter from "./project-vision.tsx";
import aiFloorplanRouter from "./ai-floorplan.tsx";
import maintenanceConfigRouter from "./maintenance-config.tsx";
import { productsRouter } from "./ecommerce-products.tsx";
import { cartRouter } from "./ecommerce-cart.tsx";
import crmContentRouter from "./crm-content.tsx";
import growthMarketingRouter from "./growth-marketing.tsx";
import { marketingAssetsRouter } from "./marketing-assets.tsx";
import { territoryCohortRouter } from "./territory-cohorts.tsx";
import { vendorProfileRouter } from "./vendor-profile.tsx";
import pipelineRouter from "./pipeline.tsx";
import vendorPricingRouter from "./vendorPricing.tsx";
import brandsRouter from "./brands.tsx";
import { companyConfigRouter } from "./company-config.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Payment-Confirmation-Secret", "X-Loyalty-Event-Secret", "X-Affiliate-Event-Secret"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health is kept lightweight for deployment diagnostics.
app.get("/make-server-57095a78/health", (c) => c.json({ status: "ok", modules: ["plans", "entitlements", "payments", "hour-transfers", "time-tracking"] }));

// Batch 1 — mount the already implemented production workflow routers.
// Plans and entitlements declare their full function path themselves.
app.route("/", plansRouter);
app.route("/", entitlementsRouter);

// These routers deliberately use relative paths, so the function namespace is
// applied at the mount point. This matches the API paths called by the app.
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
app.route("/", crmContentRouter);
app.route("/", growthMarketingRouter);
app.route("/make-server-57095a78", marketingAssetsRouter);
app.route("/make-server-57095a78", territoryCohortRouter);
app.route("/make-server-57095a78", vendorProfileRouter);
app.route("/", pipelineRouter);
app.route("/", vendorPricingRouter);
app.route("/", brandsRouter);
app.route("/make-server-57095a78", companyConfigRouter);

Deno.serve(app.fetch);
