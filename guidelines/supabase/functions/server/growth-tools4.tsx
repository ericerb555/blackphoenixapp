import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

const MEDIA_KEY = "media_library:default";
const QR_KEY = "qr_codes:default";
const ACCESS_REQ_KEY = "access_requests:default";
const GATEWAYS_KEY = "payment_gateways:default";
const BRANDING_KEY = "public_branding:default";

// --- Media library (bulk array) -----------------------------------------------
router.get("/make-server-57095a78/media-library", async (c) => {
  try {
    const items = await kv.get(MEDIA_KEY);
    return c.json({ success: true, items: Array.isArray(items) ? items : null });
  } catch (err) {
    console.log("Error loading media library:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/media-library", async (c) => {
  try {
    const { items } = await c.req.json();
    await kv.set(MEDIA_KEY, Array.isArray(items) ? items : []);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving media library:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// --- QR codes (bulk array) ----------------------------------------------------
router.get("/make-server-57095a78/qr-codes", async (c) => {
  try {
    const codes = await kv.get(QR_KEY);
    return c.json({ success: true, codes: Array.isArray(codes) ? codes : null });
  } catch (err) {
    console.log("Error loading QR codes:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/qr-codes", async (c) => {
  try {
    const { codes } = await c.req.json();
    await kv.set(QR_KEY, Array.isArray(codes) ? codes : []);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving QR codes:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// --- Access requests (bulk array) ---------------------------------------------
router.get("/make-server-57095a78/access-requests", async (c) => {
  try {
    const requests = await kv.get(ACCESS_REQ_KEY);
    return c.json({ success: true, requests: Array.isArray(requests) ? requests : [] });
  } catch (err) {
    console.log("Error loading access requests:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/access-requests", async (c) => {
  try {
    const { requests } = await c.req.json();
    await kv.set(ACCESS_REQ_KEY, Array.isArray(requests) ? requests : []);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving access requests:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// --- Payment gateway state (non-secret only) ----------------------------------
// SECURITY: we deliberately store and return only the non-secret gateway state
// (is_active, test_mode, timestamps). API keys/secrets are never sent to or from
// this anon-readable endpoint — they stay in the operator's local browser.
router.get("/make-server-57095a78/payment-gateways", async (c) => {
  try {
    const configs = await kv.get(GATEWAYS_KEY);
    return c.json({ success: true, configs: configs && typeof configs === "object" ? configs : {} });
  } catch (err) {
    console.log("Error loading payment gateways:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/payment-gateways", async (c) => {
  try {
    const { configs } = await c.req.json();
    const safe: Record<string, any> = {};
    if (configs && typeof configs === "object") {
      for (const [id, cfg] of Object.entries<any>(configs)) {
        if (!cfg) continue;
        // Strip any secret material before persisting.
        safe[id] = {
          gateway_name: cfg.gateway_name ?? id,
          is_active: !!cfg.is_active,
          test_mode: cfg.test_mode !== false,
          has_credentials: !!(cfg.api_key || cfg.api_secret),
          created_at: cfg.created_at || new Date().toISOString(),
          updated_at: cfg.updated_at || new Date().toISOString(),
        };
      }
    }
    await kv.set(GATEWAYS_KEY, safe);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving payment gateways:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// --- Public company branding --------------------------------------------------
// GET is intentionally public-friendly (anon key) so unauthenticated landing-page
// visitors can load the brand. We never store base64 logo blobs — only real
// Storage URLs — so the response is safe to transfer across devices.
router.get("/make-server-57095a78/public/branding", async (c) => {
  try {
    const branding = await kv.get(BRANDING_KEY);
    if (!branding) return c.json(null);
    return c.json(branding);
  } catch (err) {
    console.log("Error loading public branding:", err);
    return c.json(null);
  }
});

router.post("/make-server-57095a78/branding-profile", async (c) => {
  try {
    const { branding } = await c.req.json();
    const b = branding && typeof branding === "object" ? { ...branding } : {};
    // Strip base64 logo blobs; only persist real Storage URLs.
    for (const field of ["logo_url", "logo_primary", "logoPrimary"]) {
      if (typeof b[field] === "string" && b[field].startsWith("data:")) {
        delete b[field];
      }
    }
    await kv.set(BRANDING_KEY, b);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving branding profile:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
