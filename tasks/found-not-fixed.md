# FOUND, NOT FIXED

Eric's rule, 2026-11-13: *"if you find something it must go on a list to have
fixed or fix it after the task you are doing nothing left behind broken or
unfinished it must be fixed or listed."*

Anything noticed in passing that was not the task at hand goes here with what
it is, where it is, and how it was found. **Delete the entry when it is fixed**
— a list nobody prunes stops being read, which is the failure this list exists
to prevent.

This is not the plan files. `phoenix-exchange-plan.md` and the rest hold work
that was *designed*; this holds work that is *broken or half-done*, found by
accident.

---

## BLOCKED ON SOMEBODY, NOT ON CODE

### The two Overpass deploys — written, tested, NOT shipped
The Exchange has not compiled a town since **2026-10-06**. The fix is committed
(`a0cf2b071`) and inert until both of these run, **in this order**:

    npx wrangler login
    npx wrangler deploy --config cloudflare/wrangler.toml
    npm run deploy:server

Reversed, the server calls a Worker path that does not exist yet. Wrangler
cannot be run from the agent environment — it needs an interactive login or
`CLOUDFLARE_API_TOKEN`.

**Also confirm first:** `EDGE_ORIGIN_SECRET` must be set on the Supabase side
as well as in Cloudflare, or the ingest throws rather than calling the proxy.

    supabase secrets list --project-ref plzsvzwwcdopnawtiwzm

### Windham and Hudson have never been compiled
Both sit `status: hidden`, `last_compiled_at: NULL`. They are first in the
clock's queue — `pickTownToRefresh` puts a never-compiled town ahead of every
stale one — so they fill themselves once the deploys above land. Listed so that
a town still empty a day later is noticed rather than assumed.

### Salem and Manchester are stale by over a month
`last_compiled_at` 2026-10-06, against `REFRESH_AFTER_DAYS = 7`. Same cause,
same fix. They refresh on their own once the clock works, one town per tick.

---

## FOUND WHILE FIXING THE CLOCK

### Bulk town discovery has no UI at all
`POST /exchange/admin/territories/discover` and `POST .../bulk` are built,
staff-gated and tested. **Nothing in `src/` calls either one.** `ExchangeTowns.tsx`
only reaches `/territories`, `/territories/lookup`, `/admin/health` and
`/admin/health/brief` — so towns can be added one at a time by hand and not in
bulk, which is the bottleneck on coverage. The per-town path (look up → open →
dry run → compile → show) does work.

### A pg_net probe never returned
Request id **54041** — `net.http_get` to Overpass with a User-Agent, fired
2026-11-14 to test whether Postgres can set the header the edge runtime will
not. No row ever appeared in `net._http_response`. Either still queued behind a
degraded endpoint, or pg_net drops a request that outlives its timeout without
recording it. Unresolved, and it matters: if pg_net *can* set a User-Agent it
is a simpler fallback than the Worker hop.

### The cron's HTTP timeout is shorter than the ingest's
`20261106190000_exchange_upkeep_hourly.sql` sets `timeout_milliseconds := 30000`;
`OVERPASS_TIMEOUT_MS` in `exchangeIngestRun.ts` is 90s. A compile that takes
longer than 30s is recorded by pg_net as a timeout even when it succeeded. Not
harmful — the KV run record is the real history — but `net._http_response` will
lie about it, and somebody will read that first.

### `overpass.osm.ch` is an empty mirror — do not "fix" anything by pointing at it
Answers **200 in one second with no data**: `timestamp_osm_base: "118455"`,
`elements: []`, for queries that return results elsewhere. Compiling a town
through it would report success and write zero businesses. Written down because
it looks exactly like the easy fix when Overpass refuses us.

---

## THE EXCHANGE, FROM READING THE PLAN AGAINST THE CODE

### Trial checkpoints are live and there is nothing to convert to
`exchangeTrials.ts` has `CHECKPOINT_MONTHS = [1, 3, 5]` wired into
`exchangeClaimRoutes.tsx`. **The three tiers do not exist.** Sign a founding
cohort now and month 5 fires a conversion prompt with no product behind it, and
month 6 arrives with nothing to sell. Tiers before the cohort, or the cohort
starts later.

### The category counter is enforced but never shown
`INCLUDED_CATEGORIES = 5` and `MAX_CATEGORIES = 10` in `exchangeCoverage.ts`
are applied in matching. Phase 8 asks for the count to be visible from day one
of a trial. No surface renders it, so a business hits the ceiling without
warning.

