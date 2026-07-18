/**
 * Stripe Connect Integration Module
 *
 * Model: ONE platform Stripe account + TWO (or more) CONNECTED accounts
 * (Stripe Connect Express). Each connected account represents a separate
 * company and has its OWN bank account / payout schedule. Every charge is a
 * DESTINATION CHARGE routed to the correct company's connected account, and
 * every transaction is stamped with that company's code (e.g. "BPB-8544") in
 * BOTH Stripe metadata and our KV records so money is fully traceable per
 * company for reconciliation and reporting.
 *
 * The browser must never see the secret key, so ALL Stripe API calls happen
 * here, server-side, using the STRIPE_SECRET_KEY secret.
 *
 * KV keys:
 *   stripe_company:{companyId}   → CompanyRecord (registry of companies)
 *   stripe_company_index         → string[] of companyIds
 *   stripe_payment:{paymentId}   → PaymentRecord
 *   stripe_payment_index         → string[] of paymentIds (newest first)
 */
import { Hono } from "npm:hono";
import Stripe from "npm:stripe@17";
import * as kv from "./kv_store.tsx";

const stripeConnectRouter = new Hono();

const PREFIX = "/make-server-57095a78";
const COMPANY_PREFIX = "stripe_company";
const COMPANY_INDEX = "stripe_company_index";
const PAYMENT_PREFIX = "stripe_payment";
const PAYMENT_INDEX = "stripe_payment_index";

// ─── Stripe client ───────────────────────────────────────────────────────────

function getStripe(): Stripe | null {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    // Use fetch under Deno rather than Node http.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyRecord {
  id: string;
  name: string;
  code: string;                    // e.g. "BPB-8544" — stamped on every txn
  email?: string;
  connectedAccountId?: string;     // Stripe acct_... for this company's bank
  chargesEnabled: boolean;         // mirrored from Stripe
  payoutsEnabled: boolean;         // mirrored from Stripe
  detailsSubmitted: boolean;       // onboarding complete
  bankLast4?: string;              // external payout bank (last 4)
  createdAt: string;
  updatedAt: string;
}

