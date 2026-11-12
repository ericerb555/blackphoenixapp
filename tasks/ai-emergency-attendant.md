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

- [ ] **A. Number directory.** `onCallNumbers.ts` — pure resolution of a dialled
      number to an account, plus the caller's number to a known property/unit.
- [ ] **B. Attendant state machine.** `onCallAttendant.ts` — pure: what to say,
      what to ask next, when enough is known to dispatch, deterministic
      classification into the emergency categories, safety-critical detection.
- [ ] **C. Voice router.** `onCallVoice.tsx` — Twilio webhooks, signature
      verification, TwiML, per-call session in KV, AI assist behind the ledger
      and kill switch with the pure classifier as fallback.
- [ ] **D. Terminate on the existing spine** — build a work request with
      `priority: 'urgent'` and hand it to `persistWorkRequest`. No second
      dispatch system.
- [ ] **E. Portal settings** — an AI Attendant section in `OnCallSetup.tsx`.
- [ ] **F. Reporting** — call history, transcripts, AI summaries on the
      existing on-call screens.

Items A–D are the chain; E and F are what makes it sellable.
