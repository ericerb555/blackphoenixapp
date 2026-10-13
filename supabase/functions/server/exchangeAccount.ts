/**
 * What a resident's own Exchange record contains, and what it must not.
 *
 * The rules here are small and the reason they are a separate, tested module
 * is that getting one of them wrong is a privacy failure rather than a bug.
 * `.ts` rather than `.tsx` so the test runner can load it at all.
 */

/** Every kind the lead ledger records. */
export type LeadKind =
  | "viewed" | "revealed" | "called" | "website"
  | "messaged" | "requested" | "quoted" | "awarded";

/**
 * The kinds that belong in somebody's enquiry history.
 *
 * `viewed` is deliberately absent, and it is the most important line in this
 * file. The ledger records a page view, so a history built from every kind
 * would be a list of everything a resident had so much as looked at — which is
 * surveillance wearing the costume of a feature, and would make the Exchange
 * exactly the thing it is positioned against. A person's history shows what
 * they DID: revealed a number, rang, opened a website, asked for something.
 *
 * It is also the more useful answer. "You looked at 340 shops" helps nobody.
 * "You rang these four" is a record worth keeping.
 */
export const ENQUIRY_KINDS: LeadKind[] = [
  "revealed", "called", "website", "messaged", "requested", "quoted", "awarded",
];

export function isEnquiry(kind: unknown): boolean {
  return ENQUIRY_KINDS.includes(String(kind ?? "") as LeadKind);
}

/** How each kind reads to the person who did it, in their own words. */
const PHRASING: Record<LeadKind, string> = {
  viewed: "Looked at",
  revealed: "Showed their number",
  called: "Called",
  website: "Opened their website",
  messaged: "Messaged",
  requested: "Asked for a quote",
  quoted: "Received a quote",
  awarded: "Gave them the work",
  // "Showed their number" rather than "revealed contact details": the resident
  // tapped to see a phone number, and the sentence should describe that rather
  // than describe the database.
};

export function phraseEnquiry(kind: unknown): string {
  const key = String(kind ?? "") as LeadKind;
  return PHRASING[key] ?? "Got in touch";
}

/**
 * The filter every read of the lead ledger for an account MUST carry.
 *
 * Returned as a value rather than applied inline so that a test can assert it
 * exists and is not empty. The ledger has no row-level security — it is
 * reached only with the service role — so this filter is the whole of the
 * protection between one resident's history and another's.
 *
 * Throws rather than returning something harmless when the id is missing. A
 * query with no actor would return the entire ledger: every enquiry every
 * person has ever made. There is no sensible degraded answer, so it must not
 * be possible to ask for one by accident.
 */
export function actorFilter(userId: unknown): { actor_user_id: string } {
  const id = String(userId ?? "").trim();
  if (!id) throw new Error("an account read needs an actor; refusing to query the ledger unscoped");
  return { actor_user_id: id };
}

/**
 * Cap on how much history is returned in one go.
 *
 * Not for performance — nobody has thousands — but so that a response size
 * cannot grow without somebody deciding it should.
 */
export const HISTORY_LIMIT = 200;
