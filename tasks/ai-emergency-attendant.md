# AI Emergency On-Call Attendant — audit, and where it joins on

## Phase 1 — what is already here

The honest headline: **the dispatch engine asked for already exists and is
proven. What does not exist is the telephone.**

### The existing on-call system (do not rebuild any of this)

| Concern | Where it lives | State |
|---|---|---|
| Per-account record: services, rotas, hours, rates, contracted vendors | `server/onCallConfig.ts` | pure, 29 tests |
| Deterministic routing — contracted → rota → office-hours → escalate → nobody | `server/onCallRouting.ts` | pure, 17 tests |
| Is this an emergency, whose rota, what trade | `server/onCallIntake.ts` | pure, tested |
| Waking somebody: Twilio SMS then voice | `server/onCallPaging.tsx` | outbound only |
| The words and the E.164 number | `server/onCallMessage.ts` | pure, tested |
| Climbing the ladder unattended | `server/onCallEscalation.ts` + `/on-call/escalate-due` | pure, 18 tests; cron still `.pending` |
| Calls, take/close, page-next, post to Phoenix Exchange | `server/on-call.tsx` (12 routes) | live |
| Per-account settings screen | `components/portals/OnCallSetup.tsx` | live in landlord, condo, property-manager portals |
| The triage screen | `components/portals/OnCallEmergencyPortal.tsx` | live |
| Entitlement — does this account get answered | `on-call` add-on on the subscription | live |

**The spine is `persistWorkRequest` → `openCallFor`.** Every work request on the
platform passes through one function (`server/workRequests.ts:76`); an urgent
one opens exactly one call, routes it, pages the first rung, notifies staff and
records the whole plan. Anything that can produce a work request record
inherits the entire dispatch system for free.

### AI governance that already exists

`aiKillSwitch.ts` (per-agent stop), `aiLedger.ts` (`recordedOpenAIFetch`,
`recordedAnthropic` — every call costed and logged), `aiCeiling.ts`/`aiSpend.ts`
(per-tier spend ceilings). A new AI agent that does not go through these is a
new way to spend money nobody can see or stop.

### The gaps — all of them on the inbound side

1. **No inbound telephony at all.** Twilio is outbound-only; there is no
   webhook, no TwiML endpoint, no signature verification, no `<Gather>`.
2. **No number → account map.** Nothing can answer "whose building is this
   caller ringing about?" from a dialled number.
3. **No conversation.** No speech capture, no caller/property verification, no
   classification of what the caller is describing.
4. **No call recording, transcript or AI summary** surface.
5. `OnCallSetup.tsx` has no attendant section (no number assignment, greeting,
   language, recording consent, verification strictness).

### Risks that shape the design

- **Twilio webhooks are unauthenticated by session.** They must be exempt at
  the auth gate and at the origin lock, and gated by X-Twilio-Signature HMAC
  instead — the same shape `/on-call/escalate-due` already uses for cron.
- **The AI must never dispatch.** It gathers and classifies; `routeEmergency`
  decides. A model that can choose who gets woken is a model that can wake the
  wrong person at 3am and bypass an exclusive vendor agreement.
- **The AI will be unavailable sometimes.** Every step needs a deterministic
  fallback that still produces a routable work request — keyword classification
  and DTMF menu — or an outage becomes an unanswered emergency.
- **Two-party consent.** Recording is off unless the account turns it on, and
  the greeting says so when it is.
- `private_cron_config` still has RLS disabled (see `tasks/on-call-system.md`);
  the attendant adds a second secret that must not live there.

## The plan

- [x] **A. Number directory.** `onCallNumbers.ts` — pure, 14 tests. One number
      belongs to one account; a second account claiming it is refused when it is
      saved rather than guessed at while somebody is on the line. A disabled
      line answers nothing. An unrecognised caller is never turned away.
- [x] **B. Attendant state machine.** `onCallAttendant.ts` — pure, 24 tests. Ten
      categories, a question cap, a skippable unit question, a handoff any
      caller can ask for at any point, and safety cues that win wherever they
      appear in the sentence.
- [x] **C. Voice router.** `onCallVoice.tsx` — three Twilio webhooks behind
      `X-Twilio-Signature`, plus the account's own settings, number directory
      and call history. Exempt at the auth gate and the origin lock; refuses
      everything while `TWILIO_AUTH_TOKEN` is unset.
- [x] **D. Terminate on the existing spine.** The attendant writes an urgent
      work request and hands it to `persistWorkRequest`. No second dispatch
      system: routing, paging, escalation and Phoenix Exchange are untouched.
- [x] **E. Portal settings.** `AiAttendantPanel.tsx`, inside `OnCallSetup` and
      above the rota — a caller meets the number before the ladder. So it is
      already in the **landlord, condo association and property manager**
      portals, and the **homeowner portal** gains an Emergency Line tab, which
      is the account with nobody else to ring.
- [x] **F. Reporting.** Call history, dispatch status, transcript and recording
      on the same panel.

## The provider changed under this — 2026-11-11

**The account is on Bird, not Twilio, and Twilio has been removed entirely.**
All SMS now leaves through `bird.ts` (`BIRD_API_SMS_KEY` + `BIRD_SMS_FROM`);
`twilio.ts` is deleted and nothing reads a `TWILIO_*` secret except this
attendant's own signature check, which is therefore inert.

### A correction, same day

