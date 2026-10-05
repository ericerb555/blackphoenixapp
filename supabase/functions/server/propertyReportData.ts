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

/**
 * The records themselves, for a report that has already passed the gate.
 *
 * `evidenceFor` counts; this returns what the counting was done on. Two
 * functions rather than one because they are asked at different moments and the
 * expensive one must not run to answer the cheap question: the gate is checked
 * every time a portal page renders a price, and the records are read once, after
 * somebody has bought.
 */
export interface PropertyDetail {
  property: any | null;
  /** Completed inspections for this property, newest first. */
  inspections: any[];
  /** Every area across them, with the inspection it came from. */
  areas: Array<{ name: string; condition: string; notes: string; inspectedAt: string }>;
  /** Items still open across those inspections. */
  openItems: Array<{ area: string; what: string; inspectedAt: string }>;
  jobs: any[];
  conditionsReports: any[];
}

export async function detailFor(email: string, propertyId: string): Promise<PropertyDetail> {
  const address = lower(email);
  const id = String(propertyId || "").trim();
  const out: PropertyDetail = { property: null, inspections: [], areas: [], openItems: [], jobs: [], conditionsReports: [] };
  if (!address || !id) return out;

  out.property = await propertyFor(address, id);
  if (!out.property) return out;

  try {
    const rows = ((await kv.getByPrefix(`inspection:${address}:`)) as any[]) || [];
    out.inspections = rows.filter(Boolean)
      .filter((r: any) => String(r?.propertyId || "") === id && String(r?.status || "") === "complete")
      .sort((a: any, b: any) => String(b?.completedAt || b?.startedAt || "").localeCompare(String(a?.completedAt || a?.startedAt || "")));

    for (const inspection of out.inspections) {
      const when = String(inspection?.completedAt || inspection?.startedAt || "").slice(0, 10);
      for (const area of (Array.isArray(inspection?.areas) ? inspection.areas : [])) {
        const name = String(area?.name || "").trim();
        if (!name) continue;
        out.areas.push({
          name,
          condition: String(area?.condition || "Good").trim(),
          notes: String(area?.notes || "").trim(),
          inspectedAt: when,
        });
      }
      for (const item of (Array.isArray(inspection?.items) ? inspection.items : [])) {
        if (String(item?.status || "open") !== "open") continue;
        out.openItems.push({
          area: String(item?.area || item?.areaName || "").trim(),
          what: String(item?.what || item?.note || item?.description || "").trim(),
          inspectedAt: when,
        });
      }
    }
  } catch (err) {
    console.log("[property-reports] could not read the inspections in full:", err);
  }

  try {
    const ids = ((await kv.get(`landlord_work_request:${address}`)) as any[]) || [];
    const keys = (Array.isArray(ids) ? ids : []).slice(0, 500).map((wrId: any) => `wr:${String(wrId)}`);
    const jobs = keys.length ? (((await kv.mget(keys)) as any[]) || []).filter(Boolean) : [];
    out.jobs = jobs.filter((j: any) => String(j?.propertyId || "") === id)
      .sort((a: any, b: any) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  } catch (err) {
    console.log("[property-reports] could not read the work requests in full:", err);
  }

  try {
    const rows = ((await kv.getByPrefix(`conditions_report:${address}:`)) as any[]) || [];
    out.conditionsReports = rows.filter(Boolean).filter((r: any) => String(r?.propertyId || "") === id);
  } catch (err) {
    console.log("[property-reports] could not read the conditions reports in full:", err);
  }

  return out;
}

/**
 * The rents behind the Revenue Opportunity Report, and the market figure.
 *
 * TENANTS CANNOT BE ATTRIBUTED TO A BUILDING IN GENERAL
 *
 * `landlord_tenants:{email}` carries a unit string and no `propertyId`, so for
 * a landlord with several properties there is no way to say which tenants live
 * here — see the long note in `evidenceFor`. The same restriction applies: the
 * tenant rents are used only when the landlord owns exactly one property, and
 * everybody else is analysed from the rent on the property record. Returning
 * every tenant against one building would produce a $99 report full of other
 * buildings' rents.
 */
export async function rentsFor(email: string, propertyId: string): Promise<{
  units: Array<{ label: string; rent: number; tenant?: string | null }>;
  totalUnits: number;
  /** Why the per-unit detail is thin, when it is. */
  limitation: string | null;
}> {
  const address = lower(email);
  const property = await propertyFor(address, propertyId);
  if (!property) return { units: [], totalUnits: 0, limitation: 'no such property' };

  const totalUnits = whole(property.units) || 1;

  let portfolioSize = 1;
  try {
    const portfolio = ((await kv.get(`landlord_portfolio:${address}`)) as any[]) || [];
    portfolioSize = portfolio.filter(Boolean).length;
  } catch { portfolioSize = 1; }

  if (portfolioSize === 1) {
    try {
      const tenants = ((await kv.get(`landlord_tenants:${address}`)) as any[]) || [];
      const let_ = (Array.isArray(tenants) ? tenants : [])
        .filter(Boolean)
        .filter((t: any) => money(t?.rent) > 0)
        .map((t: any) => ({
          label: String(t?.unit || '').trim() || 'unit',
          rent: money(t.rent),
          tenant: String(t?.name || '') || null,
        }));
      if (let_.length) return { units: let_, totalUnits: Math.max(totalUnits, let_.length), limitation: null };
    } catch (err) {
      console.log("[property-reports] could not read the tenants:", err);
    }
  }

  const own = money(property.monthlyRent);
  if (own > 0) {
    return {
      units: [{ label: String(property.name || 'the property'), rent: own }],
      totalUnits,
      limitation: portfolioSize > 1
        ? 'A tenancy record does not say which property it belongs to, so with more than one property in the portfolio this report uses the rent recorded on the property itself rather than a figure per unit.'
        : 'No tenancy carries a rent yet, so this report uses the rent recorded on the property itself.',
    };
  }

  return { units: [], totalUnits, limitation: 'no rent is recorded for this property' };
}

/**
 * The cached market rent for an address.
 *
 * Read-only, deliberately. `POST /landlord/market-rent` is what fetches from
 * RentCast and pays for the call; a report route that fetched would bill an API
 * call every time somebody opened the document, and a report opened ten times
 * would cost ten times as much to produce as it did the first time.
 *
 * So a missing figure is an answer, not a reason to go and get one — the
 * landlord fetches it from the market-rent widget in their portal, and the
 * report says so.
 */
export async function marketRentFor(propertyAddress: string): Promise<any | null> {
  const key = String(propertyAddress || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!key) return null;
  try {
    return (await kv.get(`market_rent:${key}`)) || null;
  } catch (err) {
    console.log("[property-reports] could not read the market rent:", err);
    return null;
  }
}
