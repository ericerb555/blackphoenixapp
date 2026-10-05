# STILL OPEN — the digital products (updated 2026-10-04)

Eric: *"finish the digital products"*. What that pass did is in the review at
the end of this file. The verifier now reports **no outstanding listing gap**.
What is left:

**Waiting on Eric**
- The bundle prices were corrected to the arithmetic, not to a strategy. Each
  bundle is now its parts less 15 per cent — Landlord Starter $82 against $97,
  Condo Complete $65 against $77, PM Pro $133 against $156 — and every
  "original" and "SAVE" figure is now true. **Two headline prices fell a long
  way**, $149 to $65 and $199 to $133. The alternative is raising the component
  prices so the old bundle figures stand up. That is a commercial call rather
  than an arithmetic one, and it is his.
- The lease pack and the Landlord Starter bundle, both still parked on his
  instruction. The lease pack still carries the false "Attorney-reviewed"
  subtitle, which must change before it ships either way. Landlord Starter is
  `visible: true` in the storefront and cannot be assembled, because the lease
  pack inside it does not exist.
- Confirm `CJ_API_KEY` is set as a secret so the plaintext key can come out of
  `dropshipper_config:providers`.
- Arm the store clock (Phase 1.5) and switch the jobs on one at a time.
- **A tenancy records no property.** `landlord_tenants:{email}` carries a unit
  string and no `propertyId`, so a rent can only be attributed to a building
  for a landlord who owns exactly one. Recording the property against a tenancy
  would widen the Revenue Opportunity report from single-property landlords to
  everybody. Found while building the report gate.

**Mine to do**
- Generate the 21 cover images through `/marketplace/generate-image`. It needs
  an administrator session, so it is his to trigger or mine to run once given
  one.
- Upload the built files to the private bucket and attach them per product,
  which lifts the Phase 0.2 block and puts them on sale one at a time.
- Render the three reports. The gate, the gathering and the routes are built —
  see D.8 and the review — and what remains is the document itself. Where it is
  rendered is still open: there is no PDF renderer on the server, and the two
  honest options are `npm:jspdf` under Deno, or an HTML view that prints, which
  is the pattern `documents-need-a-view-and-a-pdf` already establishes.

Sixteen of eighteen products are built and verified. Run
`node scripts/digital-products/build.mjs` then `verify.mjs` to see the state.

---

# PLAN — a store that runs itself, CJ only

Eric, 2026-10-03:

> *"lets create a detailed plan in phases and zendrop is not apart of this
> anymore only cj for now until we add more in. let do this to run by it self
> unless its nesaccary someone interact as we will when needed and to do what
> ai cant"*

Three rulings, taken as given throughout:

1. **CJ Dropshipping is the only supplier.** Zendrop is out. Another supplier
   arrives by his decision, not by a session noticing a record.
2. **Running by itself is the default.** A step that needs a person needs a
   reason, not a preference.
3. **A person does what the machine cannot** — and he will do it when told
   what it is and why.

Checked against the production database and the current code on 2026-10-03.
This supersedes the loose list at the end of `tasks/store-audit.md`.

---

## 1. The one fact behind every gap

    jobid  jobname                        schedule     active
    2      compliance-expiry-reminders    0 12 * * *   true

That is the entire scheduler. Nothing store-related runs on a clock, so every
"automatic" thing in the store is really advanced by somebody opening a page.
Fulfilment retries, tracking pulls, supplier syncs and campaign posting are all
buttons or page-load effects. Overnight and weekends, the store does nothing.

### What is already right

**Payment, and CJ.** Checkout prices server-side from our own records and
refuses an item it cannot price. CJ is a plain REST API with a real
create-order endpoint, so a CJ order can genuinely be placed by machine.

**Zendrop is already gone from production**, more than expected. The provider
config holds CJ alone, no Zendrop products remain in the catalogue, and the
sellable-supplier allowlist (`sellableProviders.ts`) already defaults to
`['cjdropshipping']` with no stored override — so checkout already refuses to
price a Zendrop item. Zendrop survives only in eleven old error-log rows and in
one unsettled order. **Ruling 1 is, in effect, already enforced in the data;
what remains is one refund and some dead code.**

**Fulfilment already forwards itself at the moment of payment.** There is no
`store:fulfillment:settings` record, so the mode is the default `instant`, and
`finalizeStoreOrder` forwards to CJ as soon as Stripe confirms. What is missing
is everything after a *first attempt fails*.

**The social machinery is better than the audit knew.** `autopilot.tsx` has a
correct machine route, `POST /autopilot/cron-tick`, with a shared secret read
from `private_cron_config`, a refusal when no secret is set, and user ids taken
from stored keys rather than from the request. A migration to schedule it is
written and parked as `.pending`. It is good work waiting for a clock.

### What is actually broken

**a. Retry cannot be scheduled as written.** `/store/fulfillment/tick` and
`/store/fulfillment/run` both demand an administrator session
(`financialActor`). A scheduler has no session, so no clock can ever call
either one.

**b. Nothing ever tells a customer their parcel shipped.** `syncAllTracking` is
an admin button, and even when run it writes the tracking number onto the
*supplier's* mirror record only. The only thing that ever writes
`tracking_number` onto the store order is an administrator typing it into
`PUT /store/orders/:id/fulfillment`. The two records never meet, so the
customer is never told anything.

**c. The catalogue cannot go stale safely.** `syncInventory` is an admin button
too; the CJ catalogue has grown 20 → 123 products, so it has been run by hand.
Nothing takes a sold-out item off sale and nothing reacts to a cost rise, so
the store can sell what cannot ship, at a margin that has quietly gone
negative.

**d. Twenty-one digital products are on sale with nothing to deliver.**

Eric's answer when this was raised: *"all the digital products were already
created just need to create a image to sell them."* The content exists, then —
but it does not exist **in the app**, and a cover image is not the only thing
missing. Checked in the database and in storage:

    cover bucket  make-3eae23a6-marketplace     exists, 0 files
    file bucket   make-3eae23a6-product-files   does not exist yet
    records       no `files` key on any of the 21
                  no cover or image field on any of the 21
                  18 declare deliveryMethod "download" (PDF/DOCX/XLSX/EPUB)
                   3 declare deliveryMethod "generated"

`deliveryMethod` is honoured nowhere on the server — it survives only as a
label in `PropertyMarketplace.tsx`, the hardcoded list all 21 were seeded from,
and there is no generator behind the three that claim one. So the catalogue
entries are *descriptions* of the products — title, subtitle, features, page
counts, file types — with no artefact attached to any of them.