I first recorded that the ring "could not be ported" because Bird runs
sequences built in its console. **That was wrong, and wrong in the direction
that matters.** Bird's Create Call API accepts an **inline sequence
definition** in the request body — not only the id of something published in
the dashboard — and `voice.say` speaks text. So an outbound page is one
request with the words in the body: the direct analogue of the inline TwiML it
replaced, with no console setup and no callback URL to host.

    POST {host}/v1/voice/calls
    Authorization: Bearer bk_<region>_…
    Idempotency-Key: <once per page>
    { from, to, sequence: { entry_node_id, trigger_data, definition } }
    → 202 Accepted

`birdVoice.ts` does this and the ring is back. What stays true from the
original note is the **inbound** half only.

### What this cost, exactly

| | Before | Now |
|---|---|---|
| On-call SMS page | Twilio | **Bird** — but see the warning below |
| On-call voice page (the ring) | Twilio Calls.json + inline TwiML | **Bird inline sequence — restored, never yet placed against the live API** |
| AI attendant inbound line | Twilio webhooks + TwiML | **inert**, webhooks 404, panel says why |
| Everything the rota decides | unchanged | unchanged |

Routing, the escalation ladder, contracted-vendor exclusivity, the exchange
hand-off and the whole portal are untouched. So is the attendant's thinking:
`onCallAttendant.ts` and `onCallNumbers.ts` are provider-agnostic and still
pinned by 38 tests that know nothing about any telephone company. What is
provider-specific is `onCallVoice.tsx`'s TwiML and its signature check.

### Why the INBOUND half still cannot simply be ported

Outbound is solved (above). Inbound is the part that genuinely differs. A call
arriving on a Bird number is routed to a SIP trunk, a **published sequence**
built in Bird's console, a verified forwarding number, a ring group, or
rejected. Bird's webhooks are *events* — `voice_call.initiated` / `.answered`
/ `.ended`, signed per the Standard Webhooks spec with HMAC-SHA256 —
reporting what a call did rather than asking what should happen next. There is
no per-turn "say this, now listen" exchange, so the attendant's conversation
loop has nothing to attach to.

What Bird's own product page *does* document for sequences is promising for
the fallback build: "spoken greetings, keypad menus, and routing branches" in
a visual editor, and recording that captures "call audio **and transcripts**".
If that transcript is reachable from the `voice_call.ended` webhook, the
keypad-plus-recording attendant needs no separate transcription vendor —
`classifyEmergency` can read it as it stands.

## What is yours — Eric's call, 2026-11-11: ask Bird first

**Decision: nothing gets built against a guessed API.** Put these to your Bird
account contact:

1. Can a Bird **AI voice agent** answer an inbound call, hold a spoken
   conversation, and POST the fields it collected to our own webhook?
2. If yes — what is the per-minute cost, and is there a sandbox number to test
   on before it carries a real emergency?
3. If no — can a **sequence** capture speech, or is keypad-plus-recording the
   ceiling?

The answer picks the build:

- **Agent posts to a webhook** → `onCallVoice.tsx` keeps its shape; swap the
  TwiML for the agent's payload and the HMAC-SHA1 check for Standard Webhooks
  HMAC-SHA256. The conversation module is already what the agent's prompt
  should be built from.
- **Keypad plus recording only** → a Bird sequence does greeting → keypad
  category → record; `voice_call.ended` hands us the recording; transcribe it
  and run `classifyEmergency` exactly as it stands. Keypad instead of
  conversation, everything downstream unchanged.
- **Neither** → the number forwards to a voice-AI vendor, or the voice line
  alone goes back on Twilio. Both were offered and neither was chosen.

### Also outstanding, and unrelated to the provider

- **Confirm `BIRD_SMS_FROM` is set.** `bird.ts` needs the sender as well as the
  key, and without it every SMS on the platform — invites, order updates,
  on-call pages — reports "not configured" and sends nothing.
- **Set `BIRD_VOICE_FROM`** — a voice-capable Bird number in E.164. The ring is
  wired again but it cannot place a call without a dialable caller ID, and
  `BIRD_SMS_FROM` is deliberately not reused: an alphanumeric sender id is
  valid for a text and cannot place a call. If your Bird key does not carry
  voice scope, set `BIRD_API_VOICE_KEY` as well; otherwise the SMS key is used.
- **Place one test call before trusting the ring.** `birdVoice.ts` is written
  against Bird's documentation and has never been run against the live API. Its
  sequence graph is pinned by 10 tests — connected end to end, speaks twice,
  only documented node types — but no test can prove Bird accepts it. Ring your
  own phone first.
- **Test it on your own account before a tenant does**, whatever shape it ends
  up. Your own number as the rota, at a time you choose. Nothing here has had a
  real emergency through it.

## Deliberately not built yet, and why

- **A model in the loop.** The classifier is deterministic keyword matching.
  Layering an LLM pass on top is a small change — `recordedOpenAIFetch` in
  `aiLedger.ts` meters it and `aiKillSwitch` stops it — but it has to stay a
  *suggestion* over the classifier rather than the thing that decides, and it
  must never leave a caller waiting on a model that is slow.
- **Caller verification against the tenant roster.** `recognizeCaller` is
  written and pinned; nothing calls it yet, because the roster it should read
  differs per portal type.
- **Spending authorisation and manager approval limits** from the brief. Those
  belong on the on-call config beside the callout rates, not on the attendant.
