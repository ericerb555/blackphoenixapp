/**
 * Sending an SMS through Bird, and what its config needs to be right.
 *
 * WHY THIS EXISTS
 *
 * Every SMS on this platform used to go through Twilio — one resolver and a
 * dozen inline call sites. The account has moved to Bird and twilio.ts is
 * deleted: this is now the only SMS transport, and every caller goes through
 * resolveBirdSms/sendBirdSms rather than learning Bird's request format.
 *
 * VOICE IS NEXT DOOR, IN birdVoice.ts
 *
 * Kept separate because the credentials differ: BIRD_SMS_FROM may be an
 * alphanumeric sender id, which is valid for a text and cannot place a call,
 * and Bird keys carry scopes so voice may need its own. OUTBOUND calls work
 * the same way as a text in the end — one request, an inline sequence in the
 * body — see birdVoice.ts.
 *
 * INBOUND is the half that genuinely differs: a call arriving on a Bird number
 * runs a published sequence or routes to SIP, and Bird webhooks report what a
 * call did rather than being asked what to do next. The AI attendant waits on
 * that. See tasks/ai-emergency-attendant.md.
 *
 * WHICH BIRD API
 *
 * Bird has two. The older Channels API addresses a workspace and a channel in
 * the path and needs both of their ids. The newer one is a single endpoint
 * that needs only the key, because the key itself carries the region:
 *
 *   POST https://<region>.platform.bird.com/v1/sms/messages
 *   Authorization: Bearer bk_<region>_…
 *   { "to": "+1…", "from": "<sender>", "text": "…", "category": "…" }
 *   → 202 Accepted, delivered asynchronously
 *
 * A key shaped `bk_us1_…` pairs with `https://us1.platform.bird.com`. The
 * region is read off the key rather than configured separately, so the host
 * and the key can never point at different regions — a mismatch Bird answers
 * with an opaque auth error. A key that is not in this shape is refused with a
 * message that says what a Bird v1 key looks like, rather than being sent to a
 * guessed endpoint.
 *
 * THE SENDER IS SEPARATE AND REQUIRED
 *
 * An SMS needs a FROM, and Bird will not invent one. BIRD_SMS_FROM holds it:
 * an E.164 number Bird has provisioned for the account, or a registered
 * alphanumeric sender id. Without it there is nothing to send as, and the
 * resolver says so rather than letting Bird reject the send with a vaguer code.
 */

/** The regional host a Bird v1 key belongs to, or null if the key isn't one. */
export function birdHostFromKey(key: unknown): string | null {
  const m = String(key ?? '').trim().match(/^bk_([a-z0-9]+)_/i);
  if (!m) return null;
  return `https://${m[1].toLowerCase()}.platform.bird.com`;
}

export interface BirdConfig {
  key: string;
  host: string;
  from: string;
  error?: string;
}

/** Reads and validates the Bird SMS config from env. */
export function resolveBirdSms(): BirdConfig {
  const key = (Deno.env.get('BIRD_API_SMS_KEY') || '').trim();
  const from = (Deno.env.get('BIRD_SMS_FROM') || '').trim();
  const empty = { key: '', host: '', from: '' };

  if (!key) {
    return { ...empty, error: 'SMS is not configured (BIRD_API_SMS_KEY is not set).' };
  }
  const host = birdHostFromKey(key);
  if (!host) {
    return { ...empty, error: 'BIRD_API_SMS_KEY is not a Bird v1 API key — it must start with "bk_<region>_", for example bk_us1_… . Check you copied the whole key from the Bird console.' };
  }
  if (!from) {
    return { ...empty, error: 'The SMS sender is not set. Put your Bird number in BIRD_SMS_FROM in E.164 form (e.g. +16035551234), or a registered alphanumeric sender id.' };
  }
  return { key, host, from };
}

/**
 * Turns a failed Bird response into something that names what to change.
 *
 * Mirrors describeTwilioError: the raw body is JSON with a code, and the codes
 * that actually recur in setup are worth translating rather than echoing.
 */
export function describeBirdError(status: number, body: string): string {
  let message: unknown = body;
  let code = '';
  try {
    const parsed = JSON.parse(body);
    message = parsed?.message ?? parsed?.error ?? body;
    code = String(parsed?.code || parsed?.type || '');
    // Bird nests the real reason under message.errors or a detail object, and a
    // bare `${message}` renders that as "[object Object]" — which hid the one
    // thing worth reading. Keep the whole body when the message is not a string.
    if (message && typeof message === 'object') message = JSON.stringify(parsed);
  } catch { /* keep the raw body */ }

  if (status === 401 || status === 403) {
    return `Bird rejected the API key (${status}). Confirm BIRD_API_SMS_KEY is the whole key from the Bird console and that its region (bk_<region>_…) matches the account.`;
  }
  if (status === 422 || status === 400) {
    return `Bird rejected the message (${status})${code ? ` [${code}]` : ''}: ${String(message).slice(0, 500)}. Check the recipient is E.164 and that BIRD_SMS_FROM is a sender this account may send from.`;
  }
  return `Bird SMS failed (${status})${code ? ` [${code}]` : ''}: ${String(message).slice(0, 500)}`;
}

export interface SmsResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send one SMS to one recipient.
 *
 * `category` is Bird's required classification, and it is a CLOSED set —
 * 'transactional', 'marketing', 'authentication' or 'service'. Bird rejects
 * anything else with a 422 (it rejected the first test send for exactly this:
 * a made-up 'notification'). The default is 'transactional', which is what the
 * messages this app sends are — invites, order updates, alerts; a one-time
 * code should pass 'authentication'. 202 is success: Bird has accepted it and
 * delivers asynchronously, so a 2xx means queued, not yet delivered.
 */
export const BIRD_CATEGORIES = ['transactional', 'marketing', 'authentication', 'service'] as const;

export async function sendBirdSms(
  to: string, text: string, category: string = 'transactional',
): Promise<SmsResult> {
  if (!BIRD_CATEGORIES.includes(category as any)) category = 'transactional';
  const cfg = resolveBirdSms();
  // Same reasoning as the failure log below: this is now the only SMS
  // transport, so "not configured" has to be visible to somebody reading logs
  // rather than only to whoever happened to make the request.
  if (cfg.error) {
    console.log(`[Bird][SMS NOT SENT] ${cfg.error}`);
    return { ok: false, error: cfg.error };
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.host}/v1/sms/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, from: cfg.from, text, category }),
    });
  } catch (e: any) {
    const error = `Bird could not be reached: ${e?.message || e}`;
    console.log(`[Bird][SMS FAILED] ${error}`);
    return { ok: false, error };
  }

  if (res.status !== 202 && !res.ok) {
    const body = await res.text().catch(() => '');
    const error = describeBirdError(res.status, body);
    /**
     * Logged, not just returned.
     *
     * Found by reading production logs: four test sends failed with 502 on
     * 2026-11-11 and the reason reached nobody — the caller got a string in a
     * response body and the log recorded only the status code. Every SMS on
     * this platform now leaves through here, so a failure nobody can read is a
     * failure nobody can fix. The key is never in `error`; `describeBirdError`
     * builds its message from the status and Bird's own body.
     */
    console.log(`[Bird][SMS FAILED] ${res.status} to ${to.slice(0, 6)}…: ${error}`);
    return { ok: false, error };
  }
  const body = await res.json().catch(() => ({} as any));
  return { ok: true, id: body?.id || body?.messageId };
}
