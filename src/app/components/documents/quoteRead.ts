/**
 * Reading a stored quote for the customer who is about to approve it.
 *
 * WHY THIS IS A .ts AND NOT PART OF THE PAGE
 *
 * It decides what a customer is told their job costs, and the test runner
 * strips types from `.ts` only — logic living in a `.tsx` cannot be checked by
 * hand. Same reason `quoteMath.ts` is not inside `QuoteDocument.tsx` and
 * `aiCeiling.ts` was split out of `aiSpend.ts`.
 *
 * WHAT IT REPLACES, AND WHY IT HAD TO BE WRITTEN
 *
 * `CustomerQuoteApproval.tsx` held a complete fictional job as its initial
 * state — John Smith, a kitchen renovation at 123 Main St Springfield, $10,200
 * of white shaker cabinets, Kashmir White granite, a seven-step kitchen process
 * and a $27,173 total — and merged the real quote over the top of it field by
 * field with `|| prev` on every line. Any field the record did not carry fell
 * back to the fiction, and `address`, `processSteps`, `taxRate`, `validUntil`
 * and `generatedAt` were not in the merge at all. A failed, expired or revoked
 * link left the whole invention on screen with an Approve button under it.
 *
 * So this reads a record and returns what is actually in it. **A field the
 * record does not carry comes back empty, never inherited and never invented.**
 *
 * THREE SHAPES OF STORED QUOTE, AND WHY ALL THREE ARE READ
 *
 *   quotes.tsx normalizeDoc   rebuilds a saved quote field by field and keeps
 *                             `items`. It has no `materials` or `labor` at all.
 *   publishQuote.ts           sends `materials` and `labor`, with `unitPrice`
 *                             and `total` per line.
 *   quoteMath.ts              which calls itself the one reading of a stored
 *                             quote, uses a third naming again:
 *                             `{ description, qty, rate }`.
 *
 * And `PUT /quotes/:id` spreads the request body raw, so whatever a caller sent
 * is what is stored. Production therefore holds all of them, and the page
 * rendered only the second: `item.unitCost.toFixed(2)` on a line carrying
 * `unitPrice` is a TypeError. Nobody ever saw it, because the fiction was
 * always the thing on screen.
 *
 * Reading the aliases is the smaller fix. Collapsing three shapes into one is
 * worth doing and is not this change.
 */

export interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
}

export interface LaborItem {
  id: string;
  role: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
}

export interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectTitle: string;
  projectDescription: string;
  address: string;
  materials: MaterialItem[];
  /**
   * Whether `materials` really is a materials list.
   *
   * A normalised quote carries one undifferentiated `items` array, and calling
   * a disposal fee or a permit a "material" to the customer holding the quote
   * is a small untruth the page has no need to tell.
   */
  linesAreMaterials: boolean;
  labor: LaborItem[];
  processSteps: ProcessStep[];
  materialsSubtotal: number;
  laborSubtotal: number;
  /**
   * The tax AMOUNT only. There is deliberately no `taxRate`.
   *
   * The page displayed `Tax ({(quote.taxRate * 100).toFixed(0)}%)`, which is
   * right for a fraction and wrong by a factor of a hundred for a percentage —
   * and both conventions exist in stored quotes. `quoteMath.ts` divides
   * `taxRate` by 100, so a normalised record holds a percentage; the mock the
   * page shipped held `0.08`. A record storing 8 rendered "Tax (800%)".
   *
   * The amount is what the customer is actually charged and it is unambiguous.
   * A rate nobody can read is decoration, and a wrong one is worse than none.
   */
  taxAmount: number;
  totalCost: number;
  generatedAt: string;
  validUntil: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

/** The first candidate that is a non-empty string, else ''. */
export const text = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const value = String(candidate).trim();
    if (value) return value;
  }
  return '';
};

/**
 * The first candidate that is a readable number, else null.
 *
 * Null rather than zero, because the two mean different things to somebody
 * reading a price: zero is "this costs nothing" and null is "we do not know".
 * `depositMath.ts` draws the same distinction for the same reason — *"an
 * unreadable deposit does NOT become zero, because a zero deposit shows the
 * entire cost as owed by the tenant"*.
 */
export const figure = (...candidates: unknown[]): number | null => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

/** The first candidate that is a non-empty array, else []. */
export const list = (...candidates: unknown[]): any[] => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
};

export function readMaterial(raw: any, index: number): MaterialItem | null {
  const name = text(raw?.name, raw?.description, raw?.item, raw?.sku);
  const quantity = figure(raw?.quantity, raw?.qty) ?? 0;
  const unitCost = figure(raw?.unitCost, raw?.unitPrice, raw?.rate, raw?.cost);
  const totalCost = figure(raw?.totalCost, raw?.total, raw?.amount)
    ?? (unitCost === null ? null : unitCost * quantity);

  // Nothing to say and no money attached: not a line, so not returned.
  if (!name && totalCost === null) return null;

  const description = text(raw?.description, raw?.notes);
  return {
    id: text(raw?.id, raw?.sku) || `m${index}`,
    name: name || 'Item',
    // Dropped when it is the same string as the name, which is what a record
    // carrying only one of the two produces.
    description: description === name ? '' : description,
    quantity,
    unit: text(raw?.unit),
    unitCost: unitCost ?? 0,
    totalCost: totalCost ?? 0,
    category: text(raw?.category),
  };
}

