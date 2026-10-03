/**
 * The job that tells a customer their parcel is coming.
 *
 * WHY THIS IS NEW WORK AND NOT A WIRING JOB
 *
 * Nothing in this system has ever told a customer anything after they paid.
 * There was a tracking sync, but it had two faults that each made it useless:
 *
 * 1. It wrote the tracking number onto the SUPPLIER's mirror record
 *    (`dropshipper_order:*`) and nowhere else. The only thing that ever wrote
 *    `tracking_number` onto the store order a customer can see was an
 *    administrator typing it into a form. The two records never met.
 *
 * 2. It could not have worked against CJ anyway. `fetchTrackingFromProvider`
 *    in dropshipper.tsx does `GET {apiUrl}/orders/{id}/tracking` with a Bearer
 *    token; CJ wants `CJ-Access-Token` and a different path entirely. Had it
 *    been put on a schedule it would have failed silently every fifteen
 *    minutes — the same shape of fault as posting Zendrop orders to an
 *    endpoint that does not create them.
 *
 * So this job pulls from CJ properly, writes the result onto the STORE order,
 * and emails the customer once when their parcel gets a tracking number and
 * once when it arrives.
 *
 * WHAT IT WILL NOT DO
 *
 * It will not invent a carrier link. If CJ returns a tracking URL it is passed
 * through; if it does not, the customer gets the number and the carrier name
 * and can look it up. A fabricated URL that 404s is worse than no URL, because
 * it reads as our mistake at the exact moment the customer is anxious.
 *
 * It will not mark anything delivered on a status it does not recognise.
 * `mapCjStatus` answers `unknown` for anything unexpected and the order stays
 * where it is — telling somebody their parcel arrived because a supplier
 * renamed a status is not a recoverable error.
 */
import * as kv from "./kv_store.tsx";
import { registerStoreJob, askForGuidance, withdrawAsk, type StoreJobContext, type StoreJobResult } from "./storeAutonomy.ts";
import { fetchCJOrderStatus } from "./cjdropshipping.tsx";
import { storedOrSecretKey as cjKey } from "./cjdropshipping.tsx";
import * as config from "./dropshipper-config.tsx";

const DROPSHIP_PREFIX = "dropshipper_order:";
const COMPANY = "The Black Phoenix Company";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@theblackphoenixcompany.com";
const APP_URL = (Deno.env.get("APP_URL") || "https://www.theblackphoenixcompany.com").replace(/\/$/, "");

/** How many consecutive failures before the job stops guessing and asks. */
const FAILURES_BEFORE_ASKING = 3;

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Send one email. Never throws: a mail provider having a bad afternoon must not
 * stop an order's status being recorded, because the record is what lets the
 * next tick try again.
 */
async function sendCustomerEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY is not configured" };
  if (!to || !to.includes("@")) return { sent: false, reason: "no usable email on the order" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${COMPANY} <${FROM_EMAIL}>`, to: [to], subject, html }),
    });
    if (!res.ok) return { sent: false, reason: `the mail provider refused it (${res.status})` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "the mail provider could not be reached" };
  }
}

/** The store order behind a supplier order, whichever prefix it was saved under. */
async function loadStoreOrder(orderId: string): Promise<{ key: string; order: any } | null> {
  for (const key of [`store:order:${orderId}`, `store_order:${orderId}`]) {
    const order = (await kv.get(key)) as any;
    if (order && typeof order === "object") return { key, order };
  }
  return null;
}

function itemLines(order: any): string {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items
    .map((i: any) => `${escapeHtml(String(i.name || i.title || "Item"))} &times;${Number(i.quantity ?? i.qty ?? 1)}`)
    .join("<br>") || "Your order";
}

function shippedEmail(order: any, tracking: { trackingNumber?: string; carrier?: string; trackingUrl?: string }): string {
  const number = escapeHtml(tracking.trackingNumber || "");
  const carrier = escapeHtml(tracking.carrier || "");
  // Only CJ's own URL, never one we built. See the header note.
  const link = tracking.trackingUrl
    ? `<p style="margin:16px 0"><a href="${escapeHtml(tracking.trackingUrl)}" style="color:#b45309">Track your parcel</a></p>`
    : `<p style="margin:16px 0;color:#57534e">You can track it with that number on ${carrier || "the carrier"}'s own website.</p>`;
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#1c1917">
  <h1 style="font-size:20px;margin:0 0 4px">Your order is on its way</h1>
  <p style="margin:0 0 20px;color:#57534e">Order ${escapeHtml(String(order.id || ""))}</p>
  <p style="margin:0 0 16px">${itemLines(order)}</p>
  <table style="border-collapse:collapse;margin:0 0 8px">
    ${carrier ? `<tr><td style="padding:4px 16px 4px 0;color:#57534e">Carrier</td><td style="padding:4px 0"><strong>${carrier}</strong></td></tr>` : ""}
    ${number ? `<tr><td style="padding:4px 16px 4px 0;color:#57534e">Tracking</td><td style="padding:4px 0"><strong>${number}</strong></td></tr>` : ""}
  </table>
  ${link}
  <p style="margin:24px 0 0;font-size:13px;color:#78716c">
    Any trouble with this order, reply to this email and a person will read it.<br>
    <a href="${APP_URL}/store" style="color:#78716c">${escapeHtml(COMPANY)}</a>
  </p>
</div>`;
}

function deliveredEmail(order: any): string {
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#1c1917">
  <h1 style="font-size:20px;margin:0 0 4px">Your order has arrived</h1>
  <p style="margin:0 0 20px;color:#57534e">Order ${escapeHtml(String(order.id || ""))}</p>
  <p style="margin:0 0 16px">${itemLines(order)}</p>
  <p style="margin:0 0 16px">The carrier has marked this as delivered. If it has not reached you, reply to
  this email and a person will look into it — do not wait.</p>
  <p style="margin:24px 0 0;font-size:13px;color:#78716c">
    <a href="${APP_URL}/store" style="color:#78716c">${escapeHtml(COMPANY)}</a>
  </p>
</div>`;
}