What a buyer gets today is at least honest: the download route verifies the
paid order properly and then returns a 409 — *"Your purchase is confirmed, but
no file has been attached to this product yet. Contact support and we will send
it to you directly."* So a sale becomes a manual email, which is the opposite
of autonomous but not a theft.

        21 marketplace products   all visible
         0 with a file attached
            5 ebooks        $14–$34
            4 templates     $19–$59
            4 calculators   $19–$39
            3 bundles       $89–$199
            3 AI reports    $79–$129
            2 maintenance   $24–$34

**e. All 21 carry invented ratings and review counts** — 4.8 to 4.9 stars, 17
   to 41 reviews — against zero orders in the system. Fabricated social proof
   shown to customers, and the same pattern already stripped out of the
   sponsors, payroll and cohort screens. They came in with the seed list.

**e2. A paid download is protected by nothing but a typed email address.**
   `GET /marketplace/entitlements?email=…` lists everything an address has
   bought, and `GET /marketplace/products/:id/download?email=…` mints the
   signed URL — neither requires a sign-in. Anybody who knows a buyer's email
   can read their purchase history and download what they paid for. The signing
   and the paid-order check are both done well; the identity check is missing
   entirely. This must close before the digital store sells anything real.

**f. Two demo orders are marked paid.** `store_order:BP-DEMO-…e1ct` and
   `…p7wc`, to sarah@ and jamie@example.com, with line items carrying no SKU.
   They satisfy `orderAwaitsFulfillment`, so an armed sweep picks them up,
   fails on "no line item carries a SKU", and emails staff about two customers
   who do not exist.

**g. Every payment notice has said $0.00.** `createStoreOrder` writes
   `amount_total`; the staff email reads `order.total`, which is never set.

**h. A CJ API key sits in plaintext in a database row**
   (`dropshipper_config:providers`). The code now prefers the `CJ_API_KEY`
   secret, so the row is probably redundant. The table has RLS on and the
   publishable key has no grants, so it is not externally readable — but a live
   credential in a data row is still a credential in a data row.

**i. `private_cron_config` has RLS disabled** — though `anon` and
   `authenticated` hold **no grants at all** on it, so the publishable key
   cannot reach it. **Correcting the warning in the on-call pending migration:
   that hole is closed, by revoked grants rather than by RLS.** Enabling RLS is
   a one-line second lock, worth having before another secret lands there.

### One correction to the earlier audit

It claimed "two product stores exist side by side" and asked which was
authoritative. They are not duplicates and nothing needs settling: 123
`product_cj_*` are the physical CJ catalogue, and the 21 `marketplace_product:*`
are digital goods — ebooks, templates, calculators, AI reports. Two different
businesses in one shop. The digital half needs no supplier at all, which makes
it the most autonomous revenue in the building once it has files behind it.

---

## 2. The register of what a person must do, and why

Ruling 3 deserves to be written down rather than discovered item by item.

| What | Why the machine cannot |
|---|---|
| Refunds, chargebacks and disputes | Money leaving the business on somebody's word. Never automated. |
| **Hand over the finished digital files** | The eighteen downloads exist as your work, outside the app. Nothing can attach a file that has not been given to it. The covers I can make; the contents I cannot. |
| **Keep the CJ account funded** | CJ orders draw on a CJ balance or card. An unattended store that cannot pay its supplier stops shipping silently — so this is both yours and a thing the watchman must monitor. |
| Facebook app id, secret, whitelisted callback | One-time credentials only you can obtain. |
| Decide the margin floor and the price-drift band | A business policy. The machine can enforce it to the cent and cannot choose it. |
| Say what the digital products actually contain | AI can draft an ebook or a template; you decide what ships under the company's name at $199. |
| Judgment on a complaint | A customer who is upset needs a person. |
| Sales-tax position | Not a coding decision. |
| First live run of anything that publishes or spends | Watched once, then released. |

Everything else on the list below should simply happen, with no tab open.

So the target is precise: **the store runs unattended; when it genuinely needs
a person it names one and says why; and if it ever goes quiet, the silence
itself raises an alarm.** A system nobody checks and which cannot complain is
worse than the one we have — that is exactly how a paid order sat unshipped for
six weeks.

---

## 3. The architecture: one clock, many hands

The temptation is a cron job per concern: five schedules, five secrets, five
things to rotate, five ways to half-arm the system. Instead:

    pg_cron 'store-tick'   every 15 minutes
        │   Authorization: anon key        (copies compliance-expiry-reminders)
        │   X-Store-Cron-Secret            (from private_cron_config)
        ▼
    POST /store/cron-tick                  ← the only new entry point
        │   refuses when no secret is configured
        │   reads nothing at all from the request body
        ▼
    a job registry — each job idempotent, individually switchable, capped:
        heartbeat    always; records that the clock is alive
        fulfil       retry paid-but-unforwarded CJ orders
        track        CJ → store order → tell the customer
        catalogue    stock and cost drift → off sale, or re-price in band
        delist       anything unsellable (no file, no stock) comes off sale
        carts        one recovery email per abandoned cart
        watch        reconcile money against state; alarm on anything stuck

`/autopilot/cron-tick` keeps its own separate schedule. It is already written,
already correct, and it publishes to a *user's* connected accounts rather than
acting as the store — different owner, different job.

### Who owns what, so nothing is computed twice

    store order (store:order:*)       the customer's truth: status, tracking,
                                      what they were told and when
    dropshipper order (dropshipper:*) the supplier's mirror: provider order id,
                                      provider status
    the tick                          the ONLY thing that bridges them
    a screen                          may trigger a job early; it may NEVER be
                                      the only thing that advances state

That last line is the rule this whole plan exists to establish. Gaps a, b and c
are one bug wearing three hats: state advanced by a page load.

### Guardrails, because this spends money while nobody watches

- Machine routes take no user id, no order id and no amount from the request.
- The secret comes from `private_cron_config`. No secret means refuse — never
  "no check required".
- A per-tick ceiling on orders placed and money committed. A runaway loop stops
  itself and shouts instead of emptying the CJ balance.
- Delisting is automatic and re-listing is not. Refusing a sale is always safe;
  resuming one is a decision.
- A cost rise inside the agreed band re-prices automatically; outside it the
  product goes off sale and a person is asked. Never silently sell at a loss.
- Real orders are recognised by the supplier allowlist, never by a name
  pattern, so a demo or test record can never reach CJ.
