/**
 * Returns — a self-serve return portal tuned to dropshipping.
 *
 * Modelled on what Redo gives a shopper (look up your order, pick items, choose
 * refund or credit, get an answer immediately) but with economics that suit a
 * catalog shipped from China rather than a warehouse down the road.
 *
 * The central difference is the keep-it threshold. Return postage to a supplier
 * warehouse routinely costs more than a $12 top. Demanding the item back on
 * every claim would spend more on shipping than the refund saves, so below a
 * configurable value the refund is approved without asking for the item. Above
 * it, a person decides.
 *
 * Store credit is offered at a bonus — the shopper gets more back as credit than
 * as cash, which keeps the money in the business and is usually the option they
 * pick. Credit is issued as an ordinary gift card, the same instrument the store
 * already redeems at checkout.
 *
 * Money moves on the account that took it. A store refund settles against the
 * order's own Stripe account, never a default one — refunding store money out of
 * the construction business would silently mix two sets of books.
 */
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

export const returnsRouter = new Hono();

const PREFIX = '/make-server-3eae23a6';
const RETURN_PREFIX = 'return_request:';
const POLICY_KEY = 'returns:policy';
const GIFT_CARD_PREFIX = 'giftcard:';

const auth = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const money = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

interface ReturnPolicy {
  windowDays: number;
  /** At or below this order-line value, refund without requiring the item back. */
  keepItThreshold: number;
  /** Extra percentage given when the shopper takes credit instead of cash. */
  storeCreditBonusPercent: number;
  autoApproveEnabled: boolean;
  requirePhotoForDamage: boolean;
  nonReturnableCategories: string[];
}

const DEFAULT_POLICY: ReturnPolicy = {
  windowDays: 30,
  keepItThreshold: 25,
  storeCreditBonusPercent: 10,
  autoApproveEnabled: true,
  requirePhotoForDamage: true,
  nonReturnableCategories: [],
};

async function getPolicy(): Promise<ReturnPolicy> {
  const raw = await kv.get(POLICY_KEY);
  const stored = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
  return { ...DEFAULT_POLICY, ...(stored || {}) };
}

/** Admin check, matching the pattern used elsewhere in the server. */
async function actor(c: any): Promise<{ email: string | null; admin: boolean }> {
  const header = c.req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) return { email: null, admin: false };
  const { data, error } = await auth.auth.getUser(header.substring(7));
  if (error || !data?.user) return { email: null, admin: false };
  const role = String((data.user.user_metadata as any)?.role || '').toLowerCase();
  return {
    email: data.user.email || null,
    admin: role === 'admin' || role === 'owner' || role === 'super_admin',
  };
}

