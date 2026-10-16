/**
 * A company's published refund policy, and which version applied to an order.
 *
 * WHY THIS IS A .ts AND NOT PART OF THE ROUTE
 *
 * It decides what a card network is shown about a charge somebody is
 * challenging, and the test runner strips types from `.ts` only — logic living
 * in a `.tsx` cannot be checked by hand. The rule that matters most here is
 * `policyInForce`, and it is the kind of rule nobody notices is wrong until a
 * year later when it is being read out in a dispute.
 *
 * WHY A POLICY IS VERSIONED AND SNAPSHOTTED
 *
 * Stripe's dispute evidence asks for the refund policy and for where the
 * customer saw it. The honest answer is the policy **as it stood on the day
 * they paid**, not the policy as it stands now — and the moment after a bad
 * dispute is exactly when somebody is tempted to go and edit it. A policy that
 * can be rewritten retroactively is not evidence; it is an assertion.
 *
 * So versions are append-only, each carries the date it took effect, and an
 * order keeps a frozen copy. `publishQuote.ts` makes the same argument about
 * frozen prices: *"Recomputing the price later answers 'what would this cost
 * today', which is a different question from 'what did we promise', and the
 * second is the one a customer holds us to."*
 *
 * PER COMPANY, BECAUSE THE ACCOUNTS ARE SEPARATE
 *
 * Each company is its own standalone Stripe account with its own key, bank and
 * dashboard — see the note at the top of `stripe-connect.tsx`. A dispute lands
 * on one account, so the policy that answers it is that company's. There is
 * deliberately no global default: see `policyInForce`.
 *
 * NOTHING HERE WRITES LEGAL TEXT
 *
 * This module stores, versions, validates and selects. The words are the
 * company's, entered by a person. A policy drafted by a model and published
 * without being read would be a term this business is bound by that nobody
 * chose, which is a worse failure than having no page.
 */

/** One clause of a policy. Kept structured so a page and a PDF can share it. */
export interface PolicySection {
  heading: string;
  body: string;
}

export interface PolicyVersion {
  /** Monotonic per company, starting at 1. */
  version: number;
  /** ISO date this version took effect. Orders before it are governed by an earlier one. */
  effectiveFrom: string;
  /** Null until somebody publishes it. A draft is never shown and never cited. */
  publishedAt: string | null;
  publishedBy?: string | null;
  sections: PolicySection[];
  /** Where a customer is told to write. */
  contactEmail?: string;
  /** Who last touched it, for the audit trail rather than for display. */
  updatedAt: string;
  updatedBy?: string | null;
}

export interface CompanyPolicy {
  companyId: string;
  companyName?: string;
  versions: PolicyVersion[];
}

/** The placeholder markers a draft carries while it is still a draft. */
const PLACEHOLDER = /\{\{|\bTODO\b|\bTBD\b|\bLOREM\b|XXXX/i;

/**
 * A yes, or a no with the reason.
 *
 * One interface with an optional `why` rather than a discriminated union of
 * `{ ok: true } | { ok: false; why: string }`. The union is the tidier type and
 * it does not survive this project's compiler settings: `strict` is
 * deliberately off (see the note in `tsconfig.json`), so narrowing on the
 * boolean literal does not hold and every reader of `.why` is a finding. A type
 * that only works under settings this repository has chosen not to use is the
 * wrong type for this repository.
 */
export interface Verdict {
  ok: boolean;
  /** Present only on a refusal, and phrased for whoever is publishing. */
  why?: string;
}

/**
 * Is this version fit to be published?
 *
 * Refuses rather than warns, and each refusal is a thing a bank would notice:
 *
 *   no sections          there is no policy, only a page
 *   an empty body        a heading with nothing under it reads as a deleted term
 *   a placeholder        {{company}} or TODO in a published policy is worse
 *                        than no policy, because it says nobody read it
 *   no effective date    a policy that cannot say when it started cannot be
 *                        matched to an order, which is its whole job here
 *
 * The short-body check is deliberately low — twenty characters. It is there to
 * catch "n/a" and "see invoice", not to have an opinion about length.
 */
export function canPublish(version: Partial<PolicyVersion> | null | undefined): Verdict {
  if (!version) return { ok: false, why: 'There is no policy to publish.' };

  const sections = Array.isArray(version.sections) ? version.sections : [];
  if (sections.length === 0) {
    return { ok: false, why: 'A policy with no sections is a page, not a policy.' };
  }

  for (const section of sections) {
    const heading = String(section?.heading || '').trim();
    const body = String(section?.body || '').trim();
    if (!heading) return { ok: false, why: 'One of the sections has no heading.' };
    if (body.length < 20) {
      return { ok: false, why: `"${heading}" has no real text under it.` };
    }
    if (PLACEHOLDER.test(heading) || PLACEHOLDER.test(body)) {
      return {
        ok: false,
        why: `"${heading}" still contains placeholder text. A published policy with `
          + 'a placeholder in it tells a card network that nobody read it.',
      };
    }
  }

  const from = Date.parse(String(version.effectiveFrom || ''));
  if (!Number.isFinite(from)) {
    return {
      ok: false,
      why: 'A policy needs the date it takes effect, or it cannot be matched to an order.',
    };
  }

  return { ok: true };
}

/** Published versions only, newest effective date first. */
export function publishedVersions(policy: CompanyPolicy | null | undefined): PolicyVersion[] {
  const versions = Array.isArray(policy?.versions) ? policy!.versions : [];
  return versions
    .filter((v) => v && v.publishedAt && Number.isFinite(Date.parse(String(v.effectiveFrom))))
    .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));
}

