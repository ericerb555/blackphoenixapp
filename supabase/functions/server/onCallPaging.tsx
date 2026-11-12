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
 * `BIRD_API_SMS_KEY` and `BIRD_SMS_FROM`, through `bird.ts` — the same two the
 * invite and the marketing sender use, deliberately, so there is one account to
 * configure rather than a second set of secrets meaning the same thing. With
 * them unset this records that it could not page and says so loudly rather than
 * failing quietly.
 *
 * THE PHONE CALL IS CURRENTLY MISSING, AND THAT IS STATED RATHER THAN HIDDEN
 *
 * The account moved off Twilio. Bird's voice product is not a TwiML
 * equivalent — see the note on VOICE_NOT_WIRED below — so the text is sent and
 * the ring is recorded as skipped with its reason, on the record and in the
 * log. Read `tasks/ai-emergency-attendant.md` for what closing that needs.
 */

import { e164, pageText, pageSpeech } from "./onCallMessage.ts";
import { resolveBirdSms, sendBirdSms } from "./bird.ts";

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

export function pagingConfigured(): boolean {
  return !resolveBirdSms().error;
}

/**
 * Why the phone no longer rings, and why that is said rather than hidden.
 *
 * This used to place a voice call through Twilio with inline TwiML. The
 * account has moved to Bird, whose voice product is not a TwiML-equivalent:
 * an inbound or outbound call runs a *published sequence* built in Bird's
 * console, and Bird's webhooks report what a call did rather than being asked
 * what it should do next. So the voice leg cannot be ported by swapping a URL,
 * and a guess written into the one code path whose job is to wake somebody at
 * three in the morning is worse than an honest gap.
 *
 * Until a Bird sequence exists and its id is in `BIRD_VOICE_SEQUENCE_ID`, the
 * text is sent and the voice attempt is recorded as `skipped` with this reason
 * attached — which is visible on the call record and in the log, because the
 * whole point of this file is that a page which did not happen must never look
 * like one that did.
 */
const VOICE_NOT_WIRED =
  "voice paging is not configured — Bird needs a published call sequence (set BIRD_VOICE_SEQUENCE_ID)";

function voiceConfigured(): boolean {
  return Boolean((Deno.env.get("BIRD_VOICE_SEQUENCE_ID") || "").trim());
}

/**
 * Page one rung of a rota.
 *
 * Text first, then ring. The text is what they read when they wake; the call is
 * what wakes them. Sending the text second would mean a phone ringing about
 * something with no detail attached.
 *
 * Only the text is sent today. `pageSpeech` is still exported and still the
 * right words — it is what a Bird sequence will read out — and keeping it here
 * rather than deleting it is deliberate: the words were the part that took
 * thought, and the gap is the transport.
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
  const sms = resolveBirdSms();
  if (sms.error) {
    // Said loudly. A rota that cannot be paged looks identical to one that was.
    console.log(
      `[OnCall][NOT PAGED] call ${call?.id}: ${sms.error} `
      + `${reachable.length} contact(s) were NOT rung.`,
    );
    return { paged: false, attempts: [], reason: sms.error };
  }

  const text = pageText(call);
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

    /**
     * `service` rather than `transactional`.
     *
     * Bird's category is a closed set and it is what the carrier sees. An
     * emergency page is operational service traffic, not a receipt, and
     * classifying it honestly is what keeps it out of the filtering that
     * marketing-adjacent categories attract — on the one message that must
     * arrive.
     */
    const result = await sendBirdSms(to, text, "service");
    if (result.ok) {
      attempt.sms = "sent";
    } else {
      attempt.sms = "failed";
      attempt.detail = String(result.error || "").slice(0, 300);
      console.log(`[OnCall] SMS to ${to} failed for call ${call?.id}: ${attempt.detail}`);
    }

    if (opts.voice !== false && !voiceConfigured()) {
      // Recorded on the attempt, not swallowed: somebody reading this call
      // record has to be able to see that the phone never rang.
      attempt.voice = "skipped";
      attempt.detail = [attempt.detail, VOICE_NOT_WIRED].filter(Boolean).join(" | ");
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
