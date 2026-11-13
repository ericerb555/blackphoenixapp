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
 * The ring needs its own two: `BIRD_API_VOICE_KEY` (the SMS key is the
 * fallback, since Bird keys carry scopes) and `BIRD_VOICE_FROM`, which must be
 * a dialable number — an alphanumeric SMS sender id cannot place a call. See
 * `birdVoice.ts`.
 */

import { e164, pageText, pageSpeech } from "./onCallMessage.ts";
import { resolveBirdSms } from "./bird.ts";
import { sendTextMessage } from "./sendSms.ts";
import { placeBirdVoiceCall } from "./birdVoice.ts";
import { sendCompanyEmail } from "./email-center.tsx";

export { e164, pageText, pageSpeech };

/**
 * Escaped, not trusted.
 *
 * The address, the trade and the title on a call come from whatever a tenant
 * typed into a work request. They are about to be interpolated into an HTML
 * email, which is the one place in this file where untrusted text becomes
 * markup somebody's mail client will render.
 */
const escapeHtml = (value: unknown): string => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export interface PageAttempt {
  contactId: string;
  name: string;
  phone: string;
  sms: "sent" | "failed" | "skipped";
  voice: "called" | "failed" | "skipped";
  /** The stopgap. See the note on EMAIL IS NOT A PAGE. */
  email: "sent" | "failed" | "skipped";
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
 * A correction worth keeping, because it was briefly wrong in the direction
 * that matters.
 *
 * When Twilio was removed this said the ring "could not be ported" and
 * recorded every voice attempt as skipped. That was wrong: Bird's Create Call
 * API accepts an INLINE sequence definition, so an outbound page is one
 * request with `voice.say` in the body — the direct analogue of the inline
 * TwiML it replaced, with no console setup and no callback URL to host. See
 * `birdVoice.ts`.
 *
 * The ring is back. It still reports honestly when it cannot be placed,
 * because that is this file's whole premise.
 */

/**
 * Page one rung of a rota.
 *
 * Text first, then ring. The text is what they read when they wake; the call is
 * what wakes them. Sending the text second would mean a phone ringing about
 * something with no detail attached.
 *
 * Both go out per contact, and each is recorded separately on the attempt. A
 * rung where the text sent and the call failed is a materially different thing
 * from one where neither did, and whoever reads the record at 7am needs to be
 * able to tell them apart.
 */
export async function pageContacts(
  call: any,
  contacts: Array<{ id?: string; name?: string; phone?: string; email?: string }>,
  opts: { voice?: boolean } = {},
): Promise<PageOutcome> {
  const reachable = (contacts || []).filter((c) => e164(String(c?.phone || "")));
  if (reachable.length === 0) {
    return { paged: false, attempts: [], reason: "nobody on this rung has a usable number" };
  }
  /**
   * A broken SMS config no longer ends this function.
   *
   * It used to return here, which meant that when texting was unavailable
   * nothing else was tried either. That was defensible while SMS was the
   * channel; it is not now that there is a second one. The reason is recorded
   * per attempt and the email below still goes.
   */
  const sms = resolveBirdSms();
  if (sms.error) {
    console.log(`[OnCall] SMS unavailable for call ${call?.id}: ${sms.error}`);
  }

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
      email: "skipped",
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
    if (sms.error) {
      attempt.sms = "failed";
      attempt.detail = sms.error.slice(0, 300);
    } else {
      const result = await sendTextMessage(to, text, "service");
      if (result.ok) {
        attempt.sms = "sent";
      } else {
        attempt.sms = "failed";
        attempt.detail = String(result.error || "").slice(0, 300);
        console.log(`[OnCall] SMS to ${to} failed for call ${call?.id}: ${attempt.detail}`);
      }
    }

    /**
     * EMAIL IS NOT A PAGE, AND IT DOES NOT COUNT AS ONE.
     *
     * This file opens by saying nobody reads email at three in the morning,
     * and that is still true. It is here because on 2026-11-13 Bird refused
     * every text with E12014 — the sender is not registered to send to the
     * US, which is 10DLC registration and takes days — and the Bird ring has
     * never been proven against the live API. So the rota had NO working
     * channel at all, and an emergency would have been logged and nobody
     * woken. An email somebody reads in the morning is worse than a phone
     * ringing and far better than silence.
     *
     * Deliberately NOT counted in `paged` below. If it were, the loud
     * NOT PAGED line would stop firing and the escalation would believe
     * somebody had been reached — turning a visible failure into exactly the
     * silent one this file exists to prevent. A page means a person was
     * woken. This is a message in an inbox.
     *
     * REMOVE THIS once 10DLC is approved and the ring is proven. It is a
     * stopgap with a date on it, not a third channel.
     */
    const emailTo = String(contact.email || "").trim();
    if (emailTo) {
      try {
        const sent = await sendCompanyEmail({
          to: emailTo,
          subject: `EMERGENCY — ${call?.trade || "call-out"}${call?.siteAddress ? ` at ${call.siteAddress}` : ""}`,
          html: `<div style="font-family:sans-serif;max-width:600px;line-height:1.5">
            <p style="font-size:18px;font-weight:bold;color:#b91c1c;margin:0 0 12px">Emergency call-out</p>
            <p style="margin:0 0 12px">${escapeHtml(text)}</p>
            <table style="font-size:14px;border-collapse:collapse">
              <tr><td style="padding:2px 12px 2px 0;color:#666">Trade</td><td>${escapeHtml(call?.trade || "—")}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#666">Where</td><td>${escapeHtml(call?.siteAddress || "—")}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#666">Job</td><td>${escapeHtml(call?.jobId || "—")}</td></tr>
            </table>
            <p style="margin:16px 0 0;font-size:13px;color:#666">
              You are being emailed because text messaging is awaiting carrier
              registration. This is not a reliable way to reach you out of
              hours — if you are on call, please check your phone.
            </p>
          </div>`,
          templateKey: "on-call-emergency",
        });
        attempt.email = sent.ok ? "sent" : "failed";
        if (!sent.ok) {
          attempt.detail = [attempt.detail, String(sent.error || "").slice(0, 200)].filter(Boolean).join(" | ");
        }
      } catch (e: any) {
        // Never throws into the caller — see the header.
        attempt.email = "failed";
        console.log(`[OnCall] email to ${emailTo} failed for call ${call?.id}: ${e?.message || e}`);
      }
    }

    if (opts.voice !== false) {
      /**
       * The idempotency key is the call and the contact, never a fresh uuid.
       *
       * Bird requires one, and what it protects against here is a retry of a
       * rung becoming two phone calls to the same person about the same
       * emergency. Derived from facts that are stable across a retry, so the
       * second attempt is recognised as the same call rather than a new one.
       */
      const voiceResult = await placeBirdVoiceCall(
        to,
        speech,
        `oncall-${String(call?.id || "nocall")}-${attempt.contactId || to}`,
      );
      if (voiceResult.ok) {
        attempt.voice = "called";
      } else {
        attempt.voice = "failed";
        attempt.detail = [attempt.detail, String(voiceResult.error || "").slice(0, 300)]
          .filter(Boolean).join(" | ");
        console.log(`[OnCall] call to ${to} failed for call ${call?.id}: ${voiceResult.error}`);
      }
    }

    attempts.push(attempt);
  }

  /** A page woke somebody. Email did not — see the note above. */
  const paged = attempts.some((a) => a.sms === "sent" || a.voice === "called");
  const emailed = attempts.filter((a) => a.email === "sent").length;
  if (!paged) {
    console.log(
      `[OnCall][NOT PAGED] call ${call?.id}: every attempt failed`
      + (emailed ? ` — ${emailed} email(s) sent as a stopgap, which wakes nobody` : ""),
    );
  }
  return {
    paged,
    attempts,
    reason: paged
      ? null
      : emailed
        ? `nobody could be rung; ${emailed} email(s) sent instead, which wakes nobody`
        : "every attempt failed",
  };
}
