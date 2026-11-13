/**
 * Where consent is kept, and the one question every send asks.
 *
 * `smsConsent.ts` holds the rules and is pure. This touches the store, and is
 * deliberately thin: read, decide, write. The split is the usual one — the
 * argument about who may be texted is testable without a database, and this
 * only has to be a faithful caller of it.
 *
 * KEYED BY NUMBER, IN E.164
 *
 * `sms_consent:+16175550123`. Normalised on the way in and on the way out, so
 * a STOP arriving as `+1 617 555 0123` finds the record written from a form
 * that stored `(617) 555-0123`. A consent store that cannot match its own
 * records is worse than none: it would answer "nobody has opted out" to every
 * question, confidently.
 */

import * as kv from "./kv_store.tsx";
import { e164 } from "./onCallMessage.ts";
import {
  normalizeConsent, withDecision, maySend, UNKNOWN,
  type ConsentRecord, type ConsentMethod, type ConsentStatus, type SmsCategory,
  type SendDecision,
} from "./smsConsent.ts";

const KEY = (phone: string) => `sms_consent:${phone}`;

/** Everything here agrees on one spelling of a number, or none of it works. */
export function consentKeyFor(raw: unknown): string {
  const normalized = e164(String(raw ?? ""));
  return normalized ? KEY(normalized) : "";
}

export async function readConsent(raw: unknown): Promise<ConsentRecord | null> {
  const phone = e164(String(raw ?? ""));
  if (!phone) return null;
  try {
    const stored = await kv.get(KEY(phone));
    return stored ? normalizeConsent(stored, phone) : UNKNOWN(phone);
  } catch {
    /**
     * A store that will not read answers `unknown`, not `granted`.
     *
     * That blocks marketing and lets operational traffic through, which is
     * the same shape as having no record — the safe direction in both halves.
     */
    return UNKNOWN(phone);
  }
}

export async function recordConsent(raw: unknown, decision: {
  status: ConsentStatus;
  method: ConsentMethod;
  wording?: string;
  source?: string;
}): Promise<ConsentRecord | null> {
  const phone = e164(String(raw ?? ""));
  if (!phone) return null;
  const current = (await readConsent(phone)) || UNKNOWN(phone);
  const next = withDecision(current, decision);
  await kv.set(KEY(phone), next);
  console.log(
    `[SMS consent] ${phone.slice(0, 6)}… ${decision.status} via ${decision.method}`
    + `${decision.source ? ` (${decision.source})` : ""}`,
  );
  return next;
}

/** The question `sendSms` asks before every message. */
export async function maySendTo(raw: unknown, category: SmsCategory): Promise<SendDecision> {
  const record = await readConsent(raw);
  return maySend(record, category);
}

export type { ConsentRecord };
