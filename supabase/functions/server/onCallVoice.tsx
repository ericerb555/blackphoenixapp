/**
 * onCallVoice — the telephone. The one thing the on-call system did not have.
 *
 * WHAT THIS IS
 *
 * Twilio rings these webhooks when somebody dials a number in the directory.
 * They answer with TwiML, gather what the caller says, and — when there is
 * enough to act on — write an ordinary urgent work request and hand it to
 * `persistWorkRequest`.
 *
 * THAT LAST SENTENCE IS THE WHOLE DESIGN.
 *
 * It does not dispatch. It does not page. It does not post to the exchange.
 * `persistWorkRequest` → `openCallFor` → `routeEmergency` already does all of
 * that, deterministically, pinned by sixty-odd tests, honouring exclusive
 * vendor agreements and business hours. A second dispatch path that happened
 * to start with a phone call would be a second set of rules to keep in
 * agreement with the first, and the night they disagreed would be the night an
 * exclusive agreement got broadcast to the open market.
 *
 * SO THE MODEL NEVER CHOOSES WHO IS WOKEN
 *
 * It is allowed to read a sentence and say which category it sounds like, and
 * even that has a deterministic classifier underneath it (`onCallAttendant.ts`)
 * which answers whenever the model is stopped, over budget, slow or wrong.
 *
 * AUTHENTICATION
 *
 * Twilio carries no session, so these paths are exempt at the auth gate and at
 * the origin lock, and authenticated instead by `X-Twilio-Signature` — an HMAC
 * over the exact URL and the posted fields, keyed by the Twilio auth token.
 * With `TWILIO_AUTH_TOKEN` unset the routes answer 404: an unauthenticated
 * endpoint that creates emergencies is worse than no endpoint at all.
 */

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { e164 } from "./onCallMessage.ts";
import {
  startSession, applySpeech, nextPrompt, readyToDispatch, workRequestFrom,
  greetingFor, safetyWarningFor, mishearPrompt, summaryOf, confirmationFor,
  transcriptText, ATTENDANT_DEFAULTS,
  type AttendantSession, type AttendantSettings,
} from "./onCallAttendant.ts";
import {
  assignmentFor, numberKey, normalizeAssignment, claimConflict,
  type NumberAssignment,
} from "./onCallNumbers.ts";
import { persistWorkRequest } from "./workRequests.ts";
import { notifyStaffInBackground } from "./staff-notifications.tsx";

export const onCallVoiceRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

/** Every inbound-call path, for the auth gate and the origin lock to exempt. */
export const VOICE_WEBHOOK_PATHS = [
  `${PREFIX}/voice/incoming`,
  `${PREFIX}/voice/gather`,
  `${PREFIX}/voice/status`,
];

const SESSION = (id: string) => `on_call_voice:${id}`;
const SESSION_INDEX = "on_call_voice_index";
const SETTINGS = (email: string) => `on_call_attendant:${String(email).toLowerCase()}`;

/* ── Twilio's signature ──────────────────────────────────────────────────── */

/**
 * Twilio signs the full request URL with the POST fields appended in sorted
 * key order, HMAC-SHA1, base64. Rebuilt here rather than trusted.
 *
 * The URL has to be the one Twilio actually called, which behind Cloudflare is
 * not necessarily what `c.req.url` reports — the forwarded host is honoured
 * when it is present, because a host mismatch produces a signature that never
 * verifies and an emergency line that answers nothing.
 */
async function signatureValid(c: any, params: Record<string, string>): Promise<boolean> {
  const token = (Deno.env.get("TWILIO_AUTH_TOKEN") || "").trim();
  if (!token) return false;
  const given = String(c.req.header("X-Twilio-Signature") || "");
  if (!given) return false;

  const url = new URL(c.req.url);
  const forwardedHost = String(c.req.header("X-Forwarded-Host") || "").trim();
  if (forwardedHost) url.host = forwardedHost;
  const forwardedProto = String(c.req.header("X-Forwarded-Proto") || "").trim();
  if (forwardedProto) url.protocol = `${forwardedProto}:`;

  let payload = url.toString();
  for (const key of Object.keys(params).sort()) payload += key + params[key];

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Length-independent compare, so a wrong signature does not leak its prefix.
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function formParams(c: any): Promise<Record<string, string>> {
  const body = await c.req.parseBody();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(body || {})) out[k] = typeof v === "string" ? v : "";
  return out;
}