interface PaymentRecord {
  id: string;
  companyId: string;
  companyCode: string;
  connectedAccountId?: string;
  amount: number;                  // in major units (dollars)
  currency: string;
  description: string;
  status: string;                  // stripe status or "recorded"
  stripePaymentIntentId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getCompanies(): Promise<CompanyRecord[]> {
  const ids = (await kv.get(COMPANY_INDEX)) as string[] | null;
  if (!ids || ids.length === 0) return [];
  const rows = await kv.mget(ids.map((c) => `${COMPANY_PREFIX}:${c}`));
  return (rows as (CompanyRecord | null)[]).filter(Boolean) as CompanyRecord[];
}

async function getCompany(companyId: string): Promise<CompanyRecord | null> {
  return (await kv.get(`${COMPANY_PREFIX}:${companyId}`)) as CompanyRecord | null;
}

async function saveCompany(company: CompanyRecord): Promise<void> {
  await kv.set(`${COMPANY_PREFIX}:${company.id}`, company);
  const ids = ((await kv.get(COMPANY_INDEX)) as string[] | null) || [];
  if (!ids.includes(company.id)) {
    ids.push(company.id);
    await kv.set(COMPANY_INDEX, ids);
  }
}

async function savePayment(p: PaymentRecord): Promise<void> {
  await kv.set(`${PAYMENT_PREFIX}:${p.id}`, p);
  const ids = ((await kv.get(PAYMENT_INDEX)) as string[] | null) || [];
  ids.unshift(p.id);
  await kv.set(PAYMENT_INDEX, ids.slice(0, 5000));
}

async function getPayments(): Promise<PaymentRecord[]> {
  const ids = (await kv.get(PAYMENT_INDEX)) as string[] | null;
  if (!ids || ids.length === 0) return [];
  const rows = await kv.mget(ids.map((p) => `${PAYMENT_PREFIX}:${p}`));
  return (rows as (PaymentRecord | null)[]).filter(Boolean) as PaymentRecord[];
}

// Pull the latest account status from Stripe into our record.
async function refreshAccountStatus(
  stripe: Stripe,
  company: CompanyRecord,
): Promise<CompanyRecord> {
  if (!company.connectedAccountId) return company;
  try {
    const acct = await stripe.accounts.retrieve(company.connectedAccountId);
    company.chargesEnabled = !!acct.charges_enabled;
    company.payoutsEnabled = !!acct.payouts_enabled;
    company.detailsSubmitted = !!acct.details_submitted;
    const bank = acct.external_accounts?.data?.find(
      (e: any) => e.object === "bank_account",
    ) as any;
    if (bank?.last4) company.bankLast4 = bank.last4;
    company.updatedAt = new Date().toISOString();
    await saveCompany(company);
  } catch (err) {
    console.log(`[StripeConnect] refreshAccountStatus failed for ${company.id}: ${err}`);
  }
  return company;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health / config check for this module.
stripeConnectRouter.get(`${PREFIX}/stripe/health`, (c) => {
  return c.json({
    ok: true,
    module: "stripe-connect",
    stripeConfigured: !!Deno.env.get("STRIPE_SECRET_KEY"),
  });
});

// List all companies (with fresh Stripe status).
stripeConnectRouter.get(`${PREFIX}/stripe/companies`, async (c) => {
  try {
    const stripe = getStripe();
    let companies = await getCompanies();
    if (stripe) {
      companies = await Promise.all(companies.map((co) => refreshAccountStatus(stripe, co)));
    }
    return c.json({ success: true, companies });
  } catch (err) {
    console.log(`[StripeConnect] list companies error: ${err}`);
    return c.json({ success: false, error: `Failed to list companies: ${err}` }, 500);
  }
});

// Create or update a company (name + code + email).
stripeConnectRouter.post(`${PREFIX}/stripe/companies`, async (c) => {
  try {
    const body = await c.req.json();
    const { companyId, name, code, email } = body || {};
    if (!name || !code) {
      return c.json({ success: false, error: "name and code are required" }, 400);
    }
    // Enforce unique codes across companies.
    const existing = await getCompanies();
    const clash = existing.find(
      (co) => co.code.toUpperCase() === String(code).toUpperCase() && co.id !== companyId,
    );
    if (clash) {
      return c.json({ success: false, error: `Code ${code} is already used by ${clash.name}` }, 409);
    }

    let company: CompanyRecord;
    if (companyId) {
      const found = await getCompany(companyId);
      if (!found) return c.json({ success: false, error: "Company not found" }, 404);
      company = { ...found, name, code, email, updatedAt: new Date().toISOString() };
    } else {
      const now = new Date().toISOString();
      company = {
        id: id("co"),
        name,
        code,
        email,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        createdAt: now,
        updatedAt: now,
      };
    }
    await saveCompany(company);
    return c.json({ success: true, company });
  } catch (err) {
    console.log(`[StripeConnect] save company error: ${err}`);
    return c.json({ success: false, error: `Failed to save company: ${err}` }, 500);
  }
});

// Begin bank onboarding: create an Express connected account (if needed) and
// return a Stripe-hosted onboarding link where the company adds its bank.
stripeConnectRouter.post(`${PREFIX}/stripe/companies/:id/connect`, async (c) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return c.json({ success: false, error: "STRIPE_SECRET_KEY is not configured" }, 400);
    }
    const companyId = c.req.param("id");
    const company = await getCompany(companyId);
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);

    const body = await c.req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || "https://example.com/return";
    const refreshUrl = body.refreshUrl || returnUrl;

