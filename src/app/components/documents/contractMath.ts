/**
 * What a contract says about itself: is it signed, by whom, and for how much.
 *
 * WHY THIS IS A .ts
 *
 * Same reason as `quoteMath.ts` — the test runner strips types from `.ts` only,
 * and a contract's signed/unsigned reading decides whether the app treats an
 * agreement as binding. That belongs somewhere it can be checked by hand.
 *
 * WHY EVERY FIELD IS OPTIONAL AND READ DEFENSIVELY
 *
 * The create route stores `{ ...body }` — whatever the caller sent, unvalidated
 * beyond an id and a status. There is no schema, and as of 28 Sep 2026 there
 * were ZERO contracts in the store, so there is not even a real example to
 * generalise from. A document that assumes a field is present will throw on the
 * first contract somebody actually makes.
 */

export interface ContractSignature {
  name?: string;
  signerEmail?: string;
  acceptedTermsAt?: string;
  /** How it was signed. `portal_typed_name` is the only method today. */
  method?: string;
}

export interface ContractDoc {
  id?: string;
  number?: string;
  title?: string;
  status?: string;
  terms?: string;
  scope?: string;
  description?: string;
  amount?: number | string;
  customerName?: string;
  clientName?: string;
  customerEmail?: string;
  clientEmail?: string;
  customerAddress?: string;
  clientAddress?: string;
  quoteId?: string;
  jobId?: string;
  createdAt?: string;
  signedAt?: string;
  signedBy?: string;
  signatureName?: string;
  signature?: ContractSignature | null;
}

/** Statuses that mean the agreement is in force. */
const SIGNED_STATUSES = ['active', 'signed', 'completed'];

/**
 * Is this contract signed?
 *
 * Mirrors the server's own test in the signing route, which refuses to re-sign
 * when `signedAt` is set OR the status is one of these. Reading it differently
 * here would show a customer an "unsigned" document the server will not let
 * them sign — a dead end with no explanation.
 */
export function isSigned(doc: ContractDoc): boolean {
  if (doc.signedAt) return true;
  return SIGNED_STATUSES.includes(String(doc.status || '').toLowerCase());
}

/** The person's own name, however the record spells it. */
export function signerName(doc: ContractDoc): string {
  return String(doc.signature?.name || doc.signatureName || '').trim();
}

export function signerEmail(doc: ContractDoc): string {
  return String(doc.signature?.signerEmail || doc.signedBy || '').trim();
}

export function signedDate(doc: ContractDoc): string {
  return String(doc.signature?.acceptedTermsAt || doc.signedAt || '').trim();
}

/**
 * How the signature was taken, in words a person can read.
 *
 * Stated plainly rather than hidden, because a typed name is a real but
 * particular kind of signature, and anybody relying on this document later —
 * the customer, a lender, a court — should be able to see what was actually
 * captured rather than infer it.
 */
export function signatureMethodLabel(doc: ContractDoc): string {
  const method = String(doc.signature?.method || '').trim();
  if (!method) return '';
  if (method === 'portal_typed_name') return 'Signed electronically in the customer portal by typed name';
  return method.replace(/_/g, ' ');
}

export const contractParty = (doc: ContractDoc) => ({
  name: String(doc.customerName || doc.clientName || '').trim(),
  email: String(doc.customerEmail || doc.clientEmail || '').trim(),
  address: String(doc.customerAddress || doc.clientAddress || '').trim(),
});

/**
 * The contract amount as a number, or null when there is not one.
 *
 * Null rather than zero, deliberately. A contract with no amount recorded and
 * a contract genuinely worth $0 are different things, and printing "$0.00" for
 * the first tells the customer something untrue about what they agreed to.
 */
export function contractAmount(doc: ContractDoc): number | null {
  if (doc.amount === undefined || doc.amount === null || doc.amount === '') return null;
  const value = Number(doc.amount);
  return Number.isFinite(value) ? value : null;
}

/** The body of the agreement, whichever field it was stored under. */
export function contractBody(doc: ContractDoc): string {
  return String(doc.terms || doc.scope || doc.description || '').trim();
}

export function contractTitle(doc: ContractDoc): string {
  return String(doc.title || '').trim() || 'Service Contract';
}

export function contractReference(doc: ContractDoc): string {
  return String(doc.number || doc.id || '').trim();
}
