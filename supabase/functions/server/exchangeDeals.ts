/**
 * What a deal is allowed to be, who may publish one, and when it is live.
 *
 * Separate and tested because the mistakes here are not cosmetic: the wrong
 * answer from `isLive` shows residents an offer nobody approved, or one that
 * expired in March. `.ts` rather than `.tsx` so the test runner can load it.
 */

export type DealState = "draft" | "submitted" | "approved" | "rejected" | "withdrawn";

/** The only state in which a resident may ever see a deal. */
export const PUBLISHED_STATE: DealState = "approved";

export interface DealRecord {
  state?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
}

function time(value: unknown): number | null {
  const at = Date.parse(String(value ?? ""));
  return Number.isFinite(at) ? at : null;
}

/**
 * Is this deal in front of residents right now?
 *
 * Approval is necessary and not sufficient: an approved deal that has not
 * started, or has finished, is not live. Both halves are checked here rather
 * than in a query so there is one answer to the question, and so the answer
 * can be tested without a database.
 *
 * An unparseable date makes a deal NOT live. The alternative — treating a bad
 * date as "no limit" — publishes something indefinitely because a field was
 * malformed, which is the wrong way for this to fail.
 */
export function isLive(deal: DealRecord, now: Date = new Date()): boolean {
  if (String(deal?.state ?? "") !== PUBLISHED_STATE) return false;
  const from = time(deal?.starts_at);
  const until = time(deal?.ends_at);
  if (from === null || until === null) return false;
  const at = now.getTime();
  return at >= from && at <= until;
}

/**
 * Which state changes are allowed, and by whom.
 *
 * Written as a table rather than a chain of ifs because the interesting cases
 * are the ones that must NOT be possible — a business approving its own deal,
 * or editing one after approval so that what residents see is not what was
 * reviewed.
 */
const BUSINESS_MAY: Record<string, DealState[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["withdrawn"],
  // Deliberately empty: once something is approved, the business cannot change
  // it. To alter an approved deal it must be withdrawn and submitted again, so
  // what residents see has always been through review. Allowing an edit here
  // would make the review a formality somebody could walk straight past.
  approved: ["withdrawn"],
  rejected: [],
  withdrawn: [],
};

const STAFF_MAY: Record<string, DealState[]> = {
  draft: [],
  submitted: ["approved", "rejected"],
  // Staff can pull an approved deal back down; that is what you need when
  // something turns out to be wrong after the fact.
  approved: ["rejected"],
  rejected: ["approved"],
  withdrawn: [],
};

export function businessMayMove(from: unknown, to: unknown): boolean {
  return (BUSINESS_MAY[String(from ?? "")] ?? []).includes(String(to ?? "") as DealState);
}

export function staffMayMove(from: unknown, to: unknown): boolean {
  return (STAFF_MAY[String(from ?? "")] ?? []).includes(String(to ?? "") as DealState);
}

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const BODY_MIN = 3;
export const BODY_MAX = 2000;
/** Nothing may run longer than this without being submitted again. */
export const MAX_RUN_DAYS = 90;

export interface DealInput {
  title?: unknown;
  body?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
}

/**
 * Check a deal before it is stored, and say what is wrong in words the
 * business will read.
 *
 * The database carries the same length and window constraints. That is not
 * duplication for its own sake: the constraint is what makes a bad row
 * impossible, and this is what tells somebody why their deal was refused
 * instead of showing them a Postgres error.
 */
export function validateDeal(input: DealInput, now: Date = new Date()): string[] {
  const problems: string[] = [];

  const title = String(input?.title ?? "").trim();
  const body = String(input?.body ?? "").trim();
  if (title.length < TITLE_MIN) problems.push("The deal needs a title.");
  else if (title.length > TITLE_MAX) problems.push(`The title has to be ${TITLE_MAX} characters or fewer.`);
  if (body.length < BODY_MIN) problems.push("Say what the deal actually is.");
  else if (body.length > BODY_MAX) problems.push(`The description has to be ${BODY_MAX} characters or fewer.`);

  const from = time(input?.startsAt);
  const until = time(input?.endsAt);
  if (from === null) problems.push("The start date is not a date.");
  if (until === null) problems.push("The end date is not a date.");

  if (from !== null && until !== null) {
    if (until <= from) problems.push("It has to end after it starts.");
    // An hour's grace, so a deal starting "today" is not refused because the
    // business typed midnight and it is now the afternoon.
    else if (until <= now.getTime() - 3600_000) problems.push("That deal has already finished.");
    else if (until - from > MAX_RUN_DAYS * 86_400_000) {
      problems.push(`A deal can run for at most ${MAX_RUN_DAYS} days before being submitted again.`);
    }
  }

  return problems;
}

/**
 * May this business publish deals at all?
 *
 * Two conditions, and the second one is the hook Eric's pricing decision needs.
 *
 * **Claimed.** An unclaimed listing is compiled from public records and has
 * nobody standing behind it; nothing it "published" would have an author.
 *
 * **Included in their plan.** Eric chose deals free with a claimed listing for
 * now, priced into the plan catalogue later. That is why this asks a question
 * rather than returning true: when deals become a paid feature, the answer
 * comes from the catalogue and nothing else on the publish path changes. A
 * hardcoded `true` here would have made that a rewrite.
 */
export interface PublishContext {
  claimed?: unknown;
  /** From the plan catalogue, once deals are priced. Absent means included. */
  dealsIncludedInPlan?: boolean;
}

export function mayPublish(context: PublishContext): { allowed: boolean; reason: string } {
  if (context?.claimed !== true) {
    return {
      allowed: false,
      reason: "Only a claimed listing can publish a deal. Claim this business first.",
    };
  }
  if (context?.dealsIncludedInPlan === false) {
    return {
      allowed: false,
      reason: "Deals are not part of this plan.",
    };
  }
  return { allowed: true, reason: "" };
}

/** How a state reads to the business that owns it. */
export function phraseState(state: unknown): string {
  switch (String(state ?? "")) {
    case "draft": return "Draft";
    case "submitted": return "Waiting for review";
    case "approved": return "Approved";
    case "rejected": return "Not approved";
    case "withdrawn": return "Withdrawn";
    default: return "Unknown";
  }
}