/**
 * The version that governed a charge made at `at`, or null.
 *
 * NULL IS A REAL AND IMPORTANT ANSWER. It means this company had no published
 * policy when that money was taken, and the only honest thing to tell a bank
 * is so. The temptation is to fall back to the current version — it is one line
 * and it would read fine on the screen — and it would be a false statement
 * about what the customer could have seen. The same reasoning as
 * `aiCeiling.ts`: *"SILENCE IS NOT A PROMISE."*
 *
 * There is also no fallback to another company's policy, for the obvious
 * reason: a different business's terms never governed this sale.
 */
export function policyInForce(
  policy: CompanyPolicy | null | undefined,
  at: string | number | Date,
): PolicyVersion | null {
  const when = at instanceof Date ? at.getTime() : Date.parse(String(at));
  if (!Number.isFinite(when)) return null;

  // Newest first, so the first one that had already taken effect is the one.
  for (const version of publishedVersions(policy)) {
    if (Date.parse(version.effectiveFrom) <= when) return version;
  }
  return null;
}

/** What a customer sees now, or null if this company has published nothing. */
export function currentPolicy(
  policy: CompanyPolicy | null | undefined,
  now: string | number | Date = Date.now(),
): PolicyVersion | null {
  return policyInForce(policy, now);
}

export interface PolicySnapshot {
  companyId: string;
  version: number;
  effectiveFrom: string;
  /** The URL the customer could have read it at. Stripe asks for this. */
  disclosureUrl: string;
  sections: PolicySection[];
  /** When this copy was taken — the moment of the sale, not of the dispute. */
  capturedAt: string;
  /**
   * Where the customer met it. `checkout` is the strong answer; `page` means
   * only that it was published somewhere they could have found.
   */
  shownAt: 'checkout' | 'page';
}

/**
 * Freeze the governing policy onto an order.
 *
 * Called when the money is taken, never when a dispute arrives — which is the
 * whole point. Returns null when there was nothing to freeze, and the caller
 * must record that absence rather than skip it: "no policy was published when
 * this sale happened" is a finding somebody should see long before a bank asks.
 */
export function policySnapshot(
  policy: CompanyPolicy | null | undefined,
  options: {
    at: string;
    disclosureUrl: string;
    shownAt?: 'checkout' | 'page';
  },
): PolicySnapshot | null {
  const version = policyInForce(policy, options.at);
  if (!version) return null;
  return {
    companyId: String(policy?.companyId || ''),
    version: version.version,
    effectiveFrom: version.effectiveFrom,
    disclosureUrl: String(options.disclosureUrl || ''),
    // Copied, not referenced. A reference would follow a later edit.
    sections: version.sections.map((s) => ({
      heading: String(s.heading),
      body: String(s.body),
    })),
    capturedAt: options.at,
    shownAt: options.shownAt === 'checkout' ? 'checkout' : 'page',
  };
}

/** The next version number for a company, so versions never collide or reuse. */
export function nextVersion(policy: CompanyPolicy | null | undefined): number {
  const versions = Array.isArray(policy?.versions) ? policy!.versions : [];
  const highest = versions.reduce(
    (max, v) => Math.max(max, Number(v?.version) || 0),
    0,
  );
  return highest + 1;
}
