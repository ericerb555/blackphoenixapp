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

// ─── AI Property Intelligence subscriptions ─────────────────────────────────
//
// These used to be handled by a second webhook route inside the main server
// function, at /make-server-3eae23a6/investments/stripe-webhook. No Stripe
// endpoint was ever registered against that URL — confirmed on 2026-09-20 by
// listing the account's endpoints — so it had never received an event and
// could not. Meanwhile the events themselves arrived HERE, at the one endpoint
// that is registered, and were dropped because nothing in this file knew what
// `kind: 'property_ai'` meant.
//
// The visible half still worked: the confirm route activates a subscriber when
// they return from Stripe. What was lost is everything that happens when nobody
// is watching — a cancellation or a failed renewal never reached the
// entitlement, so somebody could stop paying and keep access.
//
// Eric's choice of the two fixes: one endpoint serving both billing concerns,
// rather than registering a second one.

const AI_SUB = (email: string) => `property_ai_subscription:${email.toLowerCase()}`;

/**
 * Find the AI subscription a Stripe object belongs to.
 *
 * Subscription id first, customer id only as a fallback. A customer can hold a
 * maintenance plan AND an AI subscription, and matching on customer alone would
 * let a plan's invoice deactivate the wrong thing — the subscription id is the
 * precise identifier and is present on everything that matters.
 */
async function findAiSub(opts: { customer?: string | null; subscription?: string | null }): Promise<any | null> {
  const all = await kvByPrefix('property_ai_subscription:');
  if (opts.subscription) {
    const bySubscription = all.find((s: any) => s?.stripe_subscription === opts.subscription);
    if (bySubscription) return bySubscription;
  }
  if (opts.customer) {
    const byCustomer = all.find((s: any) => s?.stripe_customer === opts.customer);
    if (byCustomer) return byCustomer;
  }
  return null;
}

async function setAiActive(record: any, active: boolean, note: string): Promise<void> {
  if (!record?.email) return;
  await kvSet(AI_SUB(record.email), {
    ...record,
    active,
    status_note: note,
    updated_at: new Date().toISOString(),
  });
  console.log(`[stripe-webhooks/ai-sub] ${record.email} -> active=${active} (${note})`);
}

/**
 * Handle an event if it belongs to an AI subscription, otherwise say so.
 *
 * Returns null when the event is not ours, so the caller can fall through to
 * the store and maintenance-plan handlers exactly as before. Nothing here
 * claims an event it cannot identify.
 */
async function handlePropertyAiEvent(event: any): Promise<Record<string, unknown> | null> {
  const object = event?.data?.object || {};

  switch (event?.type) {
    case 'checkout.session.completed': {
      if (String(object?.metadata?.kind || '') !== 'property_ai') return null;
      const email = String(object?.metadata?.email || object?.customer_email || '').toLowerCase();
      if (!email) return null;
      const existing = await kvGet(AI_SUB(email));
      const now = new Date().toISOString();
      await kvSet(AI_SUB(email), {
        ...(existing || {}),
        email,
        active: true,
        tier: object?.metadata?.tier || existing?.tier || 'professional',
        audience: object?.metadata?.audience || existing?.audience || 'landlord',
        stripe_customer: object?.customer || existing?.stripe_customer || null,
        stripe_subscription: object?.subscription || existing?.stripe_subscription || null,
        stripe_session: object?.id,
        updated_at: now,
        started_at: existing?.started_at || now,
      });
      console.log(`[stripe-webhooks/ai-sub] activated via checkout.session.completed for ${email}`);
      return { aiSubscriptionActivated: email };
    }

    // On a subscription event the object IS the subscription, so its id is the
    // one to match. On an invoice the subscription is a field.
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const record = await findAiSub({ customer: object?.customer, subscription: object?.id });
      if (!record) return null;
      const active = event.type === 'customer.subscription.updated'
        && (object?.status === 'active' || object?.status === 'trialing');
      await setAiActive(record, active, `${event.type}:${object?.status || 'deleted'}`);
      return { aiSubscription: record.email, active };
    }

    case 'invoice.payment_failed': {
      const record = await findAiSub({ customer: object?.customer, subscription: object?.subscription });
      if (!record) return null;
      await setAiActive(record, false, 'invoice.payment_failed');
      return { aiSubscription: record.email, active: false };
    }

    case 'invoice.payment_succeeded': {
      const record = await findAiSub({ customer: object?.customer, subscription: object?.subscription });
      if (!record) return null;
      if (!record.active) await setAiActive(record, true, 'invoice.payment_succeeded');
      return { aiSubscription: record.email, active: true };
    }

    default:
      return null;
  }
}

