/**
 * onCallPlatformRates — what Black Phoenix charges when Black Phoenix answers.
 *
 * WHY THIS IS NOT ON THE ACCOUNT'S RECORD
 *
 * Because the account's record is edited by the account. That is right for a
 * rota they run themselves — their contractor turns out, their money, their
 * rates — and exactly wrong for ours. With our callout living in their record,
 * the customer being charged it is the person who can change it, and setting it
 * to zero is a text field and a Save button away.
 *
 * So there are two sets of rates and one decision about which applies:
 *
 *   the account's   on_call_config:{email}          edited by them
 *   ours            on_call_platform_rates:global   edited by staff only
 *
 * `ratesFor` in `onCallConfig.ts` picks, and it picks ours OUTRIGHT when we are
 * answering — not merged and not floored against theirs. A merge would let a
 * customer influence our pricing through whichever field we happened to read
 * from their side, which is the same hole with more steps.
 *
 * WHERE LABOUR COMES FROM
 *
 * Not from here. A technician's hourly rate is the tiered card in
 * `tech_tiers:config` — Master, Advanced, Intermediate, Apprentice — which is
 * already administrator-only to write and is what invoices and pickers read. A
 * second hourly rate stored here would be the copy that disagrees, and the one
 * that disagrees about money is the one that ends up on an invoice.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import type { CallExtras } from "./onCallConfig.ts";

export const onCallRatesRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";
const KEY = "on_call_platform_rates:global";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const STAFF_ROLES = new Set([
  "owner", "admin", "master_admin", "super_admin", "superadmin", "management",
]);

/**
 * What we charge, until somebody sets otherwise.
 *
 * $125 a call is Eric's figure. The hourly rate is deliberately zero: labour is
 * billed from the tech tier card, and a non-zero number here would quietly be
 * added on top of it.
 */
export const DEFAULT_PLATFORM_RATES: CallExtras = {
  calloutCents: 12500,
  afterHoursCents: 0,
  hourlyCents: 0,
  minimumHours: 0,
  notes: "Labour is billed at the technician's tier rate when one attends.",
};

const cents = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 100_000_00) : fallback;
};

/** Our rates, read by anything that needs to price a callout we answered. */
export async function platformRates(): Promise<CallExtras> {
  try {
    const stored = (await kv.get(KEY)) as any;
    if (!stored) return DEFAULT_PLATFORM_RATES;
    return {
      calloutCents: cents(stored.calloutCents, DEFAULT_PLATFORM_RATES.calloutCents),
      afterHoursCents: cents(stored.afterHoursCents, DEFAULT_PLATFORM_RATES.afterHoursCents),
      hourlyCents: cents(stored.hourlyCents, DEFAULT_PLATFORM_RATES.hourlyCents),
      minimumHours: Math.min(24, Math.max(0, Number(stored.minimumHours) || 0)),
      notes: String(stored.notes || DEFAULT_PLATFORM_RATES.notes || "").slice(0, 500),
    };
  } catch {
    // Our published rate is the safe answer when the store cannot be read. The
    // alternative — zero — would give the callout away.
    return DEFAULT_PLATFORM_RATES;
  }
}

async function staff(c: any): Promise<{ email: string } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.email) return null;
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  // From app_metadata through the same reading everything else uses:
  // user_metadata is writable by the account it belongs to.
  return STAFF_ROLES.has(role) ? { email: String(user.email).toLowerCase() } : null;
}

/**
 * GET — readable by anybody signed in.
 *
 * A customer is entitled to see what we would charge them before they buy; it
 * is a published price, not a secret. What they cannot do is change it.
 */
onCallRatesRouter.get(`${PREFIX}/on-call-platform-rates`, async (c) => {
  try {
    const rates = await platformRates();
    return c.json({
      success: true,
      rates,
      // Said plainly so a screen does not have to infer it from a zero.
      labourFrom: "tech_tiers:config",
      editable: Boolean(await staff(c)),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not read the rates." }, 500);
  }
});

onCallRatesRouter.put(`${PREFIX}/on-call-platform-rates`, async (c) => {
  const who = await staff(c);
  if (!who) return c.json({ success: false, error: "Company access is required to change our rates." }, 403);
  try {
    const body = await c.req.json().catch(() => ({}));
    const current = await platformRates();
    const next: CallExtras = {
      calloutCents: cents(body?.calloutCents, current.calloutCents),
      afterHoursCents: cents(body?.afterHoursCents, current.afterHoursCents),
      hourlyCents: cents(body?.hourlyCents, current.hourlyCents),
      minimumHours: Math.min(24, Math.max(0, Number(body?.minimumHours) || 0)),
      notes: String(body?.notes ?? current.notes ?? "").slice(0, 500),
    };
    await kv.set(KEY, { ...next, updatedAt: new Date().toISOString(), updatedBy: who.email });
    console.log(`[OnCall] ${who.email} set the platform callout to ${next.calloutCents}`);
    return c.json({ success: true, rates: next });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save the rates." }, 500);
  }
});

export { KEY as platformRatesKey };
