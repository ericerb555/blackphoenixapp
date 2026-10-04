/**
 * propertyReportData.ts — what we actually hold on one property.
 *
 * The gathering half of D.8. `propertyReportRules.ts` decides whether a report
 * may be sold; this is what it decides from. Kept apart because the decision is
 * pure and testable and this is not: it is six KV reads and a pile of defensive
 * shapes.
 *
 * SCOPED TO THE OWNER, BY CONSTRUCTION
 *
 * Every key here is prefixed with the caller's own email —
 * `inspection:{email}:`, `conditions_report:{email}:`,
 * `landlord_portfolio:{email}` — so a request cannot reach another landlord's
 * property even if it names one. That is the same isolation the inspections and
 * conditions-report modules chose deliberately, and it is isolation by the
 * shape of the key rather than by a filter somebody has to remember.
 *
 * A property id that is not in the caller's own portfolio returns empty
 * evidence, which `canSell` then refuses. It does not return an error that
 * distinguishes "not yours" from "not enough data", because that difference is
 * a way of asking whether somebody else's property exists.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Scan `wr:` for every work request on the platform to find the ones touching
 * this property. That read grows with the whole company's job history to answer
 * a question about one building. The per-landlord index is used instead, and
 * when a job carries no property it is counted as a job for this landlord but
 * not for this property.
 */
import * as kv from "./kv_store.tsx";
import { emptyEvidence, type PropertyEvidence } from "./propertyReportRules.ts";

const whole = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const lower = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** A property from the owner's own portfolio, or null. */
export async function propertyFor(email: string, propertyId: string): Promise<any | null> {
  const address = lower(email);
  const id = String(propertyId || "").trim();
  if (!address || !id) return null;
  try {
    const rows = ((await kv.get(`landlord_portfolio:${address}`)) as any[]) || [];
    return rows.filter(Boolean).find((p: any) => String(p?.id || "") === id) || null;
  } catch (err) {
    console.log("[property-reports] could not read the portfolio:", err);
    return null;
  }
}

/**
 * Count everything the reports are built from.
 *
 * One function rather than one per report, because the three overlap heavily
 * and the gate has to answer for all three at once — a landlord is shown what
 * they can buy and what the rest still need, in one answer.
 */
export async function evidenceFor(email: string, propertyId: string): Promise<PropertyEvidence> {
  const address = lower(email);
  const id = String(propertyId || "").trim();
  const evidence = emptyEvidence(id);
  if (!address || !id) return evidence;

  const property = await propertyFor(address, id);
  if (!property) return evidence;

  evidence.units = whole(property.units);
  evidence.yearBuilt = whole(property.yearBuilt) || null;
  // A single-let property records its rent on the property itself; a multi-unit
  // one records a rent per tenant. Both count, and the tenants are read below.
  if (money(property.monthlyRent) > 0) evidence.unitsWithRent = 1;

  /* Inspections — completed only, and distinct areas rather than repeat looks. */
  try {
    const rows = ((await kv.getByPrefix(`inspection:${address}:`)) as any[]) || [];
    const mine = rows.filter(Boolean).filter((r: any) => String(r?.propertyId || "") === id);
    const completed = mine.filter((r: any) => String(r?.status || "") === "complete");
    evidence.completedInspections = completed.length;

    const names = new Set<string>();
    for (const inspection of completed) {
      const areas = Array.isArray(inspection?.areas) ? inspection.areas : [];
      for (const area of areas) {
        const name = String(area?.name || "").trim();
        if (!name) continue;
        evidence.assessedAreas += 1;
        names.add(name.toLowerCase());
      }
      const items = Array.isArray(inspection?.items) ? inspection.items : [];
      evidence.openFindings += items.filter((it: any) => String(it?.status || "open") === "open").length;
    }
    evidence.distinctAreas = names.size;
  } catch (err) {
    console.log("[property-reports] could not read the inspections:", err);
  }

  /* Conditions reports — real costed damage, which is the strongest evidence
     of what a tenancy did to a building. */
  try {
    const rows = ((await kv.getByPrefix(`conditions_report:${address}:`)) as any[]) || [];
    evidence.conditionsReports = rows.filter(Boolean).filter((r: any) => {
      const theirs = String(r?.propertyId || "").trim();
      // A report with no property attached belongs to this landlord but cannot
      // be claimed for this building.
      return theirs === id;
    }).length;
  } catch (err) {
    console.log("[property-reports] could not read the conditions reports:", err);
  }

  /* Job history, via the per-landlord index rather than a global scan. */
  try {
    const ids = ((await kv.get(`landlord_work_request:${address}`)) as any[]) || [];
    const keys = (Array.isArray(ids) ? ids : []).slice(0, 500).map((wrId: any) => `wr:${String(wrId)}`);
    const jobs = keys.length ? (((await kv.mget(keys)) as any[]) || []).filter(Boolean) : [];
    const mine = jobs.filter((j: any) => String(j?.propertyId || "") === id);
    evidence.jobs = mine.length;
    evidence.completedJobs = mine.filter((j: any) => ["completed", "complete", "closed"].includes(String(j?.status || "").toLowerCase())).length;
  } catch (err) {
    console.log("[property-reports] could not read the work requests:", err);
  }

  /**
   * Rents from the tenant records — and ONLY when they can honestly be
   * attributed to this property.
   *
   * `landlord_tenants:{email}` holds every tenant a landlord has, across every
   * building, and a tenant record carries a unit string ("2B") but **no
   * propertyId**. So in general there is no way to say which of them live here.
   *
   * Counting them all against one property would be the worst kind of wrong: a
   * four-unit building with no rents recorded would show twelve tenanted units,
   * pass the gate, and produce a $99 revenue report full of other buildings'
   * rents. The owner would not necessarily notice, which is what makes it
   * worse than refusing.
   *
   * The one case where it IS safe is a landlord with a single property: every
   * tenant they have must live in it. That covers the single-let landlord the
   * revenue report is most useful to, and it is a narrowing rather than a
   * guess. Everybody else falls back to the rent on the property record, and
   * the gate refuses until there is one.
   *
   * Recording a property against a tenancy would remove this limitation
   * entirely; it is noted in tasks/store-autonomy.md rather than worked around.
   */
  try {
    const portfolio = ((await kv.get(`landlord_portfolio:${address}`)) as any[]) || [];
    const onlyProperty = portfolio.filter(Boolean).length === 1;
    if (onlyProperty) {
      const tenants = ((await kv.get(`landlord_tenants:${address}`)) as any[]) || [];
      const withRent = (Array.isArray(tenants) ? tenants : [])
        .filter(Boolean)
        .filter((t: any) => money(t?.rent) > 0);
      if (withRent.length > evidence.unitsWithRent) evidence.unitsWithRent = withRent.length;
      // A tenancy implies a unit. A portfolio record that forgot its unit count
      // should not make a tenanted building look empty.
      if (withRent.length > evidence.units) evidence.units = withRent.length;
    }
  } catch (err) {
    console.log("[property-reports] could not read the tenants:", err);
  }

  return evidence;
}
