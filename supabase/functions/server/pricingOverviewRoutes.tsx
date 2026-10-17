/**
 * The whole priced catalogue, in one request.
 *
 * WHY ONE ROUTE AND NOT FOUR
 *
 * Because the complaint this answers is that there is nowhere to see it all at
 * once. Tiers, add-ons and cohorts live under three key prefixes and are
 * served by three existing routes, and a screen that made three calls would
 * render three lists that can disagree about the moment they describe. The
 * point of the screen is the single view, so the single view is what the
 * server returns.
 *
 * WHY IT IS READ-ONLY
 *
 * Phase 1 of `tasks/pricing-in-one-place.md`. Editing comes next and goes
 * through the routes that already exist and already refuse the dangerous
 * cases. Shipping the read first means the catalogue becomes visible today
 * without putting a new write path anywhere near money.
 *
 * WHY STAFF ONLY
 *
 * It returns every price, every Stripe price id, and the member count and
 * revenue of every cohort. That is the commercial shape of the business on one
 * screen. `/public/plan-tiers` already exists for what a customer may see.
 */

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { isStaffRequest } from "./requireStaff.ts";
import { readinessOf, summarise, type PriceMode, type SellableRecord } from "./pricingReadiness.ts";

export const pricingOverviewRoutes = new Hono();

/** `plan_tier:{audience}:{id}` and `plan_addon:{audience}:{id}`. */
function splitKey(key: string, prefix: string): { audience: string; id: string } {
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const cut = rest.indexOf(":");
  if (cut < 0) return { audience: "", id: rest };
  return { audience: rest.slice(0, cut), id: rest.slice(cut + 1) };
}

/**
 * One row of the screen.
 *
 * `reasons` is the whole reason this route exists, so it is never omitted —
 * an empty array means sellable, and a screen can say so without having to
 * infer it from the absence of a field.
 */
function describe(
  kind: "tier" | "addon" | "cohort",
  key: string,
  record: SellableRecord & Record<string, any>,
  mode: PriceMode,
) {
  const prefix = kind === "tier" ? "plan_tier:" : kind === "addon" ? "plan_addon:" : "cohort_";
  const { audience, id } = kind === "cohort"
    ? { audience: String(record.audience ?? record.portalType ?? ""), id: String(record.id ?? key.slice(prefix.length)) }
    : splitKey(key, prefix);

  const verdict = readinessOf(record, mode);

  return {
    kind,
    key,
    audience,
    id,
    name: String(record.name ?? id),
    blurb: String(record.blurb ?? ""),
    active: Boolean(record.active),
    priceCents: record.priceCents ?? null,
    interval: record.interval ?? null,
    stripePriceId: record.stripePriceId ?? null,
    stripePriceIdTest: record.stripePriceIdTest ?? null,
    // Both ids are returned whatever the mode asked for, so the screen can
    // show "rehearsed but not live" — which is the state 3 of the 18 content
    // add-ons are actually in, and the state that is invisible if you only
    // ever look at one mode.
    bands: Array.isArray(record.bands) ? record.bands.length : 0,
    sortOrder: Number(record.sortOrder ?? 0),
    sourceTierId: record.sourceTierId ?? null,
    supersededByAddOn: record.supersededByAddOn ?? null,
    supersededNote: record.supersededNote ?? null,
    note: record.note ?? null,
    sellable: verdict.sellable,
    superseded: verdict.superseded,
    reasons: verdict.reasons,
    priceId: verdict.priceId,
  };
}

