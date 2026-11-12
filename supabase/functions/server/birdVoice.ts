/**
 * birdVoice — ringing somebody's phone through Bird.
 *
 * WHY THIS EXISTS, AND A CORRECTION
 *
 * When Twilio was removed I recorded that the voice leg "could not be ported"
 * because Bird runs sequences built in its console rather than returning
 * call-control per turn. That was half right and it mattered, because the half
 * that was wrong is the half that wakes people up.
 *
 * Bird's Create Call API accepts an **inline sequence definition** in the
 * request body — not only the id of something published in the dashboard. A
 * definition is a small graph of nodes, and `voice.say` speaks text. So an
 * outbound page is a direct analogue of the inline TwiML this used to send: one
 * request, no console configuration, no callback URL to host.
 *
 *   POST {host}/v1/voice/calls
 *   Authorization: Bearer bk_<region>_…
 *   Idempotency-Key: <once per page>
 *   { from, to, sequence: { entry_node_id, trigger_data, definition } }
 *   → 202 Accepted, placed asynchronously
 *
 * What remains true from that earlier note is the INBOUND half: an incoming
 * call runs a published sequence or routes to SIP, and Bird's webhooks report
 * what a call did rather than asking what to do next. The AI attendant still
 * waits on that question. This file is only the outbound page.
 *
 * WRITTEN AGAINST THE DOCUMENTATION, NOT YET AGAINST THE LIVE API
 *
 * No call has been placed with this. It is wired so that a failure is recorded
 * and visible rather than thrown — see `pageContacts` — and the first real use
 * should be a deliberate test to a known handset, not an emergency.
 *
 * THE CREDENTIALS ARE SEPARATE FROM SMS, DELIBERATELY
 *
 * `BIRD_SMS_FROM` may legitimately be an alphanumeric sender id, which cannot
 * be dialled from. A voice call needs a real E.164 number Bird has provisioned,
 * so it has its own setting and falls back to the SMS sender only when that is
 * itself a number. The key may also differ: Bird keys carry scopes and voice
 * needs `voice:write`, so a voice key is read first and the SMS key is the
 * fallback for accounts where one key covers both.
 */

import { birdHostFromKey } from './bird.ts';

export interface BirdVoiceConfig {
  key: string;
  host: string;
  from: string;
  error?: string;
}

/** Reads and validates what is needed to place a call. */
export function resolveBirdVoice(): BirdVoiceConfig {
  const key = (Deno.env.get('BIRD_API_VOICE_KEY') || Deno.env.get('BIRD_API_SMS_KEY') || '').trim();
  const smsFrom = (Deno.env.get('BIRD_SMS_FROM') || '').trim();
  const explicit = (Deno.env.get('BIRD_VOICE_FROM') || '').trim();
  const empty = { key: '', host: '', from: '' };

  if (!key) {
    return { ...empty, error: 'Voice calling is not configured (BIRD_API_VOICE_KEY / BIRD_API_SMS_KEY is not set).' };
  }
  const host = birdHostFromKey(key);
  if (!host) {
    return { ...empty, error: 'The Bird API key is not a v1 key — it must start with "bk_<region>_", for example bk_us1_… .' };
  }
  /**
   * A sender that cannot be dialled from is refused here rather than at Bird.
   *
   * An alphanumeric sender id is perfectly valid for SMS and meaningless for a
   * phone call. Letting it through means every page fails at Bird with a vague
   * code, at three in the morning, on the attempt nobody is watching.
   */
  const from = explicit || (/^\+?[1-9]\d{6,15}$/.test(smsFrom) ? smsFrom : '');
  if (!from) {
    return {
      ...empty,
      error: 'The voice caller ID is not set. Put a Bird voice-capable number in BIRD_VOICE_FROM '
        + 'in E.164 form (e.g. +16035551234). BIRD_SMS_FROM cannot be used because it is not a dialable number.',
    };
  }
  return { key, host, from: from.startsWith('+') ? from : `+${from}` };
}

