/**
 * Shipping labels — for the orders you ship yourself.
 *
 * Dropshipped goods never need one: CJ prints and ships from its own warehouse.
 * Labels are needed in two cases, and both are handled here:
 *
 *   • an order containing stock you hold, which you post yourself
 *   • a return valuable enough to be worth getting back (above the keep-it
 *     threshold), which needs a prepaid label sent to the customer
 *
 * Carrier is Shippo: plain REST, no monthly minimum, discounted USPS/UPS rates.
 * Without SHIPPO_API_KEY every route refuses clearly rather than half-working —
 * a label is a thing a customer waits for, and a silent failure here means a
 * parcel that never moves.
 *
 * Buying a label spends real money, so the two steps are deliberately separate:
 * quote returns options and prices, and nothing is purchased until a specific
 * rate is chosen.
 */
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

export const shippingLabelsRouter = new Hono();

const PREFIX = '/make-server-3eae23a6';
const SHIP_FROM_KEY = 'shipping:from_address';
const LABEL_PREFIX = 'shipping_label:';
const SHIPPO_BASE = 'https://api.goshippo.com';

const auth = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function requireAdmin(c: any): Promise<{ email: string | null; admin: boolean }> {
  const header = c.req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) return { email: null, admin: false };
  const { data, error } = await auth.auth.getUser(header.substring(7));
  if (error || !data?.user) return { email: null, admin: false };
  const role = String((data.user.app_metadata as any)?.role || '').toLowerCase();
  return { email: data.user.email || null, admin: role === 'admin' || role === 'owner' || role === 'super_admin' };
}

function shippoKey(): string {
  const key = (Deno.env.get('SHIPPO_API_KEY') || '').trim();
  if (!key) {
    throw new Error('Shipping labels are not configured. Add the SHIPPO_API_KEY secret to buy postage.');
  }
  return key;
}

