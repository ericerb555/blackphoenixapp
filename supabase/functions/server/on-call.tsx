/**
 * on-call — each portal account's own rota, stored and guarded.
 *
 * The judging lives next door in `onCallConfig.ts`, which is pure and tested.
 * This file does the two things that need a server: deciding who may read or
 * write a record, and saying whether Black Phoenix is the one answering.
 *
 * WHOSE RECORD IT IS
 *
 * The account's own, edited by them. Eric's decision is that each portal
 * account runs its own on-call, with Black Phoenix as the escalation, and with
 * us running it outright only for accounts that have added on-call to their
 * subscription. So the common case here is a landlord editing their own rota,
 * not staff editing it for them — and the isolation has to be real rather than
 * a filter somebody remembers to apply.
 *
 * KEYED BY THE ACCOUNT, NOT BY AUDIENCE AND ACCOUNT
 *
 * `on_call_config:{email}`. The plan said `{audience}:{accountId}`, and this is
 * a deliberate simplification: a grant carries exactly one `portalType`, so an
 * account has exactly one of these, and putting the audience in the key means
 * the day somebody's portal type is corrected their rota silently becomes
 * unreachable while a stale one keeps answering. The audience is stored inside
 * the record instead, where correcting it is an edit rather than an orphan.
 *
 * WHAT IT REFUSES TO DECIDE
 *
 * Whether we answer. That is `runsOurOnCall`, resolved from the subscription
 * actually being paid for, and it is reported here rather than stored — a
 * stored copy is a copy that goes stale the moment somebody cancels.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { runsOurOnCall } from "./addOnAccess.tsx";
import {
  normalizeConfig, emptyConfig, readiness, isOnCallNow, ladderMinutes,
  hoursFor, afterTheRota,
  type OnCallConfig,
} from "./onCallConfig.ts";
import { routeEmergency, goesToExchange, escalateAfterMinutes } from "./onCallRouting.ts";
import { isEmergency, accountForRequest, tradeOf } from "./onCallIntake.ts";

export const onCallRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const ADMIN_ROLES = new Set([
  "owner", "admin", "master_admin", "super_admin", "superadmin", "management",
]);

const KEY = (email: string) => `on_call_config:${String(email).toLowerCase()}`;

/**
 * Who is asking, from the token and nothing else.
 *
 * The audience comes from the grant rather than from `app_metadata`, because
 * the grant is what the subscription wrote and it is the same record every
 * other money question is answered from. Two places deciding which portal
 * somebody belongs to is how they come to disagree.
 */
async function actor(c: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.email) return null;

  const email = String(user.email).toLowerCase();
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");

  let audience = "";
  try {
    const grant = (await kv.get(`feature_grant:${email}`)) as any;
    audience = String(grant?.portalType || "");
  } catch {
    // An audience we could not read is an empty one, not a guessed one.
  }
  return { email, audience, isAdmin: ADMIN_ROLES.has(role) };
}

/** The record, with everything that is derived rather than stored. */
async function describe(config: OnCallConfig) {
  const ours = await runsOurOnCall(config.email);
  return {
    config,
    readiness: readiness(config),
    /**
     * Covering at this moment — reported so a screen can say "on-call is
     * covering now" rather than leaving somebody to work it out from a
     * timezone and a pair of times.
     */
    coveringNow: isOnCallNow(config, null),
    /**
     * Each service answered separately, because they differ.
     *
     * A lockout line that runs all night and a plumbing line on office hours
     * are both correct and only one of them is covering at eleven in the
     * morning. One combined answer would be wrong for whichever it is not.
     */
    services: (config.services || []).map((service) => ({
      id: service.id,
      name: service.name,
      coveringNow: isOnCallNow(config, service),
      ladderMinutes: ladderMinutes(service),
      hoursMode: hoursFor(config, service).mode,
      next: afterTheRota(config, service),
    })),
    /**
     * Whether Black Phoenix answers for this account, and on what basis.
     *
     * Resolved from the subscription every time it is asked. Never stored on
     * the record: a copy of an entitlement is a copy that keeps saying yes
     * after somebody has cancelled.
     */
    weAnswer: ours.held,
    addOnIds: ours.addOnIds,
  };
}