/**
 * Portal plan subscriptions — the half that actually grants access.
 *
 * The provisioning route writes `feature_grant:{email}` with a trial window and
 * its own comment says "then requires a plan". This is what turns a paid Stripe
 * subscription into that grant, and what takes it away again when the
 * subscription stops.
 *
 * FIRST REFUSAL, LIKE THE HANDLER ABOVE IT
 *
 * Returns null for anything it cannot positively identify as its own, so a
 * store order, a maintenance plan or a Property AI subscription falls through
 * untouched. Ours are identified by `bp_tier_id` in metadata, which the
 * checkout sets on BOTH the session and the subscription — Stripe does not copy
 * session metadata onto the subscription, and without it on the subscription
 * the renewal and cancellation events arrive unidentifiable.
 *
 * WHAT IT WRITES, AND WHAT IT DELIBERATELY DOES NOT
 *
 * It sets `tierId` and `stripeSubscriptionId` on the grant, which is what
 * `resolveEntitlement` looks for to report a paying subscription. It leaves
 * `trialStart` and `trialEnd` exactly as they were: the trial is a historical
 * fact about the account and overwriting it would lose the record of whether
 * somebody ever had one, which decides whether they may have another.
 *
 * On cancellation it clears the subscription fields and nothing else. It does
 * NOT delete the grant or set the level to free by hand — `resolveEntitlement`
 * already resolves a grant with no subscription and a spent trial to free, and
 * two places deciding what "no longer paying" means is how they come to
 * disagree.
 */