/* ── TwiML ───────────────────────────────────────────────────────────────── */

/** Anything spoken to a caller passes through here. An unescaped `&` is a dead call. */
function xml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function twiml(c: any, body: string) {
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, 200, {
    "Content-Type": "text/xml; charset=utf-8",
  });
}

function say(text: string, settings: AttendantSettings): string {
  return `<Say voice="${xml(settings.voice || "Polly.Joanna")}" language="${xml(settings.language || "en-US")}">${xml(text)}</Say>`;
}

/**
 * Speak, then listen.
 *
 * `speechTimeout="auto"` rather than a fixed count of seconds: somebody
 * describing a flood pauses to look at it, and a fixed timeout cuts them off
 * mid-sentence. The DTMF fallback is there for a caller the speech engine
 * cannot hear at all — a noisy street, a bad line — because the alternative
 * for them is no emergency at all.
 */
function gather(sessionId: string, text: string, settings: AttendantSettings): string {
  return `<Gather input="speech dtmf" speechTimeout="auto" numDigits="1" `
    + `action="${xml(`${PREFIX}/voice/gather?s=${sessionId}`)}" method="POST" `
    + `language="${xml(settings.language || "en-US")}">`
    + say(text, settings)
    + `</Gather>`
    // Reached only when the caller says nothing at all: re-ask rather than hang up.
    + `<Redirect method="POST">${xml(`${PREFIX}/voice/gather?s=${sessionId}&amp;silent=1`)}</Redirect>`;
}

/* ── settings and the directory ──────────────────────────────────────────── */

export async function attendantSettings(email: string): Promise<AttendantSettings> {
  try {
    const raw = (await kv.get(SETTINGS(email))) as any;
    return { ...ATTENDANT_DEFAULTS, ...(raw || {}) };
  } catch {
    // A settings read that failed must not answer "enabled with no greeting".
    return { ...ATTENDANT_DEFAULTS };
  }
}

async function directory(): Promise<NumberAssignment[]> {
  try {
    return ((await kv.getByPrefix("on_call_number:")) as NumberAssignment[]) || [];
  } catch {
    return [];
  }
}

/* ── the call ────────────────────────────────────────────────────────────── */

/**
 * POST /voice/incoming — Twilio has answered a call on one of our numbers.
 *
 * Everything that can go wrong here ends in a spoken sentence rather than an
 * error page, because the caller is a person in trouble holding a telephone. A
 * number nobody has claimed, an attendant switched off, a store that will not
 * read: each one says something true and, where there is a human line
 * configured, puts the call through to it.
 */
onCallVoiceRouter.post(`${PREFIX}/voice/incoming`, async (c) => {
  const params = await formParams(c);
  if (!(await signatureValid(c, params))) {
    console.log("[Attendant] refused an unsigned request to /voice/incoming");
    return c.text("Not found", 404);
  }

  const dialled = e164(params.To || "");
  const from = e164(params.From || "");
  const assignment = assignmentFor(await directory(), dialled);

  if (!assignment) {
    console.log(`[Attendant] no account owns ${dialled}`);
    return twiml(c, say(
      "This number is not set up to take emergency calls. Please hang up and dial 9 1 1 if this is an emergency.",
      ATTENDANT_DEFAULTS,
    ));
  }

  const settings = await attendantSettings(assignment.accountEmail);
  if (!settings.enabled) {
    // Switched off has to mean switched off — but not into silence when there
    // is a person to reach.
    if (settings.handoffNumber) {
      return twiml(c, say("Connecting you now.", settings)
        + `<Dial timeout="30">${xml(e164(settings.handoffNumber))}</Dial>`);
    }
    return twiml(c, say(
      "The emergency attendant is not available on this line. If this is a life safety emergency, hang up and dial 9 1 1.",
      settings,
    ));
  }

  const session = startSession({
    id: String(params.CallSid || crypto.randomUUID()).slice(0, 64),
    accountEmail: assignment.accountEmail,
    dialled,
    from,
    propertyId: assignment.propertyId,
    address: assignment.address,
  });
  session.transcript.push({ at: session.startedAt, who: "attendant", text: greetingFor(settings) });
  await saveSession(session);

  console.log(`[Attendant] call ${session.id} on ${dialled} for ${assignment.accountEmail}`);

  const record = settings.recordCalls
    ? `<Record recordingStatusCallback="${xml(`${PREFIX}/voice/status?s=${session.id}`)}" recordingStatusCallbackMethod="POST" />`
    : "";
  return twiml(c, record + gather(session.id, greetingFor(settings), settings));
});

