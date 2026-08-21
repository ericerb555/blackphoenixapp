/**
 * vendor-billing — what the vendor has invoiced us for, and what we have paid.
 *
 * WHY THIS EXISTS AS A RECORD RATHER THAN A DERIVED VIEW
 *
 * The vendor portal's Invoices and Payments tabs had nothing behind them, and
 * there was no vendor invoice or payment anywhere in storage. The nearest
 * candidate, `payment-processing.tsx`, is the online store and subscription
 * billing — a different business entirely, and wiring a vendor's accounts to
 * shop orders would have put a customer's checkout in a supplier's ledger.
 *
 * The real loop is: Black Phoenix raises a purchase order against a vendor, the
 * vendor delivers, the vendor invoices us for those orders, and we pay. Only
 * the first step existed. An invoice is a claim the vendor makes and a payment
 * is an act we perform, so neither can be derived from purchase orders — they
 * have to be recorded.
 *
 * WHAT IS DELIBERATELY NOT TRUSTED FROM THE CLIENT
 *
 * The invoice total is recomputed here from the purchase orders being billed.
 * A vendor posting their own `amount` would be a vendor typing the number we
 * owe them, which is not a thing a billing system should accept.
 *
 * The same purchase order may not appear on two live invoices. That is the one
 * mistake in this whole area that costs real money, so it is enforced on the
 * server where it cannot be skipped, not in the form where it can.
 *
 * WHO MAY SEE WHAT
 *
 * A vendor reads only their own invoices and payments. Vendors are paying
 * tenants of this platform, and one vendor learning another's order volume,
 * pricing or payment history is exactly what tenant isolation exists to
 * prevent. Approving an invoice and recording a payment are company acts and
 * are refused to vendors outright — otherwise a vendor could mark their own
 * invoice paid.
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

export const vendorBillingRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const INVOICE = (id: string) => `vendor_invoice:${id}`;
const PAYMENT = (id: string) => `vendor_payment:${id}`;

/** Terms a vendor can actually pick, and what they mean in days. */
const TERMS: Record<string, number> = {
  "Due on receipt": 0,
  "Net 15": 15,
  "Net 30": 30,
  "Net 45": 45,
  "Net 60": 60,
};

const money = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Resolve the caller and which vendor they are, by the same rules the rest of
 * the vendor surface uses: an id stamped on the account, else an email match
 * against the `vendor:` registry.
 *
 * A vendor we cannot identify resolves to `__unresolved__` and sees nothing.
 * Failing closed matters more here than anywhere else in the portal, because
 * the alternative is showing one company's ledger to another.
 */
async function billingActor(
  c: any,
): Promise<{ signedIn: boolean; isCompany: boolean; vendorId: string; email: string }> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { signedIn: false, isCompany: false, vendorId: "", email: "" };

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { signedIn: false, isCompany: false, vendorId: "", email: "" };

  const email = String(user.email || "").toLowerCase();
  const role = String(user.app_metadata?.role || user.user_metadata?.role || user.user_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");

  // Anyone who is not a vendor is on the company side. Black Phoenix raises
  // these orders and settles these invoices, so it sees all of them.
  if (role !== "vendor") return { signedIn: true, isCompany: true, vendorId: "", email };

  const stamped = String(user.user_metadata?.vendorId || user.user_metadata?.vendor_id || "").trim();
  if (stamped) return { signedIn: true, isCompany: false, vendorId: stamped, email };

  const vendors = ((await kv.getByPrefix("vendor:")) as any[] || []).filter(Boolean);
  const match = vendors.find((v: any) =>
    [v?.email, v?.contactEmail, v?.ownerEmail].some((e) => String(e || "").toLowerCase() === email && email),
  );
  return { signedIn: true, isCompany: false, vendorId: match ? String(match.id || "") : "__unresolved__", email };
}

const allInvoices = async () =>
  ((await kv.getByPrefix("vendor_invoice:")) as any[] || []).filter(Boolean);
const allPayments = async () =>
  ((await kv.getByPrefix("vendor_payment:")) as any[] || []).filter(Boolean);

/**
 * How much has actually landed against an invoice.
 *
 * Derived from the payments rather than stored on the invoice, so the two can
 * never disagree. A stored `paidAmount` is a number that drifts the first time
 * a payment is corrected.
 */
