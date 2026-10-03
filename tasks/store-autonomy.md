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

- [ ] **0.1** Close the download hole (e2): prove who is asking from their
      session, not from a query string, before listing purchases or signing a
      file. Fail closed — an unidentified caller gets nothing.
- [ ] **0.2** A digital product with no artefact behind it cannot be `visible`.
      Enforced in `marketplace.tsx` so it holds whatever a screen says. This is
      a rule, not a one-off tidy: it is what stops the catalogue drifting back
      into selling descriptions.
- [ ] **0.3** Generate the 21 cover images, through the
      `/marketplace/generate-image` route that already exists, and store them
      in the cover bucket. **This is the piece Eric asked for.**
- [ ] **0.4** Attach the eighteen finished downloads once he hands them over,
      and make `deliveryMethod: generated` mean something — or drop the claim
      from those three until it does.
- [ ] **0.5** Strip the invented ratings and review counts from all 21.
- [ ] **0.6** Mark `store:order:BP-F42D79D34D` as the test it was, so it stops
      reading as an unsettled paid order and stops the sweep and the watchman
      picking it up forever. No refund — it was Eric's wife exercising the live
      checkout.
- [ ] **0.7** Delete the two `BP-DEMO-…` paid orders.
- [ ] **0.8** Fix the $0.00 payment email (`order.total` → `amount_total`).
- [ ] **0.9** Enable RLS on `private_cron_config`, and correct the stale
      "open secret" warning in the on-call pending migration.
- [ ] **0.10** Confirm `CJ_API_KEY` is set as a secret, then clear the plaintext
      key out of `dropshipper_config:providers`.
- [ ] **0.11** Remove the Zendrop paths — it will not work with this app.
      Out of the forwarding switch, out of the sync switch, module retired, so
      no future session revives it.

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

- [ ] **1.1** `POST /store/cron-tick` — secret from `private_cron_config`,
      refusal when unset, nothing read from the body, a job registry with
      per-job enable flags stored in KV, and per-tick ceilings. Copies
      `/autopilot/cron-tick` deliberately rather than inventing a second shape.
- [ ] **1.2** The heartbeat job: record every run — when, which jobs ran, what
      each did, what each cost. This is the record everything later reads.
- [ ] **1.3** `GET /store/autonomy/status` for staff: the heartbeat, plainly.
- [ ] **1.4** The migration, as `.sql.pending`, with its own generated secret.
- [ ] **1.5** Arm it with **every job disabled but the heartbeat**. Watch one
      tick, then one full day. A clock that proves itself on an empty load.

*Proved by:* 96 heartbeat records a day and not one other effect.

### Phase 2 — Fulfilment and tracking, unattended

Switch jobs on one at a time, in the order a customer feels them.

- [ ] **2.1** Job `fulfil` — retry paid-but-unforwarded CJ orders, reusing
      `runFulfillmentSweep` untouched. The ceiling and the allowlist apply.
- [ ] **2.2** Job `track` — pull from CJ, and write the tracking number,
      carrier and status onto the **store order**. This is the bridge that has
      never existed.
- [ ] **2.3** Email the customer the first time their parcel gets a tracking
      number, and again on delivery. Once each, keyed on the order.
- [ ] **2.4** Take the admin-session requirement off nothing: leave
      `/store/fulfillment/run` exactly as it is for the manual button. The
      clock uses its own route, so no existing guard is loosened.
- [ ] **2.5** Watch one real order from payment to delivery with nobody
      touching it.

*Proved by:* a parcel arrives at somebody's door, and they were told it was
coming, without anyone opening the app.

### Phase 3 — A catalogue that cannot lie

- [ ] **3.1** Job `catalogue` — CJ stock sync. Out of stock goes off sale, the
      same tick.
- [ ] **3.2** Cost drift: re-price inside the agreed band automatically; outside
      it, off sale and ask. Needs decision 1 below.
- [ ] **3.3** Job `delist` — every tick, anything unsellable comes off sale: no
      stock, no deliverable, no supplier on the allowlist. Phase 0.1 made that
      true once; this keeps it true.
- [ ] **3.4** Autonomous listing: new CJ products scored and published against a
      margin floor, which is what `AutoProductPilot` was built to do. Last,
      because listing more of something is only safe once the rest holds.
- [ ] **3.5** Fix the two screens that send the publishable key instead of the
      session — `AutoProductPilot` and `ProductPagePilot` both build auth
      headers as a module constant, so every call they make resolves to nobody
      and a signed-in person is told to sign in.

*Proved by:* a product CJ runs out of overnight is off sale by morning.

### Phase 4 — Demand, unattended

- [ ] **4.1 — Eric:** `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, callback URL
      whitelisted in the Facebook app.
- [ ] **4.2** Connect Facebook and Instagram; clear the two stale OAuth state
      rows left by the attempt that never completed.
- [ ] **4.3** Arm the autopilot migration with `requireApproval` ON for the
      first campaign — the clock then proves itself by moving items to "ready"
      with nothing reaching a live page.
- [ ] **4.4** Job `carts` — one recovery email per abandoned cart, after the
      agreed delay. Needs decision 2.
- [ ] **4.5** Release approval once watched. Needs decision 4.

*Proved by:* a post lands on a Saturday night with nobody awake.

### Phase 5 — The watchman earns its keep

- [ ] **5.1** Dead-man's switch: no tick in N hours raises an alarm. This is the
      guard against the failure that already happened — a silence nobody heard
      for six weeks.
- [ ] **5.2** Job `watch` — reconcile money against state every tick and alarm
      on anything stuck: paid but not forwarded beyond N hours, forwarded with
      no tracking beyond N days, delivered but the customer never told, a CJ
      call refused for funds or credentials.
- [ ] **5.3** One screen that answers "is the store running itself right now",
      reading the heartbeat rather than showing an invented green light.

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