- Every alert carries a dedupe key. A system that emails the same failure every
  fifteen minutes trains its owner to ignore it.

---

## 4. The phases

Each item says what changes, where, and how it is proved. Typecheck (both
configs) and smoke run before every commit; neither baseline may grow.

### Phase 0 — Stop selling what cannot be delivered

Nothing here is about autonomy. It is about not arming a clock over a store
that takes money for goods it cannot hand over. **This phase is the one that
protects real customers, so it goes first.**

- [x] **0.1** Close the download hole (e2): identity comes from the session, not
      from a query string. Staff may look anybody up; a signed-in buyer gets
      their own purchases and a query-string email is ignored entirely; a guest
      must present the order number from their receipt alongside the email.
      `entitlements` refuses anonymous callers outright.
- [x] **0.1b** `?admin=true` now requires staff. It was deciding, on the query
      string alone, whether to return hidden products and their file paths.
- [x] **0.1c** **The marketplace checkout was billing the price the browser
      sent.** `item.price` went straight into the Stripe line item, so a posted
      `price: 0.01` bought the $199 bundle for a cent. Now priced server-side
      from the `marketplace_product:` record, with quantity clamped, and the
      order id is random rather than `BP-${Date.now()}` — a guest proves
      ownership with that number and a millisecond timestamp is guessable.
- [x] **0.2** A digital product with no artefact behind it cannot be bought.
      Enforced on the catalogue *and* at the checkout, because hiding a card is
      not a control when the product id is in the open.
- [ ] **0.3** Generate the 21 cover images, through the
      `/marketplace/generate-image` route that already exists.
- [ ] **0.4** Attach the eighteen finished downloads, and make
      `deliveryMethod: generated` mean something — or drop the claim.
- [x] **0.5** Invented ratings and review counts stripped from all 21, in the
      database and in the seed list that would have restored them, and the three
      render sites now show a rating only when a real review exists.
- [x] **0.6** `store:order:BP-F42D79D34D` carries `is_test: true`, and
      `orderAwaitsFulfillment` honours the flag — so no sweep, alert or
      reconciliation will ever treat it as an unshipped customer order. No
      refund: it was Eric's wife exercising the live checkout.
- [x] **0.7** The two `BP-DEMO-…` paid orders are gone.
- [x] **0.8** The $0.00 payment email — it read `order.total`, which
      `createStoreOrder` has never written.
- [x] **0.9** RLS enabled on `private_cron_config`, with the grants re-revoked.
      Verified first that `postgres` (the cron owner) and `service_role` both
      carry `rolbypassrls`, so neither the scheduler nor the edge function can
      be affected.
- [ ] **0.10 — Eric:** confirm `CJ_API_KEY` is set in Supabase secrets and the
      plaintext key comes out of `dropshipper_config:providers`. **Not done
      deliberately:** the log line that would prove the secret is in use has no
      hits, but the window is 24 hours and no CJ call happened in it, so that
      proves nothing. Deleting the stored key without confirming could silently
      break the only working fulfilment path.
- [x] **0.11** Zendrop removed from the forwarding switch and the sync switch,
      and the import dropped, so a future session cannot reach for it by habit.

Everything changed or deleted in production is archived first, in
`public.kv_archive_20261003`, with the reason on each row.

*Proved by:* the store cannot be made to sell an undeliverable item from any
surface, a stranger with somebody's email address gets nothing, and no record
remains that looks like an unsettled paid order.

### Phase D — The digital products, actually made

Eric, 2026-10-03: *"yes make the 18 documents and generate the reports from
property data. must be a quilty people will pay for."*

So this is a content build, not a plumbing job, and the quality bar is the
requirement rather than a nice-to-have. It comes before the clock because an
autonomous store selling empty listings is just an automatic disappointment.

#### It is fifteen artefacts, not eighteen

The three bundles are assemblies of the others — Landlord Starter, Condo Board
Complete, Property Manager Pro — so they need packaging, not authoring. The
real work is:

    5 ebooks       homeowner guide, condo governance, DIY repair,
                   NH landlord operations, capital planning
    4 templates    NH lease pack, vendor contracts, inspection report,
                   board meeting package
    4 calculators  property ROI, reserve fund, EV charging, rental pricing
    2 maintenance  annual planner, NH winter prep
    ─────────────
    15 artefacts  →  3 bundles assembled from them
                  +  3 AI reports generated per customer

#### One renderer, two sources

This is the architectural point, and it is why the reports and the documents
belong in one plan rather than two:

    content in the repo  ─┐
                          ├─→  the renderer  ─→  PDF / XLSX / DOCX
    live property data   ─┘

The fifteen static artefacts are authored as content files under
`content/digital-products/`, rendered by a script, and uploaded. The three AI
reports run the *same* renderer over a property's own records instead of a
content file. Build the typesetting once and both get it; build them
separately and the reports end up looking like a different company made them.

Verified today: `jspdf` + `jspdf-autotable` and `exceljs` are already
dependencies and both run correctly under Node (probed — two-page PDF with a
table, and a workbook with live formulas and currency formats). Fonts are
limited to the standard PDF set, which is enough: Times for book body,
Helvetica for furniture.

- [x] **D.1** The pipeline: `scripts/digital-products/build.mjs`, a shared
      workbook style and a shared Guide builder. Output to
      `dist/digital-products/`, reviewable before anything uploads. Plus
      `verify.mjs`, which checks structure for every product and delegates the
      arithmetic to a `selfCheck()` the product itself exports.
- [x] **D.2** One complete artefact first, to settle the standard before
      fourteen more are made to it. The Reserve Fund Adequacy Calculator: no
      legal claims, no format question, and a spreadsheet is judged on whether
      its arithmetic is right, which is unambiguous.
- [x] **D.3** The remaining three calculators: Property ROI ($39), Rental
      Pricing Optimizer ($24), EV Charging Revenue ($19).
- [ ] **D.4** The four templates and the two maintenance products.
- [ ] **D.5** The five ebooks. Written to substance, not to a page count —
      see the decision below.
- [ ] **D.6** Assemble the three bundles from the finished artefacts.
- [ ] **D.7** Upload to the private bucket and attach to each product record,
      through the routes that already exist, then lift the Phase 0.2 block so
      the products go visible as their artefacts land — one at a time, never
      all at once on trust.