/** Find a store order by its id. Orders are written under two historical keys. */
async function findOrder(orderId: string): Promise<any | null> {
  const id = String(orderId || '').trim();
  if (!id) return null;
  for (const key of [`store:order:${id}`, `store_order:${id}`]) {
    const raw = await kv.get(key);
    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  return null;
}

function orderEmail(order: any): string {
  return String(order?.customer_email || order?.customer?.email || '').toLowerCase();
}

function orderLines(order: any): any[] {
  return (Array.isArray(order?.items) ? order.items : []).map((it: any, i: number) => ({
    lineId: String(it.id || it.sku || `line-${i}`),
    name: String(it.name || 'Item'),
    sku: String(it.sku || it.id || ''),
    price: money(it.price),
    quantity: Number(it.quantity ?? it.qty ?? 1),
    image: it.image || '',
  }));
}

function daysSince(iso: string): number {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (Date.now() - t) / 86_400_000;
}

// ── Customer-facing lookup ───────────────────────────────────────────────────
// Deliberately unauthenticated: shoppers check out as guests and have no login.
// The order id alone is not enough — the email on the order must match, so
// knowing or guessing an order number reveals nothing.
returnsRouter.post(`${PREFIX}/returns/lookup`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const orderId = String(body.orderId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!orderId || !email) {
      return c.json({ success: false, error: 'Order number and email are both required.' }, 400);
    }

    const order = await findOrder(orderId);
    // Same message whether the order is missing or the email is wrong, so this
    // cannot be used to discover which order numbers exist.
    if (!order || orderEmail(order) !== email) {
      return c.json({ success: false, error: 'No order found with that number and email.' }, 404);
    }

    const policy = await getPolicy();
    const age = daysSince(order.created_at || order.createdAt);
    const withinWindow = age <= policy.windowDays;

    const existing = ((await kv.getByPrefix(RETURN_PREFIX)) || []) as any[];
    const already = existing
      .map((r) => (typeof r === 'string' ? JSON.parse(r) : r))
      .filter((r: any) => r?.orderId === order.id && r.status !== 'denied');

    return c.json({
      success: true,
      order: {
        id: order.id,
        placedAt: order.created_at || order.createdAt,
        total: money(order.amount_total ?? order.total),
        items: orderLines(order),
      },
      eligible: withinWindow && !already.length,
      reason: !withinWindow
        ? `Returns close ${policy.windowDays} days after purchase, and this order is ${Math.floor(age)} days old.`
        : already.length
          ? 'A return has already been started for this order.'
          : null,
      policy: {
        windowDays: policy.windowDays,
        storeCreditBonusPercent: policy.storeCreditBonusPercent,
      },
      existingRequests: already.map((r: any) => ({ id: r.id, status: r.status, createdAt: r.createdAt })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Lookup failed.' }, 500);
  }
});

// ── Submit a return ──────────────────────────────────────────────────────────
returnsRouter.post(`${PREFIX}/returns/request`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const orderId = String(body.orderId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const reason = String(body.reason || '').trim();
    const detail = String(body.detail || '').trim();
    const resolution = body.resolution === 'store_credit' ? 'store_credit' : 'refund';
    const photos: string[] = (Array.isArray(body.photos) ? body.photos : [])
      .filter((u: any) => typeof u === 'string' && u.trim())
      .slice(0, 6);
    const lineIds: string[] = (Array.isArray(body.lineIds) ? body.lineIds : []).map(String);

    if (!orderId || !email) return c.json({ success: false, error: 'Order number and email are required.' }, 400);
    if (!reason) return c.json({ success: false, error: 'Choose a reason for the return.' }, 400);
    if (!lineIds.length) return c.json({ success: false, error: 'Select at least one item.' }, 400);

    const order = await findOrder(orderId);
    if (!order || orderEmail(order) !== email) {
      return c.json({ success: false, error: 'No order found with that number and email.' }, 404);
    }

    const policy = await getPolicy();
    const age = daysSince(order.created_at || order.createdAt);
    if (age > policy.windowDays) {
      return c.json({ success: false, error: `Returns close ${policy.windowDays} days after purchase.` }, 400);
    }

    const damaged = /damag|broken|defect|faulty|wrong/i.test(reason);
    if (damaged && policy.requirePhotoForDamage && !photos.length) {
      return c.json({ success: false, error: 'Please add a photo showing the problem.' }, 400);
    }

    const lines = orderLines(order).filter((l) => lineIds.includes(l.lineId));
    if (!lines.length) return c.json({ success: false, error: 'Those items are not on this order.' }, 400);

    const refundValue = money(lines.reduce((n, l) => n + l.price * l.quantity, 0));
    const creditValue = money(refundValue * (1 + policy.storeCreditBonusPercent / 100));

    // The keep-it decision. Return postage on low-value goods shipped from
    // overseas costs more than the refund, so below the threshold the item is
    // not requested back — which is also the faster answer for the customer.
    const withinKeepIt = refundValue <= policy.keepItThreshold;
    const autoApprove = policy.autoApproveEnabled && withinKeepIt;

    const now = new Date().toISOString();
    const request = {
      id: `RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      orderId: order.id,
      email,
      customerName: order.customer_name || order.customer?.name || '',
      lines,
      reason,
      detail,
      photos,
      resolution,
      refundValue,
      creditValue,
      requiresItemBack: !withinKeepIt,
      status: autoApprove ? 'approved' : 'pending',
      autoApproved: autoApprove,
      stripeAccount: order.stripe_account || order.stripeAccount || 'tbpco_ecommerce',
      paymentIntent: order.stripe_payment_intent || null,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, event: autoApprove ? 'auto-approved' : 'submitted', by: 'customer' }],
    };

    await kv.set(`${RETURN_PREFIX}${request.id}`, request);

    return c.json({
      success: true,
      request: {
        id: request.id,
        status: request.status,
        requiresItemBack: request.requiresItemBack,
        refundValue,
        creditValue,
        resolution,
      },
      message: autoApprove
        ? request.requiresItemBack
          ? 'Approved — post the item back and your refund follows.'
          : 'Approved. Keep the item; your refund is being processed.'
        : 'Submitted. We review returns of this value by hand and will be in touch.',
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not submit the return.' }, 500);
  }
});

// ── Admin: list ──────────────────────────────────────────────────────────────
returnsRouter.get(`${PREFIX}/returns`, async (c) => {
  const { admin } = await actor(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const all = ((await kv.getByPrefix(RETURN_PREFIX)) || []) as any[];
  const rows = all.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)).filter(Boolean);
  rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const status = c.req.query('status');
  return c.json({
    success: true,
    returns: status ? rows.filter((r) => r.status === status) : rows,
    counts: rows.reduce((m: any, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {}),
  });
});

/**
 * Refund on the account that took the money.
 *
 * Never falls back to a default account: a store refund drawn from the
 * construction business would move real money between two sets of books and
 * reconcile to nothing.
 */
async function refundOnAccount(paymentIntent: string, amount: number, account: string) {
  const envName = account === 'tbpco_ecommerce'
    ? 'TBPCO_ECOMMERCE_STRIPE_SECRET_KEY'
    : 'STRIPE_SECRET_KEY_SERVICES';
  const key = (Deno.env.get(envName) || (account === 'tbpco_ecommerce' ? '' : Deno.env.get('STRIPE_SECRET_KEY') || '')).trim();
  if (!key) throw new Error(`Stripe is not configured for the ${account} account (${envName}).`);

  const res = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${key}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      payment_intent: paymentIntent,
      amount: String(Math.round(amount * 100)),
    }).toString(),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Stripe refund failed (${res.status}).`);
  return payload;
}

/** Issue store credit as an ordinary gift card the storefront already accepts. */
async function issueStoreCredit(request: any): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint8Array(16));
  const code = (Array.from(values, (v) => alphabet[v % alphabet.length]).join('').match(/.{1,4}/g) || []).join('-');
  const now = new Date().toISOString();
  await kv.set(`${GIFT_CARD_PREFIX}${code.replace(/-/g, '')}`, {
    code,
    amount: request.creditValue,
    balance: request.creditValue,
    from: 'Store credit',
    to: request.customerName || 'Customer',
    recipientEmail: request.email,
    purchaserEmail: request.email,
    message: `Store credit for return ${request.id}`,
    design: 'classic',
    status: 'active',
    issuedAt: now,
    purchasedAt: now,
    redeemedAmount: 0,
    redemptionHistory: [],
    returnId: request.id,
  });
  return code;
}

// ── Admin: settle ────────────────────────────────────────────────────────────
returnsRouter.post(`${PREFIX}/returns/:id/settle`, async (c) => {
  try {
    const { email, admin } = await actor(c);
    if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);

    const raw = await kv.get(`${RETURN_PREFIX}${c.req.param('id')}`);
    if (!raw) return c.json({ success: false, error: 'Return not found.' }, 404);
    const request = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (request.status === 'settled') {
      return c.json({ success: false, error: 'This return has already been settled.', request }, 409);
    }

    const body = await c.req.json().catch(() => ({} as any));
    const resolution = body.resolution === 'store_credit' || body.resolution === 'refund'
      ? body.resolution
      : request.resolution;

    const now = new Date().toISOString();
    let outcome: any = {};

    if (resolution === 'store_credit') {
      const code = await issueStoreCredit(request);
      outcome = { type: 'store_credit', code, amount: request.creditValue };
    } else {
      if (!request.paymentIntent) {
        // Say so rather than marking it settled — a return recorded as refunded
        // with no money moved is worse than one still open.
        return c.json({
          success: false,
          error: 'This order has no Stripe payment intent recorded, so it cannot be refunded automatically. Refund it in Stripe and settle as store credit, or record it manually.',
        }, 400);
      }
      const refund = await refundOnAccount(request.paymentIntent, request.refundValue, request.stripeAccount);
      outcome = { type: 'refund', stripeRefundId: refund.id, amount: request.refundValue, account: request.stripeAccount };
    }

    request.status = 'settled';
    request.resolution = resolution;
    request.outcome = outcome;
    request.settledAt = now;
    request.settledBy = email;
    request.updatedAt = now;
    request.history = [...(request.history || []), { at: now, event: `settled as ${resolution}`, by: email }];
    await kv.set(`${RETURN_PREFIX}${request.id}`, request);

    return c.json({ success: true, request, outcome });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not settle the return.' }, 500);
  }
});