/**
 * Pull status for every supplier order still in flight, and tell the customer
 * what changed.
 */
async function trackJob(ctx: StoreJobContext): Promise<StoreJobResult> {
  const rows = ((await kv.getByPrefix(DROPSHIP_PREFIX)) || []) as any[];

  // The dropshipper store keeps JSON strings, not objects — saveOrder stringifies.
  const supplierOrders = rows
    .map((row) => {
      if (typeof row === "string") { try { return JSON.parse(row); } catch { return null; } }
      return row && typeof row === "object" ? row : null;
    })
    .filter(Boolean)
    .filter((o: any) => ["forwarded", "confirmed", "shipped"].includes(String(o.status || "")))
    .slice(0, ctx.maxOrdersPerTick);

  if (supplierOrders.length === 0) {
    return { ran: false, detail: "No supplier orders are in flight." };
  }

  let checked = 0;
  let advanced = 0;
  let emailed = 0;
  let failed = 0;
  const problems: string[] = [];

  for (const supplierOrder of supplierOrders) {
    const orderId = String(supplierOrder.orderId || "");
    const providerId = String(supplierOrder.providerId || "");
    if (!orderId) continue;

    /**
     * Only CJ is sellable, so only CJ should be in flight. A record for anybody
     * else means somebody added a supplier without adding a way to track it —
     * which is a decision, not an error, so it goes to the queue rather than
     * into a log nobody reads.
     */
    if (providerId && providerId !== "cjdropshipping") {
      await askForGuidance({
        job: "track",
        dedupeKey: `unknown-provider:${providerId}`,
        question: `How should orders from "${providerId}" be tracked?`,
        because: `There is a supplier order in flight from "${providerId}", and the only supplier this store knows how to ask about is CJdropshipping. Nothing will update these orders until somebody decides.`,
        wouldHaveDone: "Left the order alone rather than guess at an API we have not written.",
        choices: [
          { key: "ignore", label: "Leave them alone", consequence: "Tracking stops for this supplier until somebody builds it. Customers are not told anything." },
          { key: "manual", label: "I will update these by hand", consequence: "The job skips them quietly from now on." },
          { key: "build", label: "Build tracking for this supplier", consequence: "Flags it as work to do; nothing changes today." },
        ],
        detail: [["Supplier", providerId], ["Example order", orderId]],
        subject: { kind: "supplier", id: providerId },
      });
      continue;
    }

    let status;
    try {
      const provider = await config.getProvider("cjdropshipping");
      status = await fetchCJOrderStatus(cjKey(provider?.apiKey) || undefined, String(supplierOrder.providerOrderId || ""));
      checked += 1;
    } catch (error: any) {
      failed += 1;
      const message = String(error?.message || error);
      problems.push(`${orderId}: ${message}`);
      const failures = Number(supplierOrder.trackingFailures || 0) + 1;
      await kv.set(`${DROPSHIP_PREFIX}${orderId}`, JSON.stringify({
        ...supplierOrder,
        trackingFailures: failures,
        trackingLastError: message,
        trackingCheckedAt: new Date().toISOString(),
      }));

      /**
       * After three consecutive failures, stop guessing and ask.
       *
       * This is the guard against the exact failure that started all of this:
       * something that cannot work, retrying forever, with the reason written
       * where nobody looks. Three is enough to rule out a blip.
       */
      if (failures >= FAILURES_BEFORE_ASKING) {
        await askForGuidance({
          job: "track",
          dedupeKey: `cj-tracking-failing:${orderId}`,
          question: `CJ will not say what happened to order ${orderId}. What should we do?`,
          because: `${failures} consecutive attempts have failed with the same answer from CJ. This may mean the order id is wrong, or that the endpoint this job uses is not the right one — it has never been exercised against a real CJ order.`,
          wouldHaveDone: "Kept retrying every fifteen minutes without telling anybody.",
          choices: [
            { key: "keep-trying", label: "Keep trying", consequence: "The job carries on retrying and will not ask again about this order." },
            { key: "manual", label: "I will check CJ by hand", consequence: "The job stops asking about this order; you update it from the Orders screen." },
            { key: "pause", label: "Pause tracking entirely", consequence: "Switch the track job off until the endpoint is corrected. No customer is told anything meanwhile." },
          ],
          detail: [
            ["Store order", orderId],
            ["CJ order id", String(supplierOrder.providerOrderId || "—")],
            ["Attempts", String(failures)],
            ["CJ said", message.slice(0, 300)],
          ],
          subject: { kind: "order", id: orderId },
        });
      }
      continue;
    }

    // A success clears the failure count and any question about this order.
    const found = await loadStoreOrder(orderId);
    const now = new Date().toISOString();

    await kv.set(`${DROPSHIP_PREFIX}${orderId}`, JSON.stringify({
      ...supplierOrder,
      status: status.status === "unknown" ? supplierOrder.status : status.status,
      providerStatus: status.rawStatus,
      trackingNumber: status.trackingNumber || supplierOrder.trackingNumber,
      trackingFailures: 0,
      trackingLastError: undefined,
      trackingCheckedAt: now,
    }));
    await withdrawAsk("track", `cj-tracking-failing:${orderId}`);

    if (!found) {
      problems.push(`${orderId}: no store order behind this supplier order`);
      continue;
    }

    const order = found.order;
    const updates: Record<string, any> = { tracking_checked_at: now };
    let changed = false;

    if (status.trackingNumber && order.tracking_number !== status.trackingNumber) {
      updates.tracking_number = status.trackingNumber;
      updates.tracking_carrier = status.carrier || order.tracking_carrier;
      if (status.trackingUrl) updates.tracking_url = status.trackingUrl;
      changed = true;
    }
    if (status.status === "shipped" && order.fulfillment_status !== "delivered") {
      if (order.fulfillment_status !== "shipped") { updates.fulfillment_status = "shipped"; changed = true; }
    }
    if (status.status === "delivered" && order.fulfillment_status !== "delivered") {
      updates.fulfillment_status = "delivered";
      updates.delivered_at = now;
      changed = true;
    }

    // Tell the customer, once per thing worth telling them.
    const email = String(order.customer_email || order.customer?.email || "");
    if (updates.tracking_number && !order.tracking_notified_at) {
      const sent = await sendCustomerEmail(
        email,
        `Your order is on its way — ${order.id}`,
        shippedEmail({ ...order, ...updates }, { trackingNumber: updates.tracking_number, carrier: updates.tracking_carrier, trackingUrl: updates.tracking_url }),
      );
      if (sent.sent) { updates.tracking_notified_at = now; emailed += 1; }
      else problems.push(`${orderId}: could not email the customer — ${sent.reason}`);
      changed = true;
    }
    if (updates.fulfillment_status === "delivered" && !order.delivered_notified_at) {
      const sent = await sendCustomerEmail(email, `Your order has arrived — ${order.id}`, deliveredEmail(order));
      if (sent.sent) { updates.delivered_notified_at = now; emailed += 1; }
      changed = true;
    }

    await kv.set(found.key, { ...order, ...updates, updated_at: now });
    if (changed) advanced += 1;
  }

  const detail = [
    `${checked} supplier order(s) checked`,
    advanced ? `${advanced} advanced` : null,
    emailed ? `${emailed} customer email(s) sent` : null,
    failed ? `${failed} failed` : null,
  ].filter(Boolean).join(", ");

  return {
    ran: checked > 0 || failed > 0,
    detail: detail || "Nothing to do.",
    counts: { checked, advanced, emailed, failed },
    error: problems.length ? problems.slice(0, 5).join("; ") : undefined,
  };
}

/**
 * Registered explicitly from index.tsx rather than on import.
 *
 * A side-effect import is the kind of line somebody removes while tidying, and
 * the symptom would be a job that silently stops existing.
 */
export function registerStoreTrackingJob(): void {
  registerStoreJob("track", trackJob);
}
