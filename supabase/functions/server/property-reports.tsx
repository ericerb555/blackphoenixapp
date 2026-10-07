/**
 * property-reports.tsx — what a landlord can buy about their own property.
 *
 * D.8 of `tasks/store-autonomy.md`. The three generated reports are different
 * from the other fifteen products: an ebook is the same for everybody and can
 * be read before it is listed, while these are built from one property's own
 * records and nobody sees one before paying for it.
 *
 * So this route exists before any rendering does. It answers "is there enough
 * here", which is the whole commercial risk — *"a hollow report at $129 is
 * worse than no product"* — and it answers it BEFORE a buy button is shown
 * rather than after a payment.
 *
 * It also answers the useful half: what the reports they cannot buy yet are
 * still missing. A landlord one inspection away from two products should be
 * told that. A gate that only refuses loses them.
 *
 * ISOLATION
 *
 * Every key read is prefixed with the caller's own email, so a property id
 * belonging to somebody else resolves to nothing. A property that is not
 * theirs and a property with no records are answered identically, because the
 * difference between those two answers is a way of asking whether another
 * landlord's building exists.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { evidenceFor, propertyFor, detailFor, rentsFor, marketRentFor } from "./propertyReportData.ts";
import { propertyHealthReport, capitalPlanReport, revenueReport } from "./propertyReportContent.ts";
import { marketIsUsable } from "./revenueRules.ts";
import * as kv from "./kv_store.tsx";
import { resolveLaborRates, resolvePricing } from "./pricingDefaults.ts";
import { reportToHtml } from "./reportHtml.ts";
import { offerFor, canSell, capitalPlanBasis, reportSpec, PROPERTY_REPORTS_ADD_ON_ID } from "./propertyReportRules.ts";
import { checkAddOn } from "./addOnAccess.tsx";

const reportsRouter = new Hono();

let client: any = null;
function admin() {
  if (!client) {
    client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
  }
  return client;
}

async function actor(c: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin().auth.getUser(token);
  if (error || !user?.email) return null;
  return { email: String(user.email).toLowerCase() };
}


/**
 * Does this account hold the reports add-on?
 *
 * Eric's ruling: the reports are sold as one subscription add-on rather than
 * three one-off purchases. So access is a question about the subscription, not
 * about a purchase record — and `checkAddOn` already answers it the way every
 * other extra is answered, including the case where a tier includes it at no
 * charge and the grant therefore does not list it.
 *
 * Enforced on the DOCUMENT routes rather than on the offer route. A landlord
 * should always be able to see what the reports are, what they cost and what
 * their property still needs — hiding that would lose the sale this add-on
 * exists to make. What the add-on buys is the document itself.
 */
async function reportsAddOnOrRefusal(email: string) {
  const verdict = await checkAddOn(email, PROPERTY_REPORTS_ADD_ON_ID);
  if (verdict.held) return null;
  return {
    success: false,
    error: "Property reports are part of the Property Reports add-on, which this account does not hold.",
    addOnId: PROPERTY_REPORTS_ADD_ON_ID,
    fix: "Add it from the Plans and Add-ons panel in your portal; it covers every property on the account.",
  };
}

/**
 * GET /property-reports/:propertyId — the three reports and their standing.
 *
 * Returns what can be bought, what cannot, and for each of those the first
 * thing that would change the answer.
 */
reportsRouter.get("/make-server-3eae23a6/property-reports/:propertyId", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const propertyId = String(c.req.param("propertyId") || "").trim();
  const property = await propertyFor(who.email, propertyId);
  const evidence = await evidenceFor(who.email, propertyId);
  const reports = offerFor(evidence).map((report) => ({
    id: report.id,
    title: report.title,
    priceCents: report.priceCents,
    blurb: report.blurb,
    available: report.ok,
    blocker: report.blocker,
    requirements: report.requirements,
    // Said up front rather than discovered in the document. The capital plan
    // estimates remaining life from the building's age, and a buyer is owed
    // that before they pay, not after.
    basis: report.id === "capital-plan" ? capitalPlanBasis(evidence) : null,
  }));

  /**
   * Whether the add-on is held is reported here but NOT enforced here.
   *
   * The panel needs it to show "included in your plan" against an open report
   * instead of a button that answers 402 when pressed — and somebody who does
   * not hold it still sees what the reports are and what their property needs,
   * because that is the pitch.
   */
  const entitlement = await checkAddOn(who.email, PROPERTY_REPORTS_ADD_ON_ID);

  return c.json({
    success: true,
    // Null when the property is not theirs OR does not exist — deliberately
    // the same answer. See the note at the top of this file.
    property: property ? { id: property.id, name: property.name || null, address: property.address || null } : null,
    evidence,
    reports,
    available: reports.filter((r) => r.available).length,
    addOn: {
      id: PROPERTY_REPORTS_ADD_ON_ID,
      held: entitlement.held,
      // One add-on covers every property on the account.
      covers: "every property on this account",
    },
  });
});

/**
 * GET /property-reports/:propertyId/:reportId — one report's standing.
 *
 * The same answer for a single product, for a page that is already showing one.
 */
reportsRouter.get("/make-server-3eae23a6/property-reports/:propertyId/:reportId", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const reportId = String(c.req.param("reportId") || "").trim();
  const spec = reportSpec(reportId);
  if (!spec) return c.json({ success: false, error: "No such report." }, 404);

  const propertyId = String(c.req.param("propertyId") || "").trim();
  const evidence = await evidenceFor(who.email, propertyId);
  const verdict = canSell(spec.id, evidence);

  return c.json({
    success: true,
    report: {
      id: spec.id,
      title: spec.title,
      priceCents: spec.priceCents,
      blurb: spec.blurb,
      available: verdict.ok,
      blocker: verdict.blocker,
      requirements: verdict.requirements,
      basis: spec.id === "capital-plan" ? capitalPlanBasis(evidence) : null,
    },
    evidence,
  });
});

