/**
 * Stripe Multi-Account Integration Module (Option B)
 *
 * Model: each company is its OWN, fully independent Stripe account with its OWN
 * secret key and OWN bank/payouts (managed in that account's own Stripe
 * dashboard). This is NOT Stripe Connect — there is no platform account and no
 * destination transfers. At charge time we look up the order's company by CODE,
 * pick that company's secret key, and create the charge DIRECTLY on that
 * standalone account. Every charge is stamped with the company code in Stripe
 * metadata and in our KV records for reconciliation.
 *
 *   Black Phoenix Builds (BPB-8544) → STRIPE_SECRET_KEY   (live now)
 *   Second company (added later)    → STRIPE_SECRET_KEY_2
 *
 * The browser never sees any secret key — ALL Stripe API calls happen here.
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyRecord {
  id: string;
  name: string;
  code: string;                    // e.g. "BPB-8544" — stamped on every txn
  email?: string;
  stripeKeyEnv: string;            // env var holding THIS account's secret key
  chargesEnabled: boolean;         // mirrored from Stripe (this account)
  payoutsEnabled: boolean;         // mirrored from Stripe (this account)
  detailsSubmitted: boolean;       // account fully activated
  bankLast4?: string;              // external payout bank (last 4)
  createdAt: string;
  updatedAt: string;
}

interface PaymentRecord {
  id: string;
  companyId: string;
  companyCode: string;
  amount: number;                  // in major units (dollars)
  currency: string;
  description: string;
  status: string;                  // stripe status or "recorded"
  stripePaymentIntentId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

// ─── Stripe clients (one key per company) ─────────────────────────────────────
//
// Option B: each company is its own standalone Stripe account. A company record
// names the env var holding its key (`stripeKeyEnv`). Charges are created
// directly on that account's key — no Connect / destination transfers.

const DEFAULT_KEY_ENV = "STRIPE_SECRET_KEY";

// Every secret-key env var this app knows about. Used for the config/health
// report so the UI can show which accounts are wired without leaking values.
const KNOWN_KEY_ENVS = ["STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY_2"];

function makeStripe(key: string): Stripe {
  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    // Use fetch under Deno rather than Node http.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// Client for a specific secret-key env var (e.g. "STRIPE_SECRET_KEY_2").
function getStripeByEnv(envName?: string): Stripe | null {
  const key = Deno.env.get(envName || DEFAULT_KEY_ENV);
  if (!key) return null;
  return makeStripe(key);
}

// Client for a given company, using the key its record points at.
function getStripeForCompany(company: CompanyRecord): Stripe | null {
  return getStripeByEnv(company.stripeKeyEnv || DEFAULT_KEY_ENV);
}

// Which known key envs actually have a value configured (names only, no values).
function configuredKeyEnvs(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const name of KNOWN_KEY_ENVS) out[name] = !!Deno.env.get(name);
  return out;
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

// Pull the latest status from THIS company's own Stripe account (the account
// its secret key belongs to). `accounts.retrieve()` with no id returns the
// account associated with the API key — perfect for a standalone account.
async function refreshAccountStatus(company: CompanyRecord): Promise<CompanyRecord> {
  const stripe = getStripeForCompany(company);
  if (!stripe) {
    // Key not configured yet — mark as not ready, don't error.
    company.chargesEnabled = false;
    company.payoutsEnabled = false;
    company.detailsSubmitted = false;
    return company;
  }
  try {
    const acct = await stripe.accounts.retrieve();
    company.chargesEnabled = !!acct.charges_enabled;
    company.payoutsEnabled = !!acct.payouts_enabled;
    company.detailsSubmitted = !!acct.details_submitted;
    const bank = (acct as any).external_accounts?.data?.find(
      (e: any) => e.object === "bank_account",
    );
    if (bank?.last4) company.bankLast4 = bank.last4;
    company.updatedAt = new Date().toISOString();
    await saveCompany(company);
  } catch (err) {
    console.log(`[Stripe] refreshAccountStatus failed for ${company.code}: ${err}`);
  }
  return company;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health / config check for this module.
stripeConnectRouter.get(`${PREFIX}/stripe/health`, (c) => {
  const accounts = configuredKeyEnvs();
  return c.json({
    ok: true,
    module: "stripe-multi-account",
    // Backwards-compatible flag: true if the primary key is set.
    stripeConfigured: !!accounts[DEFAULT_KEY_ENV],
    accounts, // e.g. { STRIPE_SECRET_KEY: true, STRIPE_SECRET_KEY_2: false }
  });
});

// List all companies (with fresh status from each company's own account).
stripeConnectRouter.get(`${PREFIX}/stripe/companies`, async (c) => {
  try {
    let companies = await getCompanies();
    companies = await Promise.all(companies.map((co) => refreshAccountStatus(co)));
    return c.json({ success: true, companies });
  } catch (err) {
    console.log(`[Stripe] list companies error: ${err}`);
    return c.json({ success: false, error: `Failed to list companies: ${err}` }, 500);
  }
});

// Create or update a company (name + code + email + which key it uses).
stripeConnectRouter.post(`${PREFIX}/stripe/companies`, async (c) => {
  try {
    const body = await c.req.json();
    const { companyId, name, code, email, stripeKeyEnv } = body || {};
    if (!name || !code) {
      return c.json({ success: false, error: "name and code are required" }, 400);
    }
    // Only allow known key envs; default to the primary.
    const keyEnv = KNOWN_KEY_ENVS.includes(stripeKeyEnv) ? stripeKeyEnv : DEFAULT_KEY_ENV;

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
      company = { ...found, name, code, email, stripeKeyEnv: keyEnv, updatedAt: new Date().toISOString() };
    } else {
      const now = new Date().toISOString();
      company = {
        id: id("co"),
        name,
        code,
        email,
        stripeKeyEnv: keyEnv,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        createdAt: now,
        updatedAt: now,
      };
    }
    await saveCompany(company);
    const fresh = await refreshAccountStatus(company);
    return c.json({ success: true, company: fresh });
  } catch (err) {
    console.log(`[Stripe] save company error: ${err}`);
    return c.json({ success: false, error: `Failed to save company: ${err}` }, 500);
  }
});

// Verify a company's account: confirm its secret key works and pull live
// status (charges/payouts enabled, bank on file). For standalone accounts the
// bank itself is added in that account's OWN Stripe dashboard, so there is no
// hosted onboarding link to open here.
stripeConnectRouter.post(`${PREFIX}/stripe/companies/:id/connect`, async (c) => {
  try {
    const company = await getCompany(c.req.param("id"));
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    const stripe = getStripeForCompany(company);
    if (!stripe) {
      return c.json({
        success: false,
        error: `${company.stripeKeyEnv} is not configured on the server yet — add that account's secret key, then verify.`,
      }, 400);
    }
    const fresh = await refreshAccountStatus(company);
    return c.json({
      success: true,
      company: fresh,
      // Manage the bank inside this account's own Stripe dashboard.
      dashboardUrl: "https://dashboard.stripe.com/settings/payouts",
    });
  } catch (err) {
    console.log(`[Stripe] verify account error: ${err}`);
    return c.json({ success: false, error: `Failed to verify account: ${err}` }, 500);
  }
});

// Refresh a single company's status from its own account.
stripeConnectRouter.get(`${PREFIX}/stripe/companies/:id/status`, async (c) => {
  try {
    const company = await getCompany(c.req.param("id"));
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    const fresh = await refreshAccountStatus(company);
    return c.json({ success: true, company: fresh });
  } catch (err) {
    return c.json({ success: false, error: `Failed to get status: ${err}` }, 500);
  }
});

// Create a charge DIRECTLY on the company's own standalone account, tagged with
// the company code. Accepts a Stripe paymentMethod id (from the client) OR, in
// test mode, defaults to Stripe's test payment method "pm_card_visa".
stripeConnectRouter.post(`${PREFIX}/stripe/charge`, async (c) => {
  try {
    const body = await c.req.json();
    const {
      companyId,
      amount,             // in dollars
      currency = "usd",
      description = "Payment",
      paymentMethodId,
      customerEmail,
      metadata = {},
    } = body || {};

    if (!companyId || !amount || amount <= 0) {
      return c.json({ success: false, error: "companyId and a positive amount are required" }, 400);
    }
    const company = await getCompany(companyId);
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    const stripe = getStripeForCompany(company);
    if (!stripe) {
      return c.json({ success: false, error: `${company.name}'s Stripe key (${company.stripeKeyEnv}) is not configured` }, 400);
    }

    const amountCents = Math.round(Number(amount) * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      description,
      payment_method: paymentMethodId || "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      receipt_email: customerEmail || undefined,
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
    console.log(`[Stripe] charge error: ${err}`);
    return c.json({ success: false, error: `Charge failed: ${err}` }, 500);
  }
});

// Create a PaymentIntent for the Stripe Elements checkout on the company's own
// account. Returns a clientSecret the browser confirms with that account's
// publishable key. A pending payment record is stored; call
// /stripe/finalize/:paymentId after confirmation to sync the final status.
stripeConnectRouter.post(`${PREFIX}/stripe/create-payment-intent`, async (c) => {
  try {
    const body = await c.req.json();
    const {
      companyId,
      amount,
      currency = "usd",
      description = "Payment",
      customerEmail,
      metadata = {},
    } = body || {};

    if (!companyId || !amount || amount <= 0) {
      return c.json({ success: false, error: "companyId and a positive amount are required" }, 400);
    }
    const company = await getCompany(companyId);
    if (!company) return c.json({ success: false, error: "Company not found" }, 404);
    const stripe = getStripeForCompany(company);
    if (!stripe) {
      return c.json({ success: false, error: `${company.name}'s Stripe key (${company.stripeKeyEnv}) is not configured` }, 400);
    }

    const amountCents = Math.round(Number(amount) * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      description,
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
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
    console.log(`[Stripe] create-payment-intent error: ${err}`);
    return c.json({ success: false, error: `Could not start checkout: ${err}` }, 500);
  }
});

// Sync a payment's final status from Stripe after the client confirms it.
// Uses the SAME account key that created the intent (the payment's company).
stripeConnectRouter.post(`${PREFIX}/stripe/finalize/:paymentId`, async (c) => {
  try {
    const paymentId = c.req.param("paymentId");
    const record = (await kv.get(`${PAYMENT_PREFIX}:${paymentId}`)) as PaymentRecord | null;
    if (!record) return c.json({ success: false, error: "Payment not found" }, 404);
    const company = await getCompany(record.companyId);
    const stripe = company ? getStripeForCompany(company) : null;
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
        stripeKeyEnv: co.stripeKeyEnv,
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

// Seed the companies if the registry is empty — convenience for first load.
// Black Phoenix Builds is live now on STRIPE_SECRET_KEY. The second company is
// stubbed pointing at STRIPE_SECRET_KEY_2 (activates once that key is added).
// Idempotent.
stripeConnectRouter.post(`${PREFIX}/stripe/seed`, async (c) => {
  try {
    const existing = await getCompanies();
    if (existing.length > 0) {
      const refreshed = await Promise.all(existing.map((co) => refreshAccountStatus(co)));
      return c.json({ success: true, seeded: false, companies: refreshed });
    }
    const now = new Date().toISOString();
    const companies: CompanyRecord[] = [
      {
        id: id("co"),
        name: "Black Phoenix Builds",
        code: "BPB-8544",
        stripeKeyEnv: "STRIPE_SECRET_KEY",
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
        stripeKeyEnv: "STRIPE_SECRET_KEY_2",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const co of companies) await saveCompany(co);
    const refreshed = await Promise.all(companies.map((co) => refreshAccountStatus(co)));
    return c.json({ success: true, seeded: true, companies: refreshed });
  } catch (err) {
    return c.json({ success: false, error: `Seed failed: ${err}` }, 500);
  }
});

export { stripeConnectRouter };
export default stripeConnectRouter;
