/**
 * Twilio credentials, and what its errors actually mean.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `deliverPortalInvite` needs both of these and moved to `portalInvite.ts`,
 * so they had to become importable. They are their own concern rather than
 * part of invites: anything on this server that sends an SMS wants the same
 * credential resolution and the same error translation.
 *
 * WHAT IT IS FOR
 *
 * Twilio accepts two auth styles — Account SID plus auth token, or an API Key
 * SID plus its secret — and silently fails with error 20003 when the wrong
 * identifier is in the wrong slot. That is the single most common Twilio
 * misconfiguration, and the raw error says only "authenticate", so
 * `describeTwilioError` translates the codes into something that names what
 * to change.
 *
 * Credentials are trimmed because a trailing newline from a pasted secret
 * breaks Basic auth in a way that looks identical to a wrong password.
 *
 * NOTE: `notifications.ts` still builds its own Twilio request inline. That
 * is the obvious next caller for this module; it was left alone here because
 * this move was already touching enough.
 *
 * Bodies unchanged from `index.tsx`.
 */

/**
 * Reads and validates the Twilio credentials from env, trimming stray
 * whitespace/newlines that break Basic auth. Supports BOTH auth styles:
 *   • Account SID (AC…) + Auth Token
 *   • API Key SID (SK…) + API Key Secret  (Account SID still used in the URL)
 * Returns a normalized shape or a human-readable `error`.
 */
export function resolveTwilioCreds(): { accountSid: string; authUser: string; authPass: string; from: string; error?: string } {
  const sid = (Deno.env.get('TWILIO_ACCOUNT_SID') || '').trim();
  const token = (Deno.env.get('TWILIO_AUTH_TOKEN') || '').trim();
  const from = (Deno.env.get('TWILIO_PHONE_NUMBER') || '').trim();
  const apiKeySid = (Deno.env.get('TWILIO_API_KEY_SID') || '').trim();
  const apiKeySecret = (Deno.env.get('TWILIO_API_KEY_SECRET') || '').trim();
  const empty = { accountSid: '', authUser: '', authPass: '', from: '' };
  if (!sid || !token || !from) return { ...empty, error: 'SMS is not configured (Twilio env vars missing: need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).' };
  if (!sid.startsWith('AC')) {
    // The Account SID must be the AC… identifier. An API Key (SK…) or anything
    // else here is the #1 cause of Twilio error 20003.
    if (sid.startsWith('SK')) return { ...empty, error: 'TWILIO_ACCOUNT_SID looks like an API Key SID (starts with "SK"). It must be your Account SID (starts with "AC"). Put the API Key in TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET instead, and set TWILIO_ACCOUNT_SID to the AC… value.' };
    return { ...empty, error: `TWILIO_ACCOUNT_SID is invalid — it must start with "AC" but starts with "${sid.slice(0, 2)}".` };
  }
  // Prefer API Key auth when provided; otherwise use the Account SID + token.
  if (apiKeySid && apiKeySecret) {
    return { accountSid: sid, authUser: apiKeySid, authPass: apiKeySecret, from };
  }
  return { accountSid: sid, authUser: sid, authPass: token, from };
}

/** Turns a raw Twilio error body into an actionable message. */
export function describeTwilioError(status: number, body: string, twilio: { authUser: string; accountSid: string }): string {
  let code = 0; let message = body;
  try { const parsed = JSON.parse(body); code = Number(parsed.code) || 0; message = parsed.message || body; } catch { /* keep raw */ }
  if (code === 20003 || status === 401) {
    const using = twilio.authUser.startsWith('SK') ? 'API Key (SK…) + secret' : 'Account SID (AC…) + Auth Token';
    return `Twilio authentication failed (20003). The credentials were rejected. You're authenticating with your ${using}. Double-check for typos or extra spaces, confirm the Auth Token matches this exact Account SID (${twilio.accountSid.slice(0, 6)}…), and make sure the token hasn't been rotated in the Twilio console.`;
  }
  if (code === 21211) return `Twilio rejected the destination number as invalid (21211). Check the recipient's phone number.`;
  if (code === 21608 || code === 21610) return `This number isn't verified on your Twilio trial account (${code}). Trial accounts can only text verified numbers — verify it in the Twilio console or upgrade the account.`;
  if (code === 21606 || code === 21659) return `Your Twilio "From" number (${code}) can't send SMS — confirm TWILIO_PHONE_NUMBER is an SMS-capable Twilio number in E.164 format.`;
  return `Twilio rejected the message${code ? ` (${code})` : ''}: ${message}`;
}
