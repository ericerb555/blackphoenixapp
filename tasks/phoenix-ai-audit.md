# PHOENIX AI — Phase 1 audit, and what the blueprint should become

Eric supplied a 29-section specification for PHOENIX AI: a multi-agent
executive operating system, to be built on top of the Black Phoenix platform,
starting with an audit of the existing application and explicitly *not* with a
rewrite.

This is that audit. Its headline finding is not a security hole or a missing
service. It is that **the blueprint is written for a project that does not
exist here.** It describes building, from scratch, a system that this codebase
has already built roughly seventy per cent of — under different names, in
pieces, without a layer tying them together.

So the useful deliverable is not "here is how to build PHOENIX AI." It is
"here is what you already have, here is what the blueprint calls it, and here
are the eleven things that are genuinely missing." Building to the blueprint
literally would produce a second marketing engine next to `growth-marketing`,
a second spend ceiling next to `aiSpend`, a second approval queue next to
`publishApproval`, and a second clock next to `storeAutonomy` — and in every
case the duplicate is the one that drifts, because the original is the one in
production.

---

## 1. What is actually here

**Scale.** 1,130 commits. ~110,800 lines of Deno/TypeScript across ~240 server
modules in one Supabase edge function. 299 React components and ~120 pages on a
Vite + React 18 + Tailwind v4 frontend. 56 migrations. 131 hand-written test
files. One CI workflow running CodeQL, secret scanning across full history, and
blocking dependency advisories.

**Shape.**

    Vite/React SPA (Vercel)
        |   publishable Supabase key, in the bundle by design
        v
    Supabase Edge Function  make-server-3eae23a6   (Hono)
        |   index.tsx = 22,858 lines: CORS, the auth wall, ~240 mounted routers
        v
    PostgreSQL + RLS   .   Storage buckets   .   pg_cron + pg_net

**The authorisation model is already correct, and hard-won.** Authority is read
from `app_metadata` only, through one shared `trustedRole` — because eleven
checks used to read `user_metadata`, which any signed-in customer can write
from the browser console. `requireStaff` is applied as scoped middleware, with
a comment explaining that an unscoped `use("*")` on a router mounted at `/`
once took the whole API staff-only for a deploy. The auth wall in `index.tsx`
defaults an unlisted route to "signed in", with explicit `PUBLIC_PREFIXES`,
`PUBLIC_GET_PREFIXES` and exact-match `PUBLIC_POST_PATHS`.

This is the single most important fact for PHOENIX AI, because sections 10 and
11 of the blueprint describe building exactly this, and it would be strictly
worse than what is here.

---

## 2. The blueprint, mapped to what exists

| Blueprint asks for | Already exists as | State |
|---|---|---|
| §11 PHOENIX GUARDIAN — authority enforcement | `trustedRole.ts`, `requireStaff.ts`, the auth wall, RLS | **Done, better than specified** |
| §11 spending limits | `aiSpend.ts` + `aiCeiling.ts` — per-account, per-bucket, reserve-then-refund | **Done** |
| §12 SSRF / untrusted external content | `outboundGuard.ts`, `safeFetch.ts` — redirects followed by hand, every hop re-validated | **Done, gap documented** |
| §10 approval checkpoints | `publishApproval.ts` — edit-resets-approval, staff exempt | **Done for content** |
| §10 autonomy levels, emergency stop | `storeAutonomy.ts` + `storeTickRules.ts` — job registry, per-job switches, spend/order ceilings, leases | **Done for the store only** |
| §20 proactive workflows | `autopilot.tsx`, pg_cron into `/store/cron-tick`, `/exchange/cron-tick`, `/autopilot/cron-tick` | **Partial** |
| §18 Growth Engine | `growth-marketing`, `growth-tools{,2,3}`, `seo-engine`, `search-console`, `social-media`, `content-studio`, `creative-studio`, `advertising`, `video-studio`, `reel-research` | **Largely done** |
| §9 owner communications | Resend, Twilio (two-way), `staff-notifications`, `onCallEscalation`, `email-center` | **Done except voice loop** |
| §4 department agents | ~15 independent model call sites: `quote-generator`, `design-assistant`, `exchangeAssistant`, `scheduleAssistant`, `architect-review`, `bid-intake`, `ai-floorplan`, `ai-blueprint-analysis`, `house-capture`, `page-pilot`, `store-ai-pricing`, `product-scoring` | **Capabilities yes, agents no** |
| §7 multi-business registry | `organizations`, `organization_members`, `companies`, `provider-orgs`, `feature_grants` | **Multi-tenant, not multi-app** |
| §23 AI stack | `OPENAI_API_KEY` *and* `ANTHROPIC_API_KEY`; gpt-4o, gpt-4.1-mini, gpt-image-1, dall-e-3, claude-opus-5; per-feature model env overrides | **Done** |
| §8 Mission Control | `CommandCenterHome`, `AIDiagnosticsCenter`, `AnalyticsDashboard`, `AdminAlertsPanel`, `AutopilotCampaigns` | **Screens exist, not unified** |

The blueprint's §23 "preferred technology" list — Vite, TypeScript, Supabase,
PostgreSQL, OpenAI with tool calling, GitHub, Resend, Twilio, Stripe — is a
description of this repository.

---

## 3. What is genuinely missing

These are the eleven things the blueprint asks for that have no counterpart
here. This is the real backlog.

1. **No orchestration layer.** ~15 model call sites, each assembling its own
   prompt, choosing its own model, handling its own failure. There is no
   object representing "a task an agent is working on," no way to ask what the
   AI is currently doing, and no way to stop it centrally.

