/**
 * onCallNumbers — which account a dialled number belongs to.
 *
 * WHY THIS IS A DIRECTORY AND NOT A FIELD
 *
 * The dialled number is the only thing an inbound call carries that says whose
 * emergency this is. Everything downstream — whose rota is paged, whose
 * contracted vendor holds an exclusive agreement, whose spending limit
 * applies — hangs off the answer. So it is looked up in one place, keyed by
 * the number, and a number belongs to exactly one account.
 *
 * WHY ONE ACCOUNT AND NOT SEVERAL
 *
 * Because two accounts claiming one number is not an ambiguity to resolve at
 * 3am by guessing; it is a configuration error, and the only safe moment to
 * refuse it is when somebody saves it. `claimConflict` is what makes that
 * refusal possible, and it answers before the second claim is written rather
 * than after a caller has been routed to the wrong building.
 *
 * Pure. The router next door does the reading and writing.
 */

import { e164 } from './onCallMessage.ts';

export { e164 };

/**
 * A number Twilio points at us, and what it means.
 *
 * `address` is the building when the number serves one — an association's
 * single tower, a homeowner's house. With it the attendant never has to ask
 * where, which removes the question most likely to be answered wrongly by
 * somebody in a panic.
 */
export interface NumberAssignment {
  /** E.164. The directory key. */
  number: string;
  accountEmail: string;
  /** What a person calls this line: "Maple Court main line". */
  label: string;
  /** The single property this line serves, when it serves one. */
  propertyId: string | null;
  address: string;
  /** Off keeps the record and stops the attendant answering on it. */
  enabled: boolean;
  assignedAt: string;
  assignedBy: string;
}

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** A claim cleaned to something storable, or null when the number is unusable. */
export function normalizeAssignment(raw: any, by: {
  accountEmail: string;
  at?: string;
}): NumberAssignment | null {
  const number = e164(str(raw?.number, 32));
  // A number Twilio will not dial is a line that silently never rings. Refused
  // here rather than stored and discovered on the first emergency.
  if (!number || number.replace(/\D/g, '').length < 10) return null;
  return {
    number,
    accountEmail: String(by.accountEmail || '').toLowerCase(),
    label: str(raw?.label, 120) || number,
    propertyId: str(raw?.propertyId, 80) || null,
    address: str(raw?.address, 300),
    enabled: raw?.enabled !== false,
    assignedAt: str(raw?.assignedAt, 40) || by.at || new Date().toISOString(),
    assignedBy: str(raw?.assignedBy, 160) || String(by.accountEmail || '').toLowerCase(),
  };
}

/** The directory key for a number, however it was typed. */
export function numberKey(raw: string): string {
  const normalized = e164(String(raw || ''));
  return normalized ? `on_call_number:${normalized}` : '';
}

/**
 * Does this claim collide with one already held?
 *
 * Re-saving your own number is not a conflict — that is an edit. Somebody
 * else's is, and it is refused.
 */
export function claimConflict(
  existing: NumberAssignment | null,
  claimingEmail: string,
): string | null {
  if (!existing) return null;
  const mine = String(claimingEmail || '').toLowerCase();
  if (existing.accountEmail === mine) return null;
  return `${existing.number} is already assigned to another account. `
    + 'A number can only answer for one account; remove it there first.';
}

/**
 * Who this call is for, from the number that was dialled.
 *
 * A disabled assignment answers nothing rather than answering for the account
 * anyway: switching the line off has to actually switch it off.
 */
export function assignmentFor(
  directory: NumberAssignment[],
  dialled: string,
): NumberAssignment | null {
  const wanted = e164(String(dialled || ''));
  if (!wanted) return null;
  const found = directory.find((entry) => e164(entry.number) === wanted) || null;
  if (!found || !found.enabled) return null;
  return found;
}

/**
 * Is the caller somebody this account already knows?
 *
 * Soft on purpose. A match is used to greet somebody by name and to skip the
 * address question; a miss is used for nothing at all. An emergency line that
 * refuses to take a call from an unrecognised number is a line that fails on
 * the night a neighbour rings about a fire, so this never gates the dispatch.
 */
export function recognizeCaller(
  from: string,
  known: Array<{ name?: string; phone?: string; unit?: string; address?: string; propertyId?: string }>,
): { name: string; unit: string; address: string; propertyId: string | null } | null {
  const wanted = e164(String(from || ''));
  if (!wanted) return null;
  for (const person of known || []) {
    if (!person?.phone) continue;
    if (e164(person.phone) !== wanted) continue;
    return {
      name: str(person.name, 120),
      unit: str(person.unit, 40),
      address: str(person.address, 300),
      propertyId: str(person.propertyId, 80) || null,
    };
  }
  return null;
}
