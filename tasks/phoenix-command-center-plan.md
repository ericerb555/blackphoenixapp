# Phoenix Command Center — implementation plan

Written 2026-11-08, in response to the "PHOENIX AI MUST BE THE LIVING INTERFACE"
brief. Section 9 of that brief says: inspect first, do not code until approved.
This is the inspection and the plan. **Nothing below Phase 0 is built.**

---

## Part 1 — What is already here

### The logo

| Asset | What it actually is |
| --- | --- |
| `src/imports/BPB_phoenix_full_color_logo.png` | **The real mark.** 1080×1080 raster PNG, 183 KB. Full colour. |
| `public/bpb-phoenix-logo.png` | Byte-identical twin of the above, served statically. |
| `src/imports/BPB_phoenix_full_color_logo-1..5.png` | Five more copies. |
| `src/app/components/PhoenixLogo.tsx` | **An SVG, but not your logo.** 83 lines of hand-drawn paths — "an upswept firebird" somebody traced by eye to dodge an asset-loading bug. It is a different bird. |

**This is the first decision, and it is yours.** The brief says to animate *my
exact logo* and, if it is raster only, to assess the options. It is raster only.
The existing SVG is not a vector of it — adopting it would be exactly the
"Phoenix-inspired replacement" the brief rules out.

Three honest options, in order of fidelity:

1. **Find the original vector.** Whoever designed the mark almost certainly has
   an `.ai`/`.svg`/`.eps`. This is the best outcome by a distance: real paths
   mean energy can travel *along a wing*, the head can brighten independently,
   and nothing is ever approximated. Costs nothing but an email.
2. **Trace the PNG to SVG, then you approve the trace.** Produces real paths at
   the cost of a fidelity review — auto-tracing a detailed full-colour raster
   drifts on fine gradients. I would show you the trace over the original at
   high zoom before a line of animation is written.
3. **Animate the PNG as-is.** Zero distortion risk, because the pixels are never
   altered. Glow, breathe, pulse, colour-shift and a sweeping light band are all
   achievable with the PNG's own alpha channel as a mask. What is *not*
   achievable is per-feature animation: the whole bird reacts together.

Option 3 is a genuinely good result and is my recommendation **if option 1 fails**.
It cannot do "energy travels through the left wing then the right".

### The application

- **359 route keys → 188 page components**, all in one `pageMap` in
  `src/app/routes.tsx`. This matters more than it sounds: the module map the
  brief asks for in section 2 already exists in machine-readable form. The
  registry does not have to be invented, it has to be *described and kept honest*.
- Pages all receive `onNavigate`, so "open any supported page" is one call.
- Server is a single Supabase edge function (Hono), many routers, auth wall by
  path prefix; `trustedRole` reads `app_metadata` only.

### The AI that already runs

Built and live, not aspirational:

- **Ledger** (`ai_call_log`) — every model call, opened *before* the call, with
  model, tokens, cost in cents, outcome. Holds shape, never content.
- **Kill switch** — `assertAiAllowed()` before every call; global or per-agent;
  fails to last known state.
- **Action queue** — proposals with a risk level from a server-side registry,
  a database trigger freezing `action`/`params`/`summary` after proposal, and
  a re-read before execution. High risk is owner-only. Proven in production.
- **Phoenix chat** — 11 tools, 10 read + `propose_action`. Column allowlists.
- **Cost model** — verified per-model pricing; spend ceiling.

**Everything below inherits these.** No phase introduces a model call that
skips the ledger or the stop.

### What is NOT connected (and so cannot be promised)

The brief is explicit: *"Do not pretend Phoenix can inspect systems that have
not been connected."* Checked, and absent:

| Brief asks for | Status |
| --- | --- |
| "real application usage and performance data" | **No analytics.** No PostHog/Mixpanel/Amplitude, no event tables. Nothing records that a page was viewed. |
| "application errors" | **No error tracking.** No Sentry/Bugsnag. Client errors reach `console.error` and die there. |
| "inspect authorized application structure", source code | **No source access.** Phoenix runs in an edge function; the repo is not mounted. |
| "produce proposed code changes", "preview changes before deployment" | **No dev environment, no preview pipeline.** |
| voice in / voice out | **Not connected.** |
| "conversion funnels", "feature adoption" | Downstream of analytics. Nothing to read. |

Several of these are buildable. None are buildable *as part of the UI work* —
each is its own integration with its own cost, and I have phased them honestly
rather than folding them into a sentence.

---

## Part 2 — The architecture

### The idea the whole thing turns on

When you say *"Phoenix, show me outstanding estimates"*, there are two ways to
put that table on screen:

- **Through the model.** Phoenix queries, the rows enter the transcript, the
  model re-emits them. Every row is paid for twice in tokens, the model can
  mistype a figure, and the rows are now in a prompt.
- **Around the model.** Phoenix returns a *directive* — `{ open: 'quotes',
  filter: { status: 'outstanding' } }` — and the **browser fetches the data
  itself, as you, through the route that already exists.**

The second is the design. Three consequences, all of them load-bearing:

1. **Cost.** A 200-row table costs zero tokens. Given the standing directive to
   cut AI spend 70–90%, no other decision here comes close.
2. **Security.** The data path does not change at all. Same route, same auth
   wall, same RLS, same session. Phoenix cannot show you something you could not
   already open, because Phoenix is not the one opening it — it is naming a door
   and your own browser is deciding whether you may walk through.
3. **Truth.** The numbers on screen are the live component's numbers. A model
   cannot round them, stale them, or invent one.

### The capability registry

A declarative list — id, label, route, what the module is *for*, which tools read
it, which actions it supports, who may see it.

The failure mode of every registry is drift: the list says a page exists, the
page was renamed, Phoenix confidently offers a dead door. So:

