/**
 * Invoice auto-linking
 *
 * When an invoice is first issued to someone who hasn't joined yet, it is stored
 * with a `customer_email` but no `customer_id`. Later, when that same email
 * becomes a real customer — either because the owner adds them in the CRM, or
 * because they sign up for a portal — we want their existing invoices to attach
 * to that customer automatically so their history is unified.
 *
 * `linkInvoicesByEmail` is the shared helper both entry points call. It scans the
 * `invoice:` KV space, finds unlinked invoices whose recipient email matches, and
 * stamps them with the customer id. It is idempotent and never overwrites an
 * invoice that is already linked to a (different) customer.
 *
 * The router also exposes an admin endpoint that runs the same logic on demand,
 * so an owner can backfill links for a customer at any time.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const invoiceLinkingRouter = new Hono();

const INVOICE_PREFIX = "invoice:";

function recipientEmail(inv: any): string {
  return String(
    inv?.customerEmail || inv?.customer_email || inv?.clientEmail || inv?.client_email || inv?.email || "",
  ).trim().toLowerCase();
}

function isLinked(inv: any): boolean {
  const id = inv?.customer_id ?? inv?.customerId;
  return id !== null && id !== undefined && String(id).trim() !== "";
}

/**
 * Attach every unlinked invoice addressed to `email` to the customer `customerId`.
 * Returns the number of invoices linked and their ids. Safe to call repeatedly.
 */
export async function linkInvoicesByEmail(
  email: string,
  customerId: string,
): Promise<{ linked: number; ids: string[] }> {
  const target = String(email || "").trim().toLowerCase();
  const cid = String(customerId || "").trim();
  if (!target || !cid) return { linked: 0, ids: [] };

  const invoices = ((await kv.getByPrefix(INVOICE_PREFIX)) as any[]) || [];
  const linkedIds: string[] = [];

  for (const inv of invoices) {
    if (!inv?.id) continue;
    if (recipientEmail(inv) !== target) continue;
    if (isLinked(inv)) continue; // never steal an invoice already tied to a customer

    const updated = {
      ...inv,
      customer_id: cid,
      customerId: cid,
      linkedAt: new Date().toISOString(),
      linkedBy: "auto",
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`${INVOICE_PREFIX}${inv.id}`, updated);
    linkedIds.push(String(inv.id));
  }

  if (linkedIds.length) {
    console.log(`[invoice-linking] linked ${linkedIds.length} invoice(s) for ${target} -> ${cid}`);
  }
  return { linked: linkedIds.length, ids: linkedIds };
}

// POST /make-server-3eae23a6/invoices/link-by-email  body { email, customerId }
// Admin only — lets the owner backfill links for a customer on demand.
invoiceLinkingRouter.post("/make-server-3eae23a6/invoices/link-by-email", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken ?? "");
    if (authErr || !user?.id) {
      return c.json({ success: false, error: `Authorization error while linking invoices: ${authErr?.message || "no user"}` }, 401);
    }
    const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
    const role = perms?.role || user.app_metadata?.role;
    if (role !== "admin" && role !== "owner" && role !== "super_admin") {
      return c.json({ success: false, error: "Administrator access is required to link invoices." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const result = await linkInvoicesByEmail(String(body?.email || ""), String(body?.customerId || ""));
    return c.json({ success: true, ...result });
  } catch (err) {
    console.log(`Error linking invoices by email: ${err}`);
    return c.json({ success: false, error: `Failed to link invoices: ${err}` }, 500);
  }
});

export default invoiceLinkingRouter;
