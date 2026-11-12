/**
 * Where the security probe files what it found.
 *
 * One route, and the only thing it does is store a validated copy of a probe
 * run so `securityPosture.ts` has something to report. See that file for why
 * the result is kept at all.
 *
 * MACHINE ENDPOINT, SO IT IS PUBLIC AT THE WALL AND SECRET AT THE DOOR
 *
 * GitHub Actions has no session and must not be given one. The path is listed
 * in `PUBLIC_POST_PATHS` so the auth gate lets it reach this handler, and this
 * handler refuses anything without `SECURITY_PROBE_SECRET`. The order matters
 * and the trap is recorded in index.tsx: a machine endpoint left off that list
 * is answered "Sign in required." by the gate before its own secret check ever
 * runs, which looks like a broken integration rather than a missing exemption.
 *
 * Unset secret refuses everything. That is the same choice the cron endpoints
 * make and the opposite of the origin lock's: an unset origin secret must fail
 * open or the platform goes dark before Cloudflare is configured, whereas an
 * unset probe secret failing open would mean anybody on the internet could
 * write what the assistant reports as the state of our security. The cost of
 * refusing is a report that does not arrive; the cost of opening is a lie
 * nobody would question.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { secretMatches } from "./storeTickRules.ts";
import { parseProbeReport } from "./securityPosture.ts";
import { recordProbeReport } from "./securityPostureStore.ts";

export const securityRoutes = new Hono();

const PREFIX = "/make-server-3eae23a6";
const SECRET_HEADER = "x-probe-secret";
const SECRET_ROW = "security_probe_secret";
const SECRET_ENV = "SECURITY_PROBE_SECRET";

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * The secret this route expects, or null.
 *
 * Database row first so it rotates without a deploy, environment as fallback,
 * null when neither yields anything — which the caller treats as "refuse".
 */
async function expectedSecret(): Promise<string | null> {
  try {
    const { data } = await service()
      .from("private_cron_config")
      .select("value")
      .eq("key", SECRET_ROW)
      .maybeSingle();
    const row = String(data?.value || "").trim();
    if (row) return row;
  } catch {
    // A database blip must not turn a machine endpoint into an open one.
  }
  return String(Deno.env.get(SECRET_ENV) || "").trim() || null;
}

securityRoutes.post(`${PREFIX}/security/probe-report`, async (c) => {
  const offered = String(c.req.header(SECRET_HEADER) || "");
  const expected = await expectedSecret();
  if (!expected || !secretMatches(offered, expected)) {
    // No detail in the refusal. A caller guessing at the secret learns only
    // that it guessed wrong, not whether one is configured.
    return c.json({ success: false, error: "Refused." }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const report = parseProbeReport(body);
  if (!report) {
    /*
     * A malformed post is rejected rather than stored as an empty pass. The
     * failure mode being avoided: counts missing from the body coerce to zero,
     * "0 failed" is stored, and the assistant reports all clear on the
     * strength of a broken request.
     */
    return c.json({ success: false, error: "Not a probe report." }, 400);
  }

  await recordProbeReport(report);
  return c.json({ success: true, stored: report.at, failed: report.failed });
});
