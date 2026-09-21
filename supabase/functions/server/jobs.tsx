/**
 * jobs — the record every document hangs from.
 *
 * The rules live in `jobIdentity.ts`, which is pure and unit-tested. This file
 * is the storage half: it reads and writes `job:{id}`, and gives every creation
 * path one function to call so no route has to decide for itself which job a
 * document belongs to. Routes deciding for themselves is exactly how the
 * pairwise, optional, caller-supplied linking came about.
 *
 * WHO CAN SEE A JOB
 *
 * Staff only, for now. A job aggregates a customer's requests, quotes,
 * invoices and our purchase orders — and the purchase orders carry what we pay
 * vendors, which is the company's margin and the one thing a customer must
 * never be shown (`customers-never-see-our-discounted-pricing`). A
 * customer-facing view of their own job is a reasonable thing to want later; it
 * needs its own route that assembles only their documents, not a loosened
 * check on this one.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import {
  chooseJob, openJob, jobIdOf,
  type Job, type JobSeed, type JobClaim, type JobDoorway,
} from "./jobIdentity.ts";

export const jobsRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const JOB = (id: string) => `job:${id}`;
const STAFF_ROLES = new Set(["owner", "admin", "master_admin", "management", "employee", "staff"]);

async function jobActor(c: any): Promise<{ email: string; isStaff: boolean } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  // app_metadata only — a role from user_metadata is one the account sets for
  // itself, and this decides who sees what we pay our vendors.
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  return { email: String(user.email || "").toLowerCase(), isStaff: STAFF_ROLES.has(role) };
}

/* ── the one function every creation path calls ───────────────────────────── */

export interface ResolveResult {
  jobId: string;
  job: Job | null;
  /** True when this call opened a new job rather than joining one. */
  opened: boolean;
}

/**
 * Which job this document belongs to, opening one if it belongs to none.
 *
 * Call it from wherever a work request, quote, invoice, purchase order or
 * design project is created, pass whatever ids the caller supplied, and store
 * the `jobId` that comes back.
 *
 * It never infers. A document joins an existing job only when the caller names
 * one or names a parent that already has one — see the note at the top of
 * `jobIdentity.ts` for why, and the test called THE RULE for the assertion.
 *
 * A named job that does not exist is treated as no job at all rather than as an
 * error: the document still gets written, attached to a job of its own, which
 * is better than refusing to save somebody's work over a stale identifier.
 */
export async function resolveJobFor(
  claim: JobClaim,
  seed: JobSeed,
  actorEmail: string,
): Promise<ResolveResult> {
  const choice = chooseJob(claim);

  if (choice.use !== "new") {
    const existing = (await kv.get(JOB(choice.jobId))) as Job | null;
    if (existing) return { jobId: existing.id, job: existing, opened: false };
    console.log(`[Jobs] ${choice.use} job ${choice.jobId} does not exist — opening a new one instead`);
  }

  const id = `job_${crypto.randomUUID()}`;
  const job = openJob({ ...seed, createdBy: seed.createdBy || actorEmail }, new Date(), id);
  await kv.set(JOB(id), job);
  console.log(`[Jobs] opened ${job.jobNumber} from ${job.openedFrom} ${job.openedFromId || "(none)"}`);
  return { jobId: id, job, opened: true };
}

/**
 * The job id carried by a parent document, looked up by its key.
 *
 * Saves each creation path writing the same two lines: fetch the parent, read
 * whichever spelling of `jobId` it happens to use. Returns '' when there is no
 * parent or it carries no job, which `chooseJob` treats as "open a new one".
 */
export async function parentJobId(key: string): Promise<string> {
  if (!key) return "";
  try {
    return jobIdOf(await kv.get(key));
  } catch {
    return "";
  }
}

/* ── reading ──────────────────────────────────────────────────────────────── */

/** Every stored collection that can carry a jobId, and what to call it. */
const DOCUMENTS: Array<{ prefix: string; as: string }> = [
  { prefix: "wr:", as: "workRequests" },
  { prefix: "quote:", as: "quotes" },
  { prefix: "invoice:", as: "invoices" },
  { prefix: "purchase_order:", as: "purchaseOrders" },
  { prefix: "design_project:", as: "designProjects" },
];

