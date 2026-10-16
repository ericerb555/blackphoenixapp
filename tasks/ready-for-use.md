# Must-dos before the app is ready for use

Scanned 2026-10-04 on Eric's instruction. Every item below is evidence from the
code or from the production database, not a guess or a feature wish. Ordered by
what hurts soonest.

---

## 1. STOP: a landlord can be charged $45 for a report that cannot exist — FIXED

**This is live right now and it is my fault.** Phase 2 built the fee; phase 3
(a real agency) is not built. Nothing connects the two.

    screening_pricing     priceCents 4500, enabled true   (set 2026-10-04)
    DEFAULT_PROVIDER      'manual'                        (produces nothing)

The only `provider.live` checks in the server are on the *report link* route and
the staff-advance route. **Nothing refuses to take money when the provider
cannot deliver.** So a landlord who orders a screening today pays $45 through
Stripe, the order reaches `invited`, and it stays there for ever with no report —
because the manual provider issues no invitation and produces no report by
design.

Two fixes, either is enough, and one of them should happen before anybody else
touches the landlord portal:

- [x] **Refuse to order at all when the resolved provider is not live**, with a
      message saying screening is not yet available. One guard in the order
      route, before `chargeFor` is consulted.
- [ ] Or set `enabled: false` on the pricing record until a real provider is
      configured.

The first is better because it cannot be undone by somebody re-enabling the fee.

**Done, and better placed than this item asked for.** The refusal is not in the
order route but inside `chargeFor` itself (`screeningPricing.ts`), ahead of the
pricing check, the price check and the switch — the first thing the function
does. A guard in one route would have held until somebody added a second route
that charges; a guard in the function that decides every charge holds for ever.
`index.tsx:10701` passes `provider.live` into it, `chargeRefusalMessage` says
"no screening agency is connected yet, so no report can be produced and nothing
has been charged", and `tests/screeningPricing.test.ts:248-270` holds it —
including that `provider_not_live` wins over every other refusal reason, and
that the default stays `true` so an omitted argument cannot silently stop
charging.

The second box is deliberately left open: it is an alternative, not a second
task, and the fix above is the one that cannot be undone from the settings
screen.

---

## 2. There is still effectively no clock

One scheduled job exists in production:

    jobname                       schedule     active
    compliance-expiry-reminders   0 12 * * *   true

Four more are written and parked as `.pending`, so nothing they do happens:

    20260923000000_schedule_on_call_escalation     on-call never escalates
    20260928120000_schedule_autopilot_tick         campaigns never post
    20261003140000_schedule_store_tick             store never fulfils unattended
    20261003120000_schedule_screening_expiry       screenings never expire or
                                                   refund on a timer

Each needs its secret in Vault and set as an edge-function secret, then the
rename. **The on-call one is the most consequential**: a rota that never climbs
is indistinguishable from a rota nobody needed, and it is sold as an emergency
service.

- [x] Arm them one at a time, verifying each in `cron.job_run_details` before
      the next.

**The clock is running. All of it.** Checked against production 2026-10-15:

    jobname                       schedule      active   24h runs
    autopilot-tick                */15 * * * *  true           96
    compliance-expiry-reminders   0 12 * * *    true            1
    on-call-escalation            * * * * *     true        1,440
    screening-invitation-expiry   7 * * * *     true           24
    store-cron-tick               */15 * * * *  true           96
    store-watchdog                7 * * * *     true           24

`schedule_on_call_escalation`, `schedule_autopilot_tick` and
`schedule_screening_expiry` were applied on 2026-10-13 and are in
`schema_migrations`; the store pair was scheduled before that. Every secret
exists and none is empty — `autopilot_cron_secret`, `compliance_cron_secret`,
`on_call_cron_secret`, `screening_cron_secret`, `store_cron_secret` and
`anon_key`, in `private_cron_config`.

**No secret ever had to be pasted anywhere, and the instruction above to put one
in Vault and in the edge-function environment was wrong.** Each migration mints
its own with `encode(gen_random_bytes(32), 'base64')` directly into
`private_cron_config`, and the route reads that same table — `on-call.tsx` was
changed the same day to prefer the table and keep the environment only as a
fallback. The value is generated and read inside the database and never passes
through a person, a terminal or a transcript, which is better than any amount of
careful pasting. To rotate one, update the row; nothing else needs to know.

### Verifying a clock: `cron.job_run_details` is not enough

