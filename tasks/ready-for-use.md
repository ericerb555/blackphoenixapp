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

## 4. Two features call routes that are not mounted

Both fail for a user with a 401 from the auth wall, which the UI will render as
something vaguer.

    src/app/components/AIBidAssistant.tsx:57
        → /bid-router/ai-analyze        aiBidRouter is never imported

    src/app/lib/services/productDataSourceManager.tsx:160
        → /products/unified-search      unifiedProductSearch is never imported

- [ ] Mount both, with an authorisation review each, or remove the UI that calls
      them. A button that cannot work is worse than no button.

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

## 6. The smoke harness is broken for every session

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
