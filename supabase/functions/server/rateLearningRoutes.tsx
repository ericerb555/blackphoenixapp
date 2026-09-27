/**
 * The learning loop: finished jobs in, corrected production rates out.
 *
 * WHAT THESE ROUTES DO
 *
 * Every job that has been invoiced and paid is measured — hours actually booked
 * against hours quoted — grouped by trade, and where a trade is consistently
 * wrong the rates used to quote it are moved toward what the crews really
 * achieve. Rates nobody chose are corrected automatically. Rates somebody set
 * themselves are never touched; those are offered with their evidence.
 *
 * WHY THE CATALOGUE IS READ FROM THE SERVER AND NOT FROM THE REQUEST
 *
 * These figures multiply straight into a customer's price. A browser that could
 * post its own catalogue could claim a rate is higher than it is and have the
 * correction computed from a number it invented, or mark a rate as somebody's
 * own to stop it ever being corrected. So the catalogue is published once by an
 * administrator into the server's own store, and every learning pass reads from
 * there. Nothing about which rates are protected is ever taken from a caller.
 *
 * THREE STORES, AND WHY THEY ARE NOT ONE
 *
 *   labor_tasks:catalogue   the book figures, published by an administrator
 *   labor_tasks:global      the edits somebody made, written by the editor
 *   labor_tasks:measured    what this loop has corrected, written only here
 *
 * They are separate because the editor deliberately saves only the tasks marked
 * as somebody's own — so a later catalogue improvement still reaches an account
 * that has edited part of it. A measured rate written into that same store would
 * be dropped by the next save from the editor, and every automatic correction
 * would quietly vanish. Keeping them apart also makes each correction
 * reversible: delete the measured record and the rate falls back.
 */
import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { readWorkRequests } from "./workRequestStore.ts";
import { jobOutcome, varianceByTask } from "./jobOutcome.ts";
import {
  learnRates, revertMeasured, resolveCatalogue,
  type CatalogueTask, type MeasuredRate,
} from "./rateLearning.ts";
import { tradeFactorsFrom } from "./measuredHours.ts";

export const rateLearningRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

const CATALOGUE_KEY = "labor_tasks:catalogue";
const EDITED_KEY = "labor_tasks:global";
const MEASURED_KEY = "labor_tasks:measured";
/**
 * What the quoting engine reads.
 *
 * Kept as its own record so a quote does not have to measure every finished
 * job in the company to price one line. The pass writes it; quoting reads it.
 */
const FACTORS_KEY = "labor_tasks:trade_factors";

/** Administrator only. These figures decide what customers are charged. */
function staffOnly(c: any): { email: string } | null {
  const actor = c.get("actor");
  if (!actor?.email) return null;
  if (!c.get("admin")) return null;
  return { email: String(actor.email) };
}

/**
 * The catalogue as the server knows it, with each task's source decided here.
 *
 * A task is somebody's own if and only if it appears in the editor's store.
 * That is the server's own record of what a person chose, so it cannot be
 * claimed by a caller in either direction.
 */