pricingOverviewRoutes.get("/pricing/overview", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const mode: PriceMode = c.req.query("mode") === "test" ? "test" : "live";

    const [tierRows, addonRows, cohortRows] = await Promise.all([
      kv.getByPrefix("plan_tier:") as Promise<any[]>,
      kv.getByPrefix("plan_addon:") as Promise<any[]>,
      kv.getByPrefix("cohort_") as Promise<any[]>,
    ]);

    /*
     * `getByPrefix` returns values rather than keys, and a tier's audience is
     * part of its key. Every record written by plan-catalog.tsx also carries
     * `audience` in the body, so the body is the source here and the key is
     * reconstructed from it — which keeps this route from depending on the key
     * format staying put.
     */
    const tiers = (tierRows || []).filter(Boolean).map((r: any) =>
      describe("tier", `plan_tier:${r.audience ?? ""}:${r.id ?? ""}`, r, mode));

    const addons = (addonRows || []).filter(Boolean).map((r: any) =>
      describe("addon", `plan_addon:${r.audience ?? ""}:${r.id ?? ""}`, r, mode));

    /*
     * `cohort_analytics_*` shares the `cohort_` prefix and is not a cohort.
     * Without this the screen would show analytics blobs as unsellable plans,
     * each with "No price set." against it.
     */
    const cohortRecords = (cohortRows || [])
      .filter((r: any) => r && r.id && !String(r.id).startsWith("analytics"))
      .filter((r: any) => !("metric" in r) && !("capturedAt" in r));

    const cohorts = cohortRecords.map((r: any) => describe("cohort", `cohort_${r.id}`, r, mode));

    const all = [...tiers, ...addons, ...cohorts];

    /*
     * Counted from the RAW records, never from the described rows.
     *
     * `describe` turns `bands` from an array into a count, because that is what
     * a screen renders. Feeding those rows back into `summarise` would make
     * `hasAmount` ask `Array.isArray(3)`, get false, and report a cohort
     * priced only by bands as having no price — the one record shape where
     * `priceCents` is legitimately null. The type checker caught it; the
     * symptom would have been a correct cohort shown as broken.
     */
    const tierRecords = (tierRows || []).filter(Boolean);
    const addonRecords = (addonRows || []).filter(Boolean);

    return c.json({
      success: true,
      mode,
      counts: {
        tiers: summarise(tierRecords, mode),
        addons: summarise(addonRecords, mode),
        cohorts: summarise(cohortRecords, mode),
        everything: summarise([...tierRecords, ...addonRecords, ...cohortRecords], mode),
      },
      // Flat, sorted once here rather than three times on the client.
      //
      // The rank is spelled out rather than nested into one comparator
      // expression: blocked rows first because a screen whose job is to show
      // what is wrong should not make you scroll past what is right, then
      // sellable, then superseded last because it is history rather than work.
      rows: all.sort((x, y) => {
        const rank = (r: typeof x) => (r.superseded ? 2 : r.sellable ? 1 : 0);
        return x.kind.localeCompare(y.kind)
          || rank(x) - rank(y)
          || x.audience.localeCompare(y.audience)
          || x.sortOrder - y.sortOrder
          || x.name.localeCompare(y.name);
      }),
      // Said out loud because "0 cohorts" is itself the finding: the money
      // spine exists and migrate-tiers has never been run.
      cohortsExist: cohorts.length > 0,
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message), rows: [] }, 500);
  }
});

/**
 * Does anything need an owner's attention right now?
 *
 * Eric, 2026-10-17: *"the app should alert owner admin when action is needed
 * and prices are not set."*
 *
 * WHY THIS IS COMPUTED AND NOT STORED
 *
 * "A price is not set" is a STATE, not an event. A stored alert describing a
 * state goes stale the moment somebody fixes it, and then has to be dismissed
 * by hand — which trains people to dismiss alerts. Computed fresh on every
 * read, this appears when the price is missing and is gone the instant the
 * price exists, with nobody having to tell it so.
 *
 * That is also why it does not post into `admin_alerts`. That queue is for
 * events — a work request arrived, a payment failed — and the panel reading it
 * merges what the server sends into the browser's own `localStorage`. A
 * derived state pushed through there would be copied into every admin's
 * browser and would outlive the problem it described.
 *
 * WHY IT IS SEPARATE FROM /pricing/overview
 *
 * Because a banner on a dashboard polls, and the overview returns every row of
 * the catalogue with its reasons. This returns counts and at most a handful of
 * examples, so a screen that only wants to know "is anything wrong" does not
 * drag the whole catalogue across the wire to find out.
 */
pricingOverviewRoutes.get("/pricing/needs-attention", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const [tierRows, addonRows] = await Promise.all([
      kv.getByPrefix("plan_tier:") as Promise<any[]>,
      kv.getByPrefix("plan_addon:") as Promise<any[]>,
    ]);

    const records = [...(tierRows || []), ...(addonRows || [])].filter(Boolean);

    /*
     * Superseded records are excluded outright rather than counted and
     * explained. They are retired on purpose, there is no action to take, and
     * an alert that includes things nobody should touch is an alert people
     * learn to ignore.
     */
    const live = records
      .map((r: any) => ({ record: r, verdict: readinessOf(r, "live") }))
      .filter((x) => !x.verdict.superseded);

    const blocked = live.filter((x) => !x.verdict.sellable);

    /*
     * Two shapes worth telling apart, because the action differs:
     * `noPrice` needs somebody to create a Stripe price; `offOnly` is priced
     * and ready and merely switched off, which is one click and is revenue
     * sitting still.
     */
    const noPrice = blocked.filter((x) =>
      x.verdict.reasons.some((r) => r.startsWith("No Stripe") || r === "No price set."));
    const offOnly = blocked.filter((x) =>
      x.verdict.reasons.length === 1 && x.verdict.reasons[0] === "Switched off.");

    return c.json({
      success: true,
      needsAttention: blocked.length > 0,
      sellable: live.length - blocked.length,
      blocked: blocked.length,
      withoutPrice: noPrice.length,
      readyButOff: offOnly.length,
      // A few names so the banner can be specific rather than only numeric.
      // Capped because this is a banner, not the catalogue.
      examples: blocked.slice(0, 4).map((x) => ({
        name: String(x.record?.name ?? x.record?.id ?? "unnamed"),
        audience: String(x.record?.audience ?? ""),
        reasons: x.verdict.reasons,
      })),
    });
  } catch (error) {
    // A banner that cannot compute says nothing rather than crying wolf.
    return c.json({ success: false, needsAttention: false, error: String((error as Error).message) }, 500);
  }
});
