/**
 * Phoenix Exchange — whether somebody has proven they own a listing.
 *
 * Pure functions, no database and no network. Every rule about who gets
 * control of a business's public identity lives here, in one file that can be
 * read end to end and tested, rather than spread across a route handler where
 * the security argument has to be reassembled from four places.
 *
 * WHY KNOWING THINGS CANNOT BE THE TEST
 *
 * The directory is compiled from public records. The business's name, address
 * and phone number are printed on the very page an attacker would be
 * attacking, so anything a form could ask them to recite is already public.
 * The test is never "do you know this business" — it is "do you CONTROL
 * something only this business controls".
 *
 * TWO FACTORS, FROM TWO DIFFERENT CATEGORIES
 *
 *   contact      a code to the phone or email already in the public record
 *   web          a DNS record, a file on the domain, or an address at it
 *   premises     a code posted by mail to the public-record address
 *   credential   a licence that matches, or documents a person has read
 *
 * Two proofs in the SAME category do not count as two. A domain-matched email
 * and a DNS token both prove only "controls the domain", and letting them
 * stack would admit anybody who registered a lookalike. That is the single
 * most important line in this file.
 *
 * THREE WAYS OUT, AND NO FOURTH
 *
 *   granted       two categories proven
 *   needs_review  a person decides — because only one category was reachable
 *                 at all, or because the listing is already claimed
 *   refused       decided against, with a reason
 *
 * `needs_review` is not a polite refusal. A business with a phone number and
 * nothing else — no website, no email in the record — can reach exactly one
 * category, and that is most of a compiled directory's harder half. Refusing
 * them means they can never join; granting them on one fact means whoever can
 * receive one text gets the business. So a person looks. Eric agreed to that
 * queue on 2026-10-02, which is a commitment to working it: a review nobody
 * reads is auto-granting, slower, with a record that says somebody looked.
 */

/** How long a code or token is good for. Ten minutes, like every other OTP. */
export const CHALLENGE_TTL_MINUTES = 10;

/**
 * Five tries, then the challenge is dead and a new one must be issued.
 *
 * A six-digit code with unlimited attempts is a four-minute brute force. Five
 * is also mirrored by a check constraint on the table, because a limit that
 * lives only here is a limit until somebody is in a hurry.
 */
export const MAX_ATTEMPTS = 5;

/**
 * How many codes one listing may be sent in a day, across every claimant.
 *
 * Per LISTING rather than per claimant, which is the direction that matters:
 * the abuse is not somebody failing to type their own code, it is using our
 * server to text a stranger thirty times. The business whose number it is did
 * not ask to be in the directory and must not be punished for being in it.
 */
export const MAX_CHALLENGES_PER_ORG_PER_DAY = 6;

/** The incumbent's window when somebody else claims a listing they hold. */
export const DISPUTE_DAYS = 7;

export type FactorCategory = 'contact' | 'web' | 'premises' | 'credential';

/**
 * Every factor, and what it actually proves.
 *
 * `enabled: false` is a factor that is designed and switched off, which is an
 * honest state and a useful one — the engine knows the shape of it, nothing
 * offers it, and turning it on is one line rather than a design exercise.
 */
export interface FactorDefinition {
  factor: string;
  category: FactorCategory;
  /** Whether it can be offered today. */
  enabled: boolean;
  /** Whether satisfying it requires a person, rather than a secret matching. */
  manual: boolean;
  /** What the claimant is told they are about to do. */
  label: string;
}

