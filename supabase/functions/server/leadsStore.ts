/**
 * The leads store: one key per lead, one pointer per email.
 *
 * This replaces a single `leads:all` array that every caller read whole and
 * every writer rewrote whole. The header of leadsKeys.ts has the why; this file
 * is the plumbing, kept thin and free of domain logic so the handlers that call
 * it stay the place where "what a lead is" is decided.
 *
 * The one invariant it keeps: every write sets both the lead and its email
 * pointer, every delete removes both. A caller never touches the pointer
 * directly, so the two cannot drift.
 */
import * as kv from './kv_store.tsx';
import {
  LEAD_PREFIX, leadKey, emailPointerKey, normalizeEmail, sortByCapturedDesc,
} from './leadsKeys.ts';

/** Every lead, newest first. The aggregate readers (stats, Phoenix) use this. */
export async function allLeads(): Promise<any[]> {
  const rows = (await kv.getByPrefix(LEAD_PREFIX)) as any[];
  return sortByCapturedDesc((rows || []).filter(Boolean));
}

export async function getLead(id: string): Promise<any | null> {
  if (!id) return null;
  return (await kv.get(leadKey(String(id)))) || null;
}

/**
 * The lead for an address, or null — in one pointer lookup rather than a scan.
 *
 * The pointer is resolved to the real lead and the email is re-checked, so a
 * stale pointer (an address that was reassigned, which this system does not
 * really do) can never return somebody else's record as a false match.
 */
export async function findLeadByEmail(email: unknown): Promise<any | null> {
  const norm = normalizeEmail(email);
  if (!norm) return null;
  const id = await kv.get(emailPointerKey(norm));
  if (!id) return null;
  const lead = await kv.get(leadKey(String(id)));
  if (lead && normalizeEmail(lead.email) === norm) return lead;
  return null;
}

/**
 * Write one lead and its pointer. The replacement for every `kv.set('leads:all',
 * …)` that followed a single-record change.
 */
export async function putLead(lead: any): Promise<void> {
  if (!lead?.id) throw new Error('A lead needs an id before it can be stored.');
  await kv.set(leadKey(String(lead.id)), lead);
  const norm = normalizeEmail(lead.email);
  if (norm) await kv.set(emailPointerKey(norm), String(lead.id));
}

export async function deleteLead(id: string): Promise<void> {
  if (!id) return;
  const lead = await kv.get(leadKey(String(id)));
  await kv.del(leadKey(String(id)));
  const norm = normalizeEmail(lead?.email);
  if (norm) await kv.del(emailPointerKey(norm));
}