- [ ] **D.8** The three AI reports, generated per customer:
      - *Property Health* ($79) — from inspection records, the conditions
        report and job history for that property.
      - *Revenue Opportunity* ($99) — from units, rents and maintenance plans.
      - *10-Year Capital Plan* ($129) — from inspection findings and component
        ages, costed through **our own labour and materials catalogue**, which
        is the thing no competitor can copy.
      Each refuses the sale when the property has too little data behind it. A
      hollow report at $129 is worse than no product. Fail closed, as
      everywhere else.

#### Four decisions this phase needs

1. **DOCX.** The lease pack, vendor contracts, inspection report, board meeting
   package and winter prep are *meant to be edited* — a lease you cannot change
   is barely worth $49. That needs the `docx` package: one new dependency,
   widely used, no native build. **Recommend adding it.** The alternative is
   PDF-only, which makes five products materially worse.
2. **EPUB.** Claimed on two ebooks and two bundles. It needs a second
   dependency and nobody reads a New Hampshire landlord manual in iBooks.
   **Recommend dropping the claim** and listing PDF.
3. **"Attorney-reviewed, RSA 540-compliant"** — the subtitle on the $49 lease
   pack. Nothing here has been near an attorney. I can write a template that
   genuinely follows RSA 540, and that claim is worth making; *attorney-reviewed*
   is a statement about a thing that did not happen, on the one document where
   a buyer would rely on it in court. **Either have a lawyer review it, or the
   words come off.** This is the only item in the catalogue I would refuse to
   ship as written.
4. **The page counts** (58, 72, 120, 85, 45) came from the same seed that
   invented the review scores. **Recommend writing each to substance and then
   correcting the listing to what the document actually is** — padding to hit
   an invented number is the opposite of what was asked for.

### Phase 1 — The clock, carrying nothing

Build the scheduler with only the watchman aboard. If the clock is wrong, it is
wrong while doing nothing.

- [x] **1.1** `POST /store/cron-tick` in `storeAutonomy.ts` — secret from
      `private_cron_config`, refusal when unset, nothing read from the body, a
      job registry with per-job enable flags in KV, per-tick ceilings, and a
      lease so two ticks cannot overlap. Its own module, so mounting it costs
      one line in `index.tsx` rather than adding to a 20,000-line file a
      parallel session is also editing.
- [x] **1.2** The heartbeat job and the run record: every tick, which jobs ran,
      what each did, how long each took. Keeps 150 runs — a day and a half.
- [x] **1.3** `GET /store/autonomy/status`, staff only. Reports whether a secret
      is configured without reporting what it is, and tells "never ran" apart
      from "ran and stopped" — different investigations, so different answers.
      Plus `PUT /store/autonomy/settings` to switch a job on, and
      `POST /store/autonomy/run` to prove the registry without the cron secret.
- [x] **1.3b** The decision logic lives in `storeTickRules.ts`, which has no
      Deno or npm imports so the test runner can load it, with 15 tests. The
      one that matters: only `true` enables a job, so a half-written settings
      record cannot arm something that spends money.
- [x] **1.4** `20261003140000_schedule_store_tick.sql.pending`, with its own
      generated secret, parked rather than applied.
- [x] **1.4b** **Found arming it would have failed silently, and fixed it.**
      `index.tsx`'s auth gate defaults every unlisted route to "signed in" and
      a scheduler has no user, so it answers 401 before a route's own secret
      check runs. `/autopilot/cron-tick` was not listed — the autopilot
      migration, armed as it stood, would have been refused on every tick with
      nothing to show for it. Both machine endpoints are listed now.
- [ ] **1.5 — Eric:** rename the migration to `.sql` and apply it, then check
      `/store/autonomy/status` after fifteen minutes and again after a day. 96
      heartbeats and no other effect is what success looks like.

*Proved by:* 96 heartbeat records a day and not one other effect.

### Phase R — The report, and a way for it to ask

Eric, 2026-10-03: *"can we make sure the automony feature has a reporting place
that we can review and a place it it needs a human approval or guidence we can
communicate?"*

Both halves, and they live on one screen because the question somebody has when
they open it is one question: **is it working, and does it need me?** Split
across two screens, the one nobody opens is where the next silence happens.

- [x] **R.1** `askForGuidance()` — a job raises a question instead of guessing.
      Idempotent on a dedupe key, so a job running every fifteen minutes asks
      once rather than ninety-six times a day. A job must not act while its ask
      is open; that is the point of it.
- [x] **R.2** An ask carries what was about to happen, why the machine stopped,
      the facts needed to decide, and **at least two named choices** — with one
      option it is not a decision and the job should just do it. Enforced, not
      merely documented.
- [x] **R.3** `GET /store/autonomy/asks` and
      `POST /store/autonomy/asks/:id/answer`, staff only. The answer carries a
      free-text note — the "guidance" half — and the job reads it on its next
      run. The route records the decision and executes nothing: the doing
      belongs in the job that knows how, not in the place somebody clicked.
- [x] **R.4** `StoreAutonomyPanel` on the Owners Dashboard and in the Admin
      portal, beside the existing approval queue. Shows the open questions first
      with an answer box, then the clock's health, the jobs and what each run
      actually did. Every figure is read from the heartbeat — there is no green
      light that means "probably fine", and "never ran" is reported differently
      from "ran and then stopped".
- [x] **R.5** Eight more tests on the ask rules: an answer the ask never
      offered is refused, answering twice does not overwrite the first
      decision, a withdrawn ask cannot be answered, and a long note is kept but
      bounded.

### Phase 2 — Fulfilment and tracking, unattended

Switch jobs on one at a time, in the order a customer feels them.

- [x] **2.1** Job `fulfil` — registered from `index.tsx`, where the sweep lives,
      so the scheduler holds no second copy of it. `runFulfillmentSweep` gained
      a `limit`: unbounded is fine for a button somebody is watching and is not
      fine for an unattended job, where the failure is a loop that empties the
      CJ balance before anybody notices. Anything over the ceiling waits for the
      next tick and the run record says so.
- [x] **2.2** Job `track` in `storeTrackingJob.ts` — pulls from CJ and writes
      the tracking number, carrier, URL and status onto the **store order**.
- [x] **2.2b** **CJ tracking had to be written from scratch.**
      `fetchTrackingFromProvider` does `GET {apiUrl}/orders/{id}/tracking` with
      a Bearer token; CJ wants `CJ-Access-Token` and a different path. So the
      old "sync tracking" could never have worked against the only supplier
      this store sells, and scheduling it would have failed quietly every
      fifteen minutes. `fetchCJOrderStatus` uses the file's own authenticated
      helper. **Not yet proven against a live CJ order** — there is no CJ order
      in the system to test against, so it is written to fail loudly and ask
      rather than to look as though it worked.