    // Create the connected account once, then reuse it.
    if (!company.connectedAccountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        email: company.email || undefined,
        business_profile: { name: company.name },
        metadata: { company_code: company.code, company_id: company.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      company.connectedAccountId = acct.id;
      company.updatedAt = new Date().toISOString();
      await saveCompany(company);
    }

    const link = await stripe.accountLinks.create({
      account: company.connectedAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return c.json({ success: true, url: link.url, connectedAccountId: company.connectedAccountId });
  } catch (err) {
    console.log(`[StripeConnect] connect error: ${err}`);
    return c.json({ success: false, error: `Failed to start onboarding: ${err}` }, 500);
  }
});

// Refresh a single company's status from Stripe.
stripeConnectRouter.get(`${PREFIX}/stripe/companies/:id/status`, async (c) => {
  try {
    const stripe = getStripe();
    const company = await getCompany(c.req.param("id"));
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    const fresh = stripe ? await refreshAccountStatus(stripe, company) : company;
    return c.json({ success: true, company: fresh });
  } catch (err) {
    return c.json({ success: false, error: `Failed to get status: ${err}` }, 500);
  }
});

// Create a destination charge routed to a company's connected account, tagged
// with the company code. Accepts a Stripe paymentMethod id (from the client)
// OR, in test mode, defaults to Stripe's test payment method "pm_card_visa".
stripeConnectRouter.post(`${PREFIX}/stripe/charge`, async (c) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return c.json({ success: false, error: "STRIPE_SECRET_KEY is not configured" }, 400);
    }
    const body = await c.req.json();
    const {
      companyId,
      amount,             // in dollars
      currency = "usd",
      description = "Payment",
      paymentMethodId,
      customerEmail,
      applicationFeeAmount, // optional platform fee in dollars
      metadata = {},
    } = body || {};

    if (!companyId || !amount || amount <= 0) {
      return c.json({ success: false, error: "companyId and a positive amount are required" }, 400);
    }
    const company = await getCompany(companyId);
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    if (!company.connectedAccountId) {
      return c.json({ success: false, error: `${company.name} has not connected a bank account yet` }, 400);
    }

    const amountCents = Math.round(Number(amount) * 100);
    const feeCents = applicationFeeAmount ? Math.round(Number(applicationFeeAmount) * 100) : undefined;

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      description,
      payment_method: paymentMethodId || "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      receipt_email: customerEmail || undefined,
      // Route funds to this company's connected account = its bank.
      transfer_data: { destination: company.connectedAccountId },
      ...(feeCents ? { application_fee_amount: feeCents } : {}),
      // Stamp the company code on the Stripe object itself.
      metadata: {
        ...metadata,
        company_code: company.code,
        company_id: company.id,
        company_name: company.name,
      },
    });

    const record: PaymentRecord = {
      id: id("pay"),
      companyId: company.id,
      companyCode: company.code,
      connectedAccountId: company.connectedAccountId,
      amount: Number(amount),
      currency,
      description,
      status: intent.status,
      stripePaymentIntentId: intent.id,
      customerEmail,
      metadata: { ...metadata, company_code: company.code },
      createdAt: new Date().toISOString(),
    };
    await savePayment(record);

    return c.json({ success: true, payment: record, stripeStatus: intent.status });
  } catch (err) {
    console.log(`[StripeConnect] charge error: ${err}`);
    return c.json({ success: false, error: `Charge failed: ${err}` }, 500);
  }
});

// Create a PaymentIntent for the Stripe Elements checkout. Returns a
// clientSecret the browser confirms with the publishable key. Funds route to
// the company's connected account (destination charge) and the charge is
// tagged with the company code. A pending payment record is stored; call
// /stripe/finalize/:paymentId after confirmation to sync the final status.
stripeConnectRouter.post(`${PREFIX}/stripe/create-payment-intent`, async (c) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return c.json({ success: false, error: "STRIPE_SECRET_KEY is not configured" }, 400);
    }
    const body = await c.req.json();
    const {
      companyId,
      amount,
      currency = "usd",
      description = "Payment",
      customerEmail,
      applicationFeeAmount,
      metadata = {},
    } = body || {};

    if (!companyId || !amount || amount <= 0) {
      return c.json({ success: false, error: "companyId and a positive amount are required" }, 400);
    }
    const company = await getCompany(companyId);
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    if (!company.connectedAccountId) {
      return c.json({ success: false, error: `${company.name} has not connected a bank account yet` }, 400);
    }

    const amountCents = Math.round(Number(amount) * 100);
    const feeCents = applicationFeeAmount ? Math.round(Number(applicationFeeAmount) * 100) : undefined;

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      description,
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      transfer_data: { destination: company.connectedAccountId },
      ...(feeCents ? { application_fee_amount: feeCents } : {}),
      metadata: {
        ...metadata,
        company_code: company.code,
        company_id: company.id,
        company_name: company.name,
      },
    });

    const record: PaymentRecord = {
      id: id("pay"),
      companyId: company.id,
      companyCode: company.code,
      connectedAccountId: company.connectedAccountId,
      amount: Number(amount),
      currency,
      description,
      status: intent.status, // "requires_payment_method" until confirmed
      stripePaymentIntentId: intent.id,
      customerEmail,
      metadata: { ...metadata, company_code: company.code },
      createdAt: new Date().toISOString(),
    };
    await savePayment(record);

    return c.json({
      success: true,
      clientSecret: intent.client_secret,
      paymentId: record.id,
      companyCode: company.code,
    });
  } catch (err) {
    console.log(`[StripeConnect] create-payment-intent error: ${err}`);
    return c.json({ success: false, error: `Could not start checkout: ${err}` }, 500);
  }
});

