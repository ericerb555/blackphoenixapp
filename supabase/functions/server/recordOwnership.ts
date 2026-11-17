/**
 * Whose record is this, and may this caller read it?
 *
 * Its own module, with no imports, so the rule can be tested. The routes that
 * use it live in files that import `npm:` specifiers and cannot be loaded by
 * `node --test`, and a rule about who may read a customer's order history
 * deserves better than being checked by eye.
 *
 * WHAT IT IS FOR
 *
 * `docs/server-route-authorization.md` found 693 routes that check only that
 * somebody is signed in, 223 of which take a record id straight from the
 * request. That combination is not a boundary: every portal customer, tenant,
 * vendor and subcontractor is signed in, so "authenticated" separates them
 * from the public and from nobody else. These two functions are the missing
 * half — the part that asks whether this particular person owns this
 * particular record.
 *
 * WHY ONE FUNCTION FOR THE EMAIL
 *
 * The records this guards were written by different features over a long time
 * and keep the owner in four different places: `customer.email` on an
 * ecommerce order, `customerEmail` on an estimate, `stakeholderEmail` on a
 * subscription, plain `email` elsewhere. A guard that knew about one of them
 * would pass the others open, and it would do it silently, because a record
 * with no recognised owner field looks exactly like a record owned by nobody.
 * Hence `ownerEmailOf` in one place, and the test below that pins all four.
 */

/** The owner's email on a record, wherever that record happens to keep it. */
export function ownerEmailOf(record: any): string {
  return String(
    record?.customer?.email
    || record?.customerEmail
    || record?.stakeholderEmail
    || record?.email
    || '',
  ).trim().toLowerCase();
}

export interface Caller {
  email: string;
  staff: boolean;
}

/**
 * May this caller read this record?
 *
 * Staff see everything. Everyone else sees their own and nothing else.
 *
 * THE UNOWNED CASE IS A REFUSAL, NOT A PASS
 *
 * A record with no owner email — malformed, half-written, or a shape nobody
 * anticipated — is refused for non-staff. The alternative reads better and is
 * wrong: comparing `'' === ''` would make every unowned record readable by any
 * caller whose token happens to carry no email, which is the one case most
 * likely to turn up in practice and least likely to be noticed.
 */
export function mayReadRecord(who: Caller | null | undefined, record: any): boolean {
  if (!who) return false;
  if (who.staff) return true;

  const owner = ownerEmailOf(record);
  const asker = String(who.email || '').trim().toLowerCase();
  if (!owner || !asker) return false;
  return owner === asker;
}