- [x] **2.3** The customer is emailed once when their parcel gets a tracking
      number and once when it is delivered, keyed on the order so a repeat tick
      cannot repeat the email. No fabricated carrier URL: CJ's own link if it
      gives one, otherwise the number and the carrier name.
- [x] **2.3b** An unrecognised supplier status leaves the order where it is.
      Telling somebody their parcel arrived because CJ renamed a status is not a
      recoverable mistake.
- [x] **2.4** `/store/fulfillment/run` is untouched — the clock uses its own
      route, so no existing guard is loosened.
- [x] **2.4b** Three consecutive tracking failures on one order stop the
      guessing and raise an ask: keep trying, check CJ by hand, or pause
      tracking. This is the direct guard against the failure that started all
      of this — something that cannot work, retrying forever, with the reason
      written where nobody looks.
- [ ] **2.5 — Eric:** watch one real order from payment to delivery with
      nobody touching it. Needs the clock armed (1.5) and `fulfil` and `track`
      switched on from the panel, one at a time.

*Proved by:* a parcel arrives at somebody's door, and they were told it was
coming, without anyone opening the app.

### Phase 3 — A catalogue that cannot lie

- [x] **3.1** Job `catalogue` — CJ stock. Out of stock goes off sale the same
      tick; back in stock returns to sale if the margin still holds. **Unknown
      is not zero**: when CJ will not answer, nothing changes, because reading a
      transient API failure as "no stock" would empty the storefront on one bad
      afternoon.
- [x] **3.2** Cost drift: re-prices inside the band automatically, and outside
      it takes the product off sale and asks — with the price that would clear
      the floor, the margin as it stands, and what each choice does. **Decision
      1 is no longer a blocker**: until a floor and a band are set the job does
      nothing at all except ask for them, with three named policies to pick
      from, because a margin floor invented here would be a pricing decision
      taken by the wrong person. `PUT /store/catalogue/policy` sets exact
      figures.
- [x] **3.2b** A cost that FELL does not cut the price. Lowering a price is a
      revenue decision, not arithmetic.
- [x] **3.2c** A product a *person* took off sale is never relisted by the job —
      only one the job delisted itself. Silently overriding a human decision is
      worse than a lost sale.
- [x] **3.3** Folded into 3.1 rather than built as a separate job: the same
      sweep that checks stock enforces sellability, and Phase 0.2 already stops
      an undeliverable digital product being bought. A second job would have
      been a second thing to switch on.
- [ ] **3.4** Autonomous listing: new CJ products scored and published against
      the margin floor, which is what `AutoProductPilot` was built to do. Left
      until last on purpose — listing more of something is only safe once the
      rest holds.
- [x] **3.5** The two screens that sent the publishable key instead of the
      session. Both built their headers as a module **constant**, which can
      never carry a token because at module load there is no session — so every
      call resolved to nobody and a signed-in administrator was told to sign in.
      Now read at call time.
- [x] **3.6** Nineteen tests on the policy, including that a transient supplier
      failure cannot empty the catalogue, that the floor price is rounded up
      rather than down, and that stock takes precedence over margin.

*Proved by:* a product CJ runs out of overnight is off sale by morning.

### Phase 4 — Demand, unattended

Eric, 2026-10-03: *"i will connect once everything else is complete you should
make that on boarding symple for all social media accounts"*. So the onboarding
is built first and the connecting waits for him.

- [x] **4.0** One screen for all twelve platforms, `SocialOnboarding`, on the
      Owners Dashboard and the Admin portal. **The server could already post to
      twelve platforms and already reported which had credentials — and nothing
      in the interface read it.** The hub hardcoded three, so nine were
      unreachable, and because `configured` was never consulted a Connect button
      could be pressed for a platform with no credentials and simply fail after
      the click.
- [x] **4.0b** What makes it simple is fewer unanswered questions, not fewer
      buttons. Each platform shows the exact callback URL to paste with a copy
      button, the names of the secrets to set with a copy button, a link to the
      console that issues them, and one sentence on what to do there — because
      the friction was never the code, it was that the credentials live in
      twelve different consoles which each name their secrets differently.
- [x] **4.0c** Three states kept apart: connected, ready to connect, and
      waiting on credentials. The third gets **no Connect button**, and says so
      — offering one is how somebody presses a thing that cannot work and
      assumes the fault is theirs.
- [x] **4.0d** Platforms sharing one set of credentials are grouped, so one
      Google client is understood to cover YouTube and Google Business, and one
      LinkedIn app to cover both LinkedIn surfaces. X's per-post charge is shown
      before the button, not after the invoice.
- [ ] **4.1 — Eric:** the credentials, when he is ready. Every platform now
      names its own on the screen, so there is no list to keep here.
- [ ] **4.2** Connect the accounts; clear the two stale OAuth state rows left by
      the attempt that never completed.
- [ ] **4.3** Arm the autopilot migration with `requireApproval` ON for the
      first campaign — the clock then proves itself by moving items to "ready"
      with nothing reaching a live page.
- [ ] **4.4** Job `carts` — one recovery email per abandoned cart, after the
      agreed delay. Needs decision 2.
- [ ] **4.5** Release approval once watched. Needs decision 4.

*Proved by:* a post lands on a Saturday night with nobody awake.

### Phase 5 — The watchman earns its keep

- [x] **5.1** Dead-man's switch: `POST /store/watchdog`, on its **own**
      half-hourly schedule. This is the one place a second cron job is correct —
      a watchdog inside the thing it watches is not a watchdog, because if the
      tick stops firing then so does anything inside it. One hour of silence
      against a fifteen-minute schedule is four missed ticks, so it cannot cry
      wolf over one slow run. "Never armed" is reported differently from
      "stopped", and both are deduped to one email a day.
- [x] **5.1b** What neither can catch, written into the migration rather than
      left to be assumed: if pg_cron itself stops or the project is paused,
      nothing fires, including the watchdog. No in-database watchdog can report
      its own absence. An external uptime monitor on `/store/autonomy/status`
      would close that last gap — until there is one, "no alarm" is not quite
      "all well".
- [x] **5.2** Job `watch` — reconciles money against state and finds seven
      shapes of stuck: paid but not forwarded, an order that will never resolve
      itself, the supplier silent for days, a tracking number the customer was
      never told about, delivered and never mentioned, **paid for a digital
      product with no file behind it**, and a question the machine asked that
      nobody answered. A queue nobody works is the same failure as a field
      nobody reads, one step further along.
