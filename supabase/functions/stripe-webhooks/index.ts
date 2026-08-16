/**
 * Stripe webhook receiver — a separate edge function, deliberately.
 *
 * The main API function runs with verify_jwt = true, so every request needs a
 * Supabase JWT. Stripe cannot send one: webhooks carry no Authorization header,
 * and the ?apikey= query form does not satisfy the gateway either. A webhook
 * route inside that function is therefore unreachable by Stripe — it answers
 * correctly when called by hand and never fires in production, which is the
 * worst kind of broken because nothing errors.
 *
 * This function runs with verify_jwt = false and authenticates the only way a
 * webhook can: by verifying Stripe's own signature. An unsigned or wrongly
 * signed request is rejected before anything is read.
 *
 * Two businesses settle into two Stripe accounts, so there are two signing
 * secrets and either may verify a delivery:
 *   STRIPE_WEBHOOK_SECRET_SERVICES  — Black Phoenix Builds (plans, invoices)
 *   STRIPE_WEBHOOK_SECRET_STORE     — TBPCO (dropshipping, digital products)
 *   STRIPE_WEBHOOK_SECRET           — legacy single-account fallback
 */
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const KV_TABLE = 'kv_store_57095a78';

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function kvGet(key: string): Promise<any> {
  const { data } = await db.from(KV_TABLE).select('value').eq('key', key).maybeSingle();
  if (!data?.value) return null;
  return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
}

async function kvSet(key: string, value: any) {
  await db.from(KV_TABLE).upsert({ key, value }, { onConflict: 'key' });
}

async function kvByPrefix(prefix: string): Promise<any[]> {
  const { data } = await db.from(KV_TABLE).select('value').like('key', `${prefix}%`);
  return (data || []).map((r: any) => (typeof r.value === 'string' ? JSON.parse(r.value) : r.value));
}

/**
 * Verify Stripe's signature header.
 *
 * Signature is HMAC-SHA256 over "<timestamp>.<raw body>". The raw body must be
 * the exact bytes Stripe sent — parsing and re-serialising changes them and the
 * signature will never match.
 *
 * The timestamp is checked against a five-minute window so a captured delivery
 * cannot be replayed indefinitely, and the comparison is constant-time so a
 * wrong signature leaks nothing about how wrong it was.
 */
async function verifySignature(raw: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      header.split(',').map((p) => p.trim().split('=') as [string, string]),
    );
    const timestamp = parts['t'];
    const expected = parts['v1'];
    if (!timestamp || !expected) return false;

    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${raw}`));
    const actual = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');

    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Store orders are fulfilled by the main API function, which already knows how
 * to reconcile a checkout, re-verify the session against Stripe, and create the
 * order. That logic is not copied here — a second implementation of order
 * fulfilment would drift from the first, and the failure mode is charging
 * someone and not shipping.
 *
 * Instead this forwards the verified event to the existing route, using the
 * service-role key as the Supabase JWT that Stripe itself cannot supply. The
 * signature has already been checked at this point, and the downstream route
 * re-verifies the session with Stripe regardless, so the forward adds a hop
 * rather than a weaker check.
 */
async function forwardToStore(raw: string): Promise<Record<string, unknown>> {
  const base = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !serviceKey) return { forwarded: false, error: 'Server keys unavailable.' };

  const res = await fetch(`${base}/functions/v1/make-server-3eae23a6/store/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    // Forward the original bytes. The downstream route reads the event as
    // Stripe sent it.
    body: raw,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface as a failure so the outer handler returns 500 and Stripe retries.
    throw new Error(`store/webhook returned ${res.status}: ${JSON.stringify(payload).slice(0, 200)}`);
  }
  return { forwarded: true, store: payload };
}

