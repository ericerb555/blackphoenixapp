/**
 * Opting out, and being heard the first time.
 *
 * FOUR DOORS, BECAUSE PEOPLE REACH FOR DIFFERENT ONES
 *
 *   POST /sms/inbound     Bird forwards a received text. STOP lands here.
 *   POST /sms/opt-out     The web form, for somebody who deleted the text.
 *   GET  /sms/consent     Staff: what does this number say?
 *   POST /sms/consent     Staff: put a number back on, with a reason.
 *
 * The first two are PUBLIC and must be. A person who wants to stop being
 * texted does not have an account, has not signed in, and is not going to.
 * Requiring a login to opt out is the same as not offering one.
 *
 * WHAT THEY GRANT A STRANGER
 *
 * Only the ability to STOP a number from being texted. `/sms/opt-out` writes
 * `revoked` and nothing else — it cannot grant consent, so a stranger cannot
 * use it to re-subscribe a number whose owner said no.
 *
 * THE ASYMMETRY THAT CREATES, AND WHY THE FOURTH DOOR EXISTS
 *
 * Found in review, and it was the real hole. Revoke-only is correct, but it
 * meant anybody could revoke any number and NOTHING could undo it except an
 * inbound START — which needs working SMS to arrive. On a platform whose
 * emergency paging is SMS-only, posting a rota's numbers to the open opt-out
 * form silenced the on-call system until somebody edited the database by
 * hand.
 *
 * So: the web form is rate limited per IP and logs the address it came from,
 * and `POST /sms/consent` lets staff put a number back, recording who did it
 * and on what basis. A reason is required to GRANT and not to revoke,
 * because writing consent for somebody who is not here to give it needs an
 * answer to "on what grounds", while stopping never does.
 *
 * `/sms/inbound` is signed, because it is the one PUBLIC door that can grant
 * (START) as well as revoke.
 */

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { e164 } from "./onCallMessage.ts";
import { readConsent, recordConsent } from "./smsConsentStore.ts";
import { readKeyword, STOP_CONFIRMATION } from "./smsConsent.ts";
import { sendTextMessage } from "./sendSms.ts";

export const smsConsentRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

/** Every path here, for the auth gate and the origin lock to exempt. */
export const SMS_CONSENT_PUBLIC_PATHS = [
  `${PREFIX}/sms/inbound`,
  `${PREFIX}/sms/opt-out`,
];

/**
 * Bird's inbound webhook signature, per the Standard Webhooks spec.
 *
 * HMAC-SHA256 over `id.timestamp.body`, base64, compared without leaking its
 * prefix. With `BIRD_WEBHOOK_SECRET` unset the route answers 404 rather than
 * trusting anything: an unauthenticated endpoint that can opt a number back
 * IN is one a stranger could use to re-subscribe somebody who said no.
 */