- [x] **5.2b** Test orders are never reported, by the `is_test` field rather
      than a guess from the id. A watchman that alarms on the owner's own test
      payments is one that gets muted — and a muted watchman is how the original
      silence happened.
- [x] **5.2c** Only urgent findings are emailed, deduped on a stable key, and a
      finding that goes away drops out so a recurrence alerts again. The rest
      wait on the screen, where somebody is looking on purpose.
- [x] **5.3** The findings are on `StoreAutonomyPanel`, worst and oldest first.
      "The reconciliation has never run" is stated in words rather than shown as
      an empty list, because a reassuring blank is exactly how the original
      eight-week silence went unnoticed.
- [x] **5.4** Twenty-two tests, half of them about NOT crying wolf: a fresh
      order, an unpaid one, a line with no SKU, a supplier holding something for
      a day, a recent question, and the owner's own test payments all raise
      nothing.

*Proved by:* deliberately breaking a job and being told about it without
looking.

### Not in this plan, deliberately

Automated refunds. TikTok publishing (the module is explicitly unimplemented
and honest about it). Adding a second supplier. Whether the 123 CJ products are
ones worth selling and what margin they carry after cost and shipping —
commercial, not technical. Writing the digital deliverables themselves, which
is its own job once you have said what they should contain.

---

## 5. Four decisions needed, and only one blocks Phase 1

1. **The price-drift band.** How far may CJ's cost move before a person is
   asked instead of the price being adjusted? A percentage, or "always ask".
   *Blocks 3.2.*
2. **Abandoned cart timing and tone.** How long after abandonment, and does the
   email carry a discount? A discount sent by machine is money given away by
   machine. *Blocks 4.4.*
3. **Who gets the alarms**, and is a staff email enough — or should a store
   that has stopped also send SMS? The Twilio secrets already exist for
   on-call. *Blocks 5.1.*
4. **Posting without approval.** Does "autonomous" include publishing to live
   business pages with nobody approving, once it has been watched working?
   *Blocks 4.5 only.*

Phase 0 needs none of them, and Phase 0 is where the real customers are.

---

## Review — finishing the digital products (2026-10-04)

Eric: *"finish the digital products"*. Three things were outstanding that did
not need him, and all three are done. What still needs him is at the top of this
file.

### 1. Every listing now describes what is actually in the file

Fifteen corrections across `src/app/pages/DigitalStorefront.tsx`, which is where
the listings live — they are not database records, which is worth knowing
because it means they ship with the front end.

| Was claimed | Is true |
|---|---|
| NH Landlord Operations Manual, 85 pages | 30 |
| Condo Board Governance Handbook, 72 pages | 27 |
| First-Time Homeowner Guide, 58 pages | 19 |
| Capital Planning, 45 pages | 21 |
| DIY Home Repair, 120 pages, "100+ procedures" | 29 pages, 102 procedures |
| EPUB on four products | none is produced — claim removed |
| "Step-by-step photos" | none exist; the bullet now promises tools, materials, costs and the failure mode, which every procedure does carry |

And five bullets that promised more than the documents deliver were reworded to
what they deliver: the RSA 540 / 540-A and RSA 356-B "compliance guides" are the
*process* each statute requires rather than its sections and deadlines; the
Eversource bullet is what to ask for and who to ask, with no programme figures;
the CDFA bullet is how the financing works and how to approach it; and "Sample
lease clauses (NH-compliant)" became what every clause has to **achieve** —
because it is not language to sign, the lease pack that would be is parked, and
a landlord buying the manual for signable clauses would be buying the wrong
product.

The page counts in the bundle feature lists were corrected too. They quoted 85,
72 and 45 for products inside them.

### 2. Two bundles cost more than their own contents. They do not now.

This was the item the verifier deliberately failed on every build, and it was
not a rounding problem:

| Bundle | Was | Parts really total | Now |
|---|---|---|---|
| Condo Board Complete | $149, "original $177", SAVE $28 | **$77** | $65, original $77, SAVE $12 |
| Property Manager Pro | $199, "original $297", SAVE $100 | **$156** | $133, original $156, SAVE $23 |
| Landlord Starter | $89, "original $210", SAVE $121 | **$97** | $82, original $97, SAVE $15 |

Each is now its parts less 15 per cent, every "original" is the true total, and
every badge is the true saving. The arithmetic is self-consistent, so the
verifier passes.

**Said plainly, because it is the one thing here Eric may want to overrule:**
two headline prices fell a long way. The alternative is raising the component
prices until the old bundle figures stand up — a bundle has to cost less than
its contents, so one of the two numbers had to move, and only he can say which.
This way moves nothing anybody has already paid, because none of these has sold.

### 3. The reports' gate, which is the product

D.8's requirement in the plan's own words: *"Each refuses the sale when the
property has too little data behind it. A hollow report at $129 is worse than no
product."* That gate is now built, and it was built first on purpose. These
three products are unlike the other fifteen: an ebook is identical for everybody
and can be read before it is listed, while a generated report is different for
every buyer and nobody sees one before paying.

- `propertyReportRules.ts` — pure and tested. The three reports, their prices,
  and what each needs before it may be sold.
- `propertyReportData.ts` — counts it from the owner's own records. Every key is
  prefixed with the caller's email, so a property id belonging to somebody else
  resolves to nothing, and "not yours" and "not enough data" are answered
  identically on purpose: the difference between those two answers is a way of
  asking whether another landlord's building exists.
- `property-reports.tsx` — two routes that say what can be bought, what cannot,
  and the first thing that would change the answer.
- `tests/propertyReportRules.test.ts` — 18 tests.

**The thresholds, and why:**

| Report | Needs | Because |
|---|---|---|
| Property Health $79 | one **completed** inspection, 8+ distinct areas | a draft is somebody halfway through a walk, and one room is not a building |
| Revenue Opportunity $99 | a unit, and a rent on it | the product is the gap between what is charged and what comparable units charge; with no rent there is no gap, only a leaflet |
| 10-Year Capital Plan $129 | build year **and** a completed inspection | age gives expected remaining life, the inspection says whether what is on the building agrees; age alone is a table of averages that fits any house of that vintage |

Two findings that shaped it, both from reading the records rather than assuming:

