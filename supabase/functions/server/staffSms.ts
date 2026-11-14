/**
 * Texting the office when something arrives.
 *
 * Eric, 2026-11-14: "i should get sms messaged when a price come in as well."
 *
 * WHY THIS IS SEPARATE FROM THE EMAIL THAT ALREADY GOES
 *
 * `staff-notifications.tsx` reaches the key-value store and is a `.tsx`, and
 * the test runner strips types from `.ts` only — so a rule living there cannot
 * be checked by hand. What decides whether somebody's phone buzzes, and what it
 * says when it does, is exactly the kind of rule that should be.
 *
 * AN SMS IS NOT A SHORTER EMAIL
 *
 * It costs money per message, it arrives wherever the person is standing, and
 * it cannot be skimmed and archived — so it earns a different bar. Three rules
 * follow, and they are the whole of this file:
 *
 *   OPT IN PER EVENT, SEPARATELY FROM EMAIL. Somebody wanting an email for
 *   every portal application does not want their phone going off for each one.
 *   `smsEvents` is its own list; an empty one means no texts, and that is the
 *   default for everybody who has not asked.
 *
 *   A NUMBER WE CAN ACTUALLY SEND TO. E.164 or it is not a number, and a
 *   silent failure at the carrier is indistinguishable from nothing happening.
 *
 *   SHORT, AND USEFUL ON ITS OWN. A text that says "you have a notification"
 *   has spent money to make somebody go and look. The figure goes in the
 *   message.
 */

import type { StaffNotificationEvent } from "./staff-notifications.tsx";

/** What we will send to. E.164: a plus, a country code, then digits. */
export function normalisePhone(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Strip the punctuation people type — (603) 207-2248 is a phone number.
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";

  if (digits.startsWith("+")) {
    return /^\+[1-9]\d{6,15}$/.test(digits) ? digits : "";
  }
  /*
   * A bare ten-digit number is North American, and assuming so is safe here
   * because this is a list of this company's own staff rather than of
   * customers. Eleven digits starting with 1 is the same number typed with its
   * country code and no plus.
   */
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  return "";
}

export interface SmsSubscriber {
  phone?: string;
  enabled?: boolean;
  smsEvents?: string[];
}

/**
 * Who should be texted about this event.
 *
 * The env list is for the account that must always be reachable without
 * anybody having configured a screen first — the same role
 * `ADMIN_NOTIFICATION_EMAILS` plays for email. Subscribers are added to it,
 * de-duplicated by the normalised number so the same phone typed two ways is
 * one phone and one message.
 */
export function phonesForEvent(
  event: StaffNotificationEvent | string,
  subscribers: SmsSubscriber[],
  envList: string,
): string[] {
  const out = new Set<string>();

  for (const entry of String(envList || "").split(",")) {
    const phone = normalisePhone(entry);
    if (phone) out.add(phone);
  }

  for (const row of Array.isArray(subscribers) ? subscribers : []) {
    if (!row || row.enabled === false) continue;
    if (!Array.isArray(row.smsEvents) || !row.smsEvents.includes(String(event))) continue;
    const phone = normalisePhone(row.phone);
    if (phone) out.add(phone);
  }

  return [...out];
}

/** The longest we will send. One segment is 160; this allows a short two. */
export const SMS_MAX = 300;

/**
 * What the text says.
 *
 * Built from the same payload the email renders from, but it is not the email
 * cut down — it is the two or three facts somebody standing in a yard can act
 * on, and then where to go. The company name leads so it is identifiable
 * before it is opened.
 */
export function smsBody(input: {
  company: string;
  subject: string;
  rows?: Array<[string, unknown]>;
  /** Rows worth a text. Others are left for the email. */
  keep?: string[];
  url?: string;
}): string {
  const keep = input.keep || [];
  const facts = (input.rows || [])
    .filter(([label]) => keep.some((k) => k.toLowerCase() === String(label).toLowerCase()))
    .map(([label, value]) => `${label}: ${String(value ?? "").trim()}`)
    .filter((line) => !line.endsWith(": ") && !line.endsWith(": —"));

  const parts = [`${input.company}: ${input.subject}`];
  if (facts.length) parts.push(facts.join(" · "));
  if (input.url) parts.push(input.url);

  const text = parts.join("\n");
  return text.length > SMS_MAX ? `${text.slice(0, SMS_MAX - 1)}…` : text;
}