Worth writing down, because this item asked for the weaker check. A pg_cron row
reads `succeeded` when the SQL ran, and the SQL is `net.http_post`, which is
asynchronous — it queues a request and returns. **A job whose every call comes
back 401 shows a perfect success record.** All six above read 100% succeeded,
which on its own proves only that the clock ticked.

The response is in `net._http_response`, and that is where this was actually
confirmed: **419 responses, every one HTTP 200**, over the roughly six hours
pg_net retains. One null, at 20:00:00 — a 30-second DNS timeout with no TCP
handshake, one call in 420, and the following minute succeeded.

### Do not rename the last `.pending` file

`20261003140000_schedule_store_tick.sql.pending` is still parked, and it must
stay that way or be rewritten before it is armed. Production already runs both
jobs it would create, and the live definitions carry
`timeout_milliseconds := 30000` while **the file does not**. Applying it as it
stands would re-schedule both store jobs down to pg_net's default five seconds,
which is exactly the regression `20261013150000_cron_jobs_explicit_timeout.sql`
was written to repair — its own comment records a missed `on-call-escalation`
tick caused by that default, and excluded the store jobs because they already
had the timeout. So the file on disk is older than production, and the drift is
in the direction that bites.

- [ ] Either delete that file, or update it to match the live definitions
      (timeouts included) so a rebuilt environment gets the same clock. Nothing
      in production needs it today.

---

## 3. Twenty-one digital products are on sale with nothing to deliver — FIXED

Scanned 2026-10-04:

    marketplace_product rows      21
    with a file attached           0
    carrying an invented rating   21

Every sale becomes a manual email, and every product shows fabricated social
proof — ratings of 4.8 to 4.9 with review counts, against one store order in the
entire system. The same fabricated-data pattern was already stripped out of the
sponsors, payroll and cohort screens.

- [x] Attach a file to each product, or take the ones with no file off sale.
- [x] Remove the invented ratings and review counts.

**Both done, and the first was answered better than this item asked.** Re-checked
against production on 2026-10-15, and two of the three numbers above no longer
describe anything:

    marketplace_product rows      21
    with a file attached           0      (unchanged)
    with a rating above zero       0      every row is rating 0, reviews 0
    on sale to the public          0      filtered, not hidden

Nothing was sold off by hand. `marketplaceProductIsDeliverable` in
`marketplace.tsx` asks whether a product can actually be handed to somebody who
pays, and it gates **both** the public catalogue (`marketplace.tsx:296`) and the
checkout (`index.tsx:7019`) — so a product with no file is unbuyable and
unlistable without anybody remembering to flip a flag, and it becomes buyable the
moment a file is attached. `storeWatchJob.ts:68` reports on the set. That is
strictly better than ticking `visible: false` twenty-one times, which the next
seed would have undone.

Worth recording that `deliveryMethod: "generated"` counts as undeliverable on
purpose: three of the 21 claim a report is produced on purchase and there is no
generator behind them. The claim does not deliver the file, the code does.

The ratings were already zeroed in the data. What was still live was the
**latent** version, and that is what this session removed:

- `DEFAULT_PRODUCTS` in `MarketplaceAdmin.tsx` still carried all 21 invented
  pairs — 4.6 to 4.9 stars, up to 321 reviews. The data was clean only until
  somebody called `POST /marketplace/products/seed`, which would have written
  every one of them straight back.
- A brand-new product in the admin form started at `rating: 5.0`, so the first
  thing a product ever claimed about itself was five stars.
- Three fallbacks invented a rating where none existed: `product.rating ?? 4.5`
  and `r.rating ?? 4.5` in `StoreProductDetail.tsx`, and
  `parseFloat(r.rating) || 4.8` in `PropertyMarketplace.tsx` — that last one
  turning a legitimate rating of 0 into 4.8, because 0 is falsy.
- `StoreProductDetail.tsx` drew its star row unconditionally, so a product with
  no rating showed gold stars beside the words "0 reviews". It is now guarded on
  a real review count, which is the rule the other three surfaces already had.

The admin catalogue's star column is now "No file attached" or "N files
attached" — the fact that actually decides whether the product can be sold.

`StoreReviews.tsx` states the governing rule and states it in capitals: there
are no seed reviews and there must not be. Product ratings are the same claim one
layer up. There is no server-side review store to derive an honest aggregate
from — reviews live in `localStorage` per browser — so until there is, a product
rating can only be fabricated, and the fields are gone rather than defaulted.