// Sync a payment's final status from Stripe after the client confirms it.
stripeConnectRouter.post(`${PREFIX}/stripe/finalize/:paymentId`, async (c) => {
  try {
    const stripe = getStripe();
    const paymentId = c.req.param("paymentId");
    const record = (await kv.get(`${PAYMENT_PREFIX}:${paymentId}`)) as PaymentRecord | null;
    if (!record) return c.json({ success: false, error: "Payment not found" }, 404);
    if (stripe && record.stripePaymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(record.stripePaymentIntentId);
      record.status = intent.status;
      await kv.set(`${PAYMENT_PREFIX}:${paymentId}`, record);
    }
    return c.json({ success: true, payment: record });
  } catch (err) {
    return c.json({ success: false, error: `Finalize failed: ${err}` }, 500);
  }
});

// List payments, optionally filtered by company.
stripeConnectRouter.get(`${PREFIX}/stripe/payments`, async (c) => {
  try {
    const companyId = c.req.query("companyId");
    let payments = await getPayments();
    if (companyId) payments = payments.filter((p) => p.companyId === companyId);
    return c.json({ success: true, payments });
  } catch (err) {
    return c.json({ success: false, error: `Failed to list payments: ${err}` }, 500);
  }
});

// Per-company revenue summary (for dashboards).
stripeConnectRouter.get(`${PREFIX}/stripe/revenue`, async (c) => {
  try {
    const companies = await getCompanies();
    const payments = await getPayments();
    const succeeded = payments.filter(
      (p) => p.status === "succeeded" || p.status === "recorded",
    );
    const byCompany = companies.map((co) => {
      const rows = succeeded.filter((p) => p.companyId === co.id);
      return {
        companyId: co.id,
        name: co.name,
        code: co.code,
        connectedAccountId: co.connectedAccountId,
        payoutsEnabled: co.payoutsEnabled,
        bankLast4: co.bankLast4,
        transactionCount: rows.length,
        totalRevenue: rows.reduce((s, p) => s + p.amount, 0),
      };
    });
    const grandTotal = byCompany.reduce((s, r) => s + r.totalRevenue, 0);
    return c.json({ success: true, byCompany, grandTotal });
  } catch (err) {
    return c.json({ success: false, error: `Failed to compute revenue: ${err}` }, 500);
  }
});

// Seed the first company (BPB-8544) if the registry is empty — convenience so
// the UI has something to show on first load. Idempotent.
stripeConnectRouter.post(`${PREFIX}/stripe/seed`, async (c) => {
  try {
    const existing = await getCompanies();
    if (existing.length > 0) {
      return c.json({ success: true, seeded: false, companies: existing });
    }
    const now = new Date().toISOString();
    const companies: CompanyRecord[] = [
      {
        id: id("co"),
        name: "Black Phoenix Builds",
        code: "BPB-8544",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("co"),
        name: "The Black Phoenix Company",
        code: "TBPC-9922",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const co of companies) await saveCompany(co);
    return c.json({ success: true, seeded: true, companies });
  } catch (err) {
    return c.json({ success: false, error: `Seed failed: ${err}` }, 500);
  }
});

export { stripeConnectRouter };
export default stripeConnectRouter;