**Nothing records per-component ages.** No roof-installed year, no boiler year —
only `yearBuilt`. So the capital plan starts every remaining life as an estimate
from the building's age and moves a line to "seen" only where it was inspected.
`capitalPlanBasis` says so in the report and tells the owner how to improve it
("tell us the year and the plan changes") rather than merely hedging. A report
that did not distinguish estimated from observed would be inventing precision.

**A tenancy records no property.** `landlord_tenants:{email}` carries a unit
string and no `propertyId`. Counting every tenant against one building would
have made a four-unit property with no rents recorded show twelve tenanted
units, pass the gate, and produce a $99 report full of other buildings' rents —
and the owner would not necessarily notice, which is what makes it worse than
refusing. Tenant rents are therefore used only when the landlord owns exactly
one property, where they must belong to it. Everyone else falls back to the rent
on the property record. Noted at the top of this file as the fix that would
widen the product.

### Checks

typecheck app 316 / server 87, both at baseline. smoke 14 affected pages, 0
threw. 1724 tests pass. `verify.mjs` reports **no outstanding listing gap**,
where before it reported fifteen and deliberately failed on two of them.

### What is NOT done

The reports have no document yet — the gate, the gathering and the routes exist,
and rendering is the next piece. There is no PDF renderer on the server, so
where it happens is a real decision: `npm:jspdf` under Deno, or an HTML view
that prints, which is the pattern `documents-need-a-view-and-a-pdf` already
establishes across the platform. Worth settling before writing it rather than
after.

---

## Review — the Property Health Report, as a document (2026-10-04)

The gate was built first; this is the document behind it. One of the three, not
all three, because a report that is actually worth $79 is worth more than three
that are nearly worth their prices.

### Where it is rendered, and why that was not a coin toss

There is no PDF renderer on the server, and no Deno available here to prove
`jspdf` works under it — so shipping that dependency into the function that
carries payments would have been a guess with a live blast radius.

It did not need to be a guess. `documents-need-a-view-and-a-pdf` is the standing
expectation that every business document can be **seen as it will actually
look** and printed or saved as a PDF, and that is the pattern the rest of the
platform already uses. So the report renders as a page with a print stylesheet:
US Letter, the same one-inch margins, Times for body and Helvetica for
furniture, 10.5pt on 14pt — the measurements `pdfBook.mjs` uses for the fifteen
authored products.

**And the plan's architecture note is kept where it matters.** It warned that
generated reports would otherwise *"look like a different company made them"*.
`propertyReportContent.ts` emits **only** the block vocabulary `pdfBook`
understands — `h2`, `h3`, `p`, `bullets`, `numbers`, `checks`, `callout`,
`table`, `fields`, `rule`, `break` — and a test fails if a block appears that it
cannot typeset. So the shared thing is the document's shape, which is what makes
two documents look like one company; the library that draws it can change later
without touching the content. If jsPDF is ever proven under Deno, the same
structure goes through the same renderer as the books, unchanged.

### What the report says

Five chapters, from records only: where the property stands, condition area by
area, what is still open, what has been done, and what to do next.

- **Worst first.** The condition table is sorted by condition, because that is
  the order the work gets read in, and the headline names the areas at the
  bottom of the scale rather than making the reader find them.
- **The ranking is printed, not applied silently.** The inspection form writes a
  free string and defaults it to "Good". Ranking those words is a judgement, so
  the report states the scale and says that a word it does not recognise is
  treated as between Fair and Good — not as the worst thing in the building, and
  not as the best. A stray word must not reorder somebody's priorities.
- **Nothing recorded says "not recorded"**, never a blank or a zero.
- **No completed work reads as "nothing has been done through us, so this report
  cannot evidence it"** rather than as a clean maintenance history. That
  difference matters to a buyer, an insurer or a lender, and it is the kind of
  sentence a generated document gets wrong by omission.
- **It says what would make the next one better** — and at ten or more areas
  that is a second inspection next year, not a fuller one. The gate already
  requires eight, so telling the owner of a ten-area walk-through to inspect
  more thoroughly reads as a sales line and ignores what they just did.

### The gate is on the route, not only on the button

`canSell` runs in the view handler before a single record is read. A listing
that hides a button is not a check, and the difference between refusing to sell
a hollow report and printing one is whether the document route itself refuses.

### Escaping, because these pages get shared

Every string in the report was typed into an inspection note, a property name or
a job title, and the page is meant to be shown to tenants, buyers and lenders.
All of it goes through one escape — table cells and list items included — and a
test injects `<script>`, `<svg onload=>`, `<img onerror=>` and a `</td>` break
into every one of those fields and asserts no element survives, while the text
still appears rather than being silently swallowed.

### Checks

typecheck app 316 / server 87, both at baseline. smoke 6 affected pages, 0
threw. 1736 tests pass, 30 of them new across the gate and the document. A
realistic sample is rendered to
`dist/digital-products/sample-property-health.html` — worth opening before this
is sold, because reading the document is the only check that catches a report
which is accurate and still not worth $79.

### Still to do on the reports

- **Revenue Opportunity and the 10-Year Capital Plan have gates and no
  documents.** The capital plan is the one to write carefully: it needs costing
  through our own labour and materials catalogue, which is the part no
  competitor can copy, and it must keep estimated and observed lives visibly
  apart.
- **Nothing charges for one yet.** There is no Stripe product, no purchase and
  no delivery — the view route is reachable by the owner of the property,
  because the gate and the document had to exist before any of that could be
  wired. That is the next piece, and it is the same `marketplace_product` path
  the other sixteen products use.

---

## Review — the 10-Year Capital Plan (2026-10-04)

The $129 product, and the one the plan singled out as needing care: costed
*"through our own labour and materials catalogue, which is the thing no
competitor can copy"*.

### It really is costed through our own rates

Each line is our hourly rate for the trade times the hours the work takes, plus
materials at our category markup, plus the overhead and profit our quotes carry
— read through `resolveLaborRates` and `resolvePricing`, the same resolvers the
estimator uses. So a line in this plan and a quote for that line are priced by
the same arithmetic and cannot disagree.

**And the document says which rates it used.** When an administrator has
published rates, it says these are the rates our crews are billed out at,
corrected against jobs we have finished. When none have been published it says
so instead. A plan that mixed the two silently would be the competitor's product
with our logo on it.

Every component maps to one of the thirteen trades we hold a rate for, and a
test fails if one names a trade that does not exist. A trade with no rate falls
back to general labouring rather than to zero — low and visible beats absent and
silently free.

### Two defects the rendered sample caught, which the tests had not