// ── Admin: deny ──────────────────────────────────────────────────────────────
returnsRouter.post(`${PREFIX}/returns/:id/deny`, async (c) => {
  try {
    const { email, admin } = await actor(c);
    if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const raw = await kv.get(`${RETURN_PREFIX}${c.req.param('id')}`);
    if (!raw) return c.json({ success: false, error: 'Return not found.' }, 404);
    const request = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (request.status === 'settled') {
      return c.json({ success: false, error: 'This return has already been settled.' }, 409);
    }
    const body = await c.req.json().catch(() => ({} as any));
    const now = new Date().toISOString();
    request.status = 'denied';
    request.denyReason = String(body.reason || '').trim() || 'Outside the returns policy.';
    request.updatedAt = now;
    request.history = [...(request.history || []), { at: now, event: 'denied', by: email, note: request.denyReason }];
    await kv.set(`${RETURN_PREFIX}${request.id}`, request);
    return c.json({ success: true, request });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not deny the return.' }, 500);
  }
});

// ── Policy ───────────────────────────────────────────────────────────────────
returnsRouter.get(`${PREFIX}/returns/policy`, async (c) => {
  return c.json({ success: true, policy: await getPolicy() });
});

returnsRouter.put(`${PREFIX}/returns/policy`, async (c) => {
  const { admin } = await actor(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const body = await c.req.json().catch(() => ({} as any));
  const current = await getPolicy();
  const next: ReturnPolicy = {
    windowDays: Math.max(0, Number(body.windowDays ?? current.windowDays)),
    keepItThreshold: Math.max(0, money(body.keepItThreshold ?? current.keepItThreshold)),
    storeCreditBonusPercent: Math.min(100, Math.max(0, Number(body.storeCreditBonusPercent ?? current.storeCreditBonusPercent))),
    autoApproveEnabled: body.autoApproveEnabled ?? current.autoApproveEnabled,
    requirePhotoForDamage: body.requirePhotoForDamage ?? current.requirePhotoForDamage,
    nonReturnableCategories: Array.isArray(body.nonReturnableCategories)
      ? body.nonReturnableCategories.map(String)
      : current.nonReturnableCategories,
  };
  await kv.set(POLICY_KEY, next);
  return c.json({ success: true, policy: next });
});

export default returnsRouter;
