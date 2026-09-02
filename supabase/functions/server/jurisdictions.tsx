/**
 * What each town requires, remembered between jobs.
 *
 * The point of this record is that it outlives the job that created it. Salem
 * costs twenty minutes once; every Salem job afterwards is checked at design
 * time instead of at the counter. Stored per company rather than per project
 * for exactly that reason.
 *
 * WHAT IT WILL NOT DO
 *
 * Invent a figure. There is no seeded data here and none is coming: a rule this
 * system did not learn from a person is a rule it does not have, and it reports
 * that as unknown rather than guessing. Shipping pre-loaded ordinances would
 * work on day one and rot in silence — a setback that was right when written is
 * wrong after the next town meeting, and a wrong setback in a filed drawing
 * costs a reputation with a building department.
 *
 * Staff only, in both directions. These figures decide filings.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { trustedRole } from "./trustedRole.ts";

const app = new Hono();

const STAFF = new Set([
  "owner", "platform_owner", "business_owner", "admin", "master_admin",
  "super_admin", "superadmin", "management", "staff", "employee",
  "project_manager", "estimator", "office",
]);

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function requireStaff(c: any, next: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ error: "Sign in required." }, 401);
  const { data, error } = await service().auth.getUser(token);
  if (error || !data?.user) return c.json({ error: "Sign in required." }, 401);
  const owners = [
    "ericerb555@proton.me",
    ...(Deno.env.get("PLATFORM_OWNER_EMAILS") || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
  ];
  const isStaff = owners.includes(String(data.user.email || "").toLowerCase())
    || STAFF.has(trustedRole(data.user));
  if (!isStaff) return c.json({ error: "Internal access is required." }, 403);
  c.set("actor", data.user);
  await next();
}

app.use("*", requireStaff);

/**
 * Keyed by state and town, normalised.
 *
 * "Salem", "salem" and " SALEM " are one town, and a second record for the same
 * place is worse than none — two answers to the same question, with nothing to
 * say which is current.
 */
function keyFor(state: string, town: string): string {
  const s = String(state || "").trim().toUpperCase().slice(0, 4);
  const t = String(town || "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 80);
  return `jurisdiction:${s}:${t}`;
}

const INDEX = "jurisdiction_index";

/** A number, or undefined. Never zero-by-accident — see the note below. */
function optionalNumber(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  // Zero is a legitimate answer for a permit threshold, meaning everything
  // needs one. Coercing an absent value to zero would silently claim that.
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function optionalString(v: any, max = 400): string | undefined {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || undefined;
}

const SOURCES = new Set(["ordinance", "counter", "phone", "assumed"]);

app.get("/:state/:town", async (c) => {
  try {
    const state = c.req.param("state");
    const town = c.req.param("town");
    if (!state || !town) return c.json({ error: "A town and state are required." }, 400);
    const record = await kv.get(keyFor(state, town));
    return c.json({ jurisdiction: record || null });
  } catch (error: any) {
    return c.json({ error: error?.message || "That town could not be read." }, 500);
  }
});

app.get("/", async (c) => {
  try {
    const index = (await kv.get(INDEX)) as string[] | null;
    const keys = Array.isArray(index) ? index.slice(0, 500) : [];
    const jurisdictions = [];
    for (const k of keys) {
      const record = await kv.get(k);
      if (record) jurisdictions.push(record);
    }
    return c.json({ jurisdictions });
  } catch (error: any) {
    return c.json({ error: error?.message || "Those could not be listed." }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const actor = c.get("actor");
    const body = await c.req.json().catch(() => ({}));
    const raw = body?.jurisdiction;
    if (!raw || typeof raw !== "object") {
      return c.json({ error: "A town record is required." }, 400);
    }

    const town = optionalString(raw.town, 120);
    const state = optionalString(raw.state, 4);
    if (!town || !state) return c.json({ error: "A town and state are required." }, 400);

    const key = keyFor(state, town);

    // Rebuilt field by field rather than spread, so a client cannot store
    // arbitrary keys against a record the whole company reads.
    const record = {
      id: key,
      town,
      state: state.toUpperCase(),
      frontSetbackFt: optionalNumber(raw.frontSetbackFt),
      rearSetbackFt: optionalNumber(raw.rearSetbackFt),
      sideSetbackFt: optionalNumber(raw.sideSetbackFt),
      maxHeightFt: optionalNumber(raw.maxHeightFt),
      maxLotCoveragePct: optionalNumber(raw.maxLotCoveragePct),
      permitExemptUnderSqFt: optionalNumber(raw.permitExemptUnderSqFt),
      feeNote: optionalString(raw.feeNote),
      // A link somebody will click, so it is restricted to http and https here
      // where it cannot be bypassed. A javascript: scheme stored in a field the
      // whole company reads would execute for other people.
      formsUrl: (() => {
        const u = optionalString(raw.formsUrl, 500);
        if (!u) return undefined;
        try {
          const parsed = new URL(u);
          return parsed.protocol === "http:" || parsed.protocol === "https:" ? u : undefined;
        } catch { return undefined; }
      })(),
      submissionNote: optionalString(raw.submissionNote),
      notes: optionalString(raw.notes, 4000),
      source: SOURCES.has(raw.source) ? raw.source : "assumed",
      enteredBy: optionalString(raw.enteredBy, 200) || actor?.email || undefined,
      enteredOn: optionalString(raw.enteredOn, 40) || new Date().toISOString().slice(0, 10),
    };

    await kv.set(key, record);

    const index = (await kv.get(INDEX)) as string[] | null;
    const list = Array.isArray(index) ? index : [];
    if (!list.includes(key)) await kv.set(INDEX, [...list, key]);

    return c.json({ success: true, jurisdiction: record });
  } catch (error: any) {
    return c.json({ error: error?.message || "That town could not be saved." }, 500);
  }
});

export default app;
