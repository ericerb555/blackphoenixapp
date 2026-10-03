/**
 * The job that checks the other jobs did their work.
 *
 * Every other job makes something happen. This one reconciles money against
 * state and complains when the two have come apart — which is the thing that
 * was missing when a paid order failed to reach its supplier and sat for eight
 * weeks with the reason in a field nobody opens.
 *
 * IT IS NOT THE DEAD-MAN'S SWITCH
 *
 * This runs ON the clock, so it cannot report that the clock stopped. That is
 * `POST /store/watchdog`, which is scheduled separately and deliberately — a
 * watchdog inside the thing it watches is not a watchdog. The two are different
 * questions and they need different triggers.
 *
 * ALERTING IS DEDUPED, BECAUSE AN IGNORED ALARM IS NO ALARM
 *
 * Every finding carries a stable key and the staff notifier dedupes on it, so a
 * stuck order produces one email rather than ninety-six a day. Only urgent
 * findings are emailed; the rest wait on the review screen, where somebody is
 * looking on purpose. A watchman that sends a daily digest of things that are
 * fine is a watchman that gets filtered into a folder.
 */
import * as kv from "./kv_store.tsx";
import { registerStoreJob, type StoreJobContext, type StoreJobResult } from "./storeAutonomy.ts";
import { notifyStaffInBackground } from "./staff-notifications.tsx";
import { marketplaceProductIsDeliverable } from "./marketplace.tsx";
import { findStuck, type Finding } from "./storeWatchRules.ts";

const FINDINGS_KEY = "store:autonomy:findings";
const ASK_PREFIX = "store:autonomy:ask:";
const MARKETPLACE_PREFIX = "marketplace_product:";

/** What the panel reads. Kept small — it is a summary, not an archive. */
interface FindingsRecord {
  at: string;
  urgent: number;
  attention: number;
  findings: Finding[];
  /** Keys already emailed about, so a restart does not re-alert everything. */
  alerted: string[];
}

async function collectOrders(): Promise<any[]> {
  const [main, marketplace] = await Promise.all([
    kv.getByPrefix("store:order:") as Promise<any[]>,
    kv.getByPrefix("store_order:") as Promise<any[]>,
  ]);
  return [...(main || []), ...(marketplace || [])].filter((o) => o && typeof o === "object");
}

async function collectAsks(): Promise<any[]> {
  return ((await kv.getByPrefix(ASK_PREFIX)) || []).filter((a: any) => a && typeof a === "object");
}

/**
 * Digital products with nothing behind them.
 *
 * Checked every run rather than trusted from a flag, because the question
 * "could we actually deliver what we sold" is the one that was answered wrong
 * for twenty-one products at once.
 */
async function collectUndeliverable(): Promise<Set<string>> {
  const rows = ((await kv.getByPrefix(MARKETPLACE_PREFIX)) || []) as any[];
  const bad = new Set<string>();
  for (const p of rows) {
    if (!p || typeof p !== "object" || !p.id) continue;
    if (!marketplaceProductIsDeliverable(p)) bad.add(String(p.id));
  }
  return bad;
}

async function watchJob(_ctx: StoreJobContext): Promise<StoreJobResult> {
  const [orders, asks, undeliverable] = await Promise.all([
    collectOrders(),
    collectAsks(),
    collectUndeliverable(),
  ]);

  const findings = findStuck({ orders, asks, undeliverableProductIds: undeliverable });
  const previous = ((await kv.get(FINDINGS_KEY)) as any) || {};
  const alreadyAlerted = new Set<string>(Array.isArray(previous.alerted) ? previous.alerted : []);

  const urgent = findings.filter((f) => f.severity === "urgent");
  const fresh = urgent.filter((f) => !alreadyAlerted.has(f.key));

  for (const finding of fresh) {
    notifyStaffInBackground("payment", {
      subject: `Store needs attention: ${finding.subject.id}`,
      heading: "⚠️ Something in the store is stuck",
      rows: [
        ["What", finding.summary],
        [finding.subject.kind === "order" ? "Order" : "Subject", finding.subject.id],
        ...(finding.amount ? [["Amount", `$${finding.amount.toFixed(2)}`] as [string, string]] : []),
        ["Unchanged for", finding.ageHours >= 48 ? `${Math.floor(finding.ageHours / 24)} days` : `${Math.floor(finding.ageHours)} hours`],
        ["Kind", finding.kind],
      ],
      note: "Found by the store's own reconciliation. The full list is on the Owners Dashboard under Review Queue.",
      ctaLabel: "Open the review queue",
      ctaPath: "/owners-dashboard",
      dedupeKey: `watch:${finding.key}`,
    });
  }

  // Keys that are still a problem, plus the ones just alerted. A finding that
  // has gone away drops out, so if it comes back it alerts again — which is
  // right: a problem recurring is news.
  const stillOpen = new Set(findings.map((f) => f.key));
  const alerted = [...new Set([...fresh.map((f) => f.key), ...[...alreadyAlerted].filter((k) => stillOpen.has(k))])];

  const record: FindingsRecord = {
    at: new Date().toISOString(),
    urgent: urgent.length,
    attention: findings.length - urgent.length,
    findings: findings.slice(0, 50),
    alerted,
  };
  await kv.set(FINDINGS_KEY, record);

  if (findings.length === 0) {
    return {
      ran: true,
      detail: `Reconciled ${orders.length} order(s) and ${asks.length} question(s); nothing is stuck.`,
      counts: { orders: orders.length, findings: 0, urgent: 0, alerted: 0 },
    };
  }

  return {
    ran: true,
    detail: `${findings.length} thing(s) need attention (${urgent.length} urgent)${fresh.length ? `, ${fresh.length} newly alerted` : ""}: ${findings.slice(0, 3).map((f) => `${f.subject.id} ${f.kind}`).join(", ")}${findings.length > 3 ? "…" : ""}`,
    counts: { orders: orders.length, findings: findings.length, urgent: urgent.length, alerted: fresh.length },
    // Urgent findings are reported as the job's error so they show red on the
    // panel and in the run record. They are not a failure of this job — they
    // are what it exists to find — but burying them in a success line is how
    // the original problem stayed invisible.
    error: urgent.length ? `${urgent.length} urgent: ${urgent.slice(0, 3).map((f) => `${f.subject.id} (${f.kind})`).join(", ")}` : undefined,
  };
}

/** What the review screen shows. */
export async function loadStoreFindings(): Promise<FindingsRecord | null> {
  return ((await kv.get(FINDINGS_KEY)) as any) || null;
}

/** Registered explicitly, not by import side effect. */
export function registerStoreWatchJob(): void {
  registerStoreJob("watch", watchJob);
}
