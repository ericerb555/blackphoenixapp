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
import { evidenceFor, propertyFor } from "./propertyReportData.ts";
import { offerFor, canSell, capitalPlanBasis, reportSpec } from "./propertyReportRules.ts";

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

  return c.json({
    success: true,
    // Null when the property is not theirs OR does not exist — deliberately
    // the same answer. See the note at the top of this file.
    property: property ? { id: property.id, name: property.name || null, address: property.address || null } : null,
    evidence,
    reports,
    available: reports.filter((r) => r.available).length,
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

export default reportsRouter;