async function handlePortalPlanEvent(event: any): Promise<Record<string, unknown> | null> {
  const object = event?.data?.object || {};
  const meta = object?.metadata || {};
  const tierId = String(meta.bp_tier_id || '').trim();
  if (!tierId) return null;

  const email = String(meta.bp_email || object?.customer_email || '').trim().toLowerCase();
  if (!email) {
    console.log('[stripe-webhooks/plan] tier metadata with no email — cannot place the grant');
    return { portalPlan: 'no email on the event' };
  }

  const audience = String(meta.bp_audience || '').trim();
  const now = new Date().toISOString();
  const key = `feature_grant:${email}`;
  const grant = (await kvGet(key)) || {};

  switch (event?.type) {
    case 'checkout.session.completed': {
      // `mode` guards against a one-off payment carrying the same metadata.
      if (object?.mode && object.mode !== 'subscription') return null;
      const subscriptionId = String(object?.subscription || '').trim();
      if (!subscriptionId) {
        console.log(`[stripe-webhooks/plan] ${email} completed checkout with no subscription id`);
        return { portalPlan: email, granted: false, reason: 'no subscription on the session' };
      }
      await kvSet(key, {
        ...grant,
        email,
        // Keep whichever portal the grant already belonged to. The audience
        // only fills it in when provisioning never did.
        portalType: grant.portalType || audience || undefined,
        status: 'active',
        tierId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: object?.customer || grant.stripeCustomerId || null,
        subscribedAt: grant.subscribedAt || now,
        updatedAt: now,
      });
      console.log(`[stripe-webhooks/plan] ${email} subscribed to ${audience || '?'}/${tierId}`);
      return { portalPlan: email, tierId, granted: true };
    }

    case 'customer.subscription.updated': {
      /**
       * Stripe's own view of whether this is paying.
       *
       * `trialing` counts as active: a Stripe-side trial is a subscription that
       * exists and will bill. `past_due` deliberately does not — an unpaid
       * renewal should stop access, and Stripe moves it back to `active` the
       * moment payment succeeds, which fires this event again.
       */
      const live = object?.status === 'active' || object?.status === 'trialing';
      await kvSet(key, {
        ...grant,
        email,
        status: 'active',
        tierId: live ? tierId : undefined,
        stripeSubscriptionId: live ? String(object?.id || '') : undefined,
        lastSubscriptionStatus: String(object?.status || ''),
        updatedAt: now,
      });
      console.log(`[stripe-webhooks/plan] ${email} subscription ${object?.status} — access ${live ? 'kept' : 'dropped'}`);
      return { portalPlan: email, tierId, active: live, status: object?.status };
    }

    case 'customer.subscription.deleted': {
      await kvSet(key, {
        ...grant,
        email,
        status: 'active',
        // Cleared, not overwritten with a level. resolveEntitlement decides
        // what no-subscription means, and it is the only thing that decides it.
        tierId: undefined,
        stripeSubscriptionId: undefined,
        lastSubscriptionStatus: 'deleted',
        cancelledAt: now,
        updatedAt: now,
      });
      console.log(`[stripe-webhooks/plan] ${email} subscription cancelled — back to their trial or the free floor`);
      return { portalPlan: email, active: false, cancelled: true };
    }

    default:
      return null;
  }
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
    // Test mode. Registering a test-mode endpoint against this same URL and
    // storing its signing secret here means billing can be exercised without
    // touching live — see the livemode guard below, which is what makes that
    // safe rather than merely possible.
    Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST'),
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

  /**
   * A verified TEST-mode event is acknowledged and then goes no further.
   *
   * This is the whole point of accepting a test signing secret. Stripe stamps
   * every event with `livemode`, and a test event carries fabricated data —
   * invented subscription ids, payments that never happened. Letting one
   * through the handlers below would let a dashboard click mark a real plan
   * paid or revoke a real subscriber's access. "Testing" that can corrupt live
   * records is not testing.
   *
   * Returning 200 matters: Stripe treats a non-2xx as a failed delivery and
   * retries with backoff, so refusing would leave the dashboard showing errors
   * against an endpoint that is behaving exactly as intended. The response says
   * plainly what happened, so a test delivery still confirms the two things
   * worth confirming — that the endpoint is reachable and that the signature
   * verified.
   *
   * Exercising the handlers themselves against test data belongs in a separate
   * environment with its own database, not in the one serving customers.
   */
  if (event?.livemode === false) {
    console.log(`[stripe-webhooks] test-mode ${event?.type} received and verified; not applied to live data.`);
    return new Response(JSON.stringify({
      received: true,
      testMode: true,
      type: event?.type,
      applied: false,
      note: 'Test-mode event verified but deliberately not applied to live records.',
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Route on the metadata each flow stamps onto its own checkout, rather than
    // on event type — a checkout.session.completed can belong to either
    // business, and guessing from the type alone would send store orders into
    // the plan handler.
    const object = event?.data?.object || {};
    const isStore = !!object?.metadata?.store_checkout_id;

    // AI subscriptions get first refusal, and refuse politely: the handler
    // returns null for anything it cannot positively identify as its own, so a
    // store order or a maintenance plan falls through untouched.
    const aiResult = await handlePropertyAiEvent(event);
    if (aiResult) {
      return new Response(JSON.stringify({ received: true, type: event?.type, ...aiResult }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Portal plan tiers get their turn next, same contract: null unless the
    // event carries our bp_tier_id metadata.
    const planTierResult = await handlePortalPlanEvent(event);
    if (planTierResult) {
      return new Response(JSON.stringify({ received: true, type: event?.type, ...planTierResult }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
