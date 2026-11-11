/**
 * Sending an SMS through Bird, and what its config needs to be right.
 *
 * WHY THIS EXISTS
 *
 * Every SMS on this platform went through Twilio — one resolver in twilio.ts
 * and a dozen inline call sites. The account is moving to Bird: the secret
 * BIRD_API_SMS_KEY is set, and nothing reads it yet. This is the Bird half of
 * twilio.ts, so a caller gets the same shape — resolve, send, a readable error
 * — without learning Bird's request format.
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
  let message = body;
  let code = '';
  try {
    const parsed = JSON.parse(body);
    message = parsed?.message || parsed?.error || body;
    code = String(parsed?.code || parsed?.type || '');
  } catch { /* keep the raw body */ }

  if (status === 401 || status === 403) {
    return `Bird rejected the API key (${status}). Confirm BIRD_API_SMS_KEY is the whole key from the Bird console and that its region (bk_<region>_…) matches the account.`;
  }
  if (status === 422 || status === 400) {
    return `Bird rejected the message (${status})${code ? ` [${code}]` : ''}: ${message}. Check the recipient is E.164 and that BIRD_SMS_FROM is a sender this account may send from.`;
  }
  return `Bird SMS failed (${status})${code ? ` [${code}]` : ''}: ${String(message).slice(0, 300)}`;
}

export interface SmsResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send one SMS to one recipient.
 *
 * `category` is Bird's required classification of the message — the honest
 * default here is 'notification' for the transactional messages this app
 * sends (invites, order updates, alerts); a caller sending a one-time code
 * should pass 'authentication'. 202 is success: Bird has accepted it and will
 * deliver asynchronously, so a 2xx means queued, not yet delivered.
 */
export async function sendBirdSms(
  to: string, text: string, category = 'notification',
): Promise<SmsResult> {
  const cfg = resolveBirdSms();
  if (cfg.error) return { ok: false, error: cfg.error };

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
    return { ok: false, error: `Bird could not be reached: ${e?.message || e}` };
  }

  if (res.status !== 202 && !res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: describeBirdError(res.status, body) };
  }
  const body = await res.json().catch(() => ({} as any));
  return { ok: true, id: body?.id || body?.messageId };
}