export function voiceConfigured(): boolean {
  return !resolveBirdVoice().error;
}

/**
 * The sequence that speaks one message, twice.
 *
 * Twice because this wakes somebody: the first pass is heard through sleep and
 * the second is the one they actually take in. That was true of the TwiML this
 * replaces and it is not a detail worth losing in a migration.
 *
 * Only documented node types are used — `trigger.start_call`, `voice.say` and
 * `logic.exit`. Anything cleverer is a guess, and a guess here is a call that
 * fails at 3am.
 */
export function sayTwiceDefinition(text: string, language = 'en') {
  const spoken = String(text || '').slice(0, 900);
  const say = (id: string, next: string) => ({
    id,
    type: 'voice.say',
    type_version: 1,
    config: {},
    input: { text: spoken, language },
    connections: { next: { node_id: next, port: 'input' } },
  });
  return {
    schema_version: 1,
    expression_environment: 'bird.cel.v1',
    nodes: [
      {
        id: 'start',
        type: 'trigger.start_call',
        type_version: 1,
        config: {},
        input: {},
        connections: { event: { node_id: 'say1', port: 'input' } },
      },
      say('say1', 'say2'),
      say('say2', 'end'),
      {
        id: 'end',
        type: 'logic.exit',
        type_version: 1,
        config: { status: 'succeeded', reason: 'completed' },
        input: { output: {} },
      },
    ],
  };
}

export interface VoiceResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Ring one number and read one message out.
 *
 * `idempotencyKey` is required by the API and is the reason it is a parameter
 * rather than generated here: the caller knows what "the same page" means. A
 * retry of one rung must not become two phone calls, and a fresh uuid per
 * attempt would guarantee exactly that.
 */
export async function placeBirdVoiceCall(
  to: string,
  text: string,
  idempotencyKey: string,
  language = 'en',
): Promise<VoiceResult> {
  const cfg = resolveBirdVoice();
  if (cfg.error) {
    console.log(`[Bird][CALL NOT PLACED] ${cfg.error}`);
    return { ok: false, error: cfg.error };
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.host}/v1/voice/calls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: cfg.from,
        to,
        sequence: {
          entry_node_id: 'start',
          trigger_data: {},
          definition: sayTwiceDefinition(text, language),
        },
      }),
    });
  } catch (e: any) {
    const error = `Bird could not be reached to place the call: ${e?.message || e}`;
    console.log(`[Bird][CALL FAILED] ${error}`);
    return { ok: false, error };
  }

  // 202 is the documented success: accepted, placed asynchronously.
  if (res.status !== 202 && !res.ok) {
    const body = await res.text().catch(() => '');
    const error = describeBirdVoiceError(res.status, body);
    console.log(`[Bird][CALL FAILED] ${res.status} to ${to.slice(0, 6)}…: ${error}`);
    return { ok: false, error };
  }
  const payload = await res.json().catch(() => ({} as any));
  return { ok: true, id: payload?.id || payload?.call_id };
}

/** Turns a failed call response into something that names what to change. */
export function describeBirdVoiceError(status: number, body: string): string {
  let message: unknown = body;
  let code = '';
  try {
    const parsed = JSON.parse(body);
    message = parsed?.message ?? parsed?.error ?? body;
    code = String(parsed?.code || parsed?.type || '');
    if (message && typeof message === 'object') message = JSON.stringify(parsed);
  } catch { /* keep the raw body */ }

  if (status === 401 || status === 403) {
    return `Bird rejected the API key for voice (${status}). A Bird key carries scopes — confirm this one has voice `
      + `permission, or set BIRD_API_VOICE_KEY to a key that does.`;
  }
  if (status === 422 || status === 400) {
    return `Bird rejected the call (${status})${code ? ` [${code}]` : ''}: ${String(message).slice(0, 500)}. `
      + `Check BIRD_VOICE_FROM is a voice-capable number on this account and the recipient is E.164.`;
  }
  return `Bird voice call failed (${status})${code ? ` [${code}]` : ''}: ${String(message).slice(0, 500)}`;
}