async function shippo(path: string, body?: any, method: 'GET' | 'POST' = body ? 'POST' : 'GET') {
  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method,
    headers: {
      Authorization: `ShippoToken ${shippoKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = payload?.detail || payload?.__all__ || JSON.stringify(payload).slice(0, 200);
    throw new Error(`Shippo ${res.status}: ${detail}`);
  }
  return payload;
}

/** A Shippo address, from whatever shape the order happens to carry. */
function toAddress(input: any, fallbackName = 'Customer') {
  const a = input || {};
  return {
    name: String(a.name || a.fullName || fallbackName).slice(0, 100),
    street1: String(a.street1 || a.line1 || a.address1 || a.address || '').slice(0, 100),
    street2: String(a.street2 || a.line2 || a.address2 || '').slice(0, 100),
    city: String(a.city || '').slice(0, 60),
    state: String(a.state || a.region || '').slice(0, 40),
    zip: String(a.zip || a.postalCode || a.postal_code || '').slice(0, 20),
    country: String(a.country || 'US').slice(0, 2).toUpperCase(),
    phone: String(a.phone || '').slice(0, 30),
    email: String(a.email || '').slice(0, 120),
  };
}

function addressComplete(a: any): string | null {
  for (const field of ['street1', 'city', 'state', 'zip'] as const) {
    if (!a[field]) return `Shipping address is missing ${field}.`;
  }
  return null;
}

async function findOrder(orderId: string): Promise<any | null> {
  const id = String(orderId || '').trim();
  if (!id) return null;
  for (const key of [`store:order:${id}`, `store_order:${id}`]) {
    const raw = await kv.get(key);
    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  return null;
}

/**
 * Which lines on an order do we post ourselves?
 *
 * An item that resolves to a dropshipper inventory record is shipped by that
 * supplier and must not be labelled here — printing postage for a parcel CJ is
 * already sending is money spent on nothing. Everything else is stock on hand.
 */
async function ownStockLines(order: any): Promise<{ own: any[]; dropshipped: any[] }> {
  const own: any[] = [];
  const dropshipped: any[] = [];
  for (const item of (Array.isArray(order?.items) ? order.items : [])) {
    const raw = String(item.sku || item.id || '');
    // Storefront ids are written `provider_sku`; inventory is keyed on the bare
    // supplier sku, so try both before deciding an item is ours.
    const candidates = [raw];
    const underscore = raw.indexOf('_');
    if (underscore > 0) candidates.push(raw.slice(underscore + 1));

    let supplierOwned = false;
    for (const sku of candidates) {
      if (!sku) continue;
      const rec = await kv.get(`dropshipper_inventory:${sku}`);
      if (rec) { supplierOwned = true; break; }
    }
    (supplierOwned ? dropshipped : own).push(item);
  }
  return { own, dropshipped };
}

// ── Ship-from address ────────────────────────────────────────────────────────
shippingLabelsRouter.get(`${PREFIX}/shipping/from-address`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const raw = await kv.get(SHIP_FROM_KEY);
  const stored = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  return c.json({
    success: true,
    address: stored,
    configured: !!stored && !addressComplete(stored),
    carrierConfigured: !!(Deno.env.get('SHIPPO_API_KEY') || '').trim(),
  });
});

shippingLabelsRouter.put(`${PREFIX}/shipping/from-address`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const body = await c.req.json().catch(() => ({} as any));
  const address = toAddress(body, body.name || 'Warehouse');
  const missing = addressComplete(address);
  if (missing) return c.json({ success: false, error: missing }, 400);
  await kv.set(SHIP_FROM_KEY, address);
  return c.json({ success: true, address });
});

// ── What does an order actually need? ────────────────────────────────────────
// Answering this before quoting stops postage being bought for parcels a
// supplier is already shipping.
shippingLabelsRouter.get(`${PREFIX}/shipping/order/:id/assessment`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const order = await findOrder(c.req.param('id'));
  if (!order) return c.json({ success: false, error: 'Order not found.' }, 404);

  const { own, dropshipped } = await ownStockLines(order);
  const existing = ((await kv.getByPrefix(LABEL_PREFIX)) || []) as any[];
  const labels = existing
    .map((l) => (typeof l === 'string' ? JSON.parse(l) : l))
    .filter((l: any) => l?.orderId === order.id);

  return c.json({
    success: true,
    orderId: order.id,
    needsLabel: own.length > 0,
    ownStockItems: own.length,
    dropshippedItems: dropshipped.length,
    note: own.length === 0
      ? 'Every item on this order ships from a supplier — no label needed.'
      : dropshipped.length > 0
        ? 'Mixed order: only the stock you hold needs a label.'
        : 'All items ship from your own stock.',
    labels: labels.map((l: any) => ({ id: l.id, tracking: l.tracking, url: l.labelUrl, kind: l.kind, createdAt: l.createdAt })),
  });
});

// ── Quote ────────────────────────────────────────────────────────────────────
// Returns options and prices. Buys nothing.
shippingLabelsRouter.post(`${PREFIX}/shipping/quote`, async (c) => {
  try {
    const { admin } = await requireAdmin(c);
    if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);

    const body = await c.req.json().catch(() => ({} as any));
    const parcel = body.parcel || {};
    const weightOz = Number(parcel.weightOz || 0);
    if (!(weightOz > 0)) return c.json({ success: false, error: 'Parcel weight (oz) is required.' }, 400);

    const fromRaw = await kv.get(SHIP_FROM_KEY);
    const from = fromRaw ? (typeof fromRaw === 'string' ? JSON.parse(fromRaw) : fromRaw) : null;
    if (!from) return c.json({ success: false, error: 'Set your ship-from address first.' }, 400);

    let to = toAddress(body.to);
    // A return label is the same shipment with the ends swapped: the customer
    // posts the item back to you.
    const isReturn = body.kind === 'return';
    const shipment = await shippo('/shipments/', {
      address_from: isReturn ? to : from,
      address_to: isReturn ? from : to,
      parcels: [{
        length: String(parcel.lengthIn || 9),
        width: String(parcel.widthIn || 6),
        height: String(parcel.heightIn || 2),
        distance_unit: 'in',
        weight: String(weightOz),
        mass_unit: 'oz',
      }],
      async: false,
    });

    const rates = (shipment.rates || []).map((r: any) => ({
      rateId: r.object_id,
      carrier: r.provider,
      service: r.servicelevel?.name || '',
      amount: Number(r.amount),
      currency: r.currency,
      estimatedDays: r.estimated_days ?? null,
    })).sort((a: any, b: any) => a.amount - b.amount);

    return c.json({
      success: true,
      boughtAnything: false,
      shipmentId: shipment.object_id,
      rates,
      note: rates.length ? null : 'No rates returned — check the addresses and parcel size.',
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not get shipping rates.' }, 500);
  }
});

// ── Buy ──────────────────────────────────────────────────────────────────────
// This spends money. It requires a rate chosen from a quote.
shippingLabelsRouter.post(`${PREFIX}/shipping/buy`, async (c) => {
  try {
    const { email, admin } = await requireAdmin(c);
    if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);

    const body = await c.req.json().catch(() => ({} as any));
    const rateId = String(body.rateId || '').trim();
    if (!rateId) return c.json({ success: false, error: 'Choose a rate from a quote first.' }, 400);

    const kind = body.kind === 'return' ? 'return' : 'outbound';
    const orderId = String(body.orderId || '').trim();
    const returnId = String(body.returnId || '').trim();

    const transaction = await shippo('/transactions/', {
      rate: rateId,
      label_file_type: 'PDF_4x6',
      async: false,
    });

    if (transaction.status !== 'SUCCESS') {
      const messages = (transaction.messages || []).map((m: any) => m.text).join('; ');
      return c.json({ success: false, error: messages || 'Shippo could not create the label.' }, 502);
    }

    const now = new Date().toISOString();
    const label = {
      id: `LBL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      kind,
      orderId: orderId || null,
      returnId: returnId || null,
      tracking: transaction.tracking_number || null,
      trackingUrl: transaction.tracking_url_provider || null,
      labelUrl: transaction.label_url || null,
      carrier: transaction.rate?.provider || null,
      cost: Number(transaction.rate?.amount || 0) || null,
      createdAt: now,
      createdBy: email,
    };
    await kv.set(`${LABEL_PREFIX}${label.id}`, label);

    // Record the label against whatever it belongs to, so it is findable from
    // the order or the return rather than only in a label list.
    if (orderId) {
      const order = await findOrder(orderId);
      if (order) {
        const key = (await kv.get(`store:order:${orderId}`)) ? `store:order:${orderId}` : `store_order:${orderId}`;
        await kv.set(key, {
          ...order,
          fulfillment_status: kind === 'outbound' ? 'label_printed' : order.fulfillment_status,
          shipping_labels: [...(order.shipping_labels || []), label],
          tracking_number: kind === 'outbound' ? label.tracking : order.tracking_number,
          updated_at: now,
        });
      }
    }
    if (returnId) {
      const raw = await kv.get(`return_request:${returnId}`);
      if (raw) {
        const request = typeof raw === 'string' ? JSON.parse(raw) : raw;
        await kv.set(`return_request:${returnId}`, {
          ...request,
          returnLabel: label,
          updatedAt: now,
          history: [...(request.history || []), { at: now, event: 'return label issued', by: email }],
        });
      }
    }

    return c.json({ success: true, label });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not buy the label.' }, 500);
  }
});

// ── List ─────────────────────────────────────────────────────────────────────
shippingLabelsRouter.get(`${PREFIX}/shipping/labels`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const all = ((await kv.getByPrefix(LABEL_PREFIX)) || []) as any[];
  const labels = all.map((l) => (typeof l === 'string' ? JSON.parse(l) : l)).filter(Boolean);
  labels.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return c.json({
    success: true,
    labels,
    spendTotal: Math.round(labels.reduce((n, l) => n + (Number(l.cost) || 0), 0) * 100) / 100,
  });
});

export default shippingLabelsRouter;
