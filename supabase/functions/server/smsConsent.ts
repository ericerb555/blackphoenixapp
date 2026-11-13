/**
 * Who has agreed to be texted, and who has told us to stop.
 *
 * WHY THIS EXISTS
 *
 * Two reasons, and the second is the one with teeth.
 *
 * The honest one: people are entitled to not be texted, and a business that
 * makes that hard is one they stop trusting. Someone who replies STOP has
 * said something unambiguous and the software should act like it heard.
 *
 * The one that costs money: US carriers enforce this through 10DLC. A
 * campaign is approved on the strength of a described opt-in, complaints are
 * measured against the number that sent them, and a number with complaints is
 * suspended. On this account ONE number sends everything — portal invites,
 * order updates, bid invitations and the ON-CALL EMERGENCY PAGES. So a
 * marketing complaint does not cost a marketing channel. It costs the
 * emergency line.
 *
 * WHAT THE EXISTING FLAG WAS NOT
 *
 * `sms_contact.optedIn` defaulted to TRUE — `b.optedIn !== false` — on a
 * contact somebody typed in by hand. That is an assumption recorded as a
 * fact, which is the shape of the thing a carrier asks you to produce and you
 * cannot. Consent has to say WHEN, HOW, and WHAT WORDS they agreed to, or it
 * is not evidence of anything.
 *
 * KEYED BY PHONE NUMBER, NOT BY ACCOUNT
 *
 * Because STOP arrives from a handset. The person texting it may have three
 * accounts or none, and the only thing the message carries is the number. A
 * consent model keyed on anything else cannot honour the one input that
 * legally must be honoured.
 *
 * THE THREE STATES ARE NOT TWO
 *
 * `unknown` is its own answer and must never be collapsed into either of the
 * others. It means nobody has asked. Reading it as granted is how a platform
 * texts people who never agreed; reading it as revoked would silently stop
 * every order update and every emergency page on this system today, since
 * nothing has ever recorded consent. Both failures are silent, which is why
 * `maySend` answers per CATEGORY rather than with a single boolean.
 */

export type ConsentStatus = 'granted' | 'revoked' | 'unknown';

export type ConsentMethod =
  /** Ticked a box on a form, with the wording recorded. */
  | 'signup-form'
  /** Replied START/UNSTOP after a previous opt-out. */
  | 'keyword'
  /** Staff recorded a verbal or written agreement made elsewhere. */
  | 'staff'
  /** Replied STOP. Only ever produces `revoked`. */
  | 'stop-keyword'
  /** Used the opt-out page. Only ever produces `revoked`. */
  | 'web-form';

export interface ConsentRecord {
  /** E.164. The key, and the only thing an inbound STOP carries. */
  phone: string;
  status: ConsentStatus;
  /** When the CURRENT status was set. */
  at: string;
  method: ConsentMethod | null;
  /**
   * The exact words shown when they agreed.
   *
   * Stored rather than referenced, because the form's wording will change and
   * what matters is what THIS person was shown on the day. A carrier asking
   * for proof of opt-in is asking for this sentence.
   */
  wording?: string;
  /** Where it happened — a form id, a page, an admin's email. */
  source?: string;
  /** Kept so a revocation does not erase the fact that consent once existed. */
  history: Array<{
    status: ConsentStatus;
    at: string;
    method: ConsentMethod | null;
    source?: string;
  }>;
}

/** Bird's categories, which are also the closed set this decides against. */
export type SmsCategory = 'marketing' | 'transactional' | 'authentication' | 'service';

const STOP_WORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'optout', 'opt-out'];
const START_WORDS = ['start', 'unstop', 'yes', 'optin', 'opt-in', 'subscribe'];

/**
 * What an inbound message is asking for, if anything.
 *
 * Carriers require STOP to work, and in practice people write "Stop",
 * "STOP.", "please stop" and "unsubscribe me". Matching the bare word only
 * would ignore most real opt-outs, so the first word is taken and stripped of
 * punctuation — while a sentence merely CONTAINING "stop" ("the leak won't
 * stop") must not unsubscribe somebody reporting an emergency.
 */
