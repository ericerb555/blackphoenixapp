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

## DECIDED AND DEFERRED — DO NOT RE-PITCH

### Point-in-Time Recovery: Eric's call, 2026-11-14, "not right now"
He asked what it would take, got the facts, and decided to turn it on later.
Recorded so the next session does not sell it to him again.

**What he has meanwhile:** the org is on **Pro**, which includes the last
**7 days of daily backups**. So the worst case is losing up to a day of
writes, not the database.

**What it would add:** WAL-G archives write-ahead log files roughly every two
minutes on top of a daily physical snapshot, so the worst-case RPO becomes
about two minutes rather than a day. "Any second" is close but not literal —
the archive interval is the floor, and it tightens under write load.

**What it costs:** ~$100/month for 7-day retention, ~$200 for 14, ~$400 for
28. Billed hourly, and NOT covered by the Spend Cap. Enabling it also replaces
daily backups rather than adding to them.

**Prerequisite to check when he does want it:** at least a Small compute
add-on, which PITR requires.

**The gap PITR would NOT close, and the reason to say so when it is enabled:**
it covers the database only. Storage objects are excluded — job photos, logos
and uploaded documents. Restoring the database to Tuesday does not bring back
a photograph deleted on Wednesday. That needs its own answer either way.

---

## WAITING ON A BUSY ENDPOINT, NOT ON ANYBODY

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

### The ingest path is FIXED and SHIPPED — Overpass is simply busy
Everything we control works, proved end to end on 2026-11-14:

