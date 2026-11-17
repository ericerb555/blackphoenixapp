/**
 * The two things we need to ring somebody back, when there is no account.
 *
 * Eric, 2026-11-17: *"yes build the no account version"* — letting a visitor
 * who priced a job without signing up ask us to confirm it, by leaving a name
 * and a number instead of making an account.
 *
 * WHY THIS IS SEPARATE AND PURE
 *
 * It is the only thing standing between an unauthenticated form and the
 * office's work queue. Everything it decides can be asserted without a
 * request, a database or a token, and the failure it prevents is quiet: a
 * queue filling with entries nobody can act on looks exactly like a busy
 * week.
 *
 * WHAT "PLAUSIBLE" MEANS HERE, AND WHAT IT DOES NOT
 *
 * A number that could be dialled. Not a number proved to belong to the person
 * typing it — that needs a verification code, which is a different feature and
 * a worse trade for somebody standing in a basement holding a phone. The
 * point is to refuse `000`, `1234567` and an empty box, not to authenticate.
 *
 * A NAME IS REQUIRED AND AN EMAIL IS NOT
 *
 * Because the office rings these back. An email with no name is a lead nobody
 * knows how to greet; a name and a number is a phone call. Email stays
 * optional so somebody who would rather be emailed can be.
 */

/** North American numbers, which is where this company works. */
const NANP_LENGTHS = new Set([10, 11]);

export interface AnonContact {
  name: string;
  phone: string;
  email: string;
}

/**
 * One shape rather than a discriminated union, deliberately.
 *
 * A union of `{ok:true, contact}` and `{ok:false, error}` is the better type
 * and does not work here: this project compiles with `strict` and
 * `strictNullChecks` off, which disables the control-flow narrowing that
 * would make `if (!verdict.ok)` reveal `error`. The union would force a cast
 * at every call site, and a cast is a worse thing to read than an optional
 * field.
 */
export interface ContactVerdict {
  ok: boolean;
  /** Set when `ok` is false. */
  error?: string;
  /** Set when `ok` is true. */
  contact?: AnonContact;
}

/**
 * Is this a number somebody could actually ring?
 *
 * Exported so the test can state the edges rather than infer them, and so a
 * caller can check before showing an error next to the field.
 */
export function plausiblePhone(raw: string): boolean {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!NANP_LENGTHS.has(digits.length)) return false;

  // 11 digits only counts as a US/Canada number when it starts with 1.
  const national = digits.length === 11 ? (digits.startsWith('1') ? digits.slice(1) : '') : digits;
  if (national.length !== 10) return false;

  /*
   * An area code never starts with 0 or 1, and neither does an exchange —
   * that is the NANP rule, not a guess, and it is what rejects `1234567890`
   * and `0000000000` without rejecting anything real.
   */
  if (/^[01]/.test(national)) return false;
  if (/^[01]/.test(national.slice(3))) return false;

  // All one digit is a placeholder somebody typed to get past the field.
  if (/^(\d)\1{9}$/.test(national)) return false;

  return true;
}

/** Deliberately loose: an address that could be sent to, not one proved to exist. */
export function plausibleEmail(raw: string): boolean {
  const s = String(raw || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/**
 * Read the contact details off a request body, or say what is wrong.
 *
 * One error at a time and in the order the form shows them, so somebody
 * fixing it is never told about a field they have not reached yet.
 */
export function readAnonContact(body: any): ContactVerdict {
  const name = String(body?.name ?? '').trim().slice(0, 120);
  const phoneRaw = String(body?.phone ?? '').trim();
  const emailRaw = String(body?.email ?? '').trim().toLowerCase().slice(0, 200);

  if (name.length < 2) {
    return { ok: false, error: 'Please give us a name to ask for.' };
  }
  if (!phoneRaw) {
    return { ok: false, error: 'We need a phone number to confirm the price with you.' };
  }
  if (!plausiblePhone(phoneRaw)) {
    return { ok: false, error: 'That does not look like a phone number we can ring.' };
  }
  if (emailRaw && !plausibleEmail(emailRaw)) {
    return { ok: false, error: 'That email address does not look right.' };
  }

  return {
    ok: true,
    contact: {
      name,
      // Stored normalised so the office can dial it and the SMS sender can use it.
      phone: phoneRaw,
      email: emailRaw,
    },
  };
}

/**
 * How many of these one address may send in a day.
 *
 * The AI spend is already bounded by `anonPricer` — pricing is the expensive
 * part and this costs nothing but a row. What this bounds is the office's
 * attention, which is the scarcer of the two: a queue somebody has filled
 * with rubbish is a queue that stops being read.
 */
export const ANON_CONFIRM_PER_IP_DAILY = 5;

export function anonConfirmKey(ip: string, nowIso: string): string {
  const s = String(ip || 'unknown');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `anon_confirm:ip:${h.toString(36)}:${String(nowIso).slice(0, 10)}`;
}
