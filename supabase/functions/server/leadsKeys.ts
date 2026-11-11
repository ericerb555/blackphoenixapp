/**
 * How a lead is addressed in the store. Pure, so `node --test` can hold it.
 *
 * WHY THESE LIVE APART FROM leadsStore.ts
 *
 * The store imports the database client and cannot be loaded by the test
 * runner. The one piece of this worth testing is not the plumbing — it is that
 * the two key spaces never collide and that an email is normalised the same way
 * on write and on lookup, because a mismatch there silently defeats dedup and
 * lets the same person become two leads.
 *
 * THE DESIGN THESE KEYS ENCODE
 *
 * Every lead was one element of a single `leads:all` array. A public endpoint
 * read that whole array, changed one entry, and wrote the whole thing back on
 * every capture — so two captures at once lost one of each other, and the
 * document grew without bound under a flood. Quotes, invoices and work requests
 * on this platform are each stored under their own key and listed by prefix;
 * leads were the exception, and that exception was the bug.
 *
 *   lead:<id>              the lead itself, written and read on its own
 *   lead_email:<email>     a pointer to that id, so "have we seen this address"
 *                          is one get rather than a scan of everything
 *
 * The two prefixes are disjoint: `getByPrefix('lead:')` compiles to
 * `LIKE 'lead:%'`, and `lead_email:` has an underscore where that pattern wants
 * a colon, so a listing of leads never sweeps up the pointers. The test proves
 * it rather than trusting the eye.
 */

export const LEAD_PREFIX = 'lead:';
export const LEAD_EMAIL_PREFIX = 'lead_email:';

/** Lower-cased and trimmed, the one normalisation used everywhere. */
export const normalizeEmail = (email: unknown): string =>
  String(email ?? '').trim().toLowerCase();

export const leadKey = (id: string): string => `${LEAD_PREFIX}${id}`;

/** The pointer key for an address. Normalised, so case can never fork a lead. */
export const emailPointerKey = (email: unknown): string =>
  `${LEAD_EMAIL_PREFIX}${normalizeEmail(email)}`;

/**
 * Newest first, which is the order the old `unshift` into the array produced
 * and the order every screen expects. Prefix listings have no inherent order,
 * so it is restored here rather than left to the database.
 */
export const sortByCapturedDesc = (leads: any[]): any[] =>
  [...leads].sort((a, b) =>
    String(b?.capturedAt || '').localeCompare(String(a?.capturedAt || '')));
