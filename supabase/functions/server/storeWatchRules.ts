/**
 * What "stuck" looks like, stated precisely enough to test.
 *
 * WHY THIS EXISTS
 *
 * Every other job in this system makes something happen. This one makes sure
 * the others did. It is the part that was missing when a paid order failed to
 * reach its supplier, the reason was written to a field on a record nobody
 * opens, and it sat for eight weeks: nothing in the system was looking for the
 * shape of that problem.
 *
 * THE SHAPES IT LOOKS FOR
 *
 * Each one is a state that is individually plausible and collectively wrong —
 * a thing that would be fine for an hour and is a failure after a day. None of
 * them is detectable by looking at a single field; they are all "this, and
 * still this, after that long".
 *
 *   paid-not-forwarded      money taken, nothing ordered from the supplier
 *   manual-required         an order that will never resolve on its own
 *   forwarded-no-tracking   the supplier has it and has said nothing since
 *   shipped-not-told        we know it shipped; the customer does not
 *   delivered-not-told      the same, after it arrived
 *   sold-undeliverable      paid for a digital product with no file behind it
 *   question-ignored        the machine asked, and nobody answered
 *
 * The last one matters as much as the rest. A queue nobody works is the same
 * failure as a field nobody reads, one step further along.
 */

export interface WatchThresholds {
  /** Paid, and still not sent to a supplier. */
  notForwardedHours: number;
  /** Sitting at manual_required, which never clears itself. */
  manualRequiredHours: number;
  /** Supplier has the order but has reported no tracking. */
  noTrackingDays: number;
  /** We know something and the customer does not. */
  customerUntoldHours: number;
  /** An open question nobody has answered. */
  questionIgnoredDays: number;
}

export const WATCH_DEFAULTS: WatchThresholds = {
  notForwardedHours: 4,
  manualRequiredHours: 24,
  noTrackingDays: 5,
  customerUntoldHours: 2,
  questionIgnoredDays: 3,
};

export type FindingKind =
  | "paid-not-forwarded"
  | "manual-required"
  | "forwarded-no-tracking"
  | "shipped-not-told"
  | "delivered-not-told"
  | "sold-undeliverable"
  | "question-ignored";

export interface Finding {
  kind: FindingKind;
  /** Stable, so an alert about the same problem is sent once. */
  key: string;
  /** Money taken and nothing happening, versus something to look at. */
  severity: "urgent" | "attention";
  /** One line a person can act on. */
  summary: string;
  subject: { kind: string; id: string };
  /** How long it has been like this, in hours. */
  ageHours: number;
  amount?: number;
}

const HOUR = 3600_000;

function hoursSince(value: unknown, now: Date): number | null {
  if (!value) return null;
  const t = Date.parse(String(value));
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / HOUR;
}

/** Paid, by any of the spellings this system has used. */
export function orderIsPaid(order: any): boolean {
  return order?.payment_status === "paid"
    || order?.payment_status === "gift_card_paid"
    || order?.status === "paid";
}

function money(order: any): number {
  return Number(order?.amount_total ?? order?.total ?? 0) || 0;
}

/**
 * Everything that looks wrong, given the orders, the open questions, and which
 * products cannot actually be delivered.
 *
 * Test orders are skipped everywhere. `is_test` is a field on the record rather
 * than a guess from the id, because the next test order will not be called
 * DEMO — and a watchman that cries about the owner's own test payments is a
 * watchman that gets muted.
 */
