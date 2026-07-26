import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";

export const entitlementsRouter = new Hono();
const ENTRY = (planId: string, id: string) => `entitlement_ledger:${planId}:${id}`;
const BALANCE = (planId: string) => `entitlement_balance:${planId}`;
const SOURCE = (type: string, id: string) => `entitlement_source:${type}:${id}`;

export type EntitlementEvent = {
  planId: string; sourceType: "renewal" | "work_usage" | "invoice" | "payment" | "refund" | "adjustment";
  sourceId: string; hoursDelta?: number; amountDelta?: number; creditDelta?: number; feature?: string; featureQuantity?: number; note?: string;
  contractId?: string; invoiceId?: string; paymentId?: string; workOrderId?: string; timeEntryId?: string;
};

/** Idempotent financial/entitlement event. It never overwrites history. */
export async function recordEntitlementEvent(event: EntitlementEvent) {
  if (!event.planId || !event.sourceType || !event.sourceId) throw new Error("planId, sourceType, and sourceId are required");
  const already = await kv.get(SOURCE(event.sourceType, event.sourceId));
  if (already) return { entry: already, duplicate: true, balance: await kv.get(BALANCE(event.planId)) };
  const now = new Date().toISOString();
  const balance = (await kv.get(BALANCE(event.planId))) || { planId: event.planId, hoursGranted: 0, hoursUsed: 0, hoursRemaining: 0, overageHours: 0, amountPaid: 0, amountRefunded: 0, creditsGranted: 0, creditsRedeemed: 0, creditsRemaining: 0, features: {}, updatedAt: now };
  // Normalize balances written before credit accounting was introduced.
  balance.features = balance.features || {};
  balance.creditsGranted = Number(balance.creditsGranted || 0);
  balance.creditsRedeemed = Number(balance.creditsRedeemed || 0);
  balance.creditsRemaining = Number(balance.creditsRemaining || 0);
  const delta = Number(event.hoursDelta || 0);
  if (delta > 0) balance.hoursGranted += delta;
  if (delta < 0) {
    const requested = Math.abs(delta);
    const included = Math.min(balance.hoursRemaining, requested);
    balance.hoursUsed += included;
    balance.overageHours += Math.max(0, requested - included);
  }
  balance.hoursRemaining = Math.max(0, balance.hoursGranted - balance.hoursUsed);
  if (event.sourceType === "payment") balance.amountPaid += Number(event.amountDelta || 0);
  if (event.sourceType === "refund") balance.amountRefunded += Math.abs(Number(event.amountDelta || 0));
  const creditDelta = Number(event.creditDelta || 0);
  if (creditDelta > 0) balance.creditsGranted += creditDelta;
  if (creditDelta < 0) balance.creditsRedeemed += Math.abs(creditDelta);
  balance.creditsRemaining = balance.creditsGranted - balance.creditsRedeemed;
  if (event.feature) balance.features[event.feature] = (balance.features[event.feature] || 0) + Number(event.featureQuantity || 1);
  balance.updatedAt = now;
  const entry = { id: crypto.randomUUID(), ...event, hoursDelta: delta, creditDelta, createdAt: now, balanceAfter: { hoursRemaining: balance.hoursRemaining, overageHours: balance.overageHours, creditsRemaining: balance.creditsRemaining } };
  await kv.set(ENTRY(event.planId, entry.id), entry);
  await kv.set(SOURCE(event.sourceType, event.sourceId), entry);
  await kv.set(BALANCE(event.planId), balance);
  return { entry, duplicate: false, balance };
}

entitlementsRouter.get("/make-server-3eae23a6/entitlements/:planId", async c => {
  const planId = c.req.param("planId");
  const [balance, entries] = await Promise.all([kv.get(BALANCE(planId)), kv.getByPrefix(`entitlement_ledger:${planId}:`)]);
  return c.json({ success: true, balance: balance || null, entries: (entries || []).sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || "")) });
});

entitlementsRouter.post("/make-server-3eae23a6/entitlements/events", async c => {
  try { return c.json({ success: true, ...(await recordEntitlementEvent(await c.req.json())) }); }
  catch (error: any) { return c.json({ success: false, error: error.message || "Could not record entitlement event" }, 400); }
});

// Shared read model for every portal. It references existing plans, contracts,
// invoices and ledger balances; it does not create a second financial system.
entitlementsRouter.get("/make-server-3eae23a6/entitlements-summary", async c => {
  try {
    const owner = String(c.req.query("owner") || c.req.query("email") || "").toLowerCase();
    const portalType = String(c.req.query("portalType") || "");
    let plans: any[] = (await kv.getByPrefix("plan:")) || [];
    if (owner) plans = plans.filter((plan: any) => String(plan.ownerEmail || plan.email || plan.owner || "").toLowerCase() === owner);
    if (portalType) plans = plans.filter((plan: any) => plan.portalType === portalType);
    const [canonicalContracts, quoteContracts, invoices] = await Promise.all([kv.getByPrefix("contract:"), kv.getByPrefix("contract_"), kv.getByPrefix("invoice:")]);
    const contracts = [...new Map<string, any>([...(canonicalContracts || []), ...(quoteContracts || [])].filter((contract: any) => contract?.id).map((contract: any) => [contract.id, contract])).values()];
    const rows = await Promise.all(plans.map(async plan => {
      const [balance, usage] = await Promise.all([kv.get(BALANCE(plan.id)), kv.getByPrefix(`plan_usage:${plan.id}:`)]);
      const relatedContracts = contracts.filter((contract: any) => contract.planId === plan.id && contract.status === "active");
      const relatedInvoices = invoices.filter((invoice: any) => (invoice.planId || invoice.maintenancePlanId) === plan.id);
      const openInvoices = relatedInvoices.filter((invoice: any) => !["paid", "completed", "void", "voided"].includes(String(invoice.status || invoice.paymentStatus || "").toLowerCase()));
      const usageEntries = (usage || []).sort((a: any, b: any) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
      return { plan, balance: balance || { hoursGranted: Number(plan.hours?.included || 0), hoursUsed: Number(plan.hours?.used || 0), hoursRemaining: Math.max(0, Number(plan.hours?.included || 0) - Number(plan.hours?.used || 0)), overageHours: 0, creditsGranted: 0, creditsRedeemed: 0, creditsRemaining: 0, features: {} }, contracts: relatedContracts, invoices: relatedInvoices, usageEntries, openInvoiceCount: openInvoices.length, usageCount: usageEntries.length };
    }));
    return c.json({ success: true, plans: rows, totals: { hoursRemaining: rows.reduce((sum, row) => sum + Number(row.balance.hoursRemaining || 0), 0), overageHours: rows.reduce((sum, row) => sum + Number(row.balance.overageHours || 0), 0), openInvoices: rows.reduce((sum, row) => sum + row.openInvoiceCount, 0), creditsRemaining: rows.reduce((sum, row) => sum + Number(row.balance.creditsRemaining || 0), 0) } });
  } catch (error: any) { return c.json({ success: false, error: error.message || "Could not load entitlement summary" }, 500); }
});