2. **No agent or tool registry.** §2 and §10 depend on one: agents cannot be
   listed, paused, resumed or permission-scoped if they are not first-class.

3. **No AI audit log.** `aiSpend` counts calls; nothing records what was asked,
   what came back, what was done with it, or on whose authority. §10 and §22
   both require this, and it is the precondition for trusting autonomy.

4. **No durable workflow engine.** The substitute — idempotent jobs advanced by
   an external tick — is sound and I would keep it. But there is no retry
   policy, no step-level state, and no resumption after partial failure. §20's
   nine-step lead workflow cannot be expressed in it today.

5. **Platform-wide autonomy levels.** §10's three levels exist, correctly
   implemented, *inside the store subsystem*. Nothing governs the other
   fourteen AI surfaces, which are gated only on being signed in.

6. **No global emergency stop.** `storeAutonomy` can disable store jobs.
   There is no one switch that halts all model spend and all autonomous
   publishing — §25 item 20 and §28 item 24 both require it.

7. **Prompt injection is essentially unaddressed.** One file mentions it. The
   system reads vendor catalogues, OSM data, uploaded blueprints, customer
   photographs, research results and inbound email into prompts. §12 treats
   this as a first-class threat; the codebase does not yet.

8. **No AI-facing persistent memory.** §13's four memory systems. The KV store
   and Postgres hold business data, but nothing holds owner preferences,
   architecture decisions or operational learning in a form an agent reads.

9. **No multi-application registry.** `organizations` is multi-tenancy *within*
   Black Phoenix. §7's "register a second application with isolated data and
   shared orchestration" has no foundation here.

10. **No App Factory.** §5 in its entirety. There is no GitHub integration, no
    sandbox, and no code generation path.

11. **No voice conversation loop.** `ELEVENLABS_API_KEY` and `gpt-4o-mini-tts`
    are present for synthesis; there is no duplex conversation.

---

## 4. Risks I found while looking

**`index.tsx` is 22,858 lines.** Every new router mounts here, and the auth
wall's three public-path lists live here. This is the single highest-friction
obstacle to adding anything PHOENIX-shaped, and the place a mistake is most
likely to be invisible. It needs splitting before it grows further, not after.

**A stale comment that misdescribes reality — but only the comment.**
`autopilot.tsx` still opens by stating "this environment has no server cron
(edge functions are request-driven only)". That stopped being true on
2026-10-13, when `schedule_autopilot_tick` armed a fifteen-minute pg_cron job
against `/autopilot/cron-tick`. The runner is fine; the file's own description
of why it is shaped that way is now misleading to the next reader. Worth one
line of correction, nothing more.

I flag it because I drew the wrong conclusion from it myself before checking
`cron.job`, and the wrong conclusion — "autonomous publishing only runs when a
tab is open" — is exactly the kind of thing that gets designed around.

**The migration directory understates what is running.** The clock story is
not readable from the filenames.
`20261003140000_schedule_store_tick.sql.pending` looks parked; its header says
plainly that both its jobs have been live in production since 2026-10-03,
applied by hand, and that the file is "the record, not the switch" — and that
the file had drifted three ways from what production actually runs, including
the job name. That is the right call made honestly, and it is still a state
where the only way to know what is scheduled is to query `cron.job`.

Before §17 owner-absence mode depends on any of these, there should be one
route that reports the live schedule — what is armed, when it last ran, and
whether it succeeded. `storeAutonomy`'s heartbeat already does this for its own
jobs and is the model.

**Three retired `make-server-*` stubs are still deployed** alongside the live
function. Reduced surface is cheap; worth confirming they are inert.

**The blueprint's own risk.** §15 (controlled self-improvement) and §5
(autonomous code generation) against a 110k-line production system earning real
revenue is the highest-risk item in the document by a wide margin, and the one
with the least existing scaffolding. It should be last, not Phase 8.

---

## 5. What I recommend instead of §24's twelve phases

Keep the blueprint as the statement of intent. Replace the build order.

**A. Split `index.tsx`.** Nothing else is safe or pleasant until this is done.

**B. Build the ledger before the agents.** One table recording every model
call: who asked, which agent, which tool, under what authority, what happened,
what it cost. This is §3's "never claim an action was completed without
verifying the result" made enforceable, and it is the cheapest item with the
highest leverage. It also makes gaps 1 to 3 above answerable.

**C. Promote `storeAutonomy`'s pattern to the platform.** It is already the
right design — job registry, per-job switches, ceilings, leases, heartbeat,
"armed carrying nothing". Generalise it rather than writing PHOENIX CORE next
to it. The global emergency stop falls out of this for free.

**D. Give the ~15 AI call sites one front door.** A single module that owns
model selection, the spend check, the audit write, and prompt-injection
boundaries. Retrofit the existing call sites through it one at a time. After
this, "agents" is a thin naming layer over capabilities that already work.

**E. Then, and only then, autonomy and Mission Control.** §26's seven-day
absence simulation is a good gate and should stay.

Gaps 9, 10 and 11 — multi-application, App Factory, voice — are a different
product from everything above. They should not be interleaved with hardening
the business that is currently earning.

---

## 6. What I need from Eric before Phase 2

The audit did not require any of this, which is why it is at the end rather
than the start.

- **Which of the eleven gaps are real goals**, versus aspiration written into
  the document for completeness. My guess is 1 to 8 are real and 9 to 11 are
  not yet, but that is a guess and it sets the next six weeks.

No credentials are needed for any of the above. Nothing in this audit modified
a production system, which §24 Phase 1 required.
