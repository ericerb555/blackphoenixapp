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

### The frontend does NOT build on Cloudflare, and that pipeline is dead
A Cloudflare Worker named `blackphoenixapp`, connected to this GitHub repo on
`main`, has failed **111 builds**, most recently 2026-11-14, with
`JavaScript heap out of memory` during Vite's "rendering chunks" phase.

**Nothing is broken by this.** The live site is served by Vercel — a request to
`theblackphoenixcompany.com` comes back with `x-vercel-id` and
`x-vercel-cache` behind Cloudflare's proxy — and `deploy.md` says so: *"anything
under `src/` → `git push origin main` — Vercel builds"*. Every deploy today went
out that way and was confirmed live in the browser.

So that pipeline has never shipped anything and nobody has missed it. The
decision is whether it should exist at all, NOT whether to fix its heap limit.
`NODE_OPTIONS=--max-old-space-size=4096` would make it build, but it would be
making a duplicate deploy of the same app from the same branch — two things
publishing one site is a worse problem than one of them failing.

The build itself is healthy: `npm run build` finishes locally in 32-55s and has
been run many times today without memory trouble.

### The two Overpass deploys — written, tested, NOT shipped
The Exchange has not compiled a town since **2026-10-06**. The fix is committed
(`a0cf2b071`) and inert until both of these run, **in this order**:

    npx wrangler login
    npx wrangler deploy --config cloudflare/wrangler.toml
    npm run deploy:server

Reversed, the server calls a Worker path that does not exist yet. Wrangler
cannot be run from the agent environment — it needs an interactive login or
`CLOUDFLARE_API_TOKEN`.

**The Worker name is reconciled** — `api-origin-proxy`, read off the dashboard
2026-11-14. It had been `blackphoenix-origin-proxy`, a name that has never
existed in the account, and deploying under it would have created a rival
Worker on this route with no `EDGE_ORIGIN_SECRET` and taken the API down. Safe
to run now; the reasoning lives in `wrangler.toml` above the name itself.

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

### The 390px sweep ran — what it found that is still open
Run 2026-11-14 against production in a same-origin iframe (a desktop Chrome
window will not go below ~568px and was sitting at 62% zoom, so resizing it
cannot produce a phone viewport — the iframe gets its own real one at 386px).

**Confirmed working on the live site:** store button `display:none`, chat
widget 88px off the bottom (20px + the 4rem lift), and the landing page,
`/login`, `/signup` and `/exchange` all have `scrollWidth <= viewport` —
nothing drags sideways.

**Fixed on the spot** (`926cee5bf`): six Exchange fields still computing under
16px, found by measuring the running page.

**Also fixed** (`fe4f05760`): the Sign In button overlapping the landing hero,
and the third floating control — ThemeManager's colour editor — now hidden on
phones with a safe-area inset.

**Still open from the sweep:**

- **`* { margin:0; padding:0 }` kills every Tailwind padding utility
  application-wide.** `globals.css:70` says this is deliberate and that changing
  it needs Eric's approval, so it stays — but the consequences are not written
  down anywhere people will meet them. `px-6 py-3` on a button does nothing,
  which is why the Sign In control measured 26px tall on the live page, and why
  the 44px `min-height` rule is the only thing that can size a tap target here.
  Every "add some padding" fix in this codebase is a no-op. Worth a line in
  CLAUDE.md so it is learned once rather than per-person.
- **`/exchange` takes several seconds to mount on a phone-sized viewport** —
  long enough that a 45s scripted budget covering three routes timed out and
  froze the renderer. It renders correctly once up (1,401 nodes). Worth a look
  at what it loads before first paint.

**The 44px tap-target rule could not be verified this way.** `@media (pointer:
coarse)` does not match in desktop Chrome, so every "small target" count from
the sweep is the unstyled size, not what a phone gets. Confirming that rule
needs a real device or Chrome's device emulation.

**Only four routes were swept** — the landing page, `/login`, `/signup` and
`/exchange`. The browser profile used was signed in as a platform owner, so
authenticated pages are reachable; the rest of the ~190 pages are unswept.

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