function settle(invoice: any, payments: any[]) {
  const paid = payments
    .filter((p) => Array.isArray(p?.invoiceIds) && p.invoiceIds.includes(invoice.id))
    .reduce((sum, p) => {
      // A remittance can cover several invoices at once. When it does, the
      // allocation says how much belongs to each; without one the payment is
      // for this invoice alone.
      const alloc = p?.allocations?.[invoice.id];
      return sum + money(alloc !== undefined ? alloc : (p.invoiceIds.length === 1 ? p.amount : 0));
    }, 0);

  const amount = money(invoice.amount);
  const outstanding = money(amount - paid);
  // A cent of tolerance: these are rounded currency sums, and an invoice left
  // "$0.00 outstanding but unpaid" would sit in the overdue list forever.
  const isPaid = outstanding <= 0.01;
  const overdue = !isPaid && String(invoice.dueDate || "") < today() && invoice.status !== "disputed";

  return {
    ...invoice,
    paidAmount: money(paid),
    outstanding: isPaid ? 0 : outstanding,
    // The stored status covers what a person decided (submitted, approved,
    // disputed). Paid is a fact about money arriving, so it is computed.
    status: isPaid ? "paid" : String(invoice.status || "submitted"),
    overdue,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase orders this vendor may still bill for.
// ─────────────────────────────────────────────────────────────────────────────
vendorBillingRouter.get("/vendor-billing/billable-orders", async (c) => {
  try {
    const actor = await billingActor(c);
    if (!actor.signedIn) return c.json({ success: false, orders: [], error: "Sign in to view billable orders." }, 401);

    const vendorId = actor.isCompany ? String(c.req.query("vendorId") || "") : actor.vendorId;
    if (!vendorId || vendorId === "__unresolved__") {
      return c.json({ success: true, orders: [], reason: "This account is not linked to a vendor record yet." });
    }

    const orders = ((await kv.getByPrefix("purchase_order:")) as any[] || [])
      .filter(Boolean)
      .filter((o: any) => String(o?.vendorId || "") === vendorId)
      // A cancelled order is not billable, and neither is one still in draft on
      // our side — it has not been placed yet.
      .filter((o: any) => !["cancelled", "draft"].includes(String(o?.status || "").toLowerCase()));

    // Anything already on a live invoice is off the table. Voided invoices
    // release their orders again, which is the whole point of voiding one.
    const claimed = new Set<string>();
    for (const inv of await allInvoices()) {
      if (String(inv?.status || "") === "void") continue;
      for (const id of (inv?.poIds || [])) claimed.add(String(id));
    }

    const available = orders
      .filter((o: any) => !claimed.has(String(o.id)))
      .map((o: any) => ({
        id: String(o.id),
        poNumber: String(o.poNumber || o.id),
        total: money(o.total),
        status: String(o.status || ""),
        orderDate: String(o.orderDate || o.createdAt || "").slice(0, 10),
        lines: Array.isArray(o.lineItems) ? o.lineItems.length : Number(o.items || 0),
      }))
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));

    return c.json({ success: true, orders: available });
  } catch (error: any) {
    return c.json({ success: false, orders: [], error: error?.message || "Unable to load billable orders." }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────
vendorBillingRouter.get("/vendor-billing/invoices", async (c) => {
  try {
    const actor = await billingActor(c);
    if (!actor.signedIn) return c.json({ success: false, invoices: [], error: "Sign in to view invoices." }, 401);

    const payments = await allPayments();
    const invoices = (await allInvoices())
      .filter((inv: any) => {
        if (actor.isCompany) {
          const want = String(c.req.query("vendorId") || "");
          return !want || String(inv?.vendorId || "") === want;
        }
        return actor.vendorId !== "__unresolved__" && String(inv?.vendorId || "") === actor.vendorId;
      })
      .map((inv: any) => settle(inv, payments))
      .sort((a: any, b: any) => String(b.issueDate || "").localeCompare(String(a.issueDate || "")));

    return c.json({ success: true, invoices, scopedToVendor: actor.isCompany ? null : actor.vendorId });
  } catch (error: any) {
    return c.json({ success: false, invoices: [], error: error?.message || "Unable to load invoices." }, 500);
  }
});

vendorBillingRouter.post("/vendor-billing/invoices", async (c) => {
  try {
    const actor = await billingActor(c);
    if (!actor.signedIn) return c.json({ success: false, error: "Sign in to raise an invoice." }, 401);

    const body = await c.req.json().catch(() => ({}));
    // A vendor invoices as themselves and nobody else. The company may raise one
    // on a vendor's behalf, which happens when an invoice arrives on paper.
    const vendorId = actor.isCompany ? String(body.vendorId || "") : actor.vendorId;
    if (!vendorId || vendorId === "__unresolved__") {
      return c.json({ success: false, error: "This account is not linked to a vendor record yet." }, 400);
    }

    const poIds = (Array.isArray(body.poIds) ? body.poIds : []).map((x: any) => String(x)).filter(Boolean);
    if (!poIds.length) return c.json({ success: false, error: "Select at least one purchase order to invoice." }, 400);

    const number = String(body.number || "").trim();
    if (!number) return c.json({ success: false, error: "An invoice number is required." }, 400);

    // Their own numbering, so a duplicate is theirs to catch — but a repeat of
    // the same number against the same vendor is nearly always a double send.
    const existing = await allInvoices();
    if (existing.some((i: any) => String(i?.vendorId) === vendorId && String(i?.number || "").toLowerCase() === number.toLowerCase())) {
      return c.json({ success: false, error: `Invoice ${number} already exists.` }, 409);
    }

    const orders = ((await kv.getByPrefix("purchase_order:")) as any[] || []).filter(Boolean);
    const claimed = new Set<string>();
    for (const inv of existing) {
      if (String(inv?.status || "") === "void") continue;
      for (const id of (inv?.poIds || [])) claimed.add(String(id));
    }

    const billing: any[] = [];
    for (const id of poIds) {
      const order = orders.find((o: any) => String(o?.id) === id);
      if (!order) return c.json({ success: false, error: `Purchase order ${id} was not found.` }, 404);
      // Refusing here rather than filtering: silently dropping an order the
      // vendor believed they were billing for is how an invoice goes out short.
      if (String(order.vendorId || "") !== vendorId) {
        return c.json({ success: false, error: "That purchase order belongs to another vendor." }, 403);
      }
      if (claimed.has(id)) {
        return c.json({ success: false, error: `${order.poNumber || id} has already been invoiced.` }, 409);
      }
      billing.push(order);
    }

    const issueDate = String(body.issueDate || today()).slice(0, 10);
    const termsLabel = TERMS[String(body.terms)] !== undefined ? String(body.terms) : "Net 30";
    const due = new Date(`${issueDate}T00:00:00Z`);
    due.setUTCDate(due.getUTCDate() + TERMS[termsLabel]);

    // Stamped once, at creation. The company view lists every vendor's
    // invoices at once and an id is not something a person can read; resolving
    // the name on every request would mean re-reading the whole vendor registry
    // to render a table.
    const vendorRecord = ((await kv.getByPrefix("vendor:")) as any[] || [])
      .filter(Boolean)
      .find((v: any) => String(v?.id || "") === vendorId);

    const now = new Date().toISOString();
    const id = `vinv_${crypto.randomUUID()}`;
    const invoice = {
      id,
      vendorId,
      vendorName: String(vendorRecord?.name || "").trim(),
      number,
      poIds,
      poNumbers: billing.map((o) => String(o.poNumber || o.id)),
      issueDate,
      terms: termsLabel,
      dueDate: due.toISOString().slice(0, 10),
      // Recomputed from the orders, never taken from the request body.
      amount: money(billing.reduce((sum, o) => sum + money(o.total), 0)),
      status: "submitted",
      notes: String(body.notes || "").slice(0, 2000),
      raisedBy: actor.email,
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(INVOICE(id), invoice);
    return c.json({ success: true, invoice: settle(invoice, await allPayments()) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Unable to raise the invoice." }, 500);
  }
});

/**
 * Approve, dispute, or void an invoice.
 *
 * Company only. A vendor approving their own invoice would make the approval
 * step meaningless, and "paid" is never settable by hand — it is computed from
 * the payments recorded against the invoice.
 */
vendorBillingRouter.patch("/vendor-billing/invoices/:id/status", async (c) => {
  try {
    const actor = await billingActor(c);
    if (!actor.signedIn) return c.json({ success: false, error: "Sign in to update an invoice." }, 401);
    if (!actor.isCompany) return c.json({ success: false, error: "Only Black Phoenix can approve or dispute an invoice." }, 403);

    const id = c.req.param("id");
    const invoice = await kv.get(INVOICE(id)) as any;
    if (!invoice) return c.json({ success: false, error: "Invoice not found." }, 404);

    const body = await c.req.json().catch(() => ({}));
    const status = String(body.status || "").trim().toLowerCase();
    if (!["submitted", "approved", "disputed", "void"].includes(status)) {
      return c.json({ success: false, error: "Status must be submitted, approved, disputed or void." }, 400);
    }

    const payments = await allPayments();
    const current = settle(invoice, payments);
    if (current.status === "paid" && status === "void") {
      return c.json({ success: false, error: "A paid invoice cannot be voided — reverse the payment first." }, 409);
    }

    const updated = {
      ...invoice,
      status,
      // A dispute is only useful if the reason travels with it.
      statusNote: String(body.note || "").slice(0, 1000),
      statusBy: actor.email,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(INVOICE(id), updated);
    return c.json({ success: true, invoice: settle(updated, payments) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Unable to update the invoice." }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────
vendorBillingRouter.get("/vendor-billing/payments", async (c) => {
  try {
    const actor = await billingActor(c);
    if (!actor.signedIn) return c.json({ success: false, payments: [], error: "Sign in to view payments." }, 401);

    const payments = (await allPayments())
      .filter((p: any) => {
        if (actor.isCompany) {
          const want = String(c.req.query("vendorId") || "");
          return !want || String(p?.vendorId || "") === want;
        }
        return actor.vendorId !== "__unresolved__" && String(p?.vendorId || "") === actor.vendorId;
      })
      .sort((a: any, b: any) => String(b.paidDate || "").localeCompare(String(a.paidDate || "")));

    return c.json({ success: true, payments, scopedToVendor: actor.isCompany ? null : actor.vendorId });
  } catch (error: any) {
    return c.json({ success: false, payments: [], error: error?.message || "Unable to load payments." }, 500);
  }
});

/**
 * Record a remittance against one or more invoices. Company only — a vendor
 * recording their own payment would be a vendor deciding they had been paid.
 */
vendorBillingRouter.post("/vendor-billing/payments", async (c) => {
  try {
    const actor = await billingActor(c);
    if (!actor.signedIn) return c.json({ success: false, error: "Sign in to record a payment." }, 401);
    if (!actor.isCompany) return c.json({ success: false, error: "Only Black Phoenix can record a payment." }, 403);

    const body = await c.req.json().catch(() => ({}));
    const invoiceIds = (Array.isArray(body.invoiceIds) ? body.invoiceIds : []).map((x: any) => String(x)).filter(Boolean);
    if (!invoiceIds.length) return c.json({ success: false, error: "Select at least one invoice to pay." }, 400);

    const invoices: any[] = [];
    for (const id of invoiceIds) {
      const inv = await kv.get(INVOICE(id)) as any;
      if (!inv) return c.json({ success: false, error: `Invoice ${id} was not found.` }, 404);
      if (String(inv.status || "") === "void") {
        return c.json({ success: false, error: `Invoice ${inv.number} is void and cannot be paid.` }, 409);
      }
      invoices.push(inv);
    }

    // One remittance covers one vendor. Paying two vendors on a single record
    // would make the vendor-scoped read above ambiguous.
    const vendorIds = new Set(invoices.map((i) => String(i.vendorId || "")));
    if (vendorIds.size !== 1) {
      return c.json({ success: false, error: "A payment must cover invoices from a single vendor." }, 400);
    }

    const existing = await allPayments();
    const allocations: Record<string, number> = {};
    let total = 0;

    for (const inv of invoices) {
      const already = settle(inv, existing);
      const asked = body.allocations?.[inv.id];
      // Default to clearing what is left, which is what paying an invoice
      // normally means. An explicit allocation covers part payments.
      const amount = money(asked !== undefined ? asked : already.outstanding);
      if (amount <= 0) {
        return c.json({ success: false, error: `Nothing outstanding on invoice ${inv.number}.` }, 400);
      }
      if (amount > already.outstanding + 0.01) {
        return c.json({
          success: false,
          error: `Cannot pay $${amount.toFixed(2)} against invoice ${inv.number} — only $${already.outstanding.toFixed(2)} is outstanding.`,
        }, 400);
      }
      allocations[inv.id] = amount;
      total = money(total + amount);
    }

    const now = new Date().toISOString();
    const id = `vpay_${crypto.randomUUID()}`;
    const payment = {
      id,
      vendorId: [...vendorIds][0],
      vendorName: String(invoices[0]?.vendorName || ""),
      invoiceIds,
      invoiceNumbers: invoices.map((i) => String(i.number || i.id)),
      allocations,
      amount: total,
      method: String(body.method || "ACH transfer").slice(0, 60),
      reference: String(body.reference || "").slice(0, 120),
      paidDate: String(body.paidDate || today()).slice(0, 10),
      notes: String(body.notes || "").slice(0, 1000),
      recordedBy: actor.email,
      createdAt: now,
    };

    await kv.set(PAYMENT(id), payment);
    return c.json({ success: true, payment });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Unable to record the payment." }, 500);
  }
});

export default vendorBillingRouter;
