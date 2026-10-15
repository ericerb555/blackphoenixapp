# Must-dos before the app is ready for use

Scanned 2026-10-04 on Eric's instruction. Every item below is evidence from the
code or from the production database, not a guess or a feature wish. Ordered by
what hurts soonest.

---

## 1. STOP: a landlord can be charged $45 for a report that cannot exist

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

- [ ] **Refuse to order at all when the resolved provider is not live**, with a
      message saying screening is not yet available. One guard in the order
      route, before `chargeFor` is consulted.
- [ ] Or set `enabled: false` on the pricing record until a real provider is
      configured.

The first is better because it cannot be undone by somebody re-enabling the fee.

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

- [ ] Arm them one at a time, verifying each in `cron.job_run_details` before
      the next.

---

## 3. Twenty-one digital products are on sale with nothing to deliver

Verified in production today:

    marketplace_product rows      21
    with a file attached           0
    carrying an invented rating   21

Every sale becomes a manual email, and every product shows fabricated social
proof — ratings of 4.8 to 4.9 with review counts, against one store order in the
entire system. The same fabricated-data pattern was already stripped out of the
sponsors, payroll and cohort screens.

- [ ] Attach a file to each product, or take the ones with no file off sale.
- [ ] Remove the invented ratings and review counts.

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

## 5. `nav.ts` drives nothing, so new pages are unreachable

The file says of itself: *"To add a new page to the nav: add an entry here.
App.tsx never needs to change."* `navigationSections` is imported at
`App.tsx:90` and **never used**. "Platform Management" exists in that file and
nowhere else in the app.

This is why a finished feature can be invisible — it cost an hour today. The
real navigation is the module list inside `UnifiedDashboard`.

- [ ] Either wire `nav.ts` into a real sidebar, or delete it and correct the
      comment so the next person does not trust it.

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

- [ ] Take both ports from the environment, defaulting to today's values.
- [ ] Give the reporter a deadline so a vite that cannot bind fails loudly.
- [ ] Kill the orphan (needs a person; this session cannot kill processes).

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
