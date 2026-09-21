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
// Stricter than STAFF_ROLES on purpose: the back-fill writes to every
// document collection at once, so it is not a thing an employee should do.
const ADMIN_ROLES = new Set(["owner", "admin", "master_admin", "management"]);

async function jobActor(c: any): Promise<{ email: string; isStaff: boolean; isAdmin: boolean } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  // app_metadata only — a role from user_metadata is one the account sets for
  // itself, and this decides who sees what we pay our vendors.
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  return {
    email: String(user.email || "").toLowerCase(),
    isStaff: STAFF_ROLES.has(role),
    isAdmin: ADMIN_ROLES.has(role),
  };
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

/**
 * Give a document its job, unless it already has one.
 *
 * The shape every creation path uses. Two things about it matter.
 *
 * It NEVER re-stamps. Several of these routes are create-or-update — POST
 * /quotes takes the id from the request body, so posting an existing quote
 * back is an edit — and a document that already belongs to a job must keep it.
 * Re-resolving on every save would move a quote to a new job the first time
 * somebody edited it without passing the parent again, quietly detaching it
 * from the invoice raised against it.
 *
 * It inherits only from the parent the caller names. There is no lookup by
 * customer or address anywhere in this chain — see THE RULE in
 * tests/jobIdentity.test.ts for why that is load-bearing.
 */