async function signatureValid(c: any, rawBody: string): Promise<boolean> {
  const secret = (Deno.env.get("BIRD_WEBHOOK_SECRET") || "").trim();
  if (!secret) return false;

  const given = String(
    c.req.header("webhook-signature") || c.req.header("Webhook-Signature") || "",
  ).trim();
  const id = String(c.req.header("webhook-id") || c.req.header("Webhook-Id") || "");
  const timestamp = String(c.req.header("webhook-timestamp") || c.req.header("Webhook-Timestamp") || "");
  if (!given || !id || !timestamp) return false;

  /**
   * A five-minute window, which the spec asks for and which is the whole
   * value of the timestamp: without it a captured request stays valid for
   * ever and can be replayed to unsubscribe somebody repeatedly.
   */
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const keyBytes = secret.startsWith("whsec_")
    ? Uint8Array.from(atob(secret.slice(6)), (ch) => ch.charCodeAt(0))
    : new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // The header may carry several space-separated `v1,<sig>` values.
  for (const part of given.split(/\s+/)) {
    const candidate = part.includes(",") ? part.split(",")[1] : part;
    if (candidate.length !== expected.length) continue;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}

/** Bird nests the interesting parts differently depending on the event shape. */
function readInbound(payload: any): { from: string; text: string } {
  const body = payload?.payload ?? payload?.data ?? payload ?? {};
  const from = body?.from?.phoneNumber ?? body?.sender?.contact?.identifierValue
    ?? body?.originator ?? body?.from ?? "";
  const text = body?.body?.text?.text ?? body?.body?.text ?? body?.text ?? body?.message ?? "";
  return { from: String(from ?? ""), text: String(text ?? "") };
}

/**
 * POST /sms/inbound — somebody replied to one of our texts.
 *
 * Answers 200 to anything it understood, including messages that are not
 * keywords: a webhook that returns an error on an ordinary reply is one the
 * provider retries and eventually disables.
 */
smsConsentRouter.post(`${PREFIX}/sms/inbound`, async (c) => {
  const raw = await c.req.text();
  if (!(await signatureValid(c, raw))) {
    console.log("[SMS consent] refused an unsigned inbound webhook");
    return c.text("Not found", 404);
  }

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { /* handled below */ }
  const { from, text } = readInbound(payload);
  const phone = e164(from);
  if (!phone) return c.json({ ok: true, ignored: "no sender" });

  const keyword = readKeyword(text);
  if (!keyword) return c.json({ ok: true, ignored: "not a keyword" });

  if (keyword === "stop") {
    await recordConsent(phone, { status: "revoked", method: "stop-keyword", source: "inbound-sms" });
    /**
     * One confirmation, and only one.
     *
     * Carriers expect a single acknowledgement after an opt-out and treat
     * anything more as continued messaging. It goes out as `transactional`
     * and deliberately bypasses nothing — `sendSms` will now refuse it,
     * because the number was just revoked, which is correct and means the
     * carrier's own STOP handling is what the person actually sees.
     */
    console.log(`[SMS consent] STOP from ${phone.slice(0, 6)}… — opted out`);
    return c.json({ ok: true, status: "revoked", confirmation: STOP_CONFIRMATION });
  }

  await recordConsent(phone, { status: "granted", method: "keyword", source: "inbound-sms" });
  await sendTextMessage(phone, "You are opted back in and will receive texts from The Black Phoenix Company. Reply STOP to opt out.", "transactional");
  console.log(`[SMS consent] START from ${phone.slice(0, 6)}… — opted in`);
  return c.json({ ok: true, status: "granted" });
});

/**
 * POST /sms/opt-out — the web form.
 *
 * Deliberately cannot grant. See the note at the top of this file: a public
 * route that could opt somebody IN would let a stranger re-subscribe a number
 * whose owner had said no.
 *
 * Answers the same thing whether or not the number was known, because telling
 * a caller "that number is not on our list" is a way to test which numbers
 * are.
 */
smsConsentRouter.post(`${PREFIX}/sms/opt-out`, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const phone = e164(String((body as any)?.phone ?? ""));
  if (!phone) {
    return c.json({ success: false, error: "Enter the mobile number you want to stop texts to." }, 400);
  }

  /**
   * RATE LIMITED, BECAUSE REVOKING IS A DENIAL OF SERVICE ON THE ON-CALL ROTA.
   *
   * Found in review: this route is public, takes any number, and until the
   * staff grant below existed NOTHING could undo it except an inbound START,
   * which needs working SMS to arrive. So somebody posting a rota's numbers
   * here silences emergency paging, and on a platform where paging is
   * SMS-only that is the whole channel.
   *
   * The limit is per IP and generous — a person opting out their own two
   * numbers, or retrying after a typo, never meets it. Twenty in an hour is
   * somebody working through a list.
   *
   * It is NOT a reason to refuse a genuine opt-out, so the cap is high and
   * the failure is a 429 asking them to reply STOP instead, which always
   * works and is handled at the carrier.
   */
  const ip = String(
    c.req.header("cf-connecting-ip")
    || c.req.header("x-forwarded-for")?.split(",")[0]
    || "unknown",
  ).trim().slice(0, 64);
  const bucket = `sms_optout_rate:${ip}`;
  let recent: number[] = [];
  try {
    recent = ((await kv.get(bucket)) as number[]) || [];
  } catch { /* a store that will not read must not block an opt-out */ }
  const hourAgo = Date.now() - 3_600_000;
  recent = recent.filter((t) => t > hourAgo);
  if (recent.length >= 20) {
    console.log(`[SMS consent] rate-limited opt-out burst from ${ip} (${recent.length} in the hour)`);
    return c.json({
      success: false,
      error: "Too many requests from this connection. Reply STOP to any text from us — that always works.",
    }, 429);
  }
  try { await kv.set(bucket, [...recent, Date.now()]); } catch { /* best effort */ }

  await recordConsent(phone, { status: "revoked", method: "web-form", source: `opt-out-page ip=${ip}` });
  return c.json({
    success: true,
    message: "That number has been unsubscribed. It can take a few minutes for messages already queued to stop.",
  });
});

/**
 * POST /sms/consent — staff put a number back on.
 *
 * THE ASYMMETRY THIS CLOSES. Before it existed, anybody could revoke any
 * number from the open web and the only route back was an inbound START,
 * which needs working SMS to arrive — so a malicious or mistaken opt-out of
 * an on-call engineer's number silenced emergency paging until somebody
 * edited the database.
 *
 * Staff only, behind the global auth gate, and it records WHO restored it and
 * on what grounds. That matters: this writes consent on somebody else's
 * behalf, which is only defensible when there is a real agreement behind it
 * and a name against the claim.
 */
smsConsentRouter.post(`${PREFIX}/sms/consent`, async (c) => {
  const actor = c.get("actor");
  if (!actor?.email) return c.json({ success: false, error: "Sign in required." }, 401);

  const body = await c.req.json().catch(() => ({}));
  const phone = e164(String((body as any)?.phone ?? ""));
  if (!phone) return c.json({ success: false, error: "A phone number is required." }, 400);

  const status = (body as any)?.status === "revoked" ? "revoked" : "granted";
  const note = String((body as any)?.note ?? "").trim().slice(0, 300);
  if (status === "granted" && !note) {
    /**
     * A reason is required to GRANT and not to revoke, deliberately.
     *
     * Recording consent for somebody who is not here to give it needs an
     * answer to "on what basis" — a signed contract, a phone call, an
     * engineer confirming it was not them. Revoking needs no justification
     * because stopping is always allowed.
     */
    return c.json({
      success: false,
      error: "Say on what basis this number is being opted back in — a contract, a call, or who confirmed it.",
    }, 400);
  }

  const record = await recordConsent(phone, {
    status,
    method: "staff",
    wording: status === "granted" ? note : undefined,
    source: `staff:${actor.email}`,
  });
  console.log(`[SMS consent] ${actor.email} set ${phone.slice(0, 6)}… to ${status}`);
  return c.json({ success: true, consent: record });
});

/** GET /sms/consent?phone= — staff only, behind the global auth gate. */
smsConsentRouter.get(`${PREFIX}/sms/consent`, async (c) => {
  const actor = c.get("actor");
  if (!actor?.email) return c.json({ success: false, error: "Sign in required." }, 401);
  const record = await readConsent(c.req.query("phone") || "");
  if (!record) return c.json({ success: false, error: "Unreadable number." }, 400);
  return c.json({ success: true, consent: record });
});

export default smsConsentRouter;