- `api-origin-proxy` deployed from this repo, to its real route
- `/__osm/interpreter` live and gated — 401 without the secret, 405 on GET
- `EDGE_ORIGIN_SECRET` matched on both sides (it never had been; the old
  Supabase digest `81c0b89a…` and Cloudflare's copy were different values)
- the server deployed and calling the proxy
- a tick reaching Overpass through the hop, confirmed by the 401 disappearing

The last tick failed with **522 after 39.7 seconds**, and a direct request from
a laptop at the same moment got 502 with Overpass's own words: *"This Overpass
API server is currently at capacity. All query workers are busy and the request
queue is full. Retry your request using exponential backoff."*

**Nothing to fix and nobody to chase.** The hourly clock is the exponential
backoff Overpass asks for. Hudson is first in its queue — never-compiled sorts
ahead of stale — then Windham, then Salem and Manchester refresh.

**What to check tomorrow** rather than assume: `last_compiled_at` on
`exchange_territory`. If Hudson is still NEVER after a day of hourly ticks,
that is a new problem and the run record will name it.

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

### RESOLVED 2026-11-17 (signup) — two of our own forms asked for a card number and CVV

**Eric: "no card at signup, remove the fields."** Done for the registration
form — the card number, expiry, CVC and billing ZIP are gone, the whole
payment step with them, and the wizard is three steps for every plan. The
hardcoded test card went with the prefill. **Still open: the dead
`EnhancedCheckoutFlow.tsx` below, which nothing imports.** The original
finding follows.

Found 2026-11-17 answering "so this site is safe a secure for customers".

Real payments are fine: `/stripe/checkout/sessions` is created server-side and
the customer types their card on Stripe's own hosted page, so card data never
reaches our servers on the path that actually charges anybody.

These two are not that path.

**`pages/CustomerRegistrationForm.tsx` — routed, at `/customer-registration`.**
It renders a card number field and a CVV field, and `validate()` makes the card
number REQUIRED with a 16-digit check. Neither of the two requests it then
makes — `POST /auth/signup` and `POST /customers` — contains any card field.
The number is typed into React state and discarded.

So a customer is required to enter a card number to create an account, for a
card that is never stored, never charged and never sent anywhere.

Three separate problems in that one sentence:

- **It collects card data with no purpose.** The page is on our own origin, so
  any XSS on it, or a malicious browser extension, now has a card number and
  CVV to take that had no reason to exist. Card data you never asked for is the
  only card data that cannot leak.
- **It is misleading.** A required card field reads as "you are about to be
  charged" or "this is being kept on file". Neither is true.
- **It blocks registration.** Anybody unwilling to type a card cannot finish
  signing up — a conversion bug hiding inside a security bug.

There is also a hardcoded test card, `4532015112830366`, prefilled in a demo
autofill at line 77. It is a well-known Visa test number rather than anybody's
real card, but it should go with the fields.

**`components/EnhancedCheckoutFlow.tsx` — not imported anywhere.** Same card
and CVV fields, and `handleCompleteOrder` is a two-second
`setTimeout` under the comment "Simulate payment processing"; the order it
emits carries `payment: { method }` and no card data. Dead today — and a loaded
gun, because the day somebody wires this component to a route, customers type
real card numbers into a form that pretends to charge them and does nothing.

**THE FIX IS A PRODUCT DECISION, WHICH IS WHY IT IS WRITTEN HERE AND NOT DONE.**

The security-correct answer is to stop collecting card details in our own
forms at all: delete the fields from the registration form, delete the dead
checkout component, and let Stripe collect a card when there is actually
something to charge. But if the intent was to put a card on file at signup,
the fix is the opposite shape — a Stripe SetupIntent or Checkout in setup
mode, which stores a reusable payment method without our page ever seeing the
number. Those are different features, and guessing which one was meant is how
a billing flow gets built nobody wanted.

Until it is decided, nothing is leaking: no card number from either form
reaches our servers, our logs, or the database. The exposure is the browser
page itself, for as long as the fields are on it.

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

### The typecheck ratchet reads a syntax error as an improvement
`precommit.mjs` compares the NUMBER of typecheck findings against a baseline
and passes when the number does not rise. A parse error defeats that: `tsc`
stops analysing a file it cannot parse, so the semantic errors it was holding
up simply vanish from the count.

**Measured, 2026-11-14.** A stray backtick inside a template literal in
`growth-marketing.tsx` took the server count from **82 to 3**, and `precommit`
reported `typecheck ok — server 3 (under baseline)` and **passed all five
checks**. The file did not compile. The number went the right way, so the
ratchet applauded.

Had the baseline then been lowered to 3 as the ratchet's own note invites
("1 fewer, lower the baseline"), the 82 real errors would have been locked out
of view permanently.

**The fix** is to fail on error CLASS, not only on count: any `TS1xxx` (syntax)
error should fail outright regardless of the total, because it means the rest
of the check did not happen. A sharp drop is also worth treating as suspicious
rather than celebrated — real cleanups remove errors one or two at a time.

### Smoke trusts whoever answers on its port, and drives the wrong app
`smoke.mjs` starts Vite on `SMOKE_PORT`, then health-checks
`http://localhost:<port>/smoke.html` and proceeds when it gets a 200. It never
checks that the server answering is the one IT started.

**What that looked like, 2026-11-14.** An orphaned Vite from an earlier run
held 5177. A sweep launched from a WORKTREE found the port occupied, got its
200 from the MAIN checkout's server, and drove the browser against a harness
page that was not its own. Every batch came back silent and the error said
*"Nothing reported at all from the first batch. Either the route map failed to
load, or the batch was starved"* — blaming the route map, while the real
problem was that it was looking at a different application. It cost most of an
hour and three wrong hypotheses (junctioned `node_modules`, a stale Vite dep
cache, Edge profile collision) before `Get-NetTCPConnection` named it.

**The fix** is a sibling of the report-port one already made: either fail when
the port is occupied rather than adopting the squatter, or step to a free port
the way the report listener now does. Stepping is better — it also makes
worktree and main-checkout runs able to proceed side by side, which is the
whole point of a worktree.

A cheap intermediate: stamp something identifying into the generated
`smoke.html` and have the health check confirm it comes back.

### The smoke harness uses fixed ports, so two runs collide
`SMOKE_PORT` 5177 and `SMOKE_REPORT_PORT` 9911 are defaults, and a second run
cannot bind them. That is correct behaviour and it says so clearly — but it
means a `precommit` started while any other sweep is running fails on a check
that has nothing wrong with it.

This is what the unexplained 2026-11-14 "could not read the result" was: a
concurrent run holding the port, with smoke's own explanation thrown away by
precommit's keyword filter. Both halves are fixed — the filter now prints what
smoke said — so this is no longer invisible, just still inconvenient.

**The fix, when somebody wants it:** have the harness pick a free port instead
of a fixed one, and pass it to the browser. Everything needed is already in
`smoke.mjs`; it is the default values that are hardcoded, not the mechanism.


### Supabase Auth bypasses Cloudflare entirely
`src/app/lib/supabase.ts` builds its client against
`https://<projectId>.supabase.co`, so every `/auth/v1/*` call — sign-in,
sign-up, token refresh, password reset — goes straight to Supabase and never
passes through the proxied hostname.

The API does go through it: `SUPABASE_ORIGIN` is
`api.theblackphoenixcompany.com`, confirmed in the live bundle 2026-11-14.

So a WAF on that zone protects the API and **nothing that handles
credentials**, which is the half a WAF is usually bought for. Credential
stuffing, signup abuse and token-refresh floods all land on `/auth/v1`.

**The fix:** Supabase's custom-domain add-on for the auth hostname, or route
auth through the `api-origin-proxy` Worker as well. Either way it is a
prerequisite for calling the perimeter finished — see
`docs/security/owasp-crs-runbook.md`, which says the same at the top.


### `user_permissions` is read in ten places and written in none
Found 2026-11-16, while building the team screen.

Ten server modules gate on a fine-grained permissions record — `content-filter-admin`,
`fulfillment`, `hot-products`, `investments-kv`, `invoice-linking`,
`promotions-engine`, `store-ai-pricing`, `store-boosters`, `tier-features` and
`design-links` — reading either `user_permissions:<userId>` in KV or a Postgres
table of the same name.

**Nothing writes either one**, except `/auth/signup`, which always writes
`"client"`. Six rows exist across the whole project and all six say that;
`auth.tsx:460` already documents this from the 2026-09-20 investigation.

So every one of those gates falls through to its role check, and the
permissions layer is decorative. It is not a security hole — the role checks
are real and do the work — but it is a whole vocabulary of access that looks
configurable and is not.

**Why the team screen did not build on it:** roles are what the server
enforces, so roles are what `TeamAccessPanel` changes. Driving a store nobody
reads for authority would have been a second mock in the place the first one
just came out of.

**The fix, when it is wanted:** decide whether per-feature permissions are
actually a product requirement. If yes, the writer belongs next to
`POST /team/members/role` in `teamDirectory.ts` and those ten gates need to
mean something. If no, delete the reads and let the role checks stand alone.
### `/design` serves a Figma site from our own origin
`vercel.json` rewrites `/design` and `/design/:path*` to
`https://author-canon-65421010.figma.site/`. That is third-party HTML served as
`theblackphoenixcompany.com`, so anything executing there is same-origin with
the app — and the Supabase session lives in `window.localStorage`
(`src/app/lib/supabase.ts:83`), readable by any same-origin script.

It is inert today, by accident rather than design. Figma's page asks for
root-relative scripts (`/_runtimes/sites-runtime.….js`); the SPA catch-all
rewrite answers those with `index.html`, and `nosniff` stops the browser
executing HTML as script — verified 2026-11-16, that path returns
`status=200 type=text/html`. Its inline scripts carry hashes the CSP does not
list, so those are blocked too.

So the page is broken, and the danger is the obvious fix. Adding a
`/_runtimes` rewrite or loosening `script-src` to make the design page work
would hand Figma's JavaScript the session token for every signed-in user.

**The fix:** delete the rewrite, or move it to a subdomain that shares no
origin with the app. Do not repair it in place.


### Daily backups do not cover Storage objects
The project is on the Pro plan, so Postgres is backed up daily with seven days
retained — that part needs nothing. But the Supabase docs are explicit:
"Database backups do not include objects you store via the Storage API."

So `project-photos` and `project-videos` are outside it. Those buckets hold the
photographs behind every trash estimate, which is the evidence a disputed
number rests on, and the blueprint and document uploads.

**The fix:** a scheduled copy of the buckets to somewhere outside the project,
or accept the exposure deliberately and write down that it was a decision.


### A link visitor's estimate keeps no photographs
`TrashEstimatePanel` uploads originals to the private `project-photos` bucket
before pricing. A visitor on a texted pricing link has only the anon key, so
that upload fails — and the panel ignores upload errors by design, so the
estimate still prices from the frames extracted in the browser and simply
keeps no evidence.

Signed-in estimates are unaffected. But the panel's own header says the clip
is kept "because a person wants to watch it and it is the evidence behind the
number", and for link-priced jobs that is now untrue.

**The fix:** let the server store the frames it was sent against the estimate
record, or give the link route a signed upload URL. Worth doing before the
link is used in anger.


### 304 standing TypeScript errors are hiding real defects
`npx tsc -p tsconfig.json --noEmit` reports 304 errors (2026-11-16, after one
was fixed). Nobody can read that, so nobody does.

Two of the four fixes in the CSP/secrets work came out of it rather than out of
looking: the payments CSV exported a blank Type column because it read
`p.payment_type`, which is not a field on `UnifiedPayment`, and the revenue
breakdown omitted `bank_of_america` so that gateway read back `undefined`
instead of `0`. Neither was reported by a person. Both were sitting in the
noise.

**The fix:** not tidiness — a pass to find the rest. The ratio says there are
more.


### A fresh browser makes the next signup an "owner" in its own UI
`src/app/pages/SignUp.tsx` decides the account type from `localStorage`:

```js
const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
const isFirstUser = Object.keys(userProfiles).length === 0;
const accountType = isFirstUser ? 'owner' : 'customer';
```

In any fresh browser that object is empty, so the next person to register is
written as `owner` in their own stored profile.

**This is already known and already bounded**, which is why this entry is a
pointer rather than a discovery. The comment at SignUp.tsx:118 says the same
thing; the server grants every self-registration the `client` role
(`/auth/signup` hardcodes it, because it once read the role from the request
body and let anyone self-register as `master_admin`); and `Login.tsx` discards
a locally elevated `accountType` on the next sign-in. So it is not a privilege
escalation and it does not survive signing in again.

What is new is the traffic. The 5% junk pricing offer now sends visitors from
a texted link to `/signup`, on phones, in browsers with no stored profiles —
so the audience most likely to meet this is the one the funnel was built to
attract, and they meet it in the window between registering and their next
sign-in.

**The fix:** answer the first-owner question on the server by counting
accounts, rather than from what one browser remembers.


---

## Resolved 2026-11-17

Four of the five entries above are fixed; the originals are left in place
because the reasoning is the useful part.

- **`/design` serving Figma from our origin** — it is a `redirect` now, not a
  `rewrite`, so Figma's site loads on Figma's own origin. The page works
  better than it did before, which is unusual for a security fix.
- **A link visitor's estimate keeping no photographs** — the server stores the
  frames it was already sent, for any estimate that arrives with pictures and
  no `storage://` refs. Not special-cased to links; a failed upload from a
  signed-in phone on bad signal left the same hole.
- **A fresh browser making the next signup an "owner"** — signup always writes
  `customer`. The two welcome branches collapsed into one, because the branch
  existed to announce the claim.
- **Standing TypeScript errors** — 304 down to 297, and the seam is described
  below.

Still open: **daily backups do not cover Storage objects.** That one needs a
destination and a decision, not code, and is left for Eric.

### `Shift['status']` has no "cancelled" or "completed"

`MasterScheduling.tsx` moves an appointment through
`scheduled | confirmed | completed | cancelled`, but a crew shift can only be
`scheduled | pending | time-off | time-off-pending`.

So when a job is cancelled there is no honest value to write. The code used to
write `scheduled` regardless — leaving crews rostered on cancelled jobs — and
now leaves the shift untouched for `cancelled` and `completed`. That is true
rather than false, but a dispatcher is still looking at a shift for a job that
is not happening.

**The fix:** widen `Shift['status']` to carry the states a job can actually
reach, and render them. It touches the roster UI, which is why it was not done
alongside the one-line correctness fix.

### The TS2367 / TS2551 seam is exhausted — 281 left, all noise codes

Closed 2026-11-17. **Five real defects** came out of this list and not one was
reported by a person: a blank Type column in every exported payments CSV, Bank
of America missing from the revenue breakdown, six social captions containing
the word "undefined", crews left rostered on cancelled jobs, and the booking
page below — which was the worst of them.

| Code | What it means | Yield | Left |
|---|---|---|---|
| TS2367 | A comparison whose types cannot overlap | Almost always a real bug | **0** |
| TS2551 | A misspelled property, with the correct name suggested | Almost always real | **0** |
| TS2339 | Property not on type — mostly loose record shapes | Low, very noisy | ~150 |
| TS2322 | Assignment mismatch | Low, very noisy | ~108 |

The last five high-yield errors resolved as one defect, one wrong type, one
dead branch and one false positive:

- **The customer booking page was writing fabricated data into the real
  schedule** (two TS2367s in `ServiceScheduling.tsx`). Found because a
  priority badge had two unreachable branches — and the reason they were
  unreachable is that the whole contract object was a mock. It carried contract
  number `CT-20260122-0045` for every customer, the address
  `123 Main St, New York, NY 10001`, `depositPaid: true` with a DEPOSIT PAID
  badge before anyone had paid, and three invented technicians (`e1` Mike
  Johnson, 4.9 rating, 342 completed, Certified) whose ids were written as the
  appointment's `employeeId`. `handleConfirmAppointment` POSTs that object to
  `/schedule/appointments`, which stores the body whole, and `MasterScheduling`
  reads that store — so a dispatcher would have seen a real customer's real
  appointment at a New York address with a technician who does not exist. Six
  routes reach it: `/book`, `/booking`, `/services`, `/quote`,
  `/service-scheduling`. **No appointment records existed yet**, so this was
  caught before anybody acted on one. Fixed by loading the roster from
  `time-tracking/employees` and `unavailability` — the same fix
  `MasterScheduling` already carried for the identical defect on the staff
  side — requiring the service address from the customer, and showing the
  deposit as due.
- **`laborItems` was a real field the type did not declare** (TS2551 in
  `UnifiedProjectPipeline.tsx`). The suggested correction, `laborRates`, is
  hourly rate cards rather than labour lines; taking it would have put rate
  cards in the labour list. The type was wrong and the code was right.
- **An always-false stage comparison** (TS2367, same file): nothing is ever
  staged `'work-request'`, and a work request entering the pipeline is already
  mapped to `quote-draft`. Dead branch removed.
- **The placeholder credentials guard** (TS2367 in `lib/supabase.ts`) was the
  one high-yield error that was not a defect — `projectId` is a literal, so
  the compiler believes `!== 'placeholder'` cannot be false, while the guard
  exists for the checkouts where `info.tsx` is unconfigured. Compared through
  `String()` so the check survives.

**The method that made this seam pay, if a similar list ever needs working:**
start from the error CODE, not the file; then decide from production data or a
request rather than by reading — three of the cases above were settled by asking
what is actually stored, and one by asking production which header arrives.