export async function ensureJobId(
  record: any,
  opts: {
    /** A job named outright, and the parent whose job to inherit. */
    claim?: JobClaim;
    /**
     * Key of the parent document, read for its jobId. Several may be given,
     * most specific first — the first one that actually carries a job wins.
     *
     * A purchase order is the case that needs it: raised from the pipeline it
     * may have a quote behind it, or only the work request, depending on how
     * far the job has got. Trying the quote and then the work request is the
     * difference between the order joining the job and opening its own.
     */
    parentKey?: string | string[];
    seed: JobSeed;
    actorEmail?: string;
  },
): Promise<string> {
  const already = jobIdOf(record);
  if (already) return already;

  let inherited = String(opts.claim?.parentJobId || '').trim();
  if (!inherited && opts.parentKey) {
    const keys = Array.isArray(opts.parentKey) ? opts.parentKey : [opts.parentKey];
    for (const key of keys) {
      inherited = await parentJobId(key);
      if (inherited) break;
    }
    /**
     * Naming a parent and getting nothing back is a different fact from
     * naming no parent at all, and it is the one worth hearing about.
     *
     * It means a link exists in the caller and does not resolve — a stale id,
     * a record deleted, or an id of the wrong kind, which is how a purchase
     * order came to be sent a work request id in the `quoteId` field. Opening
     * a job is still the right outcome, but silently is not: the document
     * would look attached while standing alone.
     */
    if (!inherited && keys.length) {
      console.log(`[Jobs] parent(s) named but none resolved: ${keys.join(', ')} — opening a new job instead`);
    }
  }

  const { jobId } = await resolveJobFor(
    { jobId: opts.claim?.jobId, parentJobId: inherited },
    opts.seed,
    String(opts.actorEmail || '').toLowerCase(),
  );
  return jobId;
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

/*
 * NOTE ON ORDER: every literal /jobs/... path must be registered BEFORE the
 * parameterised /jobs/:id below. Hono takes the first route that matches, so
 * a literal registered after it is unreachable — /jobs/orphans would resolve
 * as a job with the id "orphans" and answer 404.
 */
/**
 * What is not on a job.
 *
 * J6 of `tasks/one-job-identity.md`: the point is that an unattached document
 * should say so rather than sit there silently. Every creation path now stamps
 * a job, but not every path goes through those routes — a subscription invoice
 * raised from a plan proposal has no job because it is not job work, and
 * anything written before this existed has none because there was nothing to
 * carry.
 *
 * So rather than assert that orphans cannot happen, this counts them. A number
 * that should be going down and is not is the signal worth having.
 */
jobsRouter.get("/make-server-3eae23a6/jobs/orphans", async (c) => {
  const who = await jobActor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!who.isStaff) return c.json({ success: false, error: "Staff access is required." }, 403);

  const report: any[] = [];
  let total = 0;

  for (const { prefix, as } of DOCUMENTS) {
    const rows = ((await kv.getByPrefix(prefix)) as any[] || []).filter(Boolean);
    const orphaned = rows.filter((r) => !jobIdOf(r));
    total += orphaned.length;
    report.push({
      collection: as,
      records: rows.length,
      onAJob: rows.length - orphaned.length,
      unattached: orphaned.length,
      // Enough to find them, not enough to be a data dump.
      examples: orphaned.slice(0, 5).map((r) => ({
        id: r.id,
        createdAt: r.createdAt || r.created_at || null,
      })),
    });
  }

  return c.json({
    success: true,
    unattached: total,
    report,
    note: total === 0
      ? "Every document is on a job."
      : "These carry no job. Most will be records written before jobs existed — "
        + "run POST /jobs/backfill to see what following their links would fix.",
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

/* ── the back-fill ────────────────────────────────────────────────────────
 *
 * J4 of `tasks/one-job-identity.md`. Every document written before jobs
 * existed carries no `jobId`, so `GET /jobs` shows only work started since.
 * This walks what is already stored and gives each chain a job.
 *
 * IT FOLLOWS LINKS AND NOTHING ELSE
 *
 * The same rule the live code follows, applied to history: an invoice joins
 * the job of the quote it names, a quote joins the job of the work request it
 * names, and a document naming nothing gets a job of its own. Two old records
 * are never grouped because they share a customer or an address — that is
 * Eric's rule, and it matters more here than anywhere, because a back-fill
 * touches thousands of records at once and a merge it got wrong would be
 * invisible afterwards.
 *
 * SO A DOCUMENT WITH NO LINK BECOMES ITS OWN JOB
 *
 * Which can mean a lot of jobs. That is the honest outcome of the rule rather
 * than a flaw: those documents genuinely have nothing tying them to anything,
 * and inventing a connection would be worse than recording that they stand
 * alone. The dry run says how many before anything is written.
 *
 * IT IS IDEMPOTENT AND IT NEVER OVERWRITES
 *
 * A record that already carries a `jobId` is left exactly as it is and its
 * job is used for its children. Running it twice does nothing the second time.
 */

/** In the order they must be processed: parents before children. */
const BACKFILL_PASSES: Array<{
  prefix: string;
  as: string;
  doorway: JobDoorway;
  /** Keys of the possible parents, most specific first. */
  parents: (r: any) => string[];
  seed: (r: any) => JobSeed;
  /**
   * Where this record actually lives.
   *
   * Not every collection keys on the id alone. A design project is stored at
   * `design_project:{ownerKey}:{id}` so that one customer cannot read
   * another's, and rebuilding its key as prefix + id would have written a NEW
   * record at a key nobody reads instead of updating the real one — silently
   * doubling the collection. Returning an empty string means the key cannot
   * be derived, and the record is reported rather than guessed at.
   */
  keyOf: (r: any) => string;
}> = [
  {
    prefix: "wr:",
    keyOf: (r) => (r?.id ? `wr:${r.id}` : ""),
    as: "workRequests",
    doorway: "work_request",
    parents: () => [],
    seed: (r) => ({
      customerEmail: r.client_email || r.clientEmail || r.email,
      customerName: r.client_name || r.clientName || r.customer_name,
      siteAddress: r.address || r.site_address || r.siteAddress || r.location,
      title: r.title || r.project_name || r.projectName,
      serviceType: r.serviceType || r.project_type || r.service_type,
      openedFrom: "work_request",
      openedFromId: r.id,
      createdBy: r.createdBy || r.client_email || r.clientEmail,
    }),
  },
  {
    prefix: "quote:",
    keyOf: (r) => (r?.id ? `quote:${r.id}` : ""),
    as: "quotes",
    doorway: "quote",
    parents: (r) => {
      const wr = String(r.workRequestId || r.work_request_id || r.wrId || "").trim();
      return wr ? [`wr:${wr}`] : [];
    },
    seed: (r) => ({
      customerEmail: r.clientEmail || r.customerEmail || r.client_email,
      customerName: r.clientName || r.customerName || r.customer_name,
      siteAddress: r.siteAddress || r.address || r.location,
      title: r.title || r.projectName || r.serviceType,
      serviceType: r.serviceType || r.project_type,
      openedFrom: "quote",
      openedFromId: r.id,
      createdBy: r.createdBy,
    }),
  },
  {
    prefix: "invoice:",
    keyOf: (r) => (r?.id ? `invoice:${r.id}` : ""),
    as: "invoices",
    doorway: "invoice",
    parents: (r) => {
      const q = String(r.quoteId || r.quote_id || "").trim();
      const wr = String(r.workRequestId || r.work_request_id || "").trim();
      return [q ? `quote:${q}` : "", wr ? `wr:${wr}` : ""].filter(Boolean);
    },
    seed: (r) => ({
      customerEmail: r.customerEmail || r.customer_email || r.clientEmail,
      customerName: r.customerName || r.customer_name,
      siteAddress: r.siteAddress || r.site_address || r.address,
      title: r.description || r.title || r.invoice_number,
      openedFrom: "invoice",
      openedFromId: r.id,
      createdBy: r.createdBy,
    }),
  },
  {
    prefix: "purchase_order:",
    keyOf: (r) => (r?.id ? `purchase_order:${r.id}` : ""),
    as: "purchaseOrders",
    doorway: "purchase_order",
    parents: (r) => {
      const q = String(r.sourceQuoteId || r.quoteId || "").trim();
      const wr = String(r.workRequestId || "").trim();
      return [q ? `quote:${q}` : "", wr ? `wr:${wr}` : ""].filter(Boolean);
    },
    seed: (r) => ({
      siteAddress: r.siteAddress,
      title: r.projectName || r.poNumber,
      openedFrom: "purchase_order",
      openedFromId: r.id,
      createdBy: r.raisedBy,
    }),
  },
  {
    prefix: "design_project:",
    // Three parts, not two — see the note on keyOf.
    keyOf: (r) => (r?.ownerKey && r?.id ? `design_project:${r.ownerKey}:${r.id}` : ""),
    as: "designProjects",
    doorway: "design_project",
    parents: (r) => {
      const wr = String(r.workRequestId || r.work_request_id || "").trim();
      return wr ? [`wr:${wr}`] : [];
    },
    seed: (r) => ({
      customerEmail: r.ownerEmail || r.customerEmail,
      siteAddress: r.siteAddress || r.address,
      title: r.name || r.title,
      openedFrom: "design_project",
      openedFromId: r.id,
      createdBy: r.createdBy || r.ownerEmail,
    }),
  },
];

jobsRouter.post("/make-server-3eae23a6/jobs/backfill", async (c) => {
  const who = await jobActor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);
  // Deliberately stricter than the rest of this router. A back-fill writes to
  // every document collection at once; staff can read jobs, only an owner or
  // administrator may rewrite history.
  if (!who.isAdmin) {
    return c.json({ success: false, error: "Administrator access is required." }, 403);
  }

  const dryRun = c.req.query("dry") !== "0";

  /**
   * The job each record key resolves to, built up as the passes run.
   *
   * A child looks its parent up in here rather than re-reading storage, which
   * is what makes a chain work in one go: the quote is resolved in pass two and
   * the invoice that names it finds the answer in pass three.
   */
  const jobOf = new Map<string, string>();
  const created: any[] = [];
  const summary: any[] = [];
  const unkeyed: any[] = [];

  for (const pass of BACKFILL_PASSES) {
    const rows = ((await kv.getByPrefix(pass.prefix)) as any[] || []).filter(Boolean);
    let alreadyHad = 0;
    let inherited = 0;
    let opened = 0;
    const samples: any[] = [];

    for (const row of rows) {
      const key = pass.keyOf(row);
      if (!key) {
        // Cannot work out where it lives, so it is not touched. Reported
        // rather than written to a guessed key.
        unkeyed.push({ collection: pass.as, id: row?.id || null });
        continue;
      }

      const existing = jobIdOf(row);
      if (existing) {
        jobOf.set(key, existing);
        alreadyHad++;
        continue;
      }

      // Its parent's job, if it named a parent that has one.
      let jobId = "";
      for (const parentKey of pass.parents(row)) {
        jobId = jobOf.get(parentKey) || (await parentJobId(parentKey));
        if (jobId) break;
      }
      if (jobId) inherited++;

      if (!jobId) {
        // Nothing to join, so it stands alone. The id is generated either way
        // so a dry run reports the true number of jobs an import would open.
        const id = `job_${crypto.randomUUID()}`;
        const job = openJob({ ...pass.seed(row), createdBy: pass.seed(row).createdBy || who.email }, new Date(), id);
        if (!dryRun) await kv.set(JOB(id), job);
        created.push({ jobNumber: job.jobNumber, from: pass.as, documentId: row.id });
        jobId = id;
        opened++;
      }

      jobOf.set(key, jobId);
      if (!dryRun) await kv.set(key, { ...row, jobId });
      if (samples.length < 5) samples.push({ id: row.id, jobId });
    }

    summary.push({
      collection: pass.as,
      records: rows.length,
      alreadyHad,
      inheritedFromParent: inherited,
      openedOwnJob: opened,
      samples,
    });
  }

  const totalOpened = created.length;
  console.log(
    `[Jobs] backfill${dryRun ? " (dry run)" : ""} by ${who.email}: `
    + summary.map((s) => `${s.collection} ${s.records}`).join(", ")
    + ` — ${totalOpened} job(s) opened`,
  );

  return c.json({
    success: true,
    dryRun,
    summary,
    jobsOpened: totalOpened,
    // Records whose storage key could not be derived. Left untouched.
    unkeyed,
    sampleJobs: created.slice(0, 20),
    note: dryRun
      ? "Nothing was written. This is what a back-fill would do. Repeat with ?dry=0 to apply it."
      : "Applied. Documents that already had a job were left alone, so running this again changes nothing.",
  });
});

});
export default jobsRouter;