/**
 * POST /voice/gather — the caller said something.
 *
 * One turn of the conversation: fold in what was said, decide whether there is
 * enough to dispatch, and either dispatch or ask the next question. The
 * dispatch happens BEFORE the closing sentence is spoken, so a caller who
 * hangs up during the confirmation has still had somebody sent.
 */
onCallVoiceRouter.post(`${PREFIX}/voice/gather`, async (c) => {
  const params = await formParams(c);
  if (!(await signatureValid(c, params))) return c.text("Not found", 404);

  const id = String(c.req.query("s") || params.CallSid || "").slice(0, 64);
  const session = await readSession(id);
  if (!session) {
    return twiml(c, say("Sorry, this call has ended. Please call again.", ATTENDANT_DEFAULTS));
  }
  const settings = await attendantSettings(session.accountEmail);

  const heard = String(params.SpeechResult || "").trim();
  const digits = String(params.Digits || "").trim();
  const said = heard || (digits === "0" ? "operator" : digits);

  const next = applySpeech(session, said, settings);

  if (next.step === "handoff") {
    next.endedAt = new Date().toISOString();
    await saveSession(next);
    await announce(next, settings, "handed to a person");
    if (settings.handoffNumber) {
      return twiml(c, say("One moment. I am connecting you to a person now.", settings)
        + `<Dial timeout="40">${xml(e164(settings.handoffNumber))}</Dial>`);
    }
    // Nobody to transfer to is still worth dispatching on what we have.
    await dispatch(next, settings);
    await saveSession(next);
    return twiml(c, say(
      "I do not have a person available right now, so I have logged this emergency and the on-call team has been notified.",
      settings,
    ));
  }

  if (!said) {
    await saveSession(next);
    return twiml(c, gather(next.id, mishearPrompt(next), settings));
  }

  // The safety sentence comes before anything else that will be said, and only
  // the first time: repeating it every turn stops it being heard.
  const warning = next.safetyCritical && !session.safetyCritical ? safetyWarningFor(next) : "";

  const prompt = nextPrompt(next, settings);
  next.step = prompt.step;

  if (prompt.step === "dispatching" && readyToDispatch(next)) {
    await dispatch(next, settings);
    next.step = "done";
    next.endedAt = new Date().toISOString();
    next.transcript.push({ at: next.endedAt, who: "attendant", text: confirmationFor(next) });
    await saveSession(next);
    return twiml(c,
      (warning ? say(warning, settings) : "")
      + say(confirmationFor(next), settings)
      + say("Goodbye.", settings)
      + "<Hangup/>");
  }

  if (prompt.step === "dispatching") {
    // The cap was reached without a place to send anyone. Asking again is the
    // only thing left, and it is better than a cheerful confirmation of
    // nothing.
    next.step = "address";
    next.transcript.push({ at: new Date().toISOString(), who: "attendant", text: "What is the address of the property?" });
    await saveSession(next);
    return twiml(c, (warning ? say(warning, settings) : "")
      + gather(next.id, "I still need the address before I can send anyone. What is the address?", settings));
  }

  next.transcript.push({ at: new Date().toISOString(), who: "attendant", text: prompt.say });
  await saveSession(next);
  return twiml(c, (warning ? say(warning, settings) : "") + gather(next.id, prompt.say, settings));
});