/* ── the account's own record ────────────────────────────────────────────── */

onCallRouter.get(`${PREFIX}/on-call`, async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to see your on-call setup." }, 401);
  try {
    const stored = (await kv.get(KEY(who.email))) as any;
    // An account with nothing saved gets a usable blank rather than a 404 —
    // there is nothing exceptional about not having set this up yet.
    const config = stored
      ? normalizeConfig(stored, { email: who.email, audience: stored.audience || who.audience })
      : emptyConfig(who.email, who.audience);
    return c.json({ success: true, ...(await describe(config)) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not read your on-call setup." }, 500);
  }
});

onCallRouter.put(`${PREFIX}/on-call`, async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in to change your on-call setup." }, 401);
  try {
    const body = await c.req.json().catch(() => ({}));
    /**
     * The account is taken from the token, never from the body.
     *
     * Everything else here is theirs to set, but not whose record it is. Read
     * from the body, anybody signed in could rewrite another account's rota —
     * pointing an emergency at a phone number of their choosing.
     */
    const config = normalizeConfig(body?.config ?? body, {
      email: who.email,
      audience: who.audience,
    });
    config.updatedAt = new Date().toISOString();
    config.updatedBy = who.email;

    await kv.set(KEY(who.email), config);

    const described = await describe(config);
    // Logged when somebody switches on a rota that cannot answer, because that
    // is the state worth knowing about before the night it matters.
    if (config.enabled && !described.readiness.ready) {
      console.log(`[OnCall] ${who.email} saved an enabled rota with problems: ${described.readiness.problems.join(" | ")}`);
    }
    return c.json({ success: true, ...described });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not save your on-call setup." }, 500);
  }
});



/* ── a call, opened when a real emergency arrives ────────────────────────── */

const CALL = (id: string) => `on_call_call:${id}`;
const CALL_INDEX = "on_call_call_index";
/** One work request opens one call. See openCallFor. */
const CALL_FOR_WR = (workRequestId: string) => `on_call_for_wr:${workRequestId}`;

export interface OnCallCall {
  id: string;
  /** The job this belongs to, so the call, the quote and the invoice are one piece of work. */
  jobId: string | null;
  workRequestId: string | null;
  /** The account whose rota answers — not necessarily who reported it. */
  accountEmail: string;
  reportedBy: string;
  trade: string;
  title: string;
  siteAddress: string;
  /** The routing decision, kept whole. */
  plan: any;
  outcome: string;
  status: "open" | "answered" | "closed";
  createdAt: string;
  updatedAt: string;
}


/**
 * Open a call for a work request, once.
 *
 * WHY THE GUARD MATTERS
 *
 * `persistWorkRequest` runs on create AND on every update. Without a guard,
 * adding a note to an urgent request would open a second call, and a third, and
 * each one would page the rota again. The guard is a key of its own rather than
 * a scan, so it stays O(1) and cannot be defeated by an index that has rolled
 * over.
 *
 * IT NEVER THROWS INTO THE CALLER
 *
 * The caller is the path that saves work requests for the entire platform.
 * Every failure here is swallowed and logged: a work request that cannot be
 * saved because the on-call store had a bad moment is a far worse outcome than
 * an emergency that has to be noticed by a person.
 */