---

## 4. Two features call routes that are not mounted — FIXED 2026-10-15

Both failed for a user with a 401 from the auth wall, which the UI rendered as
something vaguer.

    src/app/components/AIBidAssistant.tsx:57
        → /bid-router/ai-analyze        aiBidRouter is never imported

    src/app/lib/services/productDataSourceManager.tsx:160
        → /products/unified-search      unifiedProductSearch is never imported

- [x] Mount both, with an authorisation review each, or remove the UI that calls
      them. A button that cannot work is worse than no button.

**The review said do not mount either, so the callers went instead.** The
reasoning is written where the next person will look for it — the unmounted-
router note in `index.tsx` — and in short:

`aiBidRouter` hands every matching provider's email, phone and subscription tier
to anybody past the auth wall who can post a job description, and its other two
routes take a record id from the body or the URL with no ownership check. That is
the same shape that keeps `providerBids` unmounted under item 9. Its caller,
`AIBidAssistant.tsx`, turned out to be rendered by nothing at all — an orphan
component, not a reachable button. Deleted.

`unifiedProductSearch` is a second catalogue over the live `product_` prefix,
unpaginated and unguarded, and `productsRouter` is mounted four thousand lines
ahead of it — so mounting would have built exactly the trap the PRODUCTS CATALOG
note in that file describes, and the route would never have answered anyway.
Worse, `/source/:sourceId/search` spends a supplier's stored credentials on an
id handed in by the caller.

Its caller was the `product-data-sources` page, and the real finding is that it
could never have worked for a much plainer reason than a missing mount: five of
its seven endpoints are `/product-sources...`, which no router in this server has
ever served. The 404 is sitting in the production log kept at
`src/imports/pasted_text/app-init-logs.txt`. The page is deleted, its route entry
with it, and `productDataSourceManager` is down from 480 lines to 200 — the one
method with a live caller (`MaterialsCenter` asking whether any supplier API is
connected, so it can carry on without one) and nothing else.

Two things worth noting, because neither was in the original finding. The dead
`searchProducts` answered its 404 with a hardcoded product list returned as
search results — the same invented-data pattern as item 3, one screen further
back. And the file defined a second `UnifiedProduct` interface, unrelated to the
one in `lib/useAllProducts` that the rest of the app imports; two different
shapes under one name is the kind of thing that costs an afternoon. Both gone.

Connecting a real supplier API is a feature, not a mount. When somebody builds
it, `getDefaultSources` already names the four worth integrating.

Six more modules are unreferenced and nothing calls them, so they are dead
weight rather than broken features: `kitchen-cabinet-schedule`, `materials-api`,
`cohort-settings`, `data-backup`, `api-gateway`, `portalSettings`.

---

## 5. `nav.ts` drives nothing, so new pages are unreachable — FIXED 2026-10-15

The file said of itself: *"To add a new page to the nav: add an entry here.
App.tsx never needs to change."* `navigationSections` was imported at
`App.tsx:90` and **never used**. "Platform Management" existed in that file and
nowhere else in the app.

This is why a finished feature can be invisible — it cost an hour. The real
navigation is the module list inside `UnifiedDashboard`.

- [x] Either wire `nav.ts` into a real sidebar, or delete it and correct the
      comment so the next person does not trust it.

**Deleted, not wired.** Wiring it would have meant building a second navigation
surface alongside the one people actually use, which is how there came to be two
in the first place. There were three statements of the same untruth, and all
three are gone: the header in `nav.ts`, a comment at `App.tsx:89` saying "nav
structure lives in nav.ts — edit that file to change the sidebar", and the dead
import beneath it.

What replaces them is one note where the decision actually gets made — above the
module list in `UnifiedDashboard.tsx` — saying plainly that this list IS the
navigation and that a module added anywhere else reaches nobody.

One thing found on the way out, left as an observation rather than a claim: of
the 75 paths `nav.ts` carried, 51 are not in that module list. Some are
certainly reachable from other hubs, so that is not a count of unreachable
pages — but if somebody ever builds a real sidebar, the deleted file is the best
starting inventory in the repo and the commit that removed it still has it.

---

## 6. The smoke harness is broken for every session — FIXED 2026-10-13

All four causes are now closed, by two sessions working on it the same day:

- **Hardcoded ports** → `SMOKE_PORT` / `SMOKE_REPORT_PORT`, defaults unchanged.
- **A shared Edge profile** → keyed per report port. Edge cannot open one
  profile twice, so the second concurrent run's browser exited instantly and
  reported nothing; that one cost three commits with smoke unrun.
- **A busy report port was an unhandled stack trace** → now a message naming
  the port and the override, exit 3. Proven by occupying a port the same way
  the harness binds.
- **A silent batch was written off rather than examined** → the range is now
  halved down to single pages. This was the one that made the harness lie: a
  batch row was skipped by the single-page retry pass, so fifteen pages went
  unexamined *and unmentioned* — "270 rendered, 13 did not report" about an app
  with 362 pages.

**The result, under the exact configuration that failed three times that day:
365 rendered, 0 did not report, 0 threw.** Every one of those red sweeps was
starvation. There was never a broken page among them, and the pages that had
been hidden inside silent batches all render fine given a browser of their own.

Still worth considering, and not done: `--all` allows twenty seconds for fifteen
pages, which is why heavy batches starve in the first place. Splitting makes the
answer correct; a longer deadline would make it faster to reach.

## 6b. The original note, kept because the reasoning still applies

`scripts/smoke.mjs` hardcodes `PORT = 5177` and `REPORT_PORT = 9911` with no
override, and spawns `vite --strictPort`. A vite process left over from
2 October still holds 5177, so the harness hangs rather than failing, and the
pre-commit check cannot run — for any session in this checkout, not just one.

- [x] Take both ports from the environment, defaulting to today's values.
      `smoke.mjs:65-66` — `SMOKE_PORT` and `SMOKE_REPORT_PORT`, old values as
      the defaults.
- [x] Give the reporter a deadline so a vite that cannot bind fails loudly.
      `smoke.mjs:156-161` — `EADDRINUSE` on the report port now names the port
      and prints the override that gets past it, exit 3 instead of fourteen
      lines of `events.js`; a vite that dies on `PORT` is caught at 189 and
      says which port it most likely lost.
- [x] Kill the orphan. Gone — checked 2026-10-15, nothing is listening on 5177.
      It was never killed deliberately as far as any note says; a reboot
      probably did it. The two fixes above are why it stops mattering.

---

## 7. Money paths that have never run

- [ ] One screening through `created → paid → invited` against a real Stripe
      event. The webhook forwarder has never fired in production.
- [ ] One rejection through the New Hampshire refund. **This is the only code in
      the system that moves money out**, and it has never executed.
- [ ] Correct `costCents`: production says $15, published aggregator pricing is
      $20–30. In New Hampshire the refund is price minus documented cost, so an
      understated cost refunds more than the law requires.

---

## 8. Screening cannot produce a report at all

No consumer reporting agency is connected. The gate is an application for
sandbox credentials rather than a negotiation — see the Phase 3 plan in
`tasks/tenant-screening.md`.

- [ ] Apply for sandbox credentials (Tenant Alert has no minimum and no startup
      fee; AAOA Enterprise is sized for 50+ units).
- [ ] Get the adverse-action wording reviewed once by a lawyer. It is a draft in
      the code and labelled as one.

---

## 9. Subcontractor bidding does not work

`providerBids` and `serviceProviders` are deliberately unmounted, documented in
`index.tsx`: they take the provider's identity from the URL, so any signed-in
caller could read another provider's opportunities by changing a number.

- [ ] Per-record ownership checks, then mount. Until then the bid side of
      Phoenix Exchange is not a feature.

---

## 10. The typecheck baseline hides new errors

    app     316 findings
    server   87 findings

None are in the crash classes, and the counts are how a regression is spotted —
but a baseline of four hundred means a new error is invisible unless somebody
compares counts. Worth burning down in slices rather than all at once.

- [ ] Agree a direction of travel: the count only goes down.

---

## What is genuinely fine

Worth saying, because the list above is all problems:

- The auth wall now holds, and the three share-link traps found this week are
  closed and documented.
- Tenant screening's consent, permissible purpose, ownership and projection
  rules are tested (84 tests) and verified live.
- The digital-product entitlement hole — purchases readable by anybody who knew
  an email address — is **fixed**, with a fail-closed identity check.
- `private_cron_config` was never exposed; the alarming version of that note was
  wrong and has been corrected in both places it appeared.