async function serverCatalogue(): Promise<CatalogueTask[]> {
  const published = (await kv.get(CATALOGUE_KEY)) as any;
  const edited = (await kv.get(EDITED_KEY)) as any;

  const editedById = new Map<string, any>();
  for (const t of (edited?.tasks || [])) {
    if (t?.id) editedById.set(String(t.id), t);
  }

  const out: CatalogueTask[] = [];
  const seen = new Set<string>();

  for (const t of (published?.tasks || [])) {
    const id = String(t?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const mine = editedById.get(id);
    out.push({
      id,
      tradeId: String(mine?.tradeId ?? t?.tradeId ?? ""),
      name: String(mine?.name ?? t?.name ?? id),
      hoursPerUnit: Number(mine?.hoursPerUnit ?? t?.hoursPerUnit) || 0,
      source: mine ? "yours" : "seed",
    });
  }

  // Anything somebody added that was never in the published catalogue.
  for (const [id, t] of editedById) {
    if (seen.has(id)) continue;
    out.push({
      id,
      tradeId: String(t?.tradeId || ""),
      name: String(t?.name || id),
      hoursPerUnit: Number(t?.hoursPerUnit) || 0,
      source: "yours",
    });
  }

  return out;
}

async function readMeasured(): Promise<MeasuredRate[]> {
  const stored = (await kv.get(MEASURED_KEY)) as any;
  return Array.isArray(stored?.rates) ? stored.rates : [];
}

/**
 * Measure every finished job, and group the result by trade.
 *
 * A job counts only once it has been invoiced AND that invoice is paid. Work
 * that has not been paid for is not a finished outcome — it is work in
 * progress, and averaging it in would move a rate on a job that might still
 * change.
 */
async function varianceFromFinishedJobs() {
  const [requests, invoices, payments, timeEntries, employees, purchaseOrders] = await Promise.all([
    readWorkRequests(),
    kv.getByPrefix("invoice:"),
    kv.getByPrefix("payment:"),
    kv.getByPrefix("time_entry_history:"),
    kv.getByPrefix("time_employee:"),
    kv.getByPrefix("purchase_order:"),
  ]);

  const payRateByEmployee: Record<string, number> = {};
  for (const e of ((employees as any[]) || [])) {
    if (e?.id) payRateByEmployee[String(e.id)] = Number(e.payRate) || 0;
  }

  const paidPayments = ((payments as any[]) || []).filter((p: any) =>
    ["paid", "completed"].includes(String(p?.status || "").toLowerCase()));

  const outcomes: any[] = [];
  for (const request of ((requests as any[]) || [])) {
    const invoice = ((invoices as any[]) || []).find((inv: any) => {
      const links = [inv?.workRequestId, inv?.work_request_id, inv?.projectId, inv?.project_id, inv?.sourceWorkRequestId];
      const paid = ["paid", "completed"].includes(String(inv?.status || "").toLowerCase())
        || paidPayments.some((p: any) => String(p?.invoiceId || p?.invoice_id || "") === String(inv?.id));
      return paid && links.some((v: any) => String(v || "") === String(request?.id));
    });
    if (!invoice) continue;

    outcomes.push(jobOutcome({
      request,
      invoiceAmount: Number(invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0) || 0,
      completedAt: invoice.paidAt || invoice.paid_at || invoice.updatedAt || "",
      timeEntries: timeEntries as any[],
      payRateByEmployee,
      purchaseOrders: purchaseOrders as any[],
    }));
  }

  // The trade a job was, under whichever field the intake form used.
  const tradeOf = (o: any) => {
    const r = ((requests as any[]) || []).find((x: any) => String(x?.id) === o.workRequestId) || {};
    return String(r.serviceType || r.project_type || r.trade || r.category || "general").toLowerCase();
  };

  return { outcomes, variance: varianceByTask(outcomes, tradeOf) };
}

/**
 * Publish the book catalogue so the server can reason about it.
 *
 * `source` is deliberately not accepted. Which rates are protected is the
 * server's own business, decided from the editor's store.
 */
rateLearningRouter.post(`${PREFIX}/labor-tasks/catalogue`, async (c) => {
  const actor = staffOnly(c);
  if (!actor) return c.json({ success: false, error: "Administrator access is required." }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.tasks) ? body.tasks : [];

    // Sanitised field by field: these numbers multiply into a customer's price.
    const tasks = incoming.slice(0, 500).map((t: any) => ({
      id: String(t?.id ?? "").slice(0, 80),
      tradeId: String(t?.tradeId ?? "").slice(0, 60),
      name: String(t?.name ?? "").slice(0, 160),
      unit: String(t?.unit ?? "each").slice(0, 20),
      hoursPerUnit: Math.max(0, Math.min(1000, Number(t?.hoursPerUnit) || 0)),
    })).filter((t: any) => t.id && t.tradeId);

    await kv.set(CATALOGUE_KEY, {
      tasks, publishedAt: new Date().toISOString(), publishedBy: actor.email,
    });
    return c.json({ success: true, published: tasks.length });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not publish the catalogue." }, 500);
  }
});

/**
 * What the loop knows, without changing anything.
 *
 * Safe to call on every screen load: it measures and reports, and the only
 * route that writes a rate is the one below it.
 */