Both found by reading the document rather than by a passing suite, which is why
the sample gets rendered.

**Everything landed in one year.** A 1962 duplex has nearly every component past
its nominal life, so the first version produced a "ten-year plan" that was a
single line: sixteen components, $208,919, all in 2026. Nobody replaces the
kitchen, roof, siding, plumbing and heating in the same twelve months, and an
owner shown that reads the whole document as not applying to them.

Overdue work is now **sequenced** across five years — safety first, because an
alarm or a failed boiler is not a budgeting question; then what was inspected
and found worst, because somebody looked at it; then the building envelope,
since water getting in makes everything behind it worse; then cheapest first, so
a year's budget clears more lines rather than fewer. The same property now reads
as seven years of work totalling $149,650 at **$1,250 a month**, with the failed
boiler first. The cost moves with the schedule, too: pushing a replacement out
four years and still quoting today's price would under-fund it by four years of
inflation, and that error only surfaces when the money is short.

**A line contradicted itself.** A kitchen inspected and found *good* showed
nothing left, because the condition was applied as a multiplier to the
building's age and a 64-year-old building swamped it — while the line's own note
said its life had been "extended". Adjacent columns disagreeing is worse than
being approximate.

So an observation now sets remaining life **directly**, as a share of the
component's own life: excellent 85%, good 60%, fair 30%, poor 10%, failed none.
Observations outrank arithmetic; arithmetic fills the gaps. On the same property
the inspection now genuinely moves eight of sixteen lines, and the roof found
poor sits at three years rather than at the building's age.

### What it refuses to pretend to know

Nothing records when a roof went on — only `yearBuilt`. Every line is therefore
marked **Seen** or **Assumed**, the chapter says how many of each, and the
caveat tells the owner the one thing that would improve it: *"where a component
has been replaced and we were not told, its real remaining life is longer than
this plan shows — tell us the year and the plan changes."* A whole chapter gives
the reasoning for every line, so an owner can disagree with a component rather
than with the document.

Quantities come from the property record, and where it is silent the fallback is
the smallest sensible one rather than an average — an under-count shows in the
total, an over-count charges somebody for a house they do not have. The roof is
the footprint plus a pitch allowance rather than the floor area, because a
two-storey 2,400 sq ft house does not have 2,400 sq ft of roof.

### Checks

typecheck app 316 / server 87, both at baseline. smoke 6 affected pages, 0
threw. 1768 tests pass, 32 of them on this arithmetic alone. Samples at
`dist/digital-products/sample-capital-plan.html` and
`sample-property-health.html` — both worth opening, since reading the document
is what caught both defects above.

### Still open

- **Revenue Opportunity** is the last of the three without a document. It has a
  gate, and it needs market rent comparables — `market_rent:{address}` records
  exist, which is where it should start.
- **Nothing charges for a report.** No Stripe product, no purchase, no delivery.
  Both documents are reachable by the owner of the property because the gate and
  the document had to exist first.
- **Neither document is deployed.** The server function needs a deploy before
  either route answers.

---

## Review — the Revenue Opportunity Report (2026-10-04)

The last of the three. All three now have a gate, an arithmetic module and a
document.

### The comparison is the product, so it gates on the comparison

The listing promises *"what your units earn now, what comparable units earn, and
where the gap is worth closing"*. The middle clause is the whole thing: a
revenue report with no market figure is the rent the owner already knows,
printed on headed paper.

So this one has **two gates**. `canSell` answers the half that lives in the
property's own records — are there units, is a rent recorded. The market
estimate is not a property record at all, it is a cached valuation keyed by
address, so the view route checks it separately through `marketIsUsable`, which
refuses three ways:

- no estimate on file;
- an estimate with **no range**, because an unqualified number presented as a
  market rate is a stronger claim than an automated valuation can make;
- a range wider than half the estimate, because a midpoint of $1,200–$2,500
  cannot price a unit.

The refusal names the fix: open the market rent panel in the portal, which
fetches a current estimate. The report route deliberately does **not** fetch —
`POST /landlord/market-rent` is what pays RentCast, and a document opened ten
times would otherwise cost ten times as much to produce as it did once.

### The range decides how strongly it speaks

Confidence comes from the width of the range, not from the headline: tight is
"worth acting on", moderate is "a direction rather than a target", wide is "not
something to set a rent from without a local opinion". The report prints the
actual range every time, because that is the honest part.

### A rent rise is not free money, and the report says so

Every rent recommendation carries **what one vacant month costs** beside it,
because that is the figure that decides whether the increase is worth taking —
a $300 gap on a $1,500 unit needs five months of the increase to pay for a
tenant leaving over it. The advice is to move rents at renewal rather than
mid-tenancy, and gaps under fifty dollars are explicitly left alone rather than
dressed up as opportunities.

A unit already let above the estimate is told so plainly, and the market total
never counts a unit *down* to the estimate — subtracting would turn a unit let
$200 over into $200 of "lost revenue".

### The flaw the rendered sample caught

The headline named the wrong number. A duplex with one unit empty and a $325
monthly rent gap headlined **"$3,900 a year"** while **$21,600 a year** sat
unearned in the vacancy. Both figures were in the document and the
recommendations already led with the vacancy — but an owner skimming reads the
callout, and a callout naming the smaller number has buried the finding.

The headline now leads with whichever is larger and says so explicitly:
*"$21,600 a year is sitting in an empty unit … occupancy is the larger of the
two by $17,700 a year, so it is what this report puts first."* All three cases
were checked by rendering them — one unit empty, fully let with gaps, and fully
let at market.

### The limitation it states rather than works around

A tenancy record carries a unit string and no `propertyId`, so per-unit rents
can only be attributed to a building for a landlord who owns exactly one
property. Everybody else is analysed from the rent on the property record, and
the report says which of the two it used. Returning every tenant against one
building would have produced a $99 report full of other buildings' rents.

### Checks

typecheck app 316 / server 87, both at baseline. smoke 6 affected pages, 0
threw. 1793 tests pass — 20 on this arithmetic. Sample at
`dist/digital-products/sample-revenue.html`.

### What remains on the reports

- **Nothing charges for one.** No Stripe product, no purchase, no delivery. All
  three documents are reachable by the owner of the property, because the gate
  and the document had to exist before billing could be wired to them.
- **Not deployed.** The server function needs a deploy before any of the three
  routes answers.
- **No portal surface.** `GET /property-reports/:propertyId` returns what can be
  bought and what the rest still need; nothing renders it yet.
