/**
 * tech-roster — server routes backing the Tech Roster & Tier Rates admin tool.
 *
 * Persists:
 *   - tech tier config (rates per tier A–D)  → KV key `tech_tiers:config`
 *   - individual tech profiles               → KV keys `tech:{id}`
 *
 * Consumed by src/app/components/TechRosterManager.tsx and TierPicker.
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const techRosterRouter = new Hono();

techRosterRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

const TIERS_KEY = "tech_tiers:config";

// Sensible defaults so the UI has rates to show before an admin saves anything.
const DEFAULT_TIERS = [
  { id: "A", label: "Tier A — Elite Master", description: "Top-tier master craftsman. 15+ years, full certifications, complex/high-stakes work.", hourlyRate: 145, color: "yellow" },
  { id: "B", label: "Tier B — Senior Journeyman", description: "Highly experienced. 8+ years, licensed, handles most jobs independently.", hourlyRate: 110, color: "gray" },
  { id: "C", label: "Tier C — Journeyman", description: "Solid all-around tech. 3+ years, licensed, standard service and repairs.", hourlyRate: 85, color: "blue" },
  { id: "D", label: "Tier D — Apprentice", description: "Entry-level / supervised. Routine tasks, basic maintenance, assists senior techs.", hourlyRate: 55, color: "green" },
];

function genId() {
  return `TECH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

// ── Tier config ───────────────────────────────────────────────────────────────

techRosterRouter.get("/make-server-57095a78/tech-tiers/config", async (c) => {
  try {
    const stored = await kv.get(TIERS_KEY);
    const tiers = Array.isArray(stored?.tiers) && stored.tiers.length > 0 ? stored.tiers : DEFAULT_TIERS;
    return c.json({ success: true, tiers });
  } catch (error) {
    console.error("[TechRoster] Error fetching tier config:", error);
    return c.json({ success: false, error: "Failed to load tier config", details: String(error) }, 500);
  }
});

techRosterRouter.post("/make-server-57095a78/tech-tiers/config", async (c) => {
  try {
    const body = await c.req.json();
    const tiers = body?.tiers;
    if (!Array.isArray(tiers)) {
      return c.json({ success: false, error: "`tiers` must be an array" }, 400);
    }
    // Normalize each tier so downstream consumers get consistent shapes.
    const normalized = tiers.map((t: any) => ({
      id: String(t.id || "").toUpperCase().slice(0, 2) || "C",
      label: String(t.label || "Untitled tier"),
      description: String(t.description || ""),
      hourlyRate: Number(t.hourlyRate) || 0,
      color: String(t.color || "blue"),
    }));
    await kv.set(TIERS_KEY, { tiers: normalized, updatedAt: new Date().toISOString() });
    console.log(`[TechRoster] Saved ${normalized.length} tiers`);
    return c.json({ success: true, tiers: normalized });
  } catch (error) {
    console.error("[TechRoster] Error saving tier config:", error);
    return c.json({ success: false, error: "Failed to save tier config", details: String(error) }, 500);
  }
});

// ── Tech roster ─────────────────────────────────────────────────────────────

techRosterRouter.get("/make-server-57095a78/tech-roster", async (c) => {
  try {
    const techs = await kv.getByPrefix("tech:");
    return c.json({ success: true, techs: techs || [] });
  } catch (error) {
    console.error("[TechRoster] Error fetching roster:", error);
    return c.json({ success: false, error: "Failed to load roster", details: String(error) }, 500);
  }
});

techRosterRouter.post("/make-server-57095a78/tech-roster", async (c) => {
  try {
    const body = await c.req.json();
    const input = body?.tech;
    if (!input || !String(input.name || "").trim()) {
      return c.json({ success: false, error: "Tech name is required" }, 400);
    }

    const id = input.id || genId();
    const existing = input.id ? await kv.get(`tech:${id}`) : null;

    const tech = {
      ...(existing || {}),
      ...input,
      id,
      yearsExperience: Number(input.yearsExperience) || 0,
      trades: Array.isArray(input.trades) ? input.trades : [],
      available: input.available !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`tech:${id}`, tech);
    console.log(`[TechRoster] Saved tech ${id} (${tech.name})`);
    return c.json({ success: true, tech });
  } catch (error) {
    console.error("[TechRoster] Error saving tech:", error);
    return c.json({ success: false, error: "Failed to save tech", details: String(error) }, 500);
  }
});

techRosterRouter.delete("/make-server-57095a78/tech-roster/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`tech:${id}`);
    console.log(`[TechRoster] Deleted tech ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[TechRoster] Error deleting tech:", error);
    return c.json({ success: false, error: "Failed to delete tech", details: String(error) }, 500);
  }
});

export default techRosterRouter;
