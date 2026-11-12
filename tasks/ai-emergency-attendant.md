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

## What is yours — nothing answers until these are done

1. **Set `TWILIO_AUTH_TOKEN`** (with `TWILIO_ACCOUNT_SID` and
   `TWILIO_PHONE_NUMBER`, which paging already needs). Until it is set, every
   inbound call is refused with a 404 — deliberately: an unauthenticated
   endpoint that creates emergencies is worse than no endpoint.
2. **Point a Twilio number at the webhook.** In the Twilio console, that
   number's *A call comes in*, HTTP POST:

       https://<your edge host>/make-server-3eae23a6/voice/incoming

   The status callback, if you want one, is `/voice/status`. `/voice/gather` is
   reached by the TwiML itself and needs no configuration.
3. **Assign that number in the portal** — Emergency Line → Numbers. A number
   pointed at us that no account has claimed is answered with "this number is
   not set up", which is the right answer and not a useful one.
4. **Test it on your own account before a tenant does.** Your own number as the
   rota, at a time you choose. Nothing here has had a real emergency through it.

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