export function readKeyword(text: unknown): 'stop' | 'start' | null {
  const words = String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;

  // "please stop" and "stop" both count; "the leak will not stop" does not.
  const candidates = words.length <= 2 ? words : [words[0]];
  for (const word of candidates) {
    if (STOP_WORDS.includes(word)) return 'stop';
    if (START_WORDS.includes(word)) return 'start';
  }
  return null;
}

export const UNKNOWN = (phone: string): ConsentRecord => ({
  phone,
  status: 'unknown',
  at: '',
  method: null,
  history: [],
});

/** A stored record, cleaned. Anything unreadable becomes `unknown`, never granted. */
export function normalizeConsent(raw: any, phone: string): ConsentRecord {
  const status: ConsentStatus =
    raw?.status === 'granted' || raw?.status === 'revoked' ? raw.status : 'unknown';
  const history = Array.isArray(raw?.history) ? raw.history.slice(-50) : [];
  return {
    phone,
    status,
    at: String(raw?.at ?? ''),
    method: (raw?.method ?? null) as ConsentMethod | null,
    wording: raw?.wording ? String(raw.wording).slice(0, 1000) : undefined,
    source: raw?.source ? String(raw.source).slice(0, 200) : undefined,
    history,
  };
}

/** Record a decision, keeping what came before it. */
export function withDecision(
  current: ConsentRecord,
  decision: {
    status: ConsentStatus;
    method: ConsentMethod;
    at?: string;
    wording?: string;
    source?: string;
  },
): ConsentRecord {
  const at = decision.at || new Date().toISOString();
  return {
    ...current,
    status: decision.status,
    at,
    method: decision.method,
    wording: decision.wording ?? current.wording,
    source: decision.source,
    /**
     * Appended, never replaced. Somebody who opted in, out and in again is a
     * different story from somebody who opted in once, and the carrier
     * question is always "show me the consent you were relying on when you
     * sent that message".
     */
    history: [
      ...current.history,
      { status: decision.status, at, method: decision.method, source: decision.source },
    ].slice(-50),
  };
}

export interface SendDecision {
  allowed: boolean;
  /** Said in words, because it is written into a log somebody has to read. */
  reason: string;
}

/**
 * May this category go to this number?
 *
 * REVOKED IS ABSOLUTE. Somebody who said stop gets nothing, whatever the
 * category — including the operational traffic that might otherwise be
 * defensible. The alternative is deciding on their behalf which of our
 * messages they really meant, which is not a judgement to make on somebody
 * who has already been clear.
 *
 * MARKETING REQUIRES A YES. `unknown` is not a yes. This is the rule the
 * 10DLC campaign is approved on.
 *
 * OPERATIONAL TRAFFIC MAY GO TO `unknown`. An order update, a portal invite
 * somebody asked a colleague to send them, a page to this company's own
 * on-call engineer — these answer a relationship that already exists, and
 * nothing on this platform has ever recorded consent, so reading `unknown` as
 * a refusal would silently switch off every one of them, the emergency pages
 * included. That is a worse failure than the one it would prevent, and it
 * would be invisible.
 */
export function maySend(record: ConsentRecord | null, category: SmsCategory): SendDecision {
  const status = record?.status ?? 'unknown';

  if (status === 'revoked') {
    const when = record?.at ? ` on ${record.at.slice(0, 10)}` : '';
    return { allowed: false, reason: `this number opted out${when} and must not be texted` };
  }

  if (category === 'marketing') {
    if (status === 'granted') return { allowed: true, reason: 'opted in' };
    return {
      allowed: false,
      reason: 'marketing needs a recorded opt-in and this number has none',
    };
  }

  return {
    allowed: true,
    reason: status === 'granted' ? 'opted in' : 'operational message to an existing relationship',
  };
}

/** The sentence a form must show to make `granted` mean anything. */
export const CONSENT_WORDING =
  'I agree to receive text messages about my account, projects and service '
  + 'from The Black Phoenix Company at this number. Message and data rates may '
  + 'apply. Reply STOP at any time to opt out.';

/**
 * What a recipient is told on the way out.
 *
 * Sent once, in reply to STOP, and deliberately short: a confirmation is the
 * only message a carrier expects after an opt-out, and anything resembling
 * persuasion in it is the thing complaints are made about.
 */
export const STOP_CONFIRMATION =
  'You have been unsubscribed and will not receive further texts from '
  + 'The Black Phoenix Company. Reply START to opt back in.';