export const FACTORS: FactorDefinition[] = [
  {
    factor: 'phone_code',
    category: 'contact',
    enabled: true,
    manual: false,
    label: 'Text or call a code to the number on the public record',
  },
  {
    factor: 'email_code',
    category: 'contact',
    enabled: true,
    manual: false,
    label: 'Email a link to the address on the public record',
  },
  {
    /**
     * An address AT the business's own domain. Separate from `email_code`
     * because it proves something different — control of the domain, not
     * receipt of the record's mail — and the same for `dns_token` below,
     * which is why neither stacks with the other.
     */
    factor: 'domain_email',
    category: 'web',
    enabled: true,
    manual: false,
    label: 'Email a link to an address at the business’s own domain',
  },
  {
    factor: 'dns_token',
    category: 'web',
    enabled: true,
    manual: false,
    label: 'Publish a TXT record on the business’s domain',
  },
  {
    /**
     * Designed, switched off. A factor nobody posts is a factor that silently
     * never completes, and the claimant waits for a letter that is not coming.
     * Turning it on is an operational commitment, not a code change.
     */
    factor: 'postal_code',
    category: 'premises',
    enabled: false,
    manual: false,
    label: 'Post a code to the address on the public record',
  },
  {
    /**
     * A stored licence number compared against the record, and documents a
     * person reads. Not a live licence-board lookup: there is no API wired up,
     * and dressing a manual check as an automatic one would make the
     * strongest-sounding factor the weakest.
     */
    factor: 'licence_match',
    category: 'credential',
    enabled: true,
    manual: true,
    label: 'Licence number and state, checked against the licence record',
  },
  {
    factor: 'documents',
    category: 'credential',
    enabled: true,
    manual: true,
    label: 'Documents showing ownership, read by a person',
  },
];

/** The category a factor belongs to, or null if we do not recognise it. */
export function factorCategory(factor: unknown): FactorCategory | null {
  const found = FACTORS.find((f) => f.factor === String(factor ?? ''));
  return found ? found.category : null;
}

/** The definition of a factor we are willing to offer right now. */
export function enabledFactor(factor: unknown): FactorDefinition | null {
  const found = FACTORS.find((f) => f.factor === String(factor ?? ''));
  return found && found.enabled ? found : null;
}

export interface ChallengeRow {
  factor?: string | null;
  category?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  attempts?: number | null;
  max_attempts?: number | null;
  satisfied_at?: string | null;
  burned_at?: string | null;
}

/**
 * Whether a challenge can still be answered.
 *
 * Reasons are returned rather than a bare false, because the route has to tell
 * the claimant something true and the audit trail has to record which of these
 * it was. A spent challenge and a brute-forced one look identical from
 * outside and are very different facts.
 */
export type ChallengeRefusal =
  | 'already_satisfied'
  | 'burned'
  | 'expired'
  | 'attempts_exhausted'
  | 'no_secret';

export function challengeUsable(
  row: ChallengeRow | null | undefined,
  nowIso: string,
): { usable: boolean; reason?: ChallengeRefusal } {
  if (!row) return { usable: false, reason: 'burned' };
  if (row.satisfied_at) return { usable: false, reason: 'already_satisfied' };
  if (row.burned_at) return { usable: false, reason: 'burned' };

  const attempts = Number(row.attempts ?? 0);
  const max = Number(row.max_attempts ?? MAX_ATTEMPTS);
  if (Number.isFinite(attempts) && Number.isFinite(max) && attempts >= max) {
    return { usable: false, reason: 'attempts_exhausted' };
  }

  // An UNPARSEABLE expiry is treated as expired. Failing the other way would
  // make a corrupt date an unlimited credential.
  const expires = Date.parse(String(row.expires_at ?? ''));
  const now = Date.parse(String(nowIso ?? ''));
  if (!Number.isFinite(expires) || !Number.isFinite(now)) {
    return { usable: false, reason: 'expired' };
  }
  if (expires <= now) return { usable: false, reason: 'expired' };

  return { usable: true };
}

/** When a challenge issued now should stop working. */
export function challengeExpiry(nowIso: string): string {
  const now = Date.parse(String(nowIso ?? ''));
  const base = Number.isFinite(now) ? now : Date.now();
  return new Date(base + CHALLENGE_TTL_MINUTES * 60 * 1000).toISOString();
}

/**
 * Whether another code may be sent for this listing today.
 *
 * Counts every challenge issued in the last 24 hours against the listing,
 * whoever asked for it, including ones that were satisfied — a satisfied code
 * still rang somebody's phone.
 */