### Phase 4 is one tick of eight; Phase 5 is zero of eight
The resident-facing half of the Exchange. Saved-search alerts — which the plan
itself calls the retention mechanism (§9i, *"a saved sheet is an alert, and
that is the retention"*) — and ratings (§9m, §9q, rules written out in detail)
have **nothing built**. Phase 5, the routing and quote engine the plan calls
"the actual product" (§4), is entirely unbuilt.

### Two Black Phoenix listings share a phone number
`dedupeKeyFor` treats `tel:6177100058` as one business, so a future ingest that
meets that number would merge **Black Phoenix Builds** and **The Black Phoenix
Company**. They are separate today only because they were entered by hand. One
needs its own number. (Recorded in the build doc 2026-10-03; repeated here
because it is a live hazard, not a decision.)

### `ensureOrganization` reuses an org without checking its type
Noted in the build doc as the better fix that was not taken: it should reuse an
organisation only when the type matches the one it would create. Today a slug
collision can hand a compiled listing an existing org of another type. Guarded
for the one known source (`collidesWithInviteSlug`), not in general.

---

## MOBILE — P0 IS DONE, THE REST IS NOT

Done and shipped (`ca4db5e84`): iOS field zoom, notched header, `100vw` root,
the two floating widgets, 44px tap targets. What the scan found and P0 did not
touch, measured over 650 components and pages:

### 605 unbreakpointed `grid-cols-N` across 236 files
A fixed multi-column grid on a 390px screen. The single biggest layout defect
by volume. Mechanical to fix — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` —
but it wants a codemod plus review in batches, not a blind sweep.

### 16 files put a `<table>` on a phone with no horizontal scroll
No `overflow-x-auto` wrapper, so the table drags the page sideways.

### 2,194 `flex justify-between` rows that cannot wrap
Most are header rows that merely look tight; some collide. Needs eyes, not a
regex — fix the ones that visibly break.

### There is no mobile navigation anywhere
`menuOpen` / `setMenuOpen` is declared at `App.tsx:1381` and **never rendered** —
dead state. The shell header carries only the company selector, role switcher
and sign-out. `UnifiedDashboard` is the only page with a mobile variant. So on a
phone, once you leave the dashboard the only way back is the "Return to Landing
Page" button in the footer.

### Four files in the whole app do any viewport detection
And there is no shared `useIsMobile` hook — `src/app/hooks/` holds two hooks,
neither of them this. Every mobile branch is re-derived.

### No guard against the problem regrowing
Nothing stops a new unbreakpointed `grid-cols-N` landing tomorrow. A check in
`scripts/precommit.mjs` would hold the line while the backlog is worked off.

### Pages that need hand-tuning, worst first
Revenue and field paths, all with zero responsive classes:
`StripeCheckout` · `CustomerQuoteApproval` (1,249 loc) · `SignUp` ·
`RequestServicePage` · `CustomerPortal` · **`ChangeOrderCameraApp`** (1,700 loc,
8 fixed grids — a *camera* app used in the field) · `JobPhotos` ·
`EmployeeMobileApp` · `ExchangeDirectory` (754 loc) · `ExchangeTowns` (737) ·
`ExchangeAccount` (405) · `DirectoryLandingPage` · `PublicStore` ·
`InvoiceBuilder`.

Admin consoles needing card-list treatment: `BidRoom` (2,046 loc, 154 inline
styles, zero responsive) · `SubcontractorSetupWizard` (16 fixed grids) ·
`PropertyRevenueHub` · `AIContentStudio` · `MaintenancePlanEditor` ·
`QuoteToContractEditor` (6,524 loc).

### The 390px browser sweep has not been run
Everything above is static analysis. Overlap, clipping and real overflow need a
device-width pass, and it would also confirm P0 actually landed.

---

## HOUSEKEEPING

### `ui/Input.tsx` and `ui/input/` both exist
The casing mismatch is fixed (the working-tree file is now `Input.tsx`, matching
git, and TS1261 is gone). But a **file** `ui/Input.tsx` and a **directory**
`ui/input/` still sit side by side, and on a case-insensitive filesystem an
import of `./ui/input` is ambiguous between them. It will cause this again.

### Typecheck baselines are debt, not health
App **306**, server **82**. Both are under their recorded baselines (316 / 87)
and both are hundreds of real errors. `ChangeOrderCameraApp.tsx` alone accounts
for roughly 25 of the app's.

### `git commit` warns every time
`error: failed to delete '.git/worktrees/deploy-head': Permission denied` on
every commit in this tree. The commit succeeds. Probably a stale worktree
registration holding a lock; `git worktree prune` when nothing is using it.

### `q3probe.mjs` is untracked in the repo root
Appeared in `git status` during this session and is not mine. Either it belongs
in `scripts/` or it should go.