/**
 * POST /voice/status — the call ended, or a recording finished.
 *
 * A caller who hangs up mid-sentence has still told us something, and this is
 * the only place that is noticed. If there is enough to act on and nothing was
 * dispatched, it is dispatched here — that is the difference between an
 * abandoned call and an unanswered emergency.
 */
onCallVoiceRouter.post(`${PREFIX}/voice/status`, async (c) => {
  const params = await formParams(c);
  if (!(await signatureValid(c, params))) return c.text("Not found", 404);

  const id = String(c.req.query("s") || params.CallSid || "").slice(0, 64);
  const session = await readSession(id);
  if (!session) return c.text("", 204);

  if (params.RecordingUrl) (session as any).recordingUrl = String(params.RecordingUrl).slice(0, 500);
  if (params.CallDuration) (session as any).durationSeconds = Number(params.CallDuration) || 0;

  const ended = String(params.CallStatus || "") === "completed" || Boolean(params.RecordingUrl);
  if (ended && !session.endedAt) session.endedAt = new Date().toISOString();

  if (!session.dispatched && readyToDispatch(session)) {
    const settings = await attendantSettings(session.accountEmail);
    console.log(`[Attendant] call ${session.id} ended early — dispatching on what was given`);
    await dispatch(session, settings);
  }
  await saveSession(session);
  return c.text("", 204);
});

/* ── dispatch: hand it to the system that already does this ──────────────── */

/**
 * Write the work request, and let the existing chain take it.
 *
 * It never throws. The caller is a live telephone call: a store that had a bad
 * moment must not become a dropped line, and the staff notification below is
 * what makes sure a failed dispatch is seen by a person rather than inferred
 * later from silence.
 */
async function dispatch(session: AttendantSession, settings: AttendantSettings): Promise<void> {
  if (session.dispatched) return;
  try {
    const id = `wr_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 6)}`;
    const record = workRequestFrom(session, { id });
    await persistWorkRequest(record);
    session.dispatched = true;
    session.workRequestId = id;
    session.jobId = record.jobId ? String(record.jobId) : null;
    console.log(`[Attendant] call ${session.id} → work request ${id} · job ${session.jobId || "none"}`);
    await announce(session, settings, "dispatched");
  } catch (error: any) {
    console.log(`[Attendant][NOT DISPATCHED] call ${session.id}: ${error?.message || error}`);
    await announce(session, settings, `COULD NOT DISPATCH — ${error?.message || error}`);
  }
}

/** Tell the team, through the engine that already knows who to tell. */
async function announce(session: AttendantSession, _settings: AttendantSettings, what: string): Promise<void> {
  try {
    notifyStaffInBackground("emergency", {
      subject: `Emergency call: ${summaryOf(session)}`,
      heading: session.safetyCritical ? "🚨 SAFETY-CRITICAL emergency call" : "📞 Emergency call answered",
      rows: [
        ["What", session.categoryLabel || "unclassified"],
        ["Where", session.address || "—"],
        ["Unit", session.unit && session.unit !== "-" ? session.unit : "—"],
        ["Caller", `${session.callerName || "not given"} · ${session.callback || session.from}`],
        ["Account", session.accountEmail],
        ["Outcome", what],
        ["Job", session.jobId || "—"],
      ],
      dedupeKey: `attendant:${session.id}:${what}`,
    });
  } catch {
    // A notification that will not send must never end the telephone call.
  }
}

/* ── session storage ─────────────────────────────────────────────────────── */

async function saveSession(session: AttendantSession): Promise<void> {
  try {
    await kv.set(SESSION(session.id), session);
    const index = ((await kv.get(SESSION_INDEX)) as string[]) || [];
    if (!index.includes(session.id)) {
      await kv.set(SESSION_INDEX, [session.id, ...index].slice(0, 500));
    }
  } catch (error: any) {
    console.log(`[Attendant] could not save session ${session.id}: ${error?.message || error}`);
  }
}