export async function openCallFor(record: any): Promise<OnCallCall | null> {
  try {
    if (!isEmergency(record)) return null;

    const workRequestId = String(record?.id || "").trim();
    if (workRequestId) {
      const already = await kv.get(CALL_FOR_WR(workRequestId));
      if (already) return null;
    }

    const accountEmail = accountForRequest(record);
    const trade = tradeOf(record);
    const answer = await planFor(accountEmail, trade);

    const id = `call_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 6)}`;
    const now = new Date().toISOString();
    const call: OnCallCall = {
      id,
      // The job the work request already has. An emergency call, the quote that
      // follows it and the invoice after that are one piece of work.
      jobId: record?.jobId ? String(record.jobId) : null,
      workRequestId: workRequestId || null,
      accountEmail,
      reportedBy: String(record?.client_email || record?.clientEmail || record?.email || "").toLowerCase(),
      trade,
      title: String(record?.title || record?.project_name || "Emergency").slice(0, 200),
      siteAddress: String(record?.address || record?.site_address || record?.siteAddress || "").slice(0, 300),
      plan: answer.plan,
      outcome: answer.plan.outcome,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(CALL(id), call);
    if (workRequestId) await kv.set(CALL_FOR_WR(workRequestId), id);
    const index = ((await kv.get(CALL_INDEX)) as string[]) || [];
    await kv.set(CALL_INDEX, [id, ...index].slice(0, 500));

    /**
     * Said loudly, because nothing rings yet.
     *
     * Until the paging is built this log line is the only thing that turns a
     * routed call into a person knowing about it, and `nobody` is the outcome
     * that must never be discovered later.
     */
    const level = call.outcome === "nobody" ? "[OnCall][NOBODY]" : "[OnCall]";
    console.log(
      `${level} call ${id} · ${accountEmail || "no account"} · ${trade || "no trade"}`
      + ` · job ${call.jobId || "none"} → ${call.outcome}: ${answer.plan.reason}`,
    );
    return call;
  } catch (error: any) {
    console.log(`[OnCall] could not open a call for ${record?.id}: ${error?.message || error}`);
    return null;
  }
}

/**
 * GET /on-call-calls — the calls this account has had, or all of them for staff.
 *
 * Registered above the parameterised on-call routes for the usual reason.
 */
onCallRouter.get(`${PREFIX}/on-call-calls`, async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  try {
    const index = ((await kv.get(CALL_INDEX)) as string[]) || [];
    const rows = ((await Promise.all(index.slice(0, 200).map((id) => kv.get(CALL(id))))) as any[])
      .filter(Boolean);

    /**
     * An account sees its own calls and nobody else's.
     *
     * A call carries a site address, a reporter's email and what went wrong in
     * somebody's building. Staff see everything because they are the escalation
     * and cannot answer a call they cannot read.
     */
    const visible = who.isAdmin
      ? rows
      : rows.filter((r: any) => String(r?.accountEmail || "").toLowerCase() === who.email);

    return c.json({ success: true, calls: visible, scopedTo: who.isAdmin ? null : who.email });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not read the call log." }, 500);
  }
});

/* ── routing one emergency ───────────────────────────────────────────────── */

/**
 * The plan for one emergency against one account, resolved server-side.
 *
 * Exported so the intake path can ask the same question without an HTTP round
 * trip to itself. Everything that decides the answer is read here — the record,
 * and whether the subscription has paid us to answer — so no caller can supply
 * either and get a different result.
 */
export async function planFor(
  email: string,
  trade: string,
  at: Date = new Date(),
  hours?: number,
) {
  const address = String(email || "").trim().toLowerCase();
  const stored = address ? ((await kv.get(KEY(address))) as any) : null;
  const config = stored
    ? normalizeConfig(stored, { email: address, audience: stored.audience || "" })
    : emptyConfig(address, "");

  /**
   * Whether we answer comes from the subscription, every time.
   *
   * Not from the record and not from the request. An account that cancelled
   * last month still has a rota stored; what it no longer has is us.
   */
  const ours = await runsOurOnCall(address);
  const plan = routeEmergency(config, { trade, at, weAnswer: ours.held, hours });

  return {
    plan,
    /** Convenience for the caller, resolved here so the rules live in one place. */
    exchange: goesToExchange(plan),
    escalateAfterMinutes: escalateAfterMinutes(plan),
    /** Whether the account has a record at all, which changes what to say to them. */
    configured: Boolean(stored),
  };
}