export function findStuck(input: {
  orders: any[];
  asks: any[];
  /** Ids of products that have nothing to hand over. */
  undeliverableProductIds?: Set<string> | string[];
  now?: Date;
  thresholds?: Partial<WatchThresholds>;
}): Finding[] {
  const now = input.now || new Date();
  const t: WatchThresholds = { ...WATCH_DEFAULTS, ...(input.thresholds || {}) };
  const undeliverable = input.undeliverableProductIds instanceof Set
    ? input.undeliverableProductIds
    : new Set(input.undeliverableProductIds || []);
  const findings: Finding[] = [];

  for (const order of input.orders || []) {
    if (!order || typeof order !== "object") continue;
    if (order.is_test === true) continue;
    if (!orderIsPaid(order)) continue;

    const id = String(order.id || "");
    if (!id) continue;
    const status = String(order.fulfillment_status || "");
    const age = hoursSince(order.created_at, now);

    // Money taken, nothing ordered.
    if ((status === "" || status === "pending") && age !== null && age >= t.notForwardedHours) {
      const hasSellableLine = (Array.isArray(order.items) ? order.items : [])
        .some((i: any) => String(i?.sku || i?.SKU || i?.id || i?.productId || "").trim());
      if (hasSellableLine) {
        findings.push({
          kind: "paid-not-forwarded",
          key: `paid-not-forwarded:${id}`,
          severity: "urgent",
          summary: `Paid ${age >= 24 ? `${Math.floor(age / 24)} day(s)` : `${Math.floor(age)} hour(s)`} ago and still not sent to a supplier.`,
          subject: { kind: "order", id },
          ageHours: age,
          amount: money(order),
        });
      }
    }

    // A state that never clears itself.
    if (status === "manual_required" && age !== null && age >= t.manualRequiredHours) {
      findings.push({
        kind: "manual-required",
        key: `manual-required:${id}`,
        severity: "urgent",
        summary: "Needs fulfilling by hand, and will not resolve on its own.",
        subject: { kind: "order", id },
        ageHours: age,
        amount: money(order),
      });
    }

    // The supplier has it and has said nothing.
    if (status === "forwarded_to_doba" && !order.tracking_number) {
      const since = hoursSince(order.fulfillment_forwarded_at || order.created_at, now);
      if (since !== null && since >= t.noTrackingDays * 24) {
        findings.push({
          kind: "forwarded-no-tracking",
          key: `forwarded-no-tracking:${id}`,
          severity: "attention",
          summary: `Sent to the supplier ${Math.floor(since / 24)} days ago with no tracking reported since.`,
          subject: { kind: "order", id },
          ageHours: since,
          amount: money(order),
        });
      }
    }

    // We know something the customer does not.
    if (order.tracking_number && !order.tracking_notified_at) {
      const since = hoursSince(order.tracking_checked_at || order.updated_at, now);
      if (since !== null && since >= t.customerUntoldHours) {
        findings.push({
          kind: "shipped-not-told",
          key: `shipped-not-told:${id}`,
          severity: "attention",
          summary: "Has a tracking number the customer has never been told about.",
          subject: { kind: "order", id },
          ageHours: since,
        });
      }
    }
    if (status === "delivered" && !order.delivered_notified_at) {
      const since = hoursSince(order.delivered_at || order.updated_at, now);
      if (since !== null && since >= t.customerUntoldHours) {
        findings.push({
          kind: "delivered-not-told",
          key: `delivered-not-told:${id}`,
          severity: "attention",
          summary: "Marked delivered, and the customer was never told.",
          subject: { kind: "order", id },
          ageHours: since,
        });
      }
    }

    // Paid for something with nothing behind it.
    if (undeliverable.size > 0) {
      const bad = (Array.isArray(order.items) ? order.items : [])
        .map((i: any) => String(i?.id ?? i?.productId ?? ""))
        .filter((pid: string) => pid && undeliverable.has(pid));
      if (bad.length > 0) {
        findings.push({
          kind: "sold-undeliverable",
          key: `sold-undeliverable:${id}`,
          severity: "urgent",
          summary: `Paid for ${bad.length === 1 ? "a product" : `${bad.length} products`} with no file attached: ${bad.join(", ")}.`,
          subject: { kind: "order", id },
          ageHours: age ?? 0,
          amount: money(order),
        });
      }
    }
  }

  // The machine asked, and nobody answered.
  for (const ask of input.asks || []) {
    if (!ask || ask.status !== "open") continue;
    const since = hoursSince(ask.raisedAt, now);
    if (since === null || since < t.questionIgnoredDays * 24) continue;
    findings.push({
      kind: "question-ignored",
      key: `question-ignored:${String(ask.id || "")}`,
      severity: "attention",
      summary: `Asked ${Math.floor(since / 24)} days ago and still unanswered: ${String(ask.question || "").slice(0, 120)}`,
      subject: { kind: "ask", id: String(ask.id || "") },
      ageHours: since,
    });
  }

  // Worst and oldest first — the order somebody should work through them in.
  const weight = (f: Finding) => (f.severity === "urgent" ? 0 : 1);
  return findings.sort((a, b) => weight(a) - weight(b) || b.ageHours - a.ageHours);
}

export type ClockVerdict = "never-armed" | "alive" | "stopped";

/**
 * Is the clock itself still beating?
 *
 * Separate from the findings because it answers a different question, and
 * because whatever calls it must NOT be the clock. A watchdog that runs inside
 * the thing it watches cannot report that the thing stopped.
 */
export function clockVerdict(
  lastRunAt: unknown,
  now: Date = new Date(),
  silentAfterMinutes = 60,
): { verdict: ClockVerdict; minutesSince: number | null } {
  if (!lastRunAt) return { verdict: "never-armed", minutesSince: null };
  const t = Date.parse(String(lastRunAt));
  if (!Number.isFinite(t)) return { verdict: "never-armed", minutesSince: null };
  const minutes = (now.getTime() - t) / 60_000;
  return { verdict: minutes > silentAfterMinutes ? "stopped" : "alive", minutesSince: minutes };
}
