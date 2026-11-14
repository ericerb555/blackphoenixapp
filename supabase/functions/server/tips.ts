/**
 * Tips, and who they belong to.
 *
 * Eric, 2026-11-14: "we should allow the customer add a tip from the portal",
 * and asked who gets it: **the crew who did the job**.
 *
 * THAT ANSWER IS WHY THIS FILE IS CAREFUL
 *
 * A tip to the company is a payment. A tip to a named person is *their money*,
 * passing through this business on the way to them, and in the United States it
 * is reportable pay. This file does not run payroll and must not pretend to —
 * what it does is make the obligation impossible to lose: every tip is recorded
 * against the people it was given to, with a status that starts as owed and
 * only an administrator can move to paid out.
 *
 * WHAT WE WILL NOT DO, AND WHY
 *
 * We will not quietly keep a tip whose crew we cannot name. A job with nobody
 * recorded on it produces an UNATTRIBUTED tip, which is money the office has to
 * allocate deliberately. Folding it into company income because the data was
 * thin is the exact move a customer who tipped "the guys" would object to, and
 * it would be invisible.
 *
 * A TIP IS NOT PART OF THE PAYMENT AMOUNT
 *
 * `payments/complete` credits an invoice by `payment.amount`. A tip added into
 * that figure would mark the invoice overpaid and close out a balance nobody
 * settled, so a tip travels as its own field and its own Stripe line and is
 * never summed into the thing that pays a bill. The cap in `create-checkout`
 * is the other half of that: it exists because the browser once decided what to
 * charge, and a tip must not become the way round it.
 */

/** Nobody is tipping more than this through a portal without talking to us. */
export const MAX_TIP = 2000;

export interface TipCrewMember {
  /** What to call them on the record. */
  name: string;
  /** How they are paid and matched. Empty where the job only held a name. */
  email: string;
}

export type TipStatus = "owed" | "paid-out";

export interface TipRecord {
  id: string;
  amount: number;
  /** Who gave it. */
  customerEmail: string;
  /** What it was for, where we know. */
  workRequestId: string | null;
  invoiceId: string | null;
  paymentId: string;
  /** Who it is for. Empty means nobody was recorded on the job. */
  crew: TipCrewMember[];
  /** True where there is nobody to pay it to yet. The office must allocate it. */
  unattributed: boolean;
  status: TipStatus;
  message: string | null;
  createdAt: string;
  paidOutAt: string | null;
  paidOutBy: string | null;
}

/**
 * How much of what the browser asked for is a tip we will take.
 *
 * Rounded to the cent because Stripe is charged in cents and a fraction of one
 * is a figure nobody can pay. Refused rather than clamped above the ceiling:
 * clamping would charge a different number from the one somebody chose, and the
 * one thing worse than refusing a payment is taking a different one.
 */
export function readTipAmount(value: unknown): { amount: number; error?: string } {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return { amount: 0 };
  if (n > MAX_TIP) {
    return { amount: 0, error: `A tip of more than $${MAX_TIP} has to go through the office — please call us.` };
  }
  return { amount: Math.round(n * 100) / 100 };
}

const clean = (v: unknown): string => String(v ?? "").trim();

/**
 * Who worked the job, as the record actually knows them.
 *
 * Reads the several spellings the work request has collected over time rather
 * than inventing a crew list: `schedule.assignedTo` is what the scheduler sets,
 * and the `assigned*Email` fields are what the access check in `index.tsx`
 * already trusts to decide whether somebody may read a job at all. Using the
 * same fields means the people who can see the job are the people who can be
 * tipped for it.
 *
 * Returns an empty list where nobody is recorded. That is a real and common
 * answer, and the caller is expected to treat it as "allocate this by hand"
 * rather than as "keep it".
 */
export function crewFromJob(record: any): TipCrewMember[] {
  if (!record || typeof record !== "object") return [];

  const byEmail = new Map<string, TipCrewMember>();
  const add = (name: unknown, email: unknown) => {
    const e = clean(email).toLowerCase();
    const n = clean(name) || e;
    if (!n && !e) return;
    // Keyed on email so the same person named twice is one person; a crew
    // member with no email keys on their name for the same reason.
    const key = e || n.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      if (!existing.email && e) existing.email = e;
      /*
       * A real name beats an address standing in for one.
       *
       * The first sighting of somebody is usually an `assigned*Email` field,
       * which leaves their name as "dan@bp.com". When the scheduler's entry
       * turns up afterwards carrying "Dan", that is the name to put on a
       * record somebody is going to read — and on money somebody is owed.
       */
      const existingIsEmail = existing.name.toLowerCase() === existing.email;
      if (n && (!existing.name || (existingIsEmail && n.toLowerCase() !== e))) existing.name = n;
      return;
    }
    byEmail.set(key, { name: n, email: e });
  };

  const emails = [
    record.assignedToEmail, record.assigned_to_email,
    record.assignedTechnicianEmail, record.assigned_technician_email,
    record.employeeEmail, record.employee_email,
  ];
  for (const email of emails) if (clean(email)) add(email, email);

  // A scheduler may set one person or a list of them.
  const assigned = record?.schedule?.assignedTo ?? record?.schedule?.assigned_to;
  if (Array.isArray(assigned)) {
    for (const entry of assigned) {
      if (entry && typeof entry === "object") add(entry.name ?? entry.fullName, entry.email);
      else add(entry, "");
    }
  } else if (clean(assigned)) {
    add(assigned, clean(assigned).includes("@") ? assigned : "");
  }

  if (Array.isArray(record.crew)) {
    for (const entry of record.crew) {
      if (entry && typeof entry === "object") add(entry.name ?? entry.fullName, entry.email);
      else add(entry, "");
    }
  }

  return [...byEmail.values()];
}

/** The record a paid tip leaves behind. */
export function tipRecord(input: {
  id: string;
  amount: number;
  customerEmail: string;
  paymentId: string;
  workRequestId?: string | null;
  invoiceId?: string | null;
  crew: TipCrewMember[];
  message?: string | null;
  now: string;
}): TipRecord {
  const crew = Array.isArray(input.crew) ? input.crew : [];
  return {
    id: input.id,
    amount: Math.round(Number(input.amount) * 100) / 100,
    customerEmail: String(input.customerEmail || "").toLowerCase(),
    workRequestId: input.workRequestId || null,
    invoiceId: input.invoiceId || null,
    paymentId: input.paymentId,
    crew,
    unattributed: crew.length === 0,
    status: "owed",
    message: input.message ? String(input.message).slice(0, 500) : null,
    createdAt: input.now,
    paidOutAt: null,
    paidOutBy: null,
  };
}

/**
 * What each person is owed out of one tip.
 *
 * Split evenly, with the remaining cents handed to the first of them rather
 * than lost — three people and a ten dollar tip is 3.34 / 3.33 / 3.33, and the
 * parts add up to the whole, which matters because somebody will add them up.
 */
export function splitTip(amount: number, crew: TipCrewMember[]): Array<{ member: TipCrewMember; amount: number }> {
  const total = Math.round((Number(amount) || 0) * 100);
  if (!crew.length || total <= 0) return [];
  const base = Math.floor(total / crew.length);
  let left = total - base * crew.length;
  return crew.map((member) => {
    const cents = base + (left > 0 ? 1 : 0);
    if (left > 0) left -= 1;
    return { member, amount: cents / 100 };
  });
}