async function readSession(id: string): Promise<AttendantSession | null> {
  if (!id) return null;
  try {
    return ((await kv.get(SESSION(id))) as AttendantSession) || null;
  } catch {
    return null;
  }
}

/* ── what the portal configures and reads ────────────────────────────────── */

/**
 * The account asking, from the gate's own lookup.
 *
 * The global auth gate has already resolved the caller and put them on the
 * context. Resolving them a second time here would be a second network call
 * per request and a second opinion about who somebody is.
 */
function who(c: any): string {
  return String(c.get("actor")?.email || "").toLowerCase();
}

/** GET /on-call-attendant — this account's attendant, its numbers, its calls. */
onCallVoiceRouter.get(`${PREFIX}/on-call-attendant`, async (c) => {
  const email = who(c);
  if (!email) return c.json({ success: false, error: "Sign in required." }, 401);

  const settings = await attendantSettings(email);
  const numbers = (await directory()).filter((n) => n.accountEmail === email);
  const ids = ((await kv.get(SESSION_INDEX)) as string[]) || [];
  const recent = (await kv.mget(ids.slice(0, 100).map(SESSION)) as AttendantSession[])
    .filter((s) => s && s.accountEmail === email)
    .slice(0, 50)
    .map((s) => ({
      id: s.id, startedAt: s.startedAt, endedAt: s.endedAt,
      summary: summaryOf(s), category: s.categoryLabel, trade: s.trade,
      safetyCritical: s.safetyCritical, dispatched: s.dispatched,
      workRequestId: s.workRequestId, jobId: s.jobId,
      from: s.from, callerName: s.callerName,
      recordingUrl: (s as any).recordingUrl || null,
    }));

  return c.json({
    success: true,
    settings,
    numbers,
    calls: recent,
    /**
     * Said plainly, because every one of these is a silent failure.
     *
     * An attendant switched on with no number answers nothing; a number with
     * the attendant off rings and says it cannot help; neither looks wrong on
     * a settings screen.
     */
    readiness: {
      configured: Boolean(Deno.env.get("TWILIO_AUTH_TOKEN")),
      problems: [
        !Deno.env.get("TWILIO_AUTH_TOKEN")
          ? "Twilio is not configured on the server, so inbound calls are refused."
          : "",
        settings.enabled && numbers.length === 0
          ? "The attendant is on but no phone number is assigned to it, so nothing can reach it."
          : "",
        !settings.enabled && numbers.length > 0
          ? "A number is assigned but the attendant is off — callers are told the line is unavailable."
          : "",
        settings.recordCalls && !/record/i.test(settings.greeting || "")
          ? "Recording is on. The attendant announces it, and in two-party-consent states that announcement is the consent."
          : "",
      ].filter(Boolean),
    },
  });
});