export function withinIssueCap(
  issuedAt: Array<string | null | undefined>,
  nowIso: string,
  cap = MAX_CHALLENGES_PER_ORG_PER_DAY,
): boolean {
  const now = Date.parse(String(nowIso ?? ''));
  if (!Number.isFinite(now)) return false;
  const since = now - 24 * 60 * 60 * 1000;

  const recent = issuedAt.filter((value) => {
    const at = Date.parse(String(value ?? ''));
    return Number.isFinite(at) && at > since;
  }).length;

  return recent < cap;
}

/**
 * The categories proven by a set of challenges.
 *
 * Reads the category off the row rather than re-deriving it from the factor
 * name, so a factor that is later moved between categories does not silently
 * rewrite the history of claims already decided. Rows whose category is not
 * one we recognise are ignored entirely — an unknown proof proves nothing.
 */
export function provenCategories(challenges: ChallengeRow[]): FactorCategory[] {
  const known: FactorCategory[] = ['contact', 'web', 'premises', 'credential'];
  const seen = new Set<FactorCategory>();

  for (const row of challenges ?? []) {
    if (!row?.satisfied_at) continue;
    if (row.burned_at) continue;
    const category = String(row.category ?? '') as FactorCategory;
    if (known.includes(category)) seen.add(category);
  }

  return known.filter((c) => seen.has(c));
}

export interface ListingReachability {
  /** A phone number on the public record. */
  phone?: string | null;
  /** An email on the record. Not always the public one. */
  email?: string | null;
  /** The business's own website, which is what makes `web` reachable. */
  website?: string | null;
  /** A licence number already on the record. */
  licenseNumber?: string | null;
}

/**
 * Which categories this listing could EVER prove, given what we hold.
 *
 * The honest version of "what can you do", and the input to the one-category
 * review rule. A listing with a phone and nothing else can reach `contact`
 * and, because documents are always an option, `credential` — but `credential`
 * needs a person either way, so it does not rescue the listing from review.
 */
export function reachableCategories(listing: ListingReachability): FactorCategory[] {
  const out: FactorCategory[] = [];

  const has = (value: unknown) => String(value ?? '').trim().length > 0;

  if (has(listing.phone) || has(listing.email)) out.push('contact');
  if (has(listing.website)) out.push('web');
  // `premises` is designed and switched off, so it is not reachable today
  // however good the address is. Said here rather than implied, because the
  // day it is switched on this is the line that has to change.
  if (FACTORS.some((f) => f.category === 'premises' && f.enabled)) out.push('premises');
  // Documents are always available, so credential is always reachable — which
  // is exactly why two proofs that both need a person are not a pass.
  out.push('credential');

  return out;
}

export type ClaimDecision = 'granted' | 'needs_review' | 'open' | 'disputed';

export interface ClaimAssessment {
  decision: ClaimDecision;
  proven: FactorCategory[];
  /** Categories this claimant could still attempt without a person. */
  outstanding: FactorCategory[];
  /** Why, in a sentence, for the claim record and for the claimant. */
  reason: string;
}

/**
 * The whole decision, in one place.
 *
 * `alreadyClaimed` comes first and overrides everything: no quantity of proof
 * takes a listing off its current owner automatically. That is a dispute for a
 * person to rule on, because the legitimate version of this — a business sold
 * last month — and the attack look identical from here.
 */
export function assessClaim(input: {
  challenges: ChallengeRow[];
  listing: ListingReachability;
  alreadyClaimed: boolean;
}): ClaimAssessment {
  const proven = provenCategories(input.challenges ?? []);

  if (input.alreadyClaimed) {
    return {
      decision: 'disputed',
      proven,
      outstanding: [],
      reason:
        'This listing is already claimed. The current owner has been told and a '
        + 'person will rule on it.',
    };
  }

  if (proven.length >= 2) {
    return {
      decision: 'granted',
      proven,
      outstanding: [],
      reason: `Proven by ${proven.join(' and ')}.`,
    };
  }

  const reachable = reachableCategories(input.listing);

  // Categories still worth attempting: reachable, not already proven, and
  // servable by a factor that does not need a person. A second manual factor
  // is not progress, it is the same queue twice.
  const outstanding = reachable.filter(
    (category) =>
      !proven.includes(category)
      && FACTORS.some((f) => f.category === category && f.enabled && !f.manual),
  );

  // Nothing automatic left to try, so this is as far as it goes on its own.
  if (outstanding.length === 0) {
    return {
      decision: 'needs_review',
      proven,
      outstanding: [],
      reason: proven.length === 1
        ? `Only ${proven[0]} could be proven for this listing, so a person will check it.`
        : 'This listing cannot be verified automatically, so a person will check it.',
    };
  }

  return {
    decision: 'open',
    proven,
    outstanding,
    reason: proven.length === 0
      ? 'Nothing proven yet.'
      : `${proven[0]} proven. One more, of a different kind, is needed.`,
  };
}

