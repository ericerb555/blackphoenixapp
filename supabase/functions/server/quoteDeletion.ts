/**
 * Which quotes are dangerous to delete, and what has to be said to do it.
 *
 * Eric: "i should be able to delete any quote with a fail safe of two
 * confirmations."
 *
 * WHY THIS IS NOT JUST A DIALOG
 *
 * Two of these cases were flat refusals, and the reasoning behind them was
 * sound. A signed quote is not a draft, it is evidence: it records what
 * somebody agreed to, when, and under what figures, and it is the document a
 * dispute is settled from. A quote that became a contract is worse — the
 * contract carries `quoteId` and reads back through it, so removing the
 * quote leaves the contract pointing at nothing.
 *
 * All still true. What was wrong was who decided. Refusing outright meant a
 * quote raised against the wrong customer, or signed by the wrong person,
 * could only be removed from a database console — so the real answer to an
 * ordinary mistake was "ask a developer", which is not an answer.
 *
 * The replacement is an acknowledgement, which is a different thing from a
 * confirmation. A confirmation asks "are you sure"; people click through
 * those. An acknowledgement makes the caller NAME the specific thing it is
 * overriding — `signed`, `has_contract` — and the server checks the names.
 * Two clicks in a browser cannot satisfy that by accident, and no caller
 * deletes a signed quote without the word "signed" having travelled.
 *
 * NOTHING HERE DELETES ANYTHING. It decides, so it can be tested; the route
 * does the work. Same split as `quoteDisposal` and `quotePhasePlan`, and for
 * the same reason — a rule that lives inside a Hono handler is a rule nobody
 * can run.
 */

export interface DeletionBlocker {
  /** The name the caller has to send back. */
  reason: 'signed' | 'has_contract';
  /** What it means, in words a person can act on. */
  detail: string;
}

/** Has the customer put their name to this? */
export function isSigned(quote: any): boolean {
  if (quote?.signature?.signedAt) return true;
  const decision = String(quote?.signature?.decision || '').trim().toLowerCase();
  return decision === 'approved' || decision === 'declined';
}

/** The contract raised from this quote, if there is one. */
export function contractFor(quoteId: string, contracts: any[]): any | null {
  const id = String(quoteId || '').trim();
  if (!id) return null;
  const rows = Array.isArray(contracts) ? contracts : [];
  return rows.find((row: any) => String(row?.quoteId || '').trim() === id) ?? null;
}

/**
 * Everything about this quote that somebody should have to say out loud.
 *
 * An empty list is the ordinary case — a draft nobody has seen — and means
 * the two confirmations in the editor are the whole failsafe.
 */
export function deletionBlockers(
  quote: any,
  quoteId: string,
  contracts: any[] = [],
): DeletionBlocker[] {
  const blockers: DeletionBlocker[] = [];

  if (isSigned(quote)) {
    blockers.push({
      reason: 'signed',
      detail: 'The customer signed this quote. It is the record of what they agreed to and what it cost.',
    });
  }

  const linked = contractFor(quoteId, contracts);
  if (linked) {
    blockers.push({
      reason: 'has_contract',
      detail:
        `Contract ${linked.title || linked.id} was created from this quote and reads back through it. `
        + 'Deleting this leaves that contract pointing at nothing.',
    });
  }

  return blockers;
}

/**
 * Read what the caller claims to accept, from a body or a query string.
 *
 * Both, because a DELETE carrying a body is awkward for some callers and
 * which one asked should not change whether the failsafe works.
 *
 * Anything unrecognised is simply not a match for a blocker, so a caller
 * cannot widen its own permission by inventing a reason — and a blanket
 * `acknowledge: ["*"]` buys nothing, which is deliberate.
 */
export function acknowledgementsFrom(body: any, query: unknown): Set<string> {
  const fromBody = Array.isArray(body?.acknowledge) ? body.acknowledge : [];
  const fromQuery = String(query ?? '').split(',');
  return new Set(
    [...fromBody, ...fromQuery]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  );
}

/** The blockers still unanswered. Empty means the delete may proceed. */
export function unacknowledged(
  blockers: DeletionBlocker[],
  acknowledged: Set<string> | string[],
): DeletionBlocker[] {
  const set = acknowledged instanceof Set ? acknowledged : new Set(acknowledged || []);
  return (Array.isArray(blockers) ? blockers : []).filter((b) => !set.has(b.reason));
}

/**
 * The record left behind.
 *
 * Deleting means deleting, so this is not a copy of the document — it is the
 * fact OF the deletion: which quote, whose, what it was worth, whether it had
 * been signed, who removed it and what they accepted in order to.
 *
 * It matters most in exactly the case this change unlocks. "Who deleted the
 * signed quote, and when?" is a question with a bad answer if nothing wrote
 * it down, and that answer gets read by a buyer's counsel rather than by us.
 */
export function deletionTombstone(
  quote: any,
  quoteId: string,
  opts: { deletedBy: string; acknowledged: string[]; blockers: DeletionBlocker[]; now?: string },
) {
  return {
    quoteId: String(quoteId),
    number: quote?.number || quote?.quoteNumber || null,
    customerEmail: quote?.customerEmail || quote?.clientEmail || null,
    customerName: quote?.customerName || quote?.clientName || null,
    total: Number(quote?.totalCost ?? quote?.total ?? quote?.grandTotal ?? 0) || 0,
    status: quote?.status || null,
    signedAt: quote?.signature?.signedAt || null,
    acknowledged: [...(opts.acknowledged || [])],
    blockers: (opts.blockers || []).map((b) => b.reason),
    deletedBy: String(opts.deletedBy || ''),
    deletedAt: opts.now || new Date().toISOString(),
  };
}
