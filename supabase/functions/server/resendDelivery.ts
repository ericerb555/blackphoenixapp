/**
 * What happened to an email AFTER we handed it over.
 *
 * Eric, 2026-11-20: *"I GOT THE EMAIL OF ACCOUNT CREATION BUT NOT THE PRICING
 * APPROVAL"* — and the log could not tell him which of those was true.
 *
 * THE GAP
 *
 * `staff-notifications` writes one record per send: recipients, subject,
 * `status: 'sent'`, and the provider's response. That is everything up to the
 * moment Resend accepts the message and nothing after it. The estimate alert
 * he was chasing is in there, accepted, with a message id —
 *
 *     status            sent
 *     providerResponse  {"id":"01a1f685-da4a-7ed1-ac58-3d2e4e7815f3"}
 *     recipients        blackphoenixbuilds@proton.me, ericerb555@proton.me
 *
 * — and that record looks identical whether the mail landed in his inbox,
 * bounced at Proton, or was filed as spam. All 61 logged sends look identical
 * for the same reason. "Sent" is not "arrived", and the difference is the
 * entire question somebody asks when they did not get an email.
 *
 * Resend will tell us, over a webhook. This module is the part worth testing:
 * verifying the signature, deciding what an event means, and applying it to a
 * record. The route in `index.tsx` does the IO.
 *
 * WHY THE SIGNATURE IS NOT OPTIONAL HERE
 *
 * This endpoint mutates our own delivery record by email id, and the ids are
 * not secret — they appear in provider dashboards and in any forwarded alert.
 * An unsigned endpoint would let anybody mark a bounced message delivered, so
 * the one question this exists to answer could be answered wrongly on
 * purpose. With no secret configured it refuses everything: a webhook nobody
 * has finished wiring should be visibly dead, not quietly trusting.
 */

/** Resend's delivery events, mapped to what we record. */
const STATE_BY_EVENT: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

/**
 * What a Resend event type means for a record, or null to ignore it.
 *
 * `email.opened` and `email.clicked` are deliberately absent. They are not
 * delivery facts, they depend on a tracking pixel the recipient may block,
 * and recording when a person read their mail is a decision for Eric rather
 * than a side effect of fixing a bounce log.
 */
export function deliveryStateFor(eventType: unknown): string | null {
  return STATE_BY_EVENT[String(eventType || '')] ?? null;
}

/**
 * How far along the delivery is, so a later event cannot undo a later one.
 *
 * Providers do not promise ordering, and a retried webhook can arrive after
 * the one that followed it. Without a rank, a redelivered `email.sent` lands
 * on top of a `bounced` and the record says the mail is fine.
 *
 * `bounced` and `complained` outrank everything: they are terminal facts
 * about a message that did not get where it was going, and nothing after them
 * makes that untrue.
 */
const RANK: Record<string, number> = {
  sent: 0, delayed: 1, delivered: 2, complained: 3, bounced: 4,
};

/** True when `next` is at least as far along as `current`. */
export function advances(current: unknown, next: string): boolean {
  const a = RANK[String(current || '')] ?? -1;
  const b = RANK[next] ?? -1;
  return b >= a;
}

export interface ResendEvent {
  type?: unknown;
  created_at?: unknown;
  data?: { email_id?: unknown; to?: unknown; subject?: unknown; bounce?: { message?: unknown } } | null;
}

/** The message id an event is about, as a string, or '' when it has none. */
export function emailIdOf(event: ResendEvent | null | undefined): string {
  return String(event?.data?.email_id ?? '').trim();
}

/**
 * Does this log record belong to that message?
 *
 * `providerResponse` is stored as the raw response TEXT, truncated to 500
 * characters — `{"id":"01a1f685-…"}` — rather than a parsed object, so this
 * reads the id out of whichever shape it finds and falls back to a substring
 * test for a record written by some older version.
 */
export function recordMatches(record: any, emailId: string): boolean {
  if (!emailId) return false;
  const raw = record?.providerResponse;
  if (raw == null) return false;
  if (typeof raw === 'object') return String((raw as any).id ?? '') === emailId;
  const text = String(raw);
  try {
    const parsed = JSON.parse(text);
    if (String(parsed?.id ?? '') === emailId) return true;
  } catch { /* not JSON, fall through to the substring test */ }
  return text.includes(emailId);
}

/**
 * The record as it should be stored once this event is applied.
 *
 * Returns null when there is nothing to do — an event we do not record, or
 * one that would move the record backwards. A null means "write nothing",
 * which keeps the caller from rewriting a row to the same value on every
 * redelivery.
 *
 * `status` is updated alongside `delivery` so the existing log readers, which
 * know only about `status`, start telling the truth without being changed.
 */
export function applyResendEvent(record: any, event: ResendEvent): any | null {
  const state = deliveryStateFor(event?.type);
  if (!state) return null;
  if (!advances(record?.delivery?.state, state)) return null;

  const at = String(event?.created_at || new Date().toISOString());
  const detail = state === 'bounced'
    ? String(event?.data?.bounce?.message || '').slice(0, 300) || null
    : null;

  return {
    ...record,
    status: state,
    delivery: {
      state,
      at,
      ...(detail ? { detail } : {}),
      /* Kept so a bounce can be read without cross-referencing the send. */
      to: record?.recipients ?? null,
    },
  };
}

/* ── the signature ───────────────────────────────────────────────────────── */

/**
 * Resend signs with Svix: HMAC-SHA256 over `id.timestamp.body`, base64, in a
 * header that may carry several space-separated versioned signatures.
 *
 * The secret arrives as `whsec_<base64>`; the bytes after the prefix are the
 * key. A secret without the prefix is accepted as raw base64, because that is
 * how it is shown in some dashboards and a mis-paste should fail loudly on
 * the signature rather than silently on the prefix.
 */
export async function verifyResendSignature(opts: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
  signatureHeader: string;
  /** Seconds of clock skew allowed either way. Replay window. */
  toleranceSeconds?: number;
  now?: () => number;
}): Promise<{ ok: boolean; reason?: string }> {
  const { secret, id, timestamp, body, signatureHeader } = opts;
  if (!secret) return { ok: false, reason: 'no signing secret configured' };
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'missing svix headers' };

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return { ok: false, reason: 'bad timestamp' };
  const nowSeconds = Math.floor((opts.now?.() ?? Date.now()) / 1000);
  const tolerance = opts.toleranceSeconds ?? 300;
  if (Math.abs(nowSeconds - sentAt) > tolerance) return { ok: false, reason: 'timestamp outside the replay window' };

  const keyMaterial = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(keyMaterial), (ch) => ch.charCodeAt(0));
  } catch {
    return { ok: false, reason: 'signing secret is not base64' };
  }

  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
  const expected = btoa(String.fromCharCode(...mac));

  /*
   * Constant time, and over every offered signature.
   *
   * Svix sends `v1,<sig> v1,<sig2>` during a secret rotation, so one of
   * several may be the right one. A plain `includes` would be both wrong
   * about versions and a timing oracle.
   */
  for (const part of signatureHeader.split(' ')) {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) continue;
    if (timingSafeEqual(value, expected)) return { ok: true };
  }
  return { ok: false, reason: 'no signature matched' };
}

/** Compares without leaking where two strings first differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