/**
 * When a dispute may be ruled on.
 *
 * Stored on the claim rather than computed when it is read, so changing the
 * policy later cannot retroactively decide a dispute already running.
 */
export function disputeDeadline(nowIso: string, days = DISPUTE_DAYS): string {
  const now = Date.parse(String(nowIso ?? ''));
  const base = Number.isFinite(now) ? now : Date.now();
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * A six-digit code, uniformly distributed.
 *
 * `% 1000000` over a 32-bit value is very slightly biased toward the low
 * codes; rejection sampling costs nothing here and removes the question.
 */
export function sixDigitCode(): string {
  const limit = 1_000_000;
  // The largest multiple of `limit` inside 2^32, so everything above it is
  // discarded rather than folded back over the bottom of the range.
  const ceiling = Math.floor(0xFFFFFFFF / limit) * limit;
  const buf = new Uint32Array(1);

  for (let i = 0; i < 64; i += 1) {
    crypto.getRandomValues(buf);
    if (buf[0] < ceiling) return String(buf[0] % limit).padStart(6, '0');
  }
  // Practically unreachable: one in 2^64 of arriving here. Taking the modulus
  // is a better outcome than throwing in the middle of a claim.
  crypto.getRandomValues(buf);
  return String(buf[0] % limit).padStart(6, '0');
}

/**
 * What the claimant is shown instead of the destination.
 *
 * The registry contact is not always the public one, so the claim screen must
 * not become a way to read a phone number or an email address that is not on
 * the listing page. Enough to recognise your own, never enough to learn
 * somebody else's.
 */
export function maskPhone(phone: unknown): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `••• ••• ${digits.slice(-4)}`;
}

export function maskEmail(email: unknown): string {
  const value = String(email ?? '').trim();
  const at = value.lastIndexOf('@');
  if (at < 1) return '••••';

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  // The domain is shown in full: it is how somebody recognises which of their
  // addresses this is, and for `domain_email` it is a fact they supplied.
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

/**
 * The registrable domain of a website, for comparing an email address against.
 *
 * Deliberately simple and deliberately strict: scheme must be http or https,
 * `www.` is dropped, everything else is compared literally. It does NOT try to
 * work out public suffixes — treating `co.uk` as a domain would be a bug, and
 * treating a subdomain as the apex would let `claims.example.com.attacker.net`
 * pass. Returns null rather than a guess.
 */
export function websiteDomain(website: unknown): string | null {
  const raw = String(website ?? '').trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  // A bare label, an IP address or anything without a dot is not a domain we
  // will accept proof against.
  if (!host.includes('.') || /^[\d.]+$/.test(host)) return null;

  return host;
}

/**
 * Whether an email address sits at the business's own domain.
 *
 * Exact match on the registrable host, or a subdomain of it. `example.com`
 * accepts `mail.example.com` and refuses `example.com.attacker.net`, which is
 * the whole reason this is a function and not a `.includes`.
 */
export function emailMatchesDomain(email: unknown, website: unknown): boolean {
  const domain = websiteDomain(website);
  if (!domain) return false;

  const value = String(email ?? '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 1 || at === value.length - 1) return false;

  const host = value.slice(at + 1);
  if (host.includes('@') || host.includes(' ')) return false;

  return host === domain || host.endsWith(`.${domain}`);
}