rateLearningRouter.get(`${PREFIX}/labor-tasks/learning`, async (c) => {
  const actor = staffOnly(c);
  if (!actor) return c.json({ success: false, error: "Administrator access is required." }, 403);

  try {
    const [{ outcomes, variance }, tasks, measured] = await Promise.all([
      varianceFromFinishedJobs(), serverCatalogue(), readMeasured(),
    ]);

    // A dry run: what a pass would do, so the screen can show it before it happens.
    const preview = learnRates({ variance, tasks, measured, now: new Date().toISOString() });

    const withMargin = outcomes.filter((o: any) => o.margin.percent !== null);
    const averageMargin = withMargin.length
      ? Math.round((withMargin.reduce((s: number, o: any) => s + o.margin.percent, 0) / withMargin.length) * 100) / 100
      : null;

    return c.json({
      success: true,
      variance,
      measured,
      /** What a pass would change now, and what it would only offer. */
      pending: preview.applied,
      heldBack: preview.heldBack,
      unmatchedTrades: preview.unmatchedTrades,
      catalogueSize: tasks.length,
      /**
       * Said plainly, because the coverage is the story until it is high. A
       * loop with four finished jobs behind it has learned nothing yet, and a
       * screen that hides that invites decisions on an average of two.
       */
      coverage: {
        finishedAndPaid: outcomes.length,
        withMeasuredLabour: outcomes.filter((o: any) => o.actual.labourKnown === "measured").length,
        withMeasuredMaterials: outcomes.filter((o: any) => o.actual.materialKnown === "measured").length,
        usableForLearning: outcomes.filter((o: any) => o.enoughToLearn).length,
      },
      averageMargin,
      jobs: outcomes.map((o: any) => ({
        id: o.workRequestId, title: o.title, customer: o.customer,
        completedAt: o.completedAt, billed: o.billed,
        quoted: o.quoted, actual: o.actual, margin: o.margin, gaps: o.gaps,
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not work that out." }, 500);
  }
});

/**
 * Run a pass and keep what it corrected.
 *
 * The only route that writes a rate. Returns exactly what moved and what it
 * declined to move, so the change is never silent.
 */
/**
 * One learning pass: measure every finished job, correct what may be
 * corrected, and publish the factors quoting reads.
 *
 * Exported so the pass can also run by itself when a job is paid for, which is
 * the moment new evidence actually arrives. Returns what happened rather than
 * throwing, because a caller settling an invoice must not fail because the
 * learning loop had an off day.
 */
export async function runLearningPass(by: string): Promise<{
  ok: boolean; reason?: string;
  applied: any[]; heldBack: any[]; unmatchedTrades: any[]; measured: any[];
}> {
  const empty = { applied: [], heldBack: [], unmatchedTrades: [], measured: [] };
  try {
    const [{ variance }, tasks, measured] = await Promise.all([
      varianceFromFinishedJobs(), serverCatalogue(), readMeasured(),
    ]);

    const now = new Date().toISOString();

    /**
     * The factors go out even when there is no catalogue to correct.
     *
     * They are what the quoting engine actually reads, and they come from the
     * finished jobs rather than from the catalogue — so a company that has
     * never published a labour catalogue still gets its quotes corrected by
     * what its own crews achieve.
     */
    await kv.set(FACTORS_KEY, {
      factors: tradeFactorsFrom(variance as any), updatedAt: now, updatedBy: by,
    });

    if (tasks.length === 0) {
      return {
        ...empty, ok: false,
        reason: "The labour catalogue has not been published to the server yet, so there are no rates to correct.",
      };
    }

    const result = learnRates({ variance, tasks, measured, now });

    if (result.applied.length > 0) {
      await kv.set(MEASURED_KEY, { rates: result.measured, updatedAt: now, updatedBy: by });
      // An automatic change to pricing is worth a record of its own.
      await kv.set(`labor_tasks:measured_log:${now}`, { at: now, by, applied: result.applied });
    }

    return { ok: true, ...result };
  } catch (error: any) {
    return { ...empty, ok: false, reason: error?.message || "Could not run the pass." };
  }
}

/**
 * Run a pass after a job has been paid for, without making the caller wait.
 *
 * A payment is the moment a job becomes evidence, so this is where the loop
 * closes by itself rather than waiting for somebody to open a screen. It never
 * throws: an invoice must settle whether or not the rates learn anything.
 */
export function learnAfterPayment(status: string, by: string): void {
  if (String(status || "").toLowerCase() !== "paid") return;
  void runLearningPass(by).catch(() => { /* settling the invoice is what matters */ });
}

rateLearningRouter.post(`${PREFIX}/labor-tasks/learn`, async (c) => {
  const actor = staffOnly(c);
  if (!actor) return c.json({ success: false, error: "Administrator access is required." }, 403);

  const result = await runLearningPass(actor.email);
  if (!result.ok) return c.json({ success: false, error: result.reason }, 409);
  return c.json({
    success: true,
    applied: result.applied,
    heldBack: result.heldBack,
    unmatchedTrades: result.unmatchedTrades,
    measured: result.measured,
  });
});

/** Put one corrected rate back to what it was. */
rateLearningRouter.post(`${PREFIX}/labor-tasks/measured/revert`, async (c) => {
  const actor = staffOnly(c);
  if (!actor) return c.json({ success: false, error: "Administrator access is required." }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const taskId = String(body?.taskId || "").trim();
    if (!taskId) return c.json({ success: false, error: "Say which rate to put back." }, 400);

    const measured = await readMeasured();
    const after = revertMeasured(measured, taskId);
    if (after.length === measured.length) {
      return c.json({ success: false, error: "That rate has not been corrected, so there is nothing to undo." }, 404);
    }

    const now = new Date().toISOString();
    await kv.set(MEASURED_KEY, { rates: after, updatedAt: now, updatedBy: actor.email });
    return c.json({ success: true, measured: after });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not undo that." }, 500);
  }
});

/**
 * The catalogue with every rate resolved — his edit, else what we measured,
 * else the book figure. This is what a quote should price from.
 */
rateLearningRouter.get(`${PREFIX}/labor-tasks/resolved`, async (c) => {
  const actor = staffOnly(c);
  if (!actor) return c.json({ success: false, error: "Administrator access is required." }, 403);

  try {
    const [tasks, measured] = await Promise.all([serverCatalogue(), readMeasured()]);
    return c.json({ success: true, tasks: resolveCatalogue(tasks, measured) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not read the catalogue." }, 500);
  }
});

export default rateLearningRouter;