/** PUT /on-call-attendant — the account's own attendant settings. */
onCallVoiceRouter.put(`${PREFIX}/on-call-attendant`, async (c) => {
  const email = who(c);
  if (!email) return c.json({ success: false, error: "Sign in required." }, 401);

  const raw = await c.req.json().catch(() => ({}));
  const current = await attendantSettings(email);
  const text = (v: unknown, max: number, fallback: string) =>
    String(v ?? "").trim().slice(0, max) || fallback;

  const settings: AttendantSettings = {
    enabled: raw?.enabled === true,
    greeting: String(raw?.greeting ?? current.greeting ?? "").trim().slice(0, 600),
    companyName: text(raw?.companyName ?? current.companyName, 80, ATTENDANT_DEFAULTS.companyName),
    language: text(raw?.language ?? current.language, 16, ATTENDANT_DEFAULTS.language),
    voice: text(raw?.voice ?? current.voice, 40, ATTENDANT_DEFAULTS.voice),
    recordCalls: raw?.recordCalls === true,
    askUnit: raw?.askUnit !== false,
    // Two is the floor: what happened, and where. Below that the attendant
    // cannot gather enough to dispatch and the cap becomes the bug.
    maxQuestions: Math.min(10, Math.max(2, Math.round(Number(raw?.maxQuestions)) || current.maxQuestions)),
    handoffNumber: e164(String(raw?.handoffNumber ?? current.handoffNumber ?? "")),
    customCategories: (Array.isArray(raw?.customCategories) ? raw.customCategories : current.customCategories || [])
      .map((cat: any, i: number) => ({
        id: text(cat?.id, 40, `custom${i + 1}`),
        label: text(cat?.label, 80, ""),
        trade: String(cat?.trade ?? "").trim().toLowerCase().slice(0, 60),
        safetyCritical: cat?.safetyCritical === true,
        cues: (Array.isArray(cat?.cues) ? cat.cues : [])
          .map((cue: any) => String(cue ?? "").trim().toLowerCase().slice(0, 60))
          .filter(Boolean).slice(0, 30),
      }))
      .filter((cat: any) => Boolean(cat.label))
      .slice(0, 20),
  };

  await kv.set(SETTINGS(email), settings);
  console.log(`[Attendant] ${email} set the attendant ${settings.enabled ? "ON" : "off"}`);
  return c.json({ success: true, settings });
});

/**
 * POST /on-call-attendant/numbers — claim a number for this account.
 *
 * The conflict check is the point of the route. Two accounts holding one
 * number is not an ambiguity to resolve while somebody is on the line; it is
 * refused at the moment of saving, which is the only moment a person is there
 * to fix it.
 */
onCallVoiceRouter.post(`${PREFIX}/on-call-attendant/numbers`, async (c) => {
  const email = who(c);
  if (!email) return c.json({ success: false, error: "Sign in required." }, 401);

  const raw = await c.req.json().catch(() => ({}));
  const assignment = normalizeAssignment(raw, { accountEmail: email });
  if (!assignment) {
    return c.json({ success: false, error: "That does not look like a phone number Twilio can route." }, 400);
  }

  const key = numberKey(assignment.number);
  const existing = (await kv.get(key)) as NumberAssignment | null;
  const conflict = claimConflict(existing, email);
  if (conflict) return c.json({ success: false, error: conflict }, 409);

  await kv.set(key, assignment);
  console.log(`[Attendant] ${email} claimed ${assignment.number}`);
  return c.json({ success: true, assignment });
});

/** DELETE /on-call-attendant/numbers/:number — give a number back. */
onCallVoiceRouter.delete(`${PREFIX}/on-call-attendant/numbers/:number`, async (c) => {
  const email = who(c);
  if (!email) return c.json({ success: false, error: "Sign in required." }, 401);

  const key = numberKey(String(c.req.param("number") || ""));
  if (!key) return c.json({ success: false, error: "Unreadable number." }, 400);
  const existing = (await kv.get(key)) as NumberAssignment | null;
  if (!existing) return c.json({ success: true, removed: false });
  // Somebody else's line is not yours to release.
  if (existing.accountEmail !== email) {
    return c.json({ success: false, error: "That number belongs to another account." }, 403);
  }
  await kv.del(key);
  return c.json({ success: true, removed: true });
});

/** GET /on-call-attendant/calls/:id — one call, with its transcript. */
onCallVoiceRouter.get(`${PREFIX}/on-call-attendant/calls/:id`, async (c) => {
  const email = who(c);
  if (!email) return c.json({ success: false, error: "Sign in required." }, 401);
  const session = await readSession(String(c.req.param("id") || ""));
  if (!session) return c.json({ success: false, error: "No such call." }, 404);
  if (session.accountEmail !== email) {
    return c.json({ success: false, error: "That call belongs to another account." }, 403);
  }
  return c.json({ success: true, call: session, transcript: transcriptText(session) });
});

export { SESSION_INDEX as attendantSessionIndex, SESSION as attendantSessionKey, SETTINGS as attendantSettingsKey, numberKey };
