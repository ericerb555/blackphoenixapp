/**
 * onCallPaging — actually waking somebody up.
 *
 * WHY SMS AND A PHONE CALL RATHER THAN EMAIL
 *
 * Eric's decision, and the reasoning is the whole feature: nobody reads email
 * at three in the morning, so an email-only on-call system is a record of an
 * emergency rather than a response to one. A text arrives with a noise, and a
 * ringing phone is the only thing that reliably wakes a person.
 *
 * WHAT IT COSTS, AND WHY THAT SHAPES IT
 *
 * Every message and every call is real money and a woken person, so this fires
 * on exactly one thing: a routed call whose outcome is `rota`, for the contacts
 * on one rung, once. It is never called speculatively, never for a preview, and
 * never for the outcomes that mean nobody should be woken — `office-hours`
 * above all.
 *
 * IT NEVER THROWS
 *
 * The caller is the path that saves work requests for the whole platform. Every
 * failure here is caught and recorded on the call, because a failure to page is
 * something a person must be able to SEE — a silent one is the worst possible
 * outcome, since everybody assumes the rota handled it.
 *
 * CREDENTIALS
 *
 * `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_PHONE_NUMBER` — the
 * same three the SMS invite and the marketing sender already use, deliberately,
 * so there is one Twilio account to configure rather than a second set of
 * secrets that mean the same thing. With none of them set, this records that it
 * could not page and says so loudly rather than failing quietly.
 */

import { e164, pageText, pageSpeech } from "./onCallMessage.ts";

export { e164, pageText, pageSpeech };

export interface PageAttempt {
  contactId: string;
  name: string;
  phone: string;
  sms: "sent" | "failed" | "skipped";
  voice: "called" | "failed" | "skipped";
  detail?: string;
  at: string;
}

export interface PageOutcome {
  paged: boolean;
  attempts: PageAttempt[];
  /** Why nothing was sent, when nothing was. */
  reason: string | null;
}

function credentials() {
  return {
    sid: Deno.env.get("TWILIO_ACCOUNT_SID") || "",
    token: Deno.env.get("TWILIO_AUTH_TOKEN") || "",
    from: Deno.env.get("TWILIO_PHONE_NUMBER") || "",
  };
}

export function pagingConfigured(): boolean {
  const { sid, token, from } = credentials();
  return Boolean(sid && token && from);
}

async function twilioPost(path: string, body: URLSearchParams): Promise<any> {
  const { sid, token } = credentials();
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
    },
    body,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.message || `Twilio responded ${res.status}`);
  return payload;
}

/**
 * Page one rung of a rota.
 *
 * Text first, then ring. The text is what they read when they wake; the call is
 * what wakes them. Sending the text second would mean a phone ringing about
 * something with no detail attached.
 *
 * The TwiML is inline rather than fetched from a URL, so this needs no public
 * callback endpoint — one less thing to host, secure and keep reachable, and a
 * callback URL that is unreachable at 3am is a phone call that never happens.
 */
export async function pageContacts(
  call: any,
  contacts: Array<{ id?: string; name?: string; phone?: string }>,
  opts: { voice?: boolean } = {},
): Promise<PageOutcome> {
  const reachable = (contacts || []).filter((c) => e164(String(c?.phone || "")));
  if (reachable.length === 0) {
    return { paged: false, attempts: [], reason: "nobody on this rung has a usable number" };
  }
  if (!pagingConfigured()) {
    // Said loudly. A rota that cannot be paged looks identical to one that was.
    console.log(
      `[OnCall][NOT PAGED] call ${call?.id}: Twilio is not configured `
      + `(TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER). `
      + `${reachable.length} contact(s) were NOT rung.`,
    );
    return { paged: false, attempts: [], reason: "Twilio is not configured on this server" };
  }

  const { from } = credentials();
  const text = pageText(call);
  const speech = pageSpeech(call);
  const attempts: PageAttempt[] = [];

  for (const contact of reachable) {
    const to = e164(String(contact.phone || ""));
    const attempt: PageAttempt = {
      contactId: String(contact.id || ""),
      name: String(contact.name || ""),
      phone: to,
      sms: "skipped",
      voice: "skipped",
      at: new Date().toISOString(),
    };

    try {
      await twilioPost("Messages.json", new URLSearchParams({ To: to, From: from, Body: text }));
      attempt.sms = "sent";
    } catch (e: any) {
      attempt.sms = "failed";
      attempt.detail = String(e?.message || e).slice(0, 300);
      console.log(`[OnCall] SMS to ${to} failed for call ${call?.id}: ${attempt.detail}`);
    }

    if (opts.voice !== false) {
      try {
        await twilioPost("Calls.json", new URLSearchParams({
          To: to,
          From: from,
          Twiml: `<Response><Say voice="alice">${speech}</Say><Pause length="1"/><Say voice="alice">${speech}</Say></Response>`,
        }));
        attempt.voice = "called";
      } catch (e: any) {
        attempt.voice = "failed";
        attempt.detail = [attempt.detail, String(e?.message || e).slice(0, 300)].filter(Boolean).join(" | ");
        console.log(`[OnCall] call to ${to} failed for call ${call?.id}: ${e?.message || e}`);
      }
    }

    attempts.push(attempt);
  }

  const paged = attempts.some((a) => a.sms === "sent" || a.voice === "called");
  if (!paged) {
    console.log(`[OnCall][NOT PAGED] call ${call?.id}: every attempt failed`);
  }
  return {
    paged,
    attempts,
    reason: paged ? null : "every attempt failed",
  };
}