jobsRouter.get("/make-server-3eae23a6/jobs", async (c) => {
  const who = await jobActor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isStaff) return c.json({ success: false, error: "Staff access is required." }, 403);

  const rows = ((await kv.getByPrefix("job:")) as Job[] || []).filter(Boolean);
  const q = String(c.req.query("q") || "").trim().toLowerCase();
  const filtered = q
    ? rows.filter((j) =>
      `${j.jobNumber} ${j.customerName} ${j.customerEmail} ${j.siteAddress} ${j.title}`
        .toLowerCase().includes(q))
    : rows;

  filtered.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return c.json({ success: true, count: filtered.length, jobs: filtered.slice(0, 500) });
});

/**
 * One job with everything attached to it.
 *
 * This is the question that could not be asked before: show me the requests,
 * the quotes, the invoices and the purchase orders for this job.
 *
 * Each collection is scanned and filtered on `jobId` rather than the job
 * holding a list of its documents. A stored list would need updating from five
 * creation paths and would be wrong the first time one of them forgot; reading
 * it from the documents themselves cannot drift, because the document is the
 * thing that knows.
 */
jobsRouter.get("/make-server-3eae23a6/jobs/:id", async (c) => {
  const who = await jobActor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isStaff) return c.json({ success: false, error: "Staff access is required." }, 403);

  const id = String(c.req.param("id") || "").trim();
  const job = (await kv.get(JOB(id))) as Job | null;
  if (!job) return c.json({ success: false, error: "No such job." }, 404);

  const documents: Record<string, any[]> = {};
  for (const { prefix, as } of DOCUMENTS) {
    const rows = ((await kv.getByPrefix(prefix)) as any[] || []).filter(Boolean);
    documents[as] = rows.filter((r) => jobIdOf(r) === id);
  }

  return c.json({ success: true, job, documents });
});

/** Open a job by hand, for work that starts with a phone call. */
jobsRouter.post("/make-server-3eae23a6/jobs", async (c) => {
  const who = await jobActor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isStaff) return c.json({ success: false, error: "Staff access is required." }, 403);

  const body = await c.req.json().catch(() => ({}));
  const { job } = await resolveJobFor(
    {},
    {
      customerEmail: body?.customerEmail,
      customerName: body?.customerName,
      siteAddress: body?.siteAddress,
      title: body?.title,
      serviceType: body?.serviceType,
      openedFrom: "manual" as JobDoorway,
      openedFromId: "",
      createdBy: who.email,
    },
    who.email,
  );

  return c.json({ success: true, job }, 201);
});

/** Correct a job's details. Never its id or its number. */
jobsRouter.patch("/make-server-3eae23a6/jobs/:id", async (c) => {
  const who = await jobActor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isStaff) return c.json({ success: false, error: "Staff access is required." }, 403);

  const id = String(c.req.param("id") || "").trim();
  const job = (await kv.get(JOB(id))) as Job | null;
  if (!job) return c.json({ success: false, error: "No such job." }, 404);

  const body = await c.req.json().catch(() => ({}));
  const text = (v: unknown, fallback: string, max: number) =>
    v === undefined ? fallback : String(v ?? "").trim().slice(0, max);

  const updated: Job = {
    ...job,
    customerName: text(body?.customerName, job.customerName, 180),
    customerEmail: text(body?.customerEmail, job.customerEmail, 320).toLowerCase(),
    siteAddress: text(body?.siteAddress, job.siteAddress, 400),
    title: text(body?.title, job.title, 240),
    serviceType: text(body?.serviceType, job.serviceType, 120),
    // id and jobNumber are deliberately not writable. Documents point at the id
    // and people quote the number; changing either turns a paper trail into a
    // puzzle.
    id: job.id,
    jobNumber: job.jobNumber,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(JOB(id), updated);
  return c.json({ success: true, job: updated });
});

export default jobsRouter;