/**
 * GET /property-reports/:propertyId/property-health/view — the document itself.
 *
 * Returns HTML rather than a PDF, which is the pattern the rest of the platform
 * uses: the owner sees the document as it will look and prints or saves it from
 * their browser. See the note at the top of reportHtml.ts for why not jsPDF.
 *
 * THE GATE IS CHECKED HERE TOO, NOT ONLY ON THE PAGE THAT SELLS IT
 *
 * A listing that hides a button is not a check — the route is the check. So the
 * same `canSell` runs before a single record is read, and a property without
 * enough behind it gets the reason rather than a thin document. That is the
 * difference between refusing to sell a hollow report and printing one.
 */
reportsRouter.get("/make-server-3eae23a6/property-reports/:propertyId/property-health/view", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const refusal = await reportsAddOnOrRefusal(who.email);
  if (refusal) return c.json(refusal, 402);

  const propertyId = String(c.req.param("propertyId") || "").trim();
  const evidence = await evidenceFor(who.email, propertyId);
  const verdict = canSell("property-health", evidence);
  if (!verdict.ok) {
    return c.json({
      success: false,
      error: `There is not enough recorded about this property yet: ${verdict.blocker}.`,
      requirements: verdict.requirements,
    }, 409);
  }

  const detail = await detailFor(who.email, propertyId);
  const report = propertyHealthReport(detail, evidence);
  return c.html(reportToHtml(report));
});

/**
 * GET /property-reports/:propertyId/capital-plan/view — the ten-year plan.
 *
 * THE RATES ARE OURS, AND THE REPORT SAYS WHICH
 *
 * This is the line in the plan that says the capital plan is costed "through
 * our own labour and materials catalogue, which is the thing no competitor can
 * copy". `resolveLaborRates` answers with the rates an administrator has
 * published, or the standards when none have been — and it reports which, so
 * the document can say so rather than implying a precision it does not have.
 *
 * Both are read through the same resolvers the estimator uses, so a line in
 * this plan and a quote for that line are priced by the same arithmetic.
 */
reportsRouter.get("/make-server-3eae23a6/property-reports/:propertyId/capital-plan/view", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const refusal = await reportsAddOnOrRefusal(who.email);
  if (refusal) return c.json(refusal, 402);

  const propertyId = String(c.req.param("propertyId") || "").trim();
  const evidence = await evidenceFor(who.email, propertyId);
  const verdict = canSell("capital-plan", evidence);
  if (!verdict.ok) {
    return c.json({
      success: false,
      error: `There is not enough recorded about this property yet: ${verdict.blocker}.`,
      requirements: verdict.requirements,
    }, 409);
  }

  const [detail, ratesRaw, pricingRaw] = await Promise.all([
    detailFor(who.email, propertyId),
    kv.get("labor_rates:global").catch(() => null),
    kv.get("pricing_config:global").catch(() => null),
  ]);
  const { rates, usingStandards: ratesAreStandard } = resolveLaborRates(ratesRaw);
  // `ratesRaw` too: the margins Eric saved on the labour rates screen live on
  // that record, and a capital plan priced differently from a quote for the
  // same work is a disagreement a customer finds before we do.
  const { settings } = resolvePricing(pricingRaw, ratesRaw);

  const report = capitalPlanReport(detail, evidence, rates, settings, !ratesAreStandard);
  return c.html(reportToHtml(report));
});

/**
 * GET /property-reports/:propertyId/revenue-opportunity/view
 *
 * TWO GATES, BECAUSE THE PRODUCT HAS TWO HALVES
 *
 * `canSell` answers the half that lives in the property's own records: are
 * there units, and is a rent recorded. The other half is the market estimate,
 * which is not a property record at all — it is a cached valuation keyed by
 * address — so it is checked here.
 *
 * It is checked rather than worked around because the comparison IS the
 * product: the listing promises "what comparable units earn, and where the gap
 * is". A revenue report with no market figure is the rent the owner already
 * knows, and `marketIsUsable` also refuses an estimate with no range or one so
 * wide that a midpoint means nothing.
 *
 * The refusal names the fix. The market figure is fetched by the market-rent
 * widget in the landlord portal, which is also what pays for the API call —
 * this route deliberately does not fetch, because a document opened ten times
 * would otherwise cost ten times as much to produce as it did once.
 */
reportsRouter.get("/make-server-3eae23a6/property-reports/:propertyId/revenue-opportunity/view", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const refusal = await reportsAddOnOrRefusal(who.email);
  if (refusal) return c.json(refusal, 402);

  const propertyId = String(c.req.param("propertyId") || "").trim();
  const evidence = await evidenceFor(who.email, propertyId);
  const verdict = canSell("revenue-opportunity", evidence);
  if (!verdict.ok) {
    return c.json({
      success: false,
      error: `There is not enough recorded about this property yet: ${verdict.blocker}.`,
      requirements: verdict.requirements,
    }, 409);
  }

  const detail = await detailFor(who.email, propertyId);
  const address = String(detail.property?.address || "");
  const market = await marketRentFor(address);
  const usable = marketIsUsable(market);
  if (!usable.ok) {
    return c.json({
      success: false,
      error: `This report compares your rents against comparable lettings, and ${usable.reason}.`,
      fix: "Open the market rent panel in your landlord portal for this address, which fetches a current estimate. The report can then be produced.",
    }, 409);
  }

  const rents = await rentsFor(who.email, propertyId);
  const report = revenueReport(detail, evidence, rents, market);
  return c.html(reportToHtml(report));
});

export default reportsRouter;