async function handlePlanEvent(event: any): Promise<Record<string, unknown>> {
  const object = event?.data?.object || {};
  const planId = String(object?.metadata?.plan_id || '');
  if (!planId) return { ignored: 'no plan_id metadata' };

  const plan = await kvGet(`plan:${planId}`);
  if (!plan?.maintenance) return { ignored: 'plan not found' };

  const now = new Date().toISOString();
  const kind = String(object?.metadata?.kind || '');

  switch (event?.type) {
    case 'checkout.session.completed': {
      if (kind === 'maintenance_invoice') {
        const invoices = await kvByPrefix(`plan_invoice:${planId}:`);
        const match = invoices.find((i: any) => i.checkoutSessionId === object.id);
        if (match && match.status !== 'paid') {
          await kvSet(`plan_invoice:${planId}:${match.id}`, { ...match, status: 'paid', paidAt: now });
          return { invoicePaid: match.id };
        }
        return { ignored: 'invoice already settled or not found' };
      }
      plan.billing = {
        ...(plan.billing || {}),
        status: 'active',
        subscriptionId: object.subscription || plan.billing?.subscriptionId || null,
        customerId: object.customer || plan.billing?.customerId || null,
        activatedAt: plan.billing?.activatedAt || now,
        updatedAt: now,
      };
      await kvSet(`plan:${planId}`, plan);
      return { planActivated: planId };
    }
    case 'invoice.payment_succeeded': {
      const periodEnd = object?.lines?.data?.[0]?.period?.end;
      plan.billing = {
        ...(plan.billing || {}),
        status: 'active',
        lastPaymentAt: now,
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : plan.billing?.currentPeriodEnd || null,
        updatedAt: now,
      };
      await kvSet(`plan:${planId}`, plan);
      return { renewed: planId };
    }
    case 'invoice.payment_failed': {
      // Stripe retries a failed payment over several days. Cancelling on the
      // first miss loses customers whose card simply expired, so this only
      // flags the plan for a person to look at.
      plan.billing = { ...(plan.billing || {}), status: 'past_due', lastFailureAt: now, updatedAt: now };
      await kvSet(`plan:${planId}`, plan);
      return { pastDue: planId };
    }
    case 'customer.subscription.deleted': {
      plan.billing = { ...(plan.billing || {}), status: 'cancelled', cancelledAt: now, updatedAt: now };
      await kvSet(`plan:${planId}`, plan);
      return { cancelled: planId };
    }
    default:
      return { ignored: event?.type || 'unknown' };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  const header = req.headers.get('stripe-signature') || '';

  const secrets = [
    Deno.env.get('STRIPE_WEBHOOK_SECRET_SERVICES'),
    Deno.env.get('STRIPE_WEBHOOK_SECRET_STORE'),
    Deno.env.get('STRIPE_WEBHOOK_SECRET'),
  ].filter((s): s is string => !!s && s.trim().length > 0);

  if (!secrets.length) {
    // Refuse rather than trust an unverified body. Accepting unsigned events
    // would let anyone who finds this URL mark any plan as paid.
    console.log('[stripe-webhooks] no signing secret configured; rejecting.');
    return new Response(
      JSON.stringify({ received: false, error: 'Webhook signing secret is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let verified = false;
  for (const secret of secrets) {
    if (await verifySignature(raw, header, secret)) { verified = true; break; }
  }
  if (!verified) {
    console.log('[stripe-webhooks] signature verification failed.');
    return new Response(JSON.stringify({ received: false, error: 'Invalid signature.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ received: false, error: 'Invalid payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Route on the metadata each flow stamps onto its own checkout, rather than
    // on event type — a checkout.session.completed can belong to either
    // business, and guessing from the type alone would send store orders into
    // the plan handler.
    const object = event?.data?.object || {};
    const isStore = !!object?.metadata?.store_checkout_id;

    const result = isStore ? await forwardToStore(raw) : await handlePlanEvent(event);
    return new Response(JSON.stringify({ received: true, type: event?.type, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    // Return 500 so Stripe retries — swallowing the error would silently drop
    // a real payment event.
    console.log('[stripe-webhooks] handler error:', error?.message || error);
    return new Response(JSON.stringify({ received: false, error: 'Handler failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
