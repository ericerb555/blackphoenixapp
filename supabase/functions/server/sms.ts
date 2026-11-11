/**
 * SMS diagnostics, and a guarded one-off test send.
 *
 * WHY THIS EXISTS
 *
 * Moving SMS to Bird needs a way to prove one message sends before the real
 * flows are converted onto it — the same reason the email centre has a send
 * route. Converting a dozen call sites to a transport nobody has watched work
 * once is how a cutover goes silently dark.
 *
 *   GET  /sms/status   staff only. Does the config resolve, and as what —
 *                      without sending anything or revealing the key.
 *   POST /sms/test     send one message. Guarded by a shared secret in the
 *                      SMS_TEST_SECRET env, the same pattern the payment
 *                      confirmation route uses, because an UNAUTHENTICATED
 *                      send endpoint is the exact lead-form abuse just closed
 *                      — a stranger spending the SMS balance. With no secret
 *                      set the route is inert and answers 404, so it can be
 *                      switched off by removing the secret once the cutover is
 *                      verified.
 */
import { Hono } from 'npm:hono@4';
import { resolveBirdSms, sendBirdSms } from './bird.ts';

export const smsRouter = new Hono();

const STATUS = '/make-server-3eae23a6/sms/status';
const TEST = '/make-server-3eae23a6/sms/test';

/**
 * Both routes gate on SMS_TEST_SECRET, and both answer 404 when it is unset.
 *
 * This is a cutover diagnostic, not a standing feature — an operator reaches it
 * with the secret while the move to Bird is being proven, and removing the
 * secret retires the whole thing. Gating status the same way as the send (not
 * behind the staff session wall) is what lets the config be checked from
 * outside a browser session during the cutover; the send stays the one that
 * costs money.
 */
function gateOk(c: any): { ok: boolean; status: number; error?: string } {
  const secret = (Deno.env.get('SMS_TEST_SECRET') || '').trim();
  if (!secret) return { ok: false, status: 404, error: 'Not found.' };
  if ((c.req.header('X-SMS-Test-Secret') || '').trim() !== secret) {
    return { ok: false, status: 401, error: 'Unauthorized.' };
  }
  return { ok: true, status: 200 };
}

smsRouter.get(STATUS, (c) => {
  const gate = gateOk(c);
  if (!gate.ok) return c.json({ error: gate.error }, gate.status);
  const cfg = resolveBirdSms();
  return c.json({
    provider: 'bird',
    configured: !cfg.error,
    // The sender and region are safe to show staff; the key never is.
    from: cfg.from || null,
    host: cfg.host || null,
    error: cfg.error || null,
  });
});

smsRouter.post(TEST, async (c) => {
  const gate = gateOk(c);
  if (!gate.ok) return c.json({ error: gate.error }, gate.status);

  const body = await c.req.json().catch(() => ({}));
  const to = String(body?.to || '').trim();
  if (!/^\+[1-9]\d{6,15}$/.test(to)) {
    return c.json({ ok: false, error: 'A recipient in E.164 form is required, e.g. +16035551234.' }, 400);
  }
  const text = String(body?.text || 'Black Phoenix test message via Bird.').slice(0, 320);

  const result = await sendBirdSms(to, text, 'notification');
  return c.json(result, result.ok ? 200 : 502);
});

export default smsRouter;