- Entries are keyed to `pageMap`, and **a test fails the build if a registry
  route is not a real route.**
- Coverage is reported (`N of 359 routes described`) so the gap is visible
  instead of assumed.
- The registry is **descriptive, not an access grant.** It says a module exists.
  Whether you may read it is still decided by the auth wall, per request.

### Security boundaries (unchanged, and stated so they stay that way)

- No raw SQL from the model. Ever. Named tools, column allowlists, as now.
- Registry visibility is filtered by role before it reaches the model.
- Workspace components fetch as the signed-in user. Phoenix is never a proxy
  that could launder a permission.
- Writes stay in the approval queue. Nothing in the workspace bypasses it.
- Every phase's model calls go through the ledger and the kill switch.

---

## Part 3 — Phases

Each phase ships working and is useful alone. Each is a separate commit against
the verification baseline (app typecheck 307, server 83, `node --test`,
`checkImports`, served-route diff).

### Phase 0 — Home ✅ DONE, LIVE

Phoenix mark beside the crown in the Owner's Control Center; opens
`phoenix-ai`, its own page. Conversation extracted to `PhoenixConsole` so the
panel and the page cannot drift. Commit `1904b54a3`.

### Decisions taken 2026-11-08

- **Logo:** trace the PNG to SVG, with the trace shown side-by-side at high
  zoom for approval *before* any animation is written.
- **Order:** useful first — 2 → 3 → 2.5 → 1 → 4 → 5.
- **Telemetry:** yes, as Phase 2.5.

### Phase 2 — Capability registry + discovery tools ✅ DONE, LIVE

`capabilityRegistry.ts` describes **85 modules** (24% of 359 routes — the
operational ones; padding it with aliases makes search worse, and the test
reports coverage so the gap stays visible). `find_module` searches it *in the
edge function*, so 85 descriptions never enter a prompt. `open_module` returns
a directive.

Two safety properties, both tested: the route is resolved from the registry by
id and never taken from the model, and `open_module` re-checks visibility so
it cannot reach past what `find_module` would have offered.

A test fails the build if any capability names a route that is not in
`pageMap`. Commit `47886d932`.

### Phase 3 — The workspace ✅ DONE, LIVE

`PhoenixWorkspace.tsx` mounts the **real page component** from `pageMap`,
inside `PanelErrorBoundary` and `Suspense`, beside the conversation. Expand,
close, and open-as-full-page. The slide-over has no workspace, so there it
navigates instead — an honest fallback rather than a chip that does nothing.

Still to do here as modules get exercised: some of the 188 page components
assume a full screen and will need a width-constrained mode. Widening by use,
not converting 188 blind.

### Phase 2.5 — Telemetry (NEXT)

Error tracking and usage events. Phase 5 is thin without them, and they are
independently valuable: finding out a screen broke for a customer without
being told.

### Phase 1 — The living logo

The seven states from the brief, each **driven by a real signal, not a timer**:

| State | What actually triggers it |
| --- | --- |
| Idle | nothing in flight |
| Thinking | a request is open |
| Working | `ai_call_log` has a running row |
| Alert | pending approvals, or a call stuck >10 min |
| Success | an action executed |
| Listening / Speaking | voice (Phase 7) |

Worth being clear about why this is not decoration: a Phoenix that glows
"working" **because the ledger has an open row** is a status display. One that
glows on a `setInterval` is a screensaver. Only the first is worth building.

Includes `prefers-reduced-motion` honoured, and GPU-cheap rendering.

*Blocked on the logo decision above.*

### Phase 2 — Capability registry + discovery tools

The registry, the drift test, role filtering, and two tools: `find_module`
(search) and `open_module` (returns a directive, opens nothing itself).
Ships useful on its own: *"where do I manage subscriptions?"* starts working.

### Phase 3 — The workspace

The page splits: conversation one side, workspace the other, mark always
visible. Directives mount **the real existing components**, lazily. Panels
expand, collapse, focus. Nothing in the app is reimplemented.

Risk I will manage rather than discover: 188 page components were written
assuming a full screen. Some will need a width-constrained mode. I will start
with a handful of high-value modules and widen, not convert 188 blind.

### Phase 4 — Screen awareness

A context provider pages register with (`route`, record id, title). "Explain
this" sends that **descriptor** — not a DOM scrape, which would be unbounded,
expensive, and full of whatever happened to be on screen.

### Phase 5 — Analysis and recommendations

Against connected data only: ledger, queue, business tools, registry coverage.
Recommendations state their evidence, and distinguish **observed** from
**suspected** — the brief asks for that distinction explicitly.

### Phase 6 — Scheduled reviews

`pg_cron` is already in use. Per-run cost cap, results to a table, nothing
auto-applied. Off by default; you switch it on.

### Phase 7 — Voice

Browser Web Speech API for listening (free, Chrome/Edge). Speaking costs real
money per character — I will bring you a per-1,000-word figure before building,
not after.

### Phase 8 — Code inspection and proposed changes

The honest one. Requires new integrations that do not exist: repository access,
an error tracker, analytics, a preview environment. **I would not start this
before Phases 1–5 are earning their keep**, and it needs its own plan, its own
budget, and its own security review — an AI with repository write access is a
different risk category from everything above.

---

## Part 4 — What I need from you

1. **The logo**, per Part 1. Option 1 (find the vector) is worth one email
   before we settle for anything else.
2. **Phase order.** 1→2→3 is the cinematic route; 2→3→1 makes it *useful*
   soonest and leaves the mark static a while longer.
3. **Analytics and error tracking.** Section 4 and Phase 5 are thin without
   them, and they are cheap and independently valuable. Say the word and they
   become Phase 2.5.