export function readLabor(raw: any, index: number): LaborItem | null {
  const role = text(raw?.role, raw?.name, raw?.trade, raw?.description);
  const hours = figure(raw?.hours, raw?.quantity, raw?.qty) ?? 0;
  const hourlyRate = figure(raw?.hourlyRate, raw?.rate, raw?.unitPrice, raw?.unitCost);
  const totalCost = figure(raw?.totalCost, raw?.total, raw?.amount)
    ?? (hourlyRate === null ? null : hourlyRate * hours);

  if (!role && totalCost === null) return null;

  const description = text(raw?.description, raw?.notes);
  return {
    id: text(raw?.id, raw?.sku) || `l${index}`,
    role: role || 'Labour',
    description: description === role ? '' : description,
    hours,
    hourlyRate: hourlyRate ?? 0,
    totalCost: totalCost ?? 0,
  };
}

export function readStep(raw: any, index: number): ProcessStep | null {
  const title = text(raw?.title, raw?.name, raw?.step, raw?.phase);
  const description = text(raw?.description, raw?.detail);
  if (!title && !description) return null;
  return {
    id: text(raw?.id) || `s${index}`,
    stepNumber: figure(raw?.stepNumber, raw?.number) ?? index + 1,
    title: title || `Step ${index + 1}`,
    description,
    estimatedDuration: text(raw?.estimatedDuration, raw?.duration),
  };
}

const sumLines = (rows: Array<{ totalCost?: number }>) =>
  rows.reduce((total, row) => total + (Number(row?.totalCost) || 0), 0);

/**
 * The quote a customer is shown, read from the by-token payload.
 *
 * `payload` is the envelope, whose client name, email and phone the server
 * resolved; `payload.quoteData` is the stored quote itself. The envelope wins
 * on contact details for that reason.
 */
export function readQuote(payload: any): Quote {
  const qd = payload?.quoteData || {};

  const materials = list(qd.materials, qd.materialItems)
    .map(readMaterial)
    .filter(Boolean) as MaterialItem[];
  const labor = list(qd.labor, qd.laborItems)
    .map(readLabor)
    .filter(Boolean) as LaborItem[];
  const processSteps = list(qd.processSteps, qd.process, qd.steps)
    .map(readStep)
    .filter(Boolean) as ProcessStep[];

  /**
   * `items` is what a normalised quote carries, and it is NOT split into
   * materials and labour. Read as one list of priced lines rather than guessed
   * into two halves: deciding from a description that "Dumpster — 20 yard" is
   * somebody's time is how a customer gets told the wrong thing about their own
   * quote.
   */
  const split = Boolean(materials.length || labor.length);
  const priced = split
    ? materials
    : (list(qd.items).map(readMaterial).filter(Boolean) as MaterialItem[]);

  const materialsSubtotal = figure(qd.materialsSubtotal, qd.subtotals?.materials) ?? sumLines(priced);
  const laborSubtotal = figure(qd.laborSubtotal, qd.subtotals?.labor) ?? sumLines(labor);
  const taxAmount = figure(qd.taxAmount, qd.subtotals?.tax) ?? 0;
  const totalCost = figure(qd.totalCost, qd.total)
    ?? (materialsSubtotal + laborSubtotal + taxAmount);

  return {
    id: text(qd.id, payload?.quoteId),
    quoteNumber: text(qd.number, qd.quoteNumber),
    customerName: text(payload?.clientName, qd.customerName, qd.clientName),
    customerEmail: text(payload?.clientEmail, qd.customerEmail, qd.clientEmail),
    customerPhone: text(payload?.clientPhone, qd.customerPhone, qd.clientPhone),
    projectTitle: text(qd.title, qd.projectTitle, qd.serviceType),
    projectDescription: text(qd.description, qd.projectDescription, qd.notes),
    address: text(qd.address, qd.clientAddress, qd.jobAddress),
    materials: priced,
    linesAreMaterials: split,
    labor,
    processSteps,
    materialsSubtotal,
    laborSubtotal,
    taxAmount,
    totalCost,
    generatedAt: text(qd.issueDate, qd.createdAt, qd.generatedAt),
    validUntil: text(qd.validUntil, qd.dueDate, qd.expiresAt),
    /**
     * Read from the record rather than pinned to 'pending'.
     *
     * A customer following their link a second time, after approving, was
     * shown the approve-and-sign screen again because the page hardcoded this.
     * `alreadySigned` there was already reading the real status; this makes the
     * view agree with it.
     */
    approvalStatus: qd.status === 'approved' ? 'approved'
      : qd.status === 'rejected' ? 'rejected'
      : 'pending',
  };
}

/**
 * The deposit, as one rule used everywhere that needs it.
 *
 * The checkout button on the approval page charges 30%, and the payment
 * schedule above it quoted 30% as well — from a different base, hardcoded
 * against a fictional total, so the two figures disagreed whenever a
 * subscription discount applied.
 */
export const DEPOSIT_RATE = 0.30;

/**
 * A total split into the deposit we take now and the balance that follows.
 *
 * Takes the total the customer is actually SHOWN — the discounted one where a
 * discount applies. The page took 30% of the pre-discount figure while crossing
 * that figure out on screen, so a subscriber was asked for a deposit on a price
 * we had just told them they were not paying.
 *
 * The balance is the remainder rather than 70% computed separately, so the two
 * always add back to the total however the rounding falls.
 */
export function splitPayment(total: number): { deposit: number; balance: number } {
  const amount = Number(total);
  if (!Number.isFinite(amount) || amount <= 0) return { deposit: 0, balance: 0 };
  const deposit = Math.round(amount * DEPOSIT_RATE);
  return { deposit, balance: Math.max(0, amount - deposit) };
}
