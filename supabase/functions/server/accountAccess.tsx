/**
 * accountAccess — reading an account's standing, enforcing it, and switching
 * an account off by hand.
 *
 * The decision itself lives in `accountStanding.ts`, which is pure and tested.
 * This file does the reading, the refusing and the writing, and nothing else.
 *
 * WHAT A FROZEN ACCOUNT CAN STILL DO
 *
 * Pay, see what it owes, read its own records, reach us, and call out an
 * emergency. Everything else is refused with 402.
 *
 * The emergency carve-out is a deliberate decision, not an oversight. This
 * platform carries habitability work: a burst pipe at two in the morning does
 * not wait for an invoice to clear, and refusing it over an unpaid bill is both
 * a liability and the one thing a customer would never forgive. The debt is
 * shown loudly instead.
 *
 * WHY WRITES STOP BUT READS DO NOT
 *
 * Seeing what you owe set against what you received is how somebody decides to
 * pay. A blank wall is how they decide to leave.
 */
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { trustedRole } from './trustedRole.ts';
import { accountStanding, mayDeactivate, type Standing } from './accountStanding.ts';

const PREFIX = '/make-server-3eae23a6';
const accountAccessRouter = new Hono();

export const DEACTIVATION_KEY = (email: string) => `account_deactivation:${email.toLowerCase()}`;

/**
 * Read an account's standing.
 *
 * Two KV reads, both by exact key. This runs on the hot path, so it never
 * scans a prefix — the maintenance-plan webhook stamps its arrears onto the
 * grant for exactly this reason, rather than making every request hunt for a
 * plan.
 */
export async function standingFor(user: any): Promise<Standing> {
  const email = String(user?.email || '').toLowerCase();
  if (!email) {
    // Unidentified callers are the auth gate's problem, not this one.
    return accountStanding({ role: '' });
  }
  const [grant, deactivation] = await Promise.all([
    kv.get(`feature_grant:${email}`).catch(() => null),
    kv.get(DEACTIVATION_KEY(email)).catch(() => null),
  ]);
  return accountStanding({
    grant: grant as any,
    deactivation: deactivation as any,
    role: trustedRole(user),
  });
}

/**
 * Paths a frozen account may still reach.
 *
 * Deliberately chosen rather than discovered by what broke. Each line is here
 * for a reason somebody could defend to a customer.
 */
const FROZEN_ALLOWED_PREFIXES = [
  // Paying, and seeing what is owed.
  '/payments', '/payment-gateways', '/payment-wallets',
  '/subscriptions', '/plan-checkout', '/plan-tiers', '/plan-builder',
  '/plan-add-on', '/plan-addons', '/plan-quote-request',
  '/maintenance-plans', '/invoices', '/my-plan', '/stripe-prices',
  // Knowing why, and reaching a person about it.
  '/account-standing', '/intake/my-access', '/messaging',
  // Emergencies. See the note at the top of this file.
  '/on-call', '/emergency',
];

/** GET-only paths a frozen account may read: its own records, not new ones. */
const FROZEN_READ_PREFIXES = [
  '/work-requests', '/quotes', '/contracts', '/documents', '/properties',
  '/portal-settings', '/notifications', '/organizations',
];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));

/**
 * Is this request allowed while frozen?
 *
 * Exported so it can be reasoned about and, if it ever matters, tested.
 */
export function frozenMayReach(path: string, method: string): boolean {
  const p = path.startsWith(PREFIX) ? (path.slice(PREFIX.length) || '/') : path;
  if (method === 'OPTIONS') return true;
  if (startsWithAny(p, FROZEN_ALLOWED_PREFIXES)) return true;
  if ((method === 'GET' || method === 'HEAD') && startsWithAny(p, FROZEN_READ_PREFIXES)) return true;
  return false;
}

/* ── routes ──────────────────────────────────────────────────────────────── */

accountAccessRouter.get(`${PREFIX}/account-standing`, async (c) => {
  const user = c.get('actor');
  if (!user?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
  const standing = await standingFor(user);
  return c.json({ success: true, standing });
});

/**
 * Switch an account off, or back on.
 *
 * Both the actor's authority and the target's role are read from the server's
 * own view of those accounts. Nothing about who may do what comes from the
 * request body — that is the whole point of the check.
 */
async function resolveTargetRole(email: string, admin: any): Promise<string> {
  try {
    const { data } = await admin.auth.admin.listUsers();
    const match = (data?.users || []).find(
      (u: any) => String(u.email || '').toLowerCase() === email.toLowerCase(),
    );
    return match ? trustedRole(match) : '';
  } catch {
    return '';
  }
}

export function registerAccountAccessRoutes(app: any, adminClient: any) {
  app.route('/', accountAccessRouter);

  app.post(`${PREFIX}/accounts/deactivate`, async (c: any) => {
    const actor = c.get('actor');
    if (!actor?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const targetEmail = String(body?.email || '').trim().toLowerCase();
    const reason = String(body?.reason || '').trim().slice(0, 500);
    if (!targetEmail) return c.json({ success: false, error: 'Which account?' }, 400);

    const targetRole = await resolveTargetRole(targetEmail, adminClient);
    const verdict = mayDeactivate(
      { role: trustedRole(actor), email: String(actor.email) },
      { role: targetRole, email: targetEmail },
    );
    if (!verdict.allowed) return c.json({ success: false, error: verdict.reason }, 403);

    const record = {
      active: true,
      reason,
      by: String(actor.email).toLowerCase(),
      byRole: trustedRole(actor),
      targetRole,
      at: new Date().toISOString(),
    };
    await kv.set(DEACTIVATION_KEY(targetEmail), record);
    console.log(`[accounts] ${actor.email} deactivated ${targetEmail} (${targetRole || 'unknown role'})`);
    return c.json({ success: true, deactivation: record });
  });

  app.post(`${PREFIX}/accounts/reactivate`, async (c: any) => {
    const actor = c.get('actor');
    if (!actor?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const targetEmail = String(body?.email || '').trim().toLowerCase();
    if (!targetEmail) return c.json({ success: false, error: 'Which account?' }, 400);

    /**
     * Reactivating takes the same authority as deactivating.
     *
     * Otherwise an administrator could undo an owner's decision about an
     * account they were never allowed to touch in the first place.
     */
    const targetRole = await resolveTargetRole(targetEmail, adminClient);
    const verdict = mayDeactivate(
      { role: trustedRole(actor), email: String(actor.email) },
      { role: targetRole, email: targetEmail },
    );
    if (!verdict.allowed) return c.json({ success: false, error: verdict.reason }, 403);

    const prior = (await kv.get(DEACTIVATION_KEY(targetEmail))) as any;
    await kv.set(DEACTIVATION_KEY(targetEmail), {
      ...(prior || {}),
      active: false,
      reactivatedBy: String(actor.email).toLowerCase(),
      reactivatedAt: new Date().toISOString(),
    });
    console.log(`[accounts] ${actor.email} reactivated ${targetEmail}`);
    return c.json({ success: true });
  });

  app.get(`${PREFIX}/accounts/deactivated`, async (c: any) => {
    const actor = c.get('actor');
    const role = trustedRole(actor);
    const mayList = ['owner', 'platform_owner', 'business_owner', 'master_admin', 'admin', 'super_admin', 'superadmin', 'management'].includes(role);
    if (!mayList) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
    const rows = ((await kv.getByPrefix('account_deactivation:')) as any[] || []).filter((r) => r?.active);
    return c.json({ success: true, accounts: rows });
  });
}

export default accountAccessRouter;
