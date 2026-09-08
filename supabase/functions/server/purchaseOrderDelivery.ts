/**
 * Sending a purchase order to the vendor who has to fulfil it.
 *
 * WHAT HAPPENED BEFORE
 *
 * `purchase-orders/from-materials` created the order with `status: 'draft'` and
 * stopped. Nothing emailed the vendor and nothing called their system, so the
 * order existed in our store and the only way a supplier learned of it was by
 * opening their portal and noticing. An order nobody has been told about is not
 * an order.
 *
 * WHAT A VENDOR IS ALLOWED TO SEE
 *
 * This is the half worth being careful about. A purchase order record carries
 * things that are ours and not theirs — which quote it came from, who raised it,
 * and in a materials list the prices we are charging the customer. The payload
 * is therefore **built field by field** rather than sent by spreading the
 * record, so a field added to a purchase order later cannot quietly start
 * appearing in an outbound message to a third party. That is the same reasoning
 * as `architectView()` in the framing submittal, for the same reason.
 *
 * What they get is what they need to fulfil: the order number, what we are
 * buying, how much, at the price we agreed with them, where it goes and when it
 * is needed.
 */

export interface DeliverableLine {
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DeliverablePurchaseOrder {
  poNumber: string;
  issuedAt: string;
  currency: string;
  buyer: { name: string; contact: string };
  fulfillment: string;
  neededBy: string | null;
  shipTo: string;
  reference: string;
  lines: DeliverableLine[];
  itemCount: number;
  total: number;
}

const money = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The outbound shape, assembled explicitly.
 *
 * `buyerContact` is passed in rather than read off the order, because the field
 * on the record is `raisedBy` — the individual who pressed the button — and a
 * supplier should be given the company's ordering address, not a staff member's
 * personal one.
 */
export function deliverablePurchaseOrder(
  order: any,
  buyer: { name: string; contact: string },
): DeliverablePurchaseOrder {
  const lines: DeliverableLine[] = (Array.isArray(order?.lineItems) ? order.lineItems : []).map((l: any) => {
    const quantity = Number(l?.quantity) || 0;
    /**
     * The unit price keeps its full precision; only the line total is rounded.
     *
     * Rounding the unit price to cents first and then multiplying is wrong for
     * anything priced in fractions of a cent, which fasteners, fittings and
     * bulk lumber routinely are. At $0.3333 each, rounding to $0.33 and
     * multiplying by 3,000 loses ten dollars against what the supplier's own
     * system will invoice — and an order whose arithmetic disagrees with the
     * supplier's is a dispute over a number we sent them.
     */
    const unitPrice = Number(l?.unitPrice) || 0;
    return {
      name: String(l?.name || l?.description || 'Unnamed item').slice(0, 200),
      sku: String(l?.sku || '').slice(0, 60),
      unit: String(l?.unit || 'each').slice(0, 24),
      quantity,
      unitPrice,
      // Recomputed rather than trusted. A stored total that disagrees with
      // quantity times price is a dispute with a supplier over a number we sent
      // them, and the arithmetic is cheaper than the phone call.
      lineTotal: money(quantity * unitPrice),
    };
  });

  return {
    poNumber: String(order?.poNumber || order?.id || ''),
    issuedAt: new Date().toISOString(),
    currency: 'usd',
    buyer,
    fulfillment: String(order?.fulfillment || 'delivery'),
    neededBy: order?.expectedDate || null,
    shipTo: String(order?.siteAddress || ''),
    // The project name only. `sourceQuoteId` and `raisedBy` are deliberately
    // absent: our quote numbering and our staff are not the supplier's business.
    reference: String(order?.projectName || '').slice(0, 200),
    lines,
    itemCount: lines.length,
    total: money(lines.reduce((sum, l) => sum + l.lineTotal, 0)),
  };
}

export type DeliveryState = 'unsent' | 'sent' | 'failed' | 'acknowledged';

export interface DeliveryRecord {
  state: DeliveryState;
  channel: 'api' | 'email' | null;
  at: string | null;
  detail: string;
  /** Sent once, by this key. See `alreadyDelivered`. */
  idempotencyKey: string;
}

/**
 * Has this order already gone out?
 *
 * Sending twice is not a duplicate message, it is potentially a duplicate
 * delivery of physical materials to a site. So a resend has to be asked for
 * explicitly rather than being what a second click does.
 */
export function alreadyDelivered(order: any): boolean {
  const state = String(order?.delivery?.state || '');
  return state === 'sent' || state === 'acknowledged';
}

/** Whether a vendor's reply should be read as success. */
export function deliveryFromResponse(status: number | undefined, ok: boolean, body: string): DeliveryRecord {
  const at = new Date().toISOString();
  if (ok) {
    return {
      state: 'sent', channel: 'api', at,
      detail: `Accepted with HTTP ${status ?? 200}.`,
      idempotencyKey: '',
    };
  }
  return {
    state: 'failed', channel: 'api', at,
    // The vendor's own words, truncated. A failure that says only "failed"
    // cannot be acted on by whoever has to chase it.
    detail: `HTTP ${status ?? 0}: ${String(body || '').slice(0, 300) || 'no response body'}`,
    idempotencyKey: '',
  };
}

/** A plain-text order, for a vendor with no API. */
export function purchaseOrderEmailText(po: DeliverablePurchaseOrder): string {
  const rows = po.lines.map((l) =>
    `  ${String(l.quantity).padStart(6)} ${l.unit.padEnd(8)} ${l.name}${l.sku ? ` [${l.sku}]` : ''}`
    + `  @ $${l.unitPrice.toFixed(2)} = $${l.lineTotal.toFixed(2)}`,
  ).join('\n');

  return [
    `Purchase order ${po.poNumber}`,
    po.reference ? `Project: ${po.reference}` : '',
    po.fulfillment === 'pickup' ? 'For collection' : `Deliver to: ${po.shipTo || '(address to follow)'}`,
    po.neededBy ? `Needed by: ${po.neededBy}` : '',
    '',
    rows,
    '',
    `Total: $${po.total.toFixed(2)}`,
    '',
    `Raised by ${po.buyer.name}. Reply to ${po.buyer.contact} to confirm or query.`,
  ].filter(Boolean).join('\n');
}