/**
 * POST /on-call/route — what would happen to an emergency right now.
 *
 * Registered before `/on-call/:email` as a matter of habit. It is a POST and
 * that one is a GET, so nothing is shadowed today — but a GET added to this
 * path later would be swallowed by the parameterised route without a word,
 * which is how `/jobs/orphans` was lost.
 *
 * IT DECIDES AND REPORTS. IT DOES NOT RING ANYBODY.
 *
 * No call is placed, no bid request is posted, nothing is written. That is
 * deliberate for now: the paging and the exchange post are separate pieces, and
 * a routing decision somebody can look at before it acts is worth having on its
 * own. The plan says what WOULD happen, in words, and the caller decides.
 */
onCallRouter.post(`${PREFIX}/on-call/route`, async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  try {
    const body = await c.req.json().catch(() => ({}));
    const trade = String(body?.trade || "").trim();

    /**
     * Whose account. Their own unless they are staff.
     *
     * A router that took the account from the body unchecked would let anybody
     * signed in read another account's rota — every name and mobile number on
     * it — by asking what would happen to an imaginary emergency.
     */
    const wanted = String(body?.email || "").trim().toLowerCase() || who.email;
    if (wanted !== who.email && !who.isAdmin) {
      return c.json({ success: false, error: "That is not your on-call setup." }, 403);
    }

    const at = body?.at ? new Date(String(body.at)) : new Date();
    const when = Number.isFinite(at.getTime()) ? at : new Date();

    const answer = await planFor(wanted, trade, when, Number(body?.hours) || undefined);
    console.log(`[OnCall] ${wanted} / ${trade || "no trade"} → ${answer.plan.outcome}: ${answer.plan.reason}`);
    return c.json({ success: true, ...answer });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not work out where this would go." }, 500);
  }
});

/* ── and what staff can see ──────────────────────────────────────────────── */

/**
 * Registered ABOVE `/on-call/:email`, deliberately.
 *
 * Hono takes the first route that matches and says nothing about the second,
 * so a literal path underneath a parameterised one that covers it is dead
 * code. `/jobs/orphans` was lost to exactly this.
 */
onCallRouter.get(`${PREFIX}/on-call-configs`, async (c) => {
  const who = await actor(c);
  if (!who?.isAdmin) return c.json({ success: false, error: "Company access is required for this." }, 403);
  try {
    const rows = ((await kv.getByPrefix("on_call_config:")) as any[] || []).filter(Boolean);
    // A summary rather than every rota in full: this answers "who has on-call
    // set up, and does it work", and a list of everybody's phone numbers is not
    // needed to answer it.
    const configs = rows.map((r) => {
      const config = normalizeConfig(r, { email: r.email, audience: r.audience });
      const state = readiness(config);
      return {
        email: config.email,
        audience: config.audience,
        enabled: config.enabled,
        contacts: config.contacts.length,
        // Named rather than counted: "three services" says nothing useful,
        // whereas "Plumbing, Lockouts" is how somebody recognises the account.
        services: config.services.filter(s => s.enabled !== false).map(s => s.name),
        ready: state.ready,
        problems: state.problems,
        updatedAt: config.updatedAt || null,
      };
    }).sort((a, b) => String(a.email).localeCompare(String(b.email)));
    return c.json({ success: true, configs });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not list on-call setups." }, 500);
  }
});

onCallRouter.get(`${PREFIX}/on-call/:email`, async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in first." }, 401);
  const wanted = String(c.req.param("email") || "").toLowerCase();
  // Their own record reached by the long road is fine; anybody else's is staff
  // only. Fail closed: an actor we cannot place as staff is not staff.
  if (wanted !== who.email && !who.isAdmin) {
    return c.json({ success: false, error: "That is not your on-call setup." }, 403);
  }
  try {
    const stored = (await kv.get(KEY(wanted))) as any;
    if (!stored) return c.json({ success: false, error: "That account has no on-call setup." }, 404);
    const config = normalizeConfig(stored, { email: wanted, audience: stored.audience || "" });
    return c.json({ success: true, ...(await describe(config)) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not read that on-call setup." }, 500);
  }
});

export { KEY as onCallKey };
export { isEmergency, accountForRequest, tradeOf } from "./onCallIntake.ts";
