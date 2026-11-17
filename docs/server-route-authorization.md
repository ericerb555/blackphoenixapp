# Server route authorization inventory

Every route registration under `supabase/functions/server/`, with the authorization that
actually stands behind it. `supabase/functions/server-dist/` is build output and is excluded.

**1,065 route registrations across 84 route-carrying modules** — the rest of the files under
`server/` are helpers and register nothing. Generated 2026-11-16 against the working tree.

---

## 1. Prioritised findings — broken access control candidates

Routes that are **AUTHED-ONLY** (they pass the global sign-in wall and nothing else) **and**
take the record or principal id **from the request** **and** touch customer, financial or
document data. Every row below was read by hand, not inferred.

"Signed in" here means *any* account — a customer, a tenant, a vendor, anyone who completed
`/signup/universal`. None of these require staff.

| # | Route | Source | Trusted parameter | What a signed-in non-staff user gets |
|---|---|---|---|---|
| 1 | `GET /make-server-3eae23a6/payment/ecommerce/orders/customer/:email` | payment-processing.tsx:216 | `:email` | Any customer's complete order history — items, totals, addresses — by typing their email into the path. |
| 2 | `PATCH /make-server-3eae23a6/payment/ecommerce/order/:orderId/status` | payment-processing.tsx:240 | `:orderId`, `status` + `tracking` (body) | Set any order to any status and attach any tracking number. Marking an unpaid order "shipped", or redirecting a real one's tracking, needs nothing but the id. |
| 3 | `GET /make-server-3eae23a6/studio/project-info/:quoteId` | index.tsx:7032 | `:quoteId` | Any quote document whole: client name, email, phone, address, line items and pricing. |
| 4 | `POST /make-server-3eae23a6/hour-transfers/review/:transferId` | hour-transfers.tsx:328 | `:transferId`, `reviewedBy` (body) | Approve or deny anybody's hour-transfer request, signed with whatever reviewer name is posted. It moves billable hours between subscriptions. |
| 5 | `POST /make-server-3eae23a6/applications/:id/approve` | territory-cohorts.tsx:219 | `:id`, `reviewedBy` (body) | Approve any pending territory/cohort application — which grants a territory seat — with a forged reviewer name. `/applications` is on the public POST list, but that list is exact-match, so this path is AUTHED-ONLY rather than public. |
| 6 | `GET /make-server-3eae23a6/quotes/:id/deliverables` | deliverables.tsx:129 | `:id` (quote id) | Signed download URLs, 24h, for every plan, rendering and photo attached to any quote. |
| 7 | `POST /make-server-3eae23a6/quotes/:id/deliverables` | deliverables.tsx:87 | `:id` (quote id) | Upload an arbitrary file into any customer's quote and have it served back as that quote's deliverable. |
| 8 | `DELETE /make-server-3eae23a6/quotes/:id/deliverables/:did` | deliverables.tsx:147 | `:id`, `:did` | Permanently delete any quote's attached plans and renderings from storage. |
| 9 | `GET /make-server-3eae23a6/payment/subscription/:subscriptionId/payments` | payment-processing.tsx:383 | `:subscriptionId` | Any subscription's full payment history. |
| 10 | `GET /make-server-3eae23a6/payment/transaction/:transactionId` | payment-processing.tsx:406 | `:transactionId` | Any transaction plus the order or subscription-payment record behind it. |
| 11 | `GET /make-server-3eae23a6/payment/subscription/payment/:paymentCode` | payment-processing.tsx:361 | `:paymentCode` | Any subscription payment record by its code. |
| 12 | `GET /make-server-3eae23a6/payment/ecommerce/order/:orderCode` | payment-processing.tsx:193 | `:orderCode` | Any order by its code — buyer details, items, totals. |
| 13 | `GET /make-server-3eae23a6/hour-transfers/subscription/:subscriptionId` | hour-transfers.tsx:311 | `:subscriptionId` | Every hour transfer in or out of any subscription. |
| 14 | `PUT /make-server-3eae23a6/crm/leads/:id` | crm-content.tsx:98 | `:id` | Rewrite any CRM lead — the request body is spread over the stored record, so every field, contact details and stage included. |
| 15 | `DELETE /make-server-3eae23a6/crm/leads/:id` | crm-content.tsx:114 | `:id` | Delete any CRM lead outright; no read, no existence check. |
| 16 | `DELETE /make-server-3eae23a6/leads/:id` | leads.tsx:422 | `:id` | Delete any lead from the main lead store. |
| 17 | `DELETE /make-server-3eae23a6/sms/contacts/:id` | growth-marketing.tsx:107 | `:id` | Delete any SMS marketing contact. |
| 18 | `GET /make-server-3eae23a6/stripe/session/:sessionId` | index.tsx:7573 | `:sessionId` | Retrieves any Stripe Checkout session across two Stripe accounts, with its line items — buyer email, name, amounts. |
| 19 | `GET /make-server-3eae23a6/social/callback` | index.tsx:8931 | `userId` inside the base64 `state` query param | `state` is `atob`-decoded and never verified. A crafted `state` writes the caller's OAuth token onto another account's social connection. |
| 20 | `PUT /make-server-3eae23a6/email-center/templates/:key` | email-center.tsx:118 | `:key` | Rewrite any transactional email template — subject and raw HTML — that the platform then sends to customers under its own name. |
| 21 | `DELETE /make-server-3eae23a6/email-center/templates/:key` | email-center.tsx:141 | `:key` | Delete any transactional email template. |
| 22 | `PUT /make-server-3eae23a6/media/:mediaId` | media-library.tsx:448 | `:mediaId` | Rewrite any media item's name, tags, folder, project and client attribution. The router's `requireSignedIn` (media-library.tsx:46-47) authenticates and stops there. |
| 23 | `DELETE /make-server-3eae23a6/video-studio/projects/:id` | video-studio.tsx:1327 | `:id` | Delete any video-studio project and remove its scene images and audio from storage. |
| 24 | `POST /make-server-3eae23a6/work-requests/:id/viewed` | index.tsx:9784 | `:id`, `adminName` / `customerEmail` / `customerName` (body) | Opens a conversation against any work request with a self-declared "Black Phoenix Team" participant and an arbitrary customer email. |
| 25 | `GET /make-server-3eae23a6/vendor-profile/:vendorId/stats` | vendor-profile.tsx:271 | `:vendorId` | Any vendor's order count and total revenue. |

Three more of the same shape, lower value:

- `GET /make-server-3eae23a6/vendor-profile/:vendorId` — vendor-profile.tsx:92 — `:vendorId` — any
  vendor's contact record, email and phone included, unclaimed portal records too. The sibling `PUT`
  at vendor-profile.tsx:195 was fixed with `vendorActor` and a vendorId equality check, and carries a
  comment explaining why; the two `GET`s were left as they were.
- `GET /make-server-3eae23a6/fulfillment/track` — fulfillment.tsx:204 — `order` + `email` query —
  order status, totals and tracking for any order whose number and customer email are known. The email
  is compared to the order, not to the session: a knowledge check, not an authorization one.
- `GET /make-server-3eae23a6/gift-cards/:code` — index.tsx:11653 — `:code` — balance and state of any
  gift card; recipient and purchaser emails are stripped from the reply.

Not access control, but the same shape and worth a line: `GET /make-server-3eae23a6/reel-research`
(reel-research.tsx:113) takes a `q` from any signed-in caller and spends the platform's YouTube Data
API quota on it, unmetered.

### What these have in common

The global wall at index.tsx:1536 answers two questions — *are you signed in*, and for the fourteen
`ADMIN_PREFIXES`, *are you an administrator*. It never answers *is this record yours*. Every route
above leans on the wall for authentication and then does no authorization at all.

The modules that got this right all do the same thing — resolve the caller from the session and key
the lookup by that, rather than by what the path says: `rental-portals.tsx` via `landlordActor` and
`landlordPortfolioKey(actor.user.email)`, `condo-associations.tsx` via `condoStanding(c, id).can(…)`,
`exchange*Routes.tsx` via `resident(c)` plus `listingIClaim(sb, me.id, orgId)`, `vendor-catalog.tsx`
via `catalogActor` + `mayTouch(who, vendorId)`, `trash-estimator.tsx` by comparing
`record.customerEmail` against `c.get('actorEmail')`, `autopilot.tsx` via `loadCampaign(userId, id)`.

---

## 2. Counts

| Auth tier | Routes |
|---|---|
| PUBLIC-LISTED (path on the index.tsx allowlist) | 95 |
| &nbsp;&nbsp;— of which also SECRET-GUARDED (verify a shared secret or webhook signature) | 3 |
| ROLE-CHECKED (handler, router middleware, or an `ADMIN_PREFIXES` path) | 277 |
| AUTHED-ONLY (passes the wall, no further role check) | 693 |
| **Total** | **1,065** |

| Ownership scoping | Routes |
|---|---|
| SCOPED-TO-SESSION | 425 |
| ID-FROM-REQUEST | 223 |
| MIXED (session resolved *and* a principal id accepted from the request) | 43 |
| N/A (no id taken from the request, or no record lookup) | 374 |

Scoping is the column that matters and also the least reliable when derived statically. `MIXED` means
the handler resolves a session **and** reads a company / customer / vendor / user id from the request.
That is either a correct staff override — `vendor-billing.tsx:144` honours `?vendorId` only when
`actor.isCompany` — or a hole. Every `MIXED` row in a sensitive module was opened; what survived is in
section 1.

---

## 3. How the tiers were decided

### The wall

`authTier(path, method)` — index.tsx:1525 — strips the `/make-server-3eae23a6` prefix and classifies:

- `OPTIONS` → public (a CORS preflight carries no credentials).
- `PUBLIC_PREFIXES` (index.tsx:849–982, 23 entries) → public, **prefix match** via `startsWithAny`
  (index.tsx:1464): `/auth/`, `/cart`, `/webhook`, `/screening/`, `/quotes/by-token/`, …
- `GET`/`HEAD` + `PUBLIC_GET_PREFIXES` (index.tsx:986–1032, 17 entries) → public.
- `POST` + `PUBLIC_POST_PATHS` (index.tsx:1121–1462, 27 entries) → public, **exact match**.
- `ADMIN_PREFIXES` (index.tsx:1047–1100, 14 entries) → admin.
- everything else → `user`.

The gate itself is index.tsx:1536. `AUTH_ENFORCE` is `true` (index.tsx:830), so a `user`-tier request
without a session gets 401 `'Sign in required.'` (index.tsx:1562), and an `admin`-tier request from a
non-admin gets 403 `'Administrator access is required.'`.

Watch the matching semantics: `/applications` is on the exact-match POST list, so
`/applications/:id/approve` is **not** public (finding #5), while `/screening/` and `/auth/` on
`PUBLIC_PREFIXES` cover everything beneath them.

### Path-scoped middleware above the routers

| Pattern | index.tsx | Effect |
|---|---|---|
| `/make-server-3eae23a6/pipeline/*` | 1662 | admin only |
| `/make-server-3eae23a6/orders/*` | 1669 | admin only |
| `/make-server-3eae23a6/vendor-orders/*` | 1675 | admin only |
| `/make-server-3eae23a6/admin/orders/*` | 1680 | admin only |
| `/make-server-3eae23a6/products/*` | 1685 | admin for anything but GET |
| `/make-server-3eae23a6/entitlements/*` | 1696 | signed in; cross-account reads and ledger writes admin only |
| `/make-server-3eae23a6/entitlements-summary` | 1719 | admin, or `?owner` / `?email` equal to the caller's own |
| `/make-server-3eae23a6/invoice-attachables` | 1867 | signed in; puts `actor` and `admin` on the context |
| `/make-server-3eae23a6/cj/*` | 1939 | `supplierAdminGuard` |

A router mounted with `app.route(prefix, router)` inherits any `app.use` whose pattern covers the
resulting path, and nothing else — the guard at 1939 does not reach routes outside `/cj/`. Routers that
declare their own full `/make-server-3eae23a6/…` paths are mounted at `/`. There are 120 mounts in
total, index.tsx:1751–2191.

### Role checks

The shared `requireStaff.ts` exports `isStaffRequest`, `requireStaff` and `requireStaffOn`. Several
modules carry local re-implementations — `aiSpend.ts`, `architect-review.tsx`, `bid-intake.tsx`,
`design-links.tsx` (`isStaff` at :64, `requireStaff` at :89), `gallery.tsx`, `job-financials.tsx`,
`jurisdictions.tsx`, `quoteAttachments.ts`, `trash-estimator.tsx` — and others use bespoke per-domain
guards: `requireQuoteStaff` (quotes.tsx:201), `condoStanding` (condo-associations.tsx), `mayTouch`
(vendor-catalog.tsx, content-management.tsx), `catalogActor`, `billingActor`, `landlordActor`,
`resident`. The **Check** column names whichever one the route actually reaches. Divergence between
those implementations is out of scope here.

Note that `requireSignedIn` (media-library.tsx:46) is authentication, not a role check, and routes
behind it are tiered AUTHED-ONLY.

### Method, and what it does not cover

Route registrations were extracted mechanically — `app` / `router` `.get/.post/.put/.patch/.delete`
with a string path — each handler body taken to its closing brace, then matched against patterns for
role guards, shared-secret checks, session resolution and request-supplied identifiers. The mounted
prefix was resolved by following each router variable's import in index.tsx.

That static pass produces the table in section 5 (renumbered 2026-11-17 when section 4 was added). It is a lead generator, not a verdict: a handler that
delegates its check to a helper the patterns do not know — `condoStanding`, `reportFor`,
`intakeOwnedBy`, `resident`, `mayTouch` — reads as unguarded until somebody opens it. Every row the
pass flagged as sensitive **and** unguarded was opened. 57 rows carry a † and state what the code
does; unmarked rows have not been read. Where a mount or a check could not be resolved, the cell says
UNKNOWN rather than a guess.

## 4. Gates that read a table that does not exist

Added 2026-11-17. This section exists because the inventory had no column for it: every
tier in section 3 records **that a check is present**, and none records **whether the
check can ever answer yes**.

### The three tables

```sql
select table_schema, table_name from information_schema.tables
 where table_name in ('company_members', 'user_permissions', 'user_profiles');
-- 0 rows, every schema
```

None of the three has ever existed in this project. A `.from('user_permissions')` call
against supabase-js does not throw — it resolves with an error object and no rows — so
every gate reading one has been answering from an empty list on every request since it
was written. `index.tsx:3120` has recorded two of the three since `/me/permissions` was
written; the third, `company_members`, was still being treated as the live half as
recently as the deletion commit of 2026-11-17.

### Three shapes, with very different consequences

**(a) Read beside a live check — contributed nothing, changed nothing.** Nine KV reads
and the Postgres reads in `identity.ts:intakeIsAdmin`, `design-links.tsx:isStaff` and
`/auth/me` sat *after* an allowlist or an `app_metadata` role test. Those two lines were
always the whole answer. Deleting the dead reads is provably behaviour-neutral and is
what the 2026-11-17 commits did; what it changes is one failed query per call on the
most-used helper on this server.

**(b) Read as the ENTIRE check — the route admitted nobody.** `rewardsAdmin`
(index.tsx:11897) had no fallback underneath it, so it returned `false` to every caller
including the owner of the company. Ten call sites, these route families:

| Route | What was unreachable |
|---|---|
| `GET /gift-cards` | the gift-card list |
| `POST /gift-cards/:code/redeem` | redemption as staff |
| `GET`, `POST`, `DELETE /referrals`, `/referrals/records`, `/referrals/records/:id` | the whole referral admin surface |
| `GET /affiliate-payouts`, `POST /affiliate-payouts/:email/:id` | payout review and approval |

**(c) Read as a role *derivation* — the field came back empty.** `/auth/me` asked both
tables for a role when `app_metadata` had none, so `role` was `''` on every call that
reached it and the answer always came from the KV application record instead.

### Why no probe finds shape (b)

**A permanently refused admin route is indistinguishable from a correctly guarded one.**
Every external test this inventory's findings were verified with — call the route as the
wrong user, expect a refusal — *passes* against a gate that refuses everybody. So does
calling it as the right user, which reads as "correctly guarded" unless you know who you
are and that you should have got in. This class is only visible from the inside, by
asking what the check reads and whether that thing exists.

It fails closed, which is why these were broken features and not holes. The cost was
paid in a different currency: the owner could not issue a gift card for a year.

### The state the inventory should carry

A third value beside *guarded* and *AUTHED-ONLY*: **NEVER ADMITS** — a check is present,
is correct in shape, and cannot return true. Rows in section 5 are not annotated with it
yet; the three cases above are the ones found so far, and they were all found by reading
gates rather than by calling routes.

### Two related facts, neither a hole (both verified, not assumed)

- **Three accounts hold no role in either metadata bag** (created 2026-04-20, 2026-09-08,
  2026-09-20; none seen since September). `trustedRole` returns `''` for them, so they are
  refused everywhere a role is required. Fail-closed and inert, but if one of them is a
  real customer, their portal is empty for this reason and not a bug in the portal.
- **The three retired API generations are deployed but serve nothing, and the repo keeps
  their full source on purpose.** `make-server-57095a78` carries its own copies of these
  dead reads at `index.tsx:952` and `:6792`, and 363 route registrations besides. None of
  it runs: `supabase/config.toml` points each slug's entrypoint at a `-stub` directory,
  and the stubs identify themselves. Verified against production 2026-11-17:

  | Function | `/health` | data routes | retired on |
  |---|---|---|---|
  | `make-server-57095a78` | 200 `retired: true` | 410 | 2026-08-15 |
  | `make-server-824f083c` | 200 `retired: true` | 410 | 2026-08-30 |
  | `make-server-12c91054` | 200 `retired: true` | 410 | 2026-08-30 |

  Kept deployed deliberately, so a stale caller gets a clear 410 rather than a confusing
  404, and the archived source is the record of what was taken out of service. The hazard
  is the entrypoint line, not the source: a deploy on 2026-08-17 named the full directory
  instead of the stub and un-retired a 509-route server with service-role privileges
  against live data for about fifteen minutes, without erroring. `RETIRED-1` in
  `scripts/security-probe.mjs` is the standing check for that.

  **That check had the same blind spot this inventory's findings had.** It accepted 410,
  401 or 404 as proof of retirement — and the live server answers an anon-key request to
  `/customers` and `/invoices` with **401** (measured 2026-11-17), so the one check written
  to catch an un-retirement would have passed a fully un-retired server. It now requires
  the positive `retired: true` marker on `/health` and a 410 on the data routes; a live
  server in its place fails it, which was demonstrated rather than assumed.

## 5. Route-by-route inventory

Columns: **Auth tier** · **Ownership scoping** · **Sensitivity**. Rows marked † were read by hand;
every other row is derived by the static pass described above and should be treated as a lead, not a verdict.

### advertising.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2002)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/advertising/house` | advertising.tsx:121 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/advertising/house` | advertising.tsx:129 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/advertising/campaigns` | advertising.tsx:180 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/advertising/campaigns` | advertising.tsx:192 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/advertising/creatives` | advertising.tsx:230 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/advertising/creatives` | advertising.tsx:241 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/advertising/creatives/:id` | advertising.tsx:322 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/advertising/images/generate` | advertising.tsx:460 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/advertising/images/upload` | advertising.tsx:537 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| POST | `/make-server-3eae23a6/advertising/images` | advertising.tsx:558 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| GET | `/make-server-3eae23a6/advertising/review` | advertising.tsx:581 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/advertising/creatives/:id/decision` | advertising.tsx:603 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/advertising/serve` | advertising.tsx:632 | PUBLIC-LISTED | N/A | PII/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/advertising/events` | advertising.tsx:752 | PUBLIC-LISTED | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/advertising/stats` | advertising.tsx:798 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |

### ai-blueprint-analysis.tsx

Mounted at `/make-server-3eae23a6/ai` (index.tsx:1898)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/ai/analyze-blueprints` | ai-blueprint-analysis.tsx:59 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/ai/measure-rooms` | ai-blueprint-analysis.tsx:586 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/ai/test` | ai-blueprint-analysis.tsx:702 | AUTHED-ONLY | N/A | MONEY/DOCS |  |

### ai-floorplan.tsx

Mounted at `/make-server-3eae23a6/ai-floorplan` (index.tsx:1893)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/ai-floorplan/analyze-image` | ai-floorplan.tsx:250 | AUTHED-ONLY | N/A | MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/ai-floorplan/analyze-video` | ai-floorplan.tsx:488 | AUTHED-ONLY | N/A | DOCS |  |
| POST | `/make-server-3eae23a6/ai-floorplan/generate-from-description` | ai-floorplan.tsx:521 | AUTHED-ONLY | N/A | DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/ai-floorplan/analyze-kitchen` | ai-floorplan.tsx:697 | AUTHED-ONLY | N/A | MONEY/DOCS |  |

### architect-review.tsx

Mounted at `/make-server-3eae23a6/architect-review` (index.tsx:1904)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/architect-review/links` | architect-review.tsx:151 | ROLE-CHECKED | SCOPED-TO-SESSION | PII | requireStaff |
| GET | `/make-server-3eae23a6/architect-review/review/:token` | architect-review.tsx:222 | PUBLIC-LISTED | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/architect-review/review/:token/respond` | architect-review.tsx:253 | PUBLIC-LISTED | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/architect-review/links/:projectId` | architect-review.tsx:305 | ROLE-CHECKED | ID-FROM-REQUEST | PII | requireStaff |
| POST | `/make-server-3eae23a6/architect-review/links/:projectId/:linkId/revoke` | architect-review.tsx:335 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaff |

### auth.tsx

Mounted at `/` (index.tsx:1850)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/auth/register-crm` | auth.tsx:169 | PUBLIC-LISTED | N/A | PII |  |
| POST | `/make-server-3eae23a6/admin/backfill-crm` | auth.tsx:191 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/auth/signup` | auth.tsx:258 | PUBLIC-LISTED | N/A | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/auth/verify` | auth.tsx:413 | PUBLIC-LISTED | SCOPED-TO-SESSION | PII/ADMIN |  |
| PATCH | `/make-server-3eae23a6/auth/profile` | auth.tsx:489 | PUBLIC-LISTED | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/auth/complete-onboarding` | auth.tsx:524 | PUBLIC-LISTED | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/admin/users` | auth.tsx:586 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| PATCH | `/make-server-3eae23a6/admin/users/:userId/role` | auth.tsx:655 | AUTHED-ONLY | MIXED | ADMIN |  |
| PATCH | `/make-server-3eae23a6/admin/users/:userId/status` | auth.tsx:705 | AUTHED-ONLY | MIXED | ADMIN |  |
| DELETE | `/make-server-3eae23a6/admin/users/:userId` | auth.tsx:755 | AUTHED-ONLY | MIXED | ADMIN |  |

### autopilot.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1998)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/autopilot/campaigns` | autopilot.tsx:147 | ROLE-CHECKED | N/A | MONEY/DOCS | requireApproval |
| GET | `/make-server-3eae23a6/autopilot/campaigns` | autopilot.tsx:219 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/autopilot/campaigns/:id` | autopilot.tsx:236 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/generate-plan` | autopilot.tsx:249 | † AUTHED-ONLY | SCOPED-TO-SESSION | MONEY | getUserId(c) → loadCampaign(userId, id) |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/generate-assets` | autopilot.tsx:303 | ROLE-CHECKED | ID-FROM-REQUEST | DOCS | requireApproval |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/advance` | autopilot.tsx:473 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/autopilot/due` | autopilot.tsx:492 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/tick` | autopilot.tsx:520 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/cron-tick` | autopilot.tsx:565 | PUBLIC-LISTED / SECRET-GUARDED | N/A | DOCS/ADMIN | shared secret / signature |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/items/:itemId/approve` | autopilot.tsx:622 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/approve-all` | autopilot.tsx:641 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/items/:itemId/reject` | autopilot.tsx:659 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/items/:itemId/edit` | autopilot.tsx:678 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/items/:itemId/regenerate` | autopilot.tsx:698 | † AUTHED-ONLY | SCOPED-TO-SESSION | DOCS | getUserId(c) → loadCampaign(userId, id) |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/pause` | autopilot.tsx:742 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/autopilot/campaigns/:id/resume` | autopilot.tsx:756 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/autopilot/campaigns/:id` | autopilot.tsx:774 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### bid-intake.tsx

Mounted at `/make-server-3eae23a6/bid-intake` (index.tsx:1900)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/bid-intake/read` | bid-intake.tsx:115 | ROLE-CHECKED | N/A | PII/MONEY/DOCS/ADMIN | requireStaff |

### bigBoxProducts.tsx

Mounted at `/make-server-3eae23a6/big-box-products` (index.tsx:2220)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/big-box-products/search` | bigBoxProducts.tsx:21 | ROLE-CHECKED | N/A | MONEY | requireStaff |
| GET | `/make-server-3eae23a6/big-box-products/:store/:sku` | bigBoxProducts.tsx:61 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaff |
| POST | `/make-server-3eae23a6/big-box-products/availability` | bigBoxProducts.tsx:90 | ROLE-CHECKED | N/A | ADMIN | requireStaff |

### brands.tsx

Mounted at `/` (index.tsx:2050)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/brands/:companyId` | brands.tsx:51 | AUTHED-ONLY | MIXED | NONE |  |
| POST | `/make-server-3eae23a6/brands/:companyId` | brands.tsx:88 | AUTHED-ONLY | MIXED | ADMIN |  |
| DELETE | `/make-server-3eae23a6/brands/:companyId` | brands.tsx:135 | AUTHED-ONLY | MIXED | NONE |  |

### cohorts.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2229)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/cohorts` | cohorts.tsx:136 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts` | cohorts.tsx:170 | ROLE-CHECKED | N/A | MONEY | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/bulk-update` | cohorts.tsx:224 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/status/active` | cohorts.tsx:267 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/overdue` | cohorts.tsx:302 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/applications` | cohorts.tsx:359 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/applications/approve` | cohorts.tsx:464 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/applications/reject` | cohorts.tsx:477 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/accounts/shutoff` | cohorts.tsx:515 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/initialize` | cohorts.tsx:587 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/migrate-tiers` | cohorts.tsx:616 | ROLE-CHECKED | N/A | PII/MONEY | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/health` | cohorts.tsx:669 | ROLE-CHECKED | N/A | MONEY | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/revenue/analytics` | cohorts.tsx:697 | ROLE-CHECKED | N/A | PII/MONEY/DOCS | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/revenue/trends` | cohorts.tsx:809 | ROLE-CHECKED | N/A | MONEY | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/:id` | cohorts.tsx:874 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaffOn |
| PUT | `/make-server-3eae23a6/cohorts/:id` | cohorts.tsx:899 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaffOn |
| DELETE | `/make-server-3eae23a6/cohorts/:id` | cohorts.tsx:943 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/:id/analytics` | cohorts.tsx:974 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/:id/calculate-price` | cohorts.tsx:1015 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/type/:type` | cohorts.tsx:1057 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/cohorts/revenue/category/:category` | cohorts.tsx:1080 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireStaffOn |
| POST | `/make-server-3eae23a6/cohorts/:id/update-subscribers` | cohorts.tsx:1147 | ROLE-CHECKED | N/A | MONEY | requireStaffOn |

### company-config.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2051)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/company/config` | company-config.tsx:11 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| PUT | `/make-server-3eae23a6/company/config` | company-config.tsx:62 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/company/config/initialize` | company-config.tsx:94 | AUTHED-ONLY | N/A | PII/ADMIN |  |

### companyLogoRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1845)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/company/logos/store` | companyLogoRoutes.tsx:98 | ROLE-CHECKED | N/A | DOCS | isStaffRequest |

### condo-associations.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2040)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/condo/associations` | condo-associations.tsx:198 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/condo/associations` | condo-associations.tsx:241 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| PUT | `/make-server-3eae23a6/condo/associations/:id` | condo-associations.tsx:304 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | condoStanding(c, id).can(...) |
| POST | `/make-server-3eae23a6/condo/associations/:id/consent` | condo-associations.tsx:339 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | condoStanding(c, id).can(...) |
| GET | `/make-server-3eae23a6/condo/associations/:id/members` | condo-associations.tsx:396 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | condoStanding(c, id).can('members') |
| POST | `/make-server-3eae23a6/condo/associations/:id/members` | condo-associations.tsx:432 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | condoStanding(c, id).can('members') |
| PATCH | `/make-server-3eae23a6/condo/associations/:id/members/:email` | condo-associations.tsx:525 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | condoStanding(c, id).can('members') |
| POST | `/make-server-3eae23a6/condo/associations/:id/members/:email/invite` | condo-associations.tsx:587 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | condoStanding(c, id).can('members') |
| GET | `/make-server-3eae23a6/condo/my-standing` | condo-associations.tsx:647 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |

### content-management.tsx

Mounted at `/make-server-3eae23a6/cms` (index.tsx:1914)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/cms/content-pieces` | content-management.tsx:133 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/cms/content-pieces/:id` | content-management.tsx:149 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/cms/content-pieces` | content-management.tsx:167 | AUTHED-ONLY | N/A | NONE |  |
| PATCH | `/make-server-3eae23a6/cms/content-pieces/:id` | content-management.tsx:196 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/cms/content-pieces/:id` | content-management.tsx:214 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/cms/templates` | content-management.tsx:229 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/cms/templates` | content-management.tsx:243 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/cms/templates/:id/increment-usage` | content-management.tsx:256 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/cms/brand-guidelines` | content-management.tsx:272 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/cms/brand-guidelines` | content-management.tsx:286 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/cms/workflows` | content-management.tsx:300 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/cms/workflows` | content-management.tsx:314 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/cms/channels` | content-management.tsx:328 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/cms/channels` | content-management.tsx:342 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/cms/distribution` | content-management.tsx:356 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII | mayTouch(c, companyOfPiece(contentPieceId)) |
| POST | `/make-server-3eae23a6/cms/distribution` | content-management.tsx:371 | AUTHED-ONLY | N/A | NONE |  |
| PATCH | `/make-server-3eae23a6/cms/distribution/:id` | content-management.tsx:387 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/cms/approvals` | content-management.tsx:406 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/cms/approvals` | content-management.tsx:421 | AUTHED-ONLY | N/A | NONE |  |
| PATCH | `/make-server-3eae23a6/cms/approvals/:id` | content-management.tsx:437 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### content-studio.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1997)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/content-studio/brand-kit` | content-studio.tsx:307 | AUTHED-ONLY | N/A | NONE |  |
| PUT | `/make-server-3eae23a6/content-studio/brand-kit` | content-studio.tsx:316 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/content-studio/repurpose` | content-studio.tsx:343 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/content-studio/packs` | content-studio.tsx:384 | AUTHED-ONLY | N/A | NONE |  |
| DELETE | `/make-server-3eae23a6/content-studio/packs/:pid` | content-studio.tsx:396 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/content-studio/plan` | content-studio.tsx:409 | AUTHED-ONLY | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/content-studio/plan` | content-studio.tsx:456 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/content-studio/compose` | content-studio.tsx:495 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/content-studio/recreate-script` | content-studio.tsx:566 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/content-studio/package` | content-studio.tsx:666 | AUTHED-ONLY | N/A | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/content-studio/reel/storyboard` | content-studio.tsx:1103 | AUTHED-ONLY | N/A | MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/content-studio/reel` | content-studio.tsx:1193 | AUTHED-ONLY | N/A | PII/MONEY |  |
| POST | `/make-server-3eae23a6/content-studio/pick-before-after` | content-studio.tsx:1379 | ROLE-CHECKED | N/A | PII/MONEY/DOCS/ADMIN | assertAiAllowed( |

### creative-studio.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1996)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/creative-studio/presets` | creative-studio.tsx:79 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/creative-studio/status` | creative-studio.tsx:86 | AUTHED-ONLY | N/A | DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/creative-studio/generate` | creative-studio.tsx:113 | AUTHED-ONLY | N/A | DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/creative-studio/assets` | creative-studio.tsx:210 | AUTHED-ONLY | N/A | NONE |  |
| DELETE | `/make-server-3eae23a6/creative-studio/assets/:id` | creative-studio.tsx:226 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### crm-content.tsx

Mounted at `/` (index.tsx:1993)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/crm/leads` | crm-content.tsx:58 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/crm/leads` | crm-content.tsx:69 | AUTHED-ONLY | N/A | PII |  |
| PUT | `/make-server-3eae23a6/crm/leads/:id` | crm-content.tsx:98 | † AUTHED-ONLY | ID-FROM-REQUEST | PII | none |
| DELETE | `/make-server-3eae23a6/crm/leads/:id` | crm-content.tsx:114 | † AUTHED-ONLY | ID-FROM-REQUEST | PII | none |
| GET | `/make-server-3eae23a6/crm/notes` | crm-content.tsx:123 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/crm/notes` | crm-content.tsx:133 | AUTHED-ONLY | N/A | PII |  |
| GET | `/make-server-3eae23a6/reviews/moderation` | crm-content.tsx:150 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/reviews/moderation` | crm-content.tsx:159 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/coupons` | crm-content.tsx:178 | ROLE-CHECKED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/coupons` | crm-content.tsx:188 | ROLE-CHECKED | N/A | MONEY |  |
| PUT | `/make-server-3eae23a6/coupons/:id` | crm-content.tsx:216 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/coupons/:id` | crm-content.tsx:236 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/coupons/validate/:code` | crm-content.tsx:246 | PUBLIC-LISTED | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/chat/config` | crm-content.tsx:265 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/chat/config` | crm-content.tsx:274 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/chat/leads` | crm-content.tsx:285 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/chat/leads` | crm-content.tsx:296 | AUTHED-ONLY | N/A | PII |  |
| DELETE | `/make-server-3eae23a6/chat/leads` | crm-content.tsx:315 | AUTHED-ONLY | N/A | PII |  |
| GET | `/make-server-3eae23a6/blog/posts` | crm-content.tsx:329 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/blog/posts` | crm-content.tsx:340 | AUTHED-ONLY | N/A | NONE |  |
| DELETE | `/make-server-3eae23a6/blog/posts/:id` | crm-content.tsx:351 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/blog/posts/:id/view` | crm-content.tsx:361 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### deliverables.tsx

Mounted at `/` (index.tsx:1889)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/quotes/:id/deliverables` | deliverables.tsx:87 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY/DOCS | none — `:id` is the quote id, no owner check |
| GET | `/make-server-3eae23a6/quotes/:id/deliverables` | deliverables.tsx:129 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY/DOCS | none — `:id` is the quote id, no owner check |
| DELETE | `/make-server-3eae23a6/quotes/:id/deliverables/:did` | deliverables.tsx:147 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY/DOCS | none — `:id` is the quote id, no owner check |

### design-assistant.tsx

Mounted at `/make-server-3eae23a6/design-assistant` (index.tsx:1913)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/design-assistant/ask` | design-assistant.tsx:55 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | assertAiAllowed( |

### design-links.tsx

Mounted at `/make-server-3eae23a6/design-links` (index.tsx:1912)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/design-links/context` | design-links.tsx:109 | † ROLE-CHECKED | N/A | PII/MONEY | requireStaff middleware (local re-implementation, design-links.tsx:89) |
| POST | `/make-server-3eae23a6/design-links/attach` | design-links.tsx:187 | ROLE-CHECKED | N/A | PII/ADMIN | requireStaff |
| POST | `/make-server-3eae23a6/design-links/files` | design-links.tsx:245 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS | requireStaff |
| POST | `/make-server-3eae23a6/design-links/files/:id/share` | design-links.tsx:316 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/DOCS | requireStaff |
| POST | `/make-server-3eae23a6/design-links/my-choice` | design-links.tsx:356 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| GET | `/make-server-3eae23a6/design-links/choice/:ownerKey/:designId` | design-links.tsx:396 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/design-links/files/:id/url` | design-links.tsx:420 | ROLE-CHECKED | ID-FROM-REQUEST | DOCS | requireStaff |
| DELETE | `/make-server-3eae23a6/design-links/files/:id` | design-links.tsx:433 | ROLE-CHECKED | ID-FROM-REQUEST | DOCS | requireStaff |
| GET | `/make-server-3eae23a6/design-links/my-files` | design-links.tsx:456 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| GET | `/make-server-3eae23a6/design-links/my-files/:id/url` | design-links.tsx:488 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |

### design-projects.tsx

Mounted at `/` (index.tsx:1891)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/design-projects/test` | design-projects.tsx:413 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/design-projects` | design-projects.tsx:421 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/design-projects/:id/photos` | design-projects.tsx:468 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/design-projects/:id/video-url` | design-projects.tsx:563 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |
| POST | `/make-server-3eae23a6/design-projects/:id/video-confirm` | design-projects.tsx:631 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/design-projects/:id/photos` | design-projects.tsx:703 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/design-projects/:id/photos/:photoId` | design-projects.tsx:744 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/design-projects` | design-projects.tsx:772 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/design-projects/:id` | design-projects.tsx:788 | AUTHED-ONLY | ID-FROM-REQUEST | ADMIN |  |
| GET | `/make-server-3eae23a6/design-projects/:id/versions/:versionId` | design-projects.tsx:817 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/design-projects/:id/restore` | design-projects.tsx:834 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/design-projects/:id` | design-projects.tsx:867 | AUTHED-ONLY | ID-FROM-REQUEST | ADMIN |  |

### design-standards.tsx

Mounted at `/` (index.tsx:2068)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/design-standards/test` | design-standards.tsx:233 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/design-standards/code-rules` | design-standards.tsx:237 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/design-standards/schedule-templates` | design-standards.tsx:253 | AUTHED-ONLY | N/A | NONE |  |

### discount-grants.tsx

Mounted at `/` (index.tsx:2008)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/my-discount` | discount-grants.tsx:131 | ROLE-CHECKED | MIXED | PII/MONEY | isStaff |
| POST | `/make-server-3eae23a6/discount-grants` | discount-grants.tsx:167 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/discount-grants` | discount-grants.tsx:225 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY | isStaff |
| DELETE | `/make-server-3eae23a6/discount-grants/:id` | discount-grants.tsx:263 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |

### ecommerce-cart.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1991)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/cart/:customerId` | ecommerce-cart.tsx:61 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| POST | `/make-server-3eae23a6/cart/:customerId/items` | ecommerce-cart.tsx:89 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/DOCS |  |
| PUT | `/make-server-3eae23a6/cart/:customerId/items/:itemId` | ecommerce-cart.tsx:180 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| DELETE | `/make-server-3eae23a6/cart/:customerId/items/:itemId` | ecommerce-cart.tsx:230 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| DELETE | `/make-server-3eae23a6/cart/:customerId` | ecommerce-cart.tsx:259 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| POST | `/make-server-3eae23a6/cart/merge` | ecommerce-cart.tsx:284 | PUBLIC-LISTED | N/A | PII |  |
| GET | `/make-server-3eae23a6/cart/:customerId/count` | ecommerce-cart.tsx:345 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| GET | `/make-server-3eae23a6/cart/:sessionId` | ecommerce-cart.tsx:365 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| POST | `/make-server-3eae23a6/cart/add` | ecommerce-cart.tsx:392 | PUBLIC-LISTED | N/A | PII/MONEY/DOCS |  |
| PUT | `/make-server-3eae23a6/cart/update` | ecommerce-cart.tsx:480 | PUBLIC-LISTED | N/A | NONE |  |
| DELETE | `/make-server-3eae23a6/cart/remove` | ecommerce-cart.tsx:523 | PUBLIC-LISTED | N/A | NONE |  |
| DELETE | `/make-server-3eae23a6/cart/clear` | ecommerce-cart.tsx:552 | PUBLIC-LISTED | N/A | NONE |  |

### ecommerce-orders.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1992)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/orders/test` | ecommerce-orders.tsx:121 | ROLE-CHECKED | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/orders/sample-data` | ecommerce-orders.tsx:130 | ROLE-CHECKED | N/A | PII/MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/orders` | ecommerce-orders.tsx:190 | ROLE-CHECKED | N/A | PII/MONEY/DOCS | requireOrdersStaff |
| POST | `/make-server-3eae23a6/orders/create` | ecommerce-orders.tsx:371 | ROLE-CHECKED | N/A | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/orders/customer/:customerId` | ecommerce-orders.tsx:542 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY |  |
| GET | `/make-server-3eae23a6/orders/:id` | ecommerce-orders.tsx:608 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY |  |
| GET | `/make-server-3eae23a6/orders/vendor/:vendorId` | ecommerce-orders.tsx:625 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY |  |
| PUT | `/make-server-3eae23a6/orders/:id/status` | ecommerce-orders.tsx:667 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireOrdersStaff |
| PUT | `/make-server-3eae23a6/vendor-orders/:id/status` | ecommerce-orders.tsx:705 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireOrdersStaff |
| GET | `/make-server-3eae23a6/admin/orders/all` | ecommerce-orders.tsx:767 | ROLE-CHECKED | N/A | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/orders/:id/cancel` | ecommerce-orders.tsx:793 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY | requireOrdersStaff |

### ecommerce-products.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1979)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/products` | ecommerce-products.tsx:152 | ROLE-CHECKED | N/A | MONEY/DOCS/ADMIN | requireCatalogueAdmin |
| GET | `/make-server-3eae23a6/products/source-summary` | ecommerce-products.tsx:221 | PUBLIC-LISTED | N/A | NONE |  |
| GET | `/make-server-3eae23a6/products/:id` | ecommerce-products.tsx:240 | PUBLIC-LISTED | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/products` | ecommerce-products.tsx:261 | PUBLIC-LISTED | N/A | MONEY |  |
| PUT | `/make-server-3eae23a6/products/:id` | ecommerce-products.tsx:339 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY/ADMIN | requireCatalogueAdmin |
| DELETE | `/make-server-3eae23a6/products/:id` | ecommerce-products.tsx:419 | ROLE-CHECKED | ID-FROM-REQUEST | ADMIN | requireCatalogueAdmin |
| POST | `/make-server-3eae23a6/products/source-visibility` | ecommerce-products.tsx:466 | ROLE-CHECKED | N/A | ADMIN | requireCatalogueAdmin |
| POST | `/make-server-3eae23a6/products/bulk-inventory` | ecommerce-products.tsx:506 | ROLE-CHECKED | N/A | ADMIN | requireCatalogueAdmin |

### email-center.tsx

Mounted at `/make-server-3eae23a6/email-center` (index.tsx:1981)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/email-center/templates` | email-center.tsx:107 | AUTHED-ONLY | N/A | PII |  |
| PUT | `/make-server-3eae23a6/email-center/templates/:key` | email-center.tsx:118 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN | none |
| DELETE | `/make-server-3eae23a6/email-center/templates/:key` | email-center.tsx:141 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN | none |
| GET | `/make-server-3eae23a6/email-center/log` | email-center.tsx:153 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/email-center/send` | email-center.tsx:255 | AUTHED-ONLY | N/A | PII/DOCS |  |

### entitlements.tsx

Mounted at `/` (index.tsx:1851)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/entitlements/:planId` | entitlements.tsx:52 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY |  |
| GET | `/make-server-3eae23a6/entitlements/:planId/reconcile` | entitlements.tsx:74 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY |  |
| POST | `/make-server-3eae23a6/entitlements/events` | entitlements.tsx:97 | ROLE-CHECKED | N/A | NONE |  |
| GET | `/make-server-3eae23a6/entitlements-summary` | entitlements.tsx:104 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY/DOCS |  |

### exchangeAccountRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1800)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/exchange/me/saved` | exchangeAccountRoutes.tsx:107 | AUTHED-ONLY | N/A | PII/MONEY |  |
| POST | `/make-server-3eae23a6/exchange/me/saved` | exchangeAccountRoutes.tsx:150 | AUTHED-ONLY | N/A | PII |  |
| DELETE | `/make-server-3eae23a6/exchange/me/saved/:orgId` | exchangeAccountRoutes.tsx:183 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII | resident(c) → .eq('user_id', me.id) |
| GET | `/make-server-3eae23a6/exchange/me/enquiries` | exchangeAccountRoutes.tsx:206 | AUTHED-ONLY | N/A | PII/MONEY |  |

### exchangeAssistantRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1824)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/exchange/assistant` | exchangeAssistantRoutes.tsx:194 | PUBLIC-LISTED | N/A | PII/MONEY/ADMIN | guard |

### exchangeClaimRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1790)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/exchange/claim/start` | exchangeClaimRoutes.tsx:241 | AUTHED-ONLY | N/A | PII |  |
| GET | `/make-server-3eae23a6/exchange/claim/:id` | exchangeClaimRoutes.tsx:313 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/exchange/claim/:id/factor` | exchangeClaimRoutes.tsx:339 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/exchange/claim/:id/answer` | exchangeClaimRoutes.tsx:488 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/exchange/review/claims` | exchangeClaimRoutes.tsx:758 | ROLE-CHECKED | N/A | PII/MONEY | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/review/claims/:id/decide` | exchangeClaimRoutes.tsx:858 | ROLE-CHECKED | ID-FROM-REQUEST | PII | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/review/listing/:id/suspend` | exchangeClaimRoutes.tsx:969 | ROLE-CHECKED | ID-FROM-REQUEST | PII | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/ingest/:territory` | exchangeClaimRoutes.tsx:1077 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | isStaffRequest |

### exchangeDealRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1810)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/exchange/me/following` | exchangeDealRoutes.tsx:121 | AUTHED-ONLY | N/A | PII/MONEY |  |
| POST | `/make-server-3eae23a6/exchange/me/following` | exchangeDealRoutes.tsx:157 | AUTHED-ONLY | N/A | PII |  |
| DELETE | `/make-server-3eae23a6/exchange/me/following/:orgId` | exchangeDealRoutes.tsx:184 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII | resident(c) → .eq('user_id', me.id) |
| GET | `/make-server-3eae23a6/exchange/me/deals` | exchangeDealRoutes.tsx:207 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/exchange/business/deals` | exchangeDealRoutes.tsx:262 | AUTHED-ONLY | N/A | PII/MONEY |  |
| POST | `/make-server-3eae23a6/exchange/business/deals` | exchangeDealRoutes.tsx:343 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/exchange/business/deals/:id/move` | exchangeDealRoutes.tsx:391 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII | resident(c) → listingIClaim(sb, me.id, deal.org_id) |
| GET | `/make-server-3eae23a6/exchange/deal-review` | exchangeDealRoutes.tsx:432 | ROLE-CHECKED | N/A | MONEY | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/deal-review/:id/decide` | exchangeDealRoutes.tsx:475 | ROLE-CHECKED | ID-FROM-REQUEST | PII | isStaffRequest |

### exchangeDirectory.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1789)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/exchange/territories` | exchangeDirectory.tsx:260 | PUBLIC-LISTED | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/exchange/nearby` | exchangeDirectory.tsx:326 | PUBLIC-LISTED | N/A | DOCS |  |
| GET | `/make-server-3eae23a6/exchange/map-style` | exchangeDirectory.tsx:483 | PUBLIC-LISTED | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/exchange/taxonomy` | exchangeDirectory.tsx:503 | PUBLIC-LISTED | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/exchange/listing/:slug` | exchangeDirectory.tsx:532 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY |  |
| POST | `/make-server-3eae23a6/exchange/listing/:slug/contact` | exchangeDirectory.tsx:653 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| GET | `/make-server-3eae23a6/exchange/category/:slug` | exchangeDirectory.tsx:694 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/exchange/missing` | exchangeDirectory.tsx:831 | PUBLIC-LISTED | N/A | NONE |  |

### exchangeLogoRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1834)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/exchange/business/logo` | exchangeLogoRoutes.tsx:136 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII | resident(c) → listingIClaim(sb, me.id, orgId) |
| POST | `/make-server-3eae23a6/exchange/business/logo` | exchangeLogoRoutes.tsx:155 | AUTHED-ONLY | N/A | PII/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/exchange/business/logo` | exchangeLogoRoutes.tsx:244 | AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/exchange/logo-review` | exchangeLogoRoutes.tsx:290 | ROLE-CHECKED | N/A | PII/MONEY/DOCS | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/logo-review/:orgId/decide` | exchangeLogoRoutes.tsx:328 | ROLE-CHECKED | ID-FROM-REQUEST | PII | isStaffRequest |

### exchangeTerritoryRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1817)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/exchange/admin/demand` | exchangeTerritoryRoutes.tsx:86 | ROLE-CHECKED | N/A | ADMIN | isStaffRequest |
| GET | `/make-server-3eae23a6/exchange/admin/territories` | exchangeTerritoryRoutes.tsx:146 | ROLE-CHECKED | N/A | MONEY/ADMIN | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/admin/territories/lookup` | exchangeTerritoryRoutes.tsx:203 | ROLE-CHECKED | N/A | PII/ADMIN | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/admin/territories` | exchangeTerritoryRoutes.tsx:262 | ROLE-CHECKED | N/A | ADMIN | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/admin/territories/:slug/status` | exchangeTerritoryRoutes.tsx:318 | ROLE-CHECKED | ID-FROM-REQUEST | ADMIN | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/admin/territories/discover` | exchangeTerritoryRoutes.tsx:403 | ROLE-CHECKED | N/A | PII/ADMIN | isStaffRequest |
| POST | `/make-server-3eae23a6/exchange/admin/territories/bulk` | exchangeTerritoryRoutes.tsx:521 | ROLE-CHECKED | N/A | ADMIN | isStaffRequest |

### flash-sales.tsx

Mounted at `/` (index.tsx:1983)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/flash-sales` | flash-sales.tsx:17 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/flash-sales` | flash-sales.tsx:28 | AUTHED-ONLY | N/A | NONE |  |

### fulfillment.tsx

Mounted at `/` (index.tsx:1987)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/fulfillment/orders` | fulfillment.tsx:110 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | requireAdmin |
| PUT | `/make-server-3eae23a6/fulfillment/orders/:id` | fulfillment.tsx:138 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY/ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/fulfillment/track` | fulfillment.tsx:204 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY | `email` query must equal the order's `customerEmail` — knowledge check, not a session check |
| POST | `/make-server-3eae23a6/fulfillment/sync-stock` | fulfillment.tsx:245 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |

### growth-marketing.tsx

Mounted at `/` (index.tsx:1994)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/sms/contacts` | growth-marketing.tsx:75 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/sms/contacts` | growth-marketing.tsx:86 | AUTHED-ONLY | N/A | PII |  |
| DELETE | `/make-server-3eae23a6/sms/contacts/:id` | growth-marketing.tsx:107 | † AUTHED-ONLY | ID-FROM-REQUEST | PII | none |
| GET | `/make-server-3eae23a6/sms/campaigns` | growth-marketing.tsx:116 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/sms/send` | growth-marketing.tsx:127 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/abandoned-carts` | growth-marketing.tsx:184 | ROLE-CHECKED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/abandoned-carts` | growth-marketing.tsx:195 | ROLE-CHECKED | N/A | PII |  |
| POST | `/make-server-3eae23a6/abandoned-carts/:id/recover` | growth-marketing.tsx:218 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/abandoned-carts/:id/mark-recovered` | growth-marketing.tsx:285 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/promotions` | growth-marketing.tsx:302 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/promotions` | growth-marketing.tsx:312 | ROLE-CHECKED | N/A | MONEY |  |
| PUT | `/make-server-3eae23a6/promotions/:id` | growth-marketing.tsx:339 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/promotions/:id` | growth-marketing.tsx:358 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/promotions/validate/:code` | growth-marketing.tsx:368 | PUBLIC-LISTED | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/exit-intent/capture` | growth-marketing.tsx:387 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/exit-intent/leads` | growth-marketing.tsx:437 | AUTHED-ONLY | N/A | PII |  |
| GET | `/make-server-3eae23a6/ranking/content` | growth-marketing.tsx:452 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/ranking/generate` | growth-marketing.tsx:463 | AUTHED-ONLY | N/A | DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/ranking/publish/:id` | growth-marketing.tsx:529 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/ranking/auto` | growth-marketing.tsx:542 | AUTHED-ONLY | N/A | ADMIN |  |

### growth-tools.tsx

Mounted at `/` (index.tsx:2179)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/automation/workflows` | growth-tools.tsx:50 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/automation/workflows` | growth-tools.tsx:60 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/automation/workflows/:id/run` | growth-tools.tsx:77 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/keywords` | growth-tools.tsx:100 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/keywords` | growth-tools.tsx:110 | ROLE-CHECKED | N/A | NONE | requireStaffOn |

### growth-tools2.tsx

Mounted at `/` (index.tsx:2180)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/surveys` | growth-tools2.tsx:46 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/surveys` | growth-tools2.tsx:56 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/influencers` | growth-tools2.tsx:71 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/influencers` | growth-tools2.tsx:81 | ROLE-CHECKED | N/A | NONE | requireStaffOn |

### growth-tools3.tsx

Mounted at `/` (index.tsx:2181)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/retargeting-pixels` | growth-tools3.tsx:24 | ROLE-CHECKED | N/A | ADMIN | requireStaffOn |
| POST | `/make-server-3eae23a6/retargeting-pixels` | growth-tools3.tsx:34 | ROLE-CHECKED | N/A | ADMIN | requireStaffOn |
| GET | `/make-server-3eae23a6/auto-products` | growth-tools3.tsx:46 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/auto-products` | growth-tools3.tsx:56 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| GET | `/make-server-3eae23a6/social/custom-accounts` | growth-tools3.tsx:68 | ROLE-CHECKED | N/A | NONE | requireStaffOn |
| POST | `/make-server-3eae23a6/social/custom-accounts` | growth-tools3.tsx:78 | ROLE-CHECKED | N/A | NONE | requireStaffOn |

### hot-products.tsx

Mounted at `/` (index.tsx:1988)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/hot-products/discover` | hot-products.tsx:231 | ROLE-CHECKED | N/A | MONEY/ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/hot-products/import` | hot-products.tsx:269 | ROLE-CHECKED | N/A | PII/ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/hot-products` | hot-products.tsx:325 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/hot-products/export` | hot-products.tsx:340 | ROLE-CHECKED | N/A | DOCS/ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/hot-products/daily-top10` | hot-products.tsx:373 | ROLE-CHECKED | N/A | MONEY/ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/hot-products/daily-top10` | hot-products.tsx:402 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/hot-products/source-analysis` | hot-products.tsx:417 | ROLE-CHECKED | N/A | MONEY/ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/hot-products/search-everywhere` | hot-products.tsx:453 | ROLE-CHECKED | N/A | MONEY/ADMIN | requireAdmin |

### hour-transfers.tsx

Mounted at `/make-server-3eae23a6/hour-transfers` (index.tsx:1853)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/hour-transfers/send-verification` | hour-transfers.tsx:50 | AUTHED-ONLY | N/A | PII/MONEY |  |
| POST | `/make-server-3eae23a6/hour-transfers/verify-and-request` | hour-transfers.tsx:133 | AUTHED-ONLY | N/A | PII/MONEY |  |
| POST | `/make-server-3eae23a6/hour-transfers/request` | hour-transfers.tsx:209 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/hour-transfers/pending` | hour-transfers.tsx:275 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/hour-transfers/all` | hour-transfers.tsx:296 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/hour-transfers/subscription/:subscriptionId` | hour-transfers.tsx:311 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:subscriptionId` from the path |
| POST | `/make-server-3eae23a6/hour-transfers/review/:transferId` | hour-transfers.tsx:328 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY | none — `:transferId` + `reviewedBy` taken from the body |
| GET | `/make-server-3eae23a6/hour-transfers/:transferId` | hour-transfers.tsx:439 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### house-capture.tsx

Mounted at `/make-server-3eae23a6/house-capture` (index.tsx:1899)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/house-capture/analyze` | house-capture.tsx:562 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | assertAiAllowed( |
| POST | `/make-server-3eae23a6/house-capture/render` | house-capture.tsx:968 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/house-capture/photoreal` | house-capture.tsx:1089 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/house-capture/imagine` | house-capture.tsx:1224 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/house-capture/floor-looks` | house-capture.tsx:1286 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/house-capture/looks` | house-capture.tsx:1342 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/house-capture/photoreal-3d` | house-capture.tsx:1455 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/house-capture/read-sketch` | house-capture.tsx:1644 | AUTHED-ONLY | N/A | PII/DOCS/ADMIN |  |

### image-upload.tsx

Mounted at `/` (index.tsx:2182)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/images/upload` | image-upload.tsx:189 | ROLE-CHECKED | N/A | DOCS | requireStaffOn |
| POST | `/make-server-3eae23a6/images/upload-file` | image-upload.tsx:217 | ROLE-CHECKED | N/A | DOCS | requireStaffOn |

### index.tsx

Routes registered directly on `app`, behind the global wall at index.tsx:1536.

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/health` | index.tsx:2232 | PUBLIC-LISTED | N/A | PII/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/csp-report` | index.tsx:2311 | PUBLIC-LISTED | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/csp-report/summary` | index.tsx:2422 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/email-diagnostic` | index.tsx:2440 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/public/branding` | index.tsx:2511 | PUBLIC-LISTED | N/A | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/public/branding/refresh` | index.tsx:2625 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/logo/upload` | index.tsx:2650 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/business-profiles` | index.tsx:2757 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/business-profiles` | index.tsx:2772 | AUTHED-ONLY | N/A | NONE |  |
| PUT | `/make-server-3eae23a6/company/contact` | index.tsx:2843 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | isStaffRequest |
| GET | `/make-server-3eae23a6/companies` | index.tsx:2897 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY |  |
| POST | `/make-server-3eae23a6/companies` | index.tsx:2932 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| PUT | `/make-server-3eae23a6/companies/:id` | index.tsx:2973 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| DELETE | `/make-server-3eae23a6/companies/:id` | index.tsx:3014 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/me/permissions` | index.tsx:3075 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/portal-access` | index.tsx:3132 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/DOCS/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/signup/universal` | index.tsx:3508 | PUBLIC-LISTED | N/A | PII |  |
| POST | `/make-server-3eae23a6/applications` | index.tsx:3521 | PUBLIC-LISTED | N/A | PII |  |
| POST | `/make-server-3eae23a6/applications/submit` | index.tsx:3538 | PUBLIC-LISTED | N/A | PII/DOCS |  |
| GET | `/make-server-3eae23a6/applications` | index.tsx:3551 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/applications/:id` | index.tsx:3560 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| PATCH | `/make-server-3eae23a6/applications/:id` | index.tsx:3570 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/probation/:applicationId` | index.tsx:3800 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| PATCH | `/make-server-3eae23a6/probation/:applicationId` | index.tsx:3834 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/vendors/backfill-from-applications` | index.tsx:3908 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/DOCS/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/application-plan-proposals` | index.tsx:4010 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| PATCH | `/make-server-3eae23a6/application-plan-proposals/:applicationId` | index.tsx:4018 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/crm/contacts` | index.tsx:4043 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/crm/contacts` | index.tsx:4052 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/doba/test-connection` | index.tsx:4070 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/doba/sync-products` | index.tsx:4120 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/doba/status` | index.tsx:4180 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/doba/products` | index.tsx:4198 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/doba/disconnect` | index.tsx:4218 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/kv/set` | index.tsx:4309 | ROLE-CHECKED | N/A | ADMIN | requireKvAccess |
| GET | `/make-server-3eae23a6/kv/get` | index.tsx:4324 | ROLE-CHECKED | N/A | ADMIN | requireKvAccess |
| GET | `/make-server-3eae23a6/kv/get-by-prefix` | index.tsx:4341 | ROLE-CHECKED | N/A | MONEY | requireKvStaff |
| DELETE | `/make-server-3eae23a6/kv/delete` | index.tsx:4360 | ROLE-CHECKED | N/A | ADMIN | requireKvStaff |
| POST | `/make-server-3eae23a6/ai-guide-chat` | index.tsx:4380 | AUTHED-ONLY | N/A | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/quote-draft/:workRequestId` | index.tsx:4692 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/auto-generate-quote` | index.tsx:4748 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | intakeIsAdmin |
| GET | `/` | index.tsx:4882 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/data/backup` | index.tsx:4907 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/data/restore` | index.tsx:4918 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/chat/config` | index.tsx:4935 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/chat/config` | index.tsx:4936 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/chat/leads` | index.tsx:4937 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/chat/leads` | index.tsx:4938 | AUTHED-ONLY | ID-FROM-REQUEST | PII |  |
| DELETE | `/make-server-3eae23a6/chat/leads` | index.tsx:4939 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/payment-gateways` | index.tsx:4942 | ROLE-CHECKED | SCOPED-TO-SESSION | MONEY/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/payment-gateways` | index.tsx:4943 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/notifications/admin-alert` | index.tsx:4948 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/notifications/admin-alerts` | index.tsx:4968 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| PUT | `/make-server-3eae23a6/notifications/admin-alerts/:id` | index.tsx:4983 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/notifications/work-request` | index.tsx:4999 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/me/notification-prefs` | index.tsx:5096 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| PUT | `/make-server-3eae23a6/me/notification-prefs` | index.tsx:5106 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/me/notifications` | index.tsx:5126 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/me/notifications/read` | index.tsx:5136 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/me/notifications/clear` | index.tsx:5149 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/auth/forgot-password` | index.tsx:5161 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/auth/reset-password` | index.tsx:5229 | PUBLIC-LISTED | N/A | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/notifications/test-email` | index.tsx:5274 | AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/notifications/test-sms` | index.tsx:5297 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/bid-room/award` | index.tsx:5361 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/compliance/:orgId` | index.tsx:5516 | AUTHED-ONLY | ID-FROM-REQUEST | DOCS |  |
| PUT | `/make-server-3eae23a6/compliance/:orgId` | index.tsx:5535 | AUTHED-ONLY | ID-FROM-REQUEST | DOCS |  |
| POST | `/make-server-3eae23a6/compliance/run-reminders` | index.tsx:5602 | PUBLIC-LISTED / SECRET-GUARDED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/bid-room/notify-invites` | index.tsx:5737 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/labor-rates/get` | index.tsx:5897 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/quote/price-lines` | index.tsx:5956 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/deck-price-book` | index.tsx:6066 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| PUT | `/make-server-3eae23a6/deck-price-book` | index.tsx:6089 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/labor-rates/save` | index.tsx:6122 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/pricing-config/get` | index.tsx:6162 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/pricing-config/save` | index.tsx:6194 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/labor-tasks/get` | index.tsx:6264 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/labor-tasks/save` | index.tsx:6274 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/quotes/list` | index.tsx:6356 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/quotes/generate-link` | index.tsx:6385 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/change-orders` | index.tsx:6458 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/change-orders` | index.tsx:6477 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/purchase-orders` | index.tsx:6569 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| POST | `/make-server-3eae23a6/purchase-orders` | index.tsx:6594 | ROLE-CHECKED | N/A | PII/MONEY | requirePurchaseOrderCompany |
| POST | `/make-server-3eae23a6/purchase-orders/from-materials` | index.tsx:6683 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | requirePurchaseOrderCompany |
| PATCH | `/make-server-3eae23a6/purchase-orders/:id/status` | index.tsx:6783 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requirePurchaseOrderCompany |
| DELETE | `/make-server-3eae23a6/purchase-orders/:id` | index.tsx:6816 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requirePurchaseOrderCompany |
| PUT | `/make-server-3eae23a6/purchase-orders/:id` | index.tsx:6828 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requirePurchaseOrderCompany |
| GET | `/make-server-3eae23a6/suppliers` | index.tsx:6849 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/suppliers` | index.tsx:6879 | ROLE-CHECKED | N/A | MONEY | requireSupplierStaff |
| PUT | `/make-server-3eae23a6/suppliers/:id` | index.tsx:6905 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireSupplierStaff |
| DELETE | `/make-server-3eae23a6/suppliers/:id` | index.tsx:6923 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireSupplierStaff |
| POST | `/make-server-3eae23a6/supplier-rfqs/:id/quote` | index.tsx:6940 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireSupplierStaff |
| POST | `/make-server-3eae23a6/supplier-rfqs/:id/award` | index.tsx:6976 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireSupplierStaff |
| GET | `/make-server-3eae23a6/studio/recent-projects` | index.tsx:7012 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/studio/save-recent` | index.tsx:7019 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/studio/project-info/:quoteId` | index.tsx:7032 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:quoteId` reads `quote:{id}` whole |
| POST | `/make-server-3eae23a6/plan-builder/generate` | index.tsx:7043 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-builder/price-custom` | index.tsx:7082 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/media/upload` | index.tsx:7163 | AUTHED-ONLY | N/A | DOCS |  |
| POST | `/make-server-3eae23a6/permit-ai/chat` | index.tsx:7207 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/vendor-pricing/compare` | index.tsx:7256 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/market-alerts/preferences` | index.tsx:7305 | ROLE-CHECKED | ID-FROM-REQUEST | PII |  |
| POST | `/make-server-3eae23a6/market-alerts/send` | index.tsx:7319 | ROLE-CHECKED | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/cart/:sessionId` | index.tsx:7384 | PUBLIC-LISTED | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/cart/add` | index.tsx:7390 | PUBLIC-LISTED | N/A | ADMIN |  |
| DELETE | `/make-server-3eae23a6/cart/remove` | index.tsx:7407 | PUBLIC-LISTED | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/marketplace/checkout` | index.tsx:7424 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/marketplace/checkout/complete` | index.tsx:7518 | PUBLIC-LISTED | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/stripe/session/:sessionId` | index.tsx:7573 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/ADMIN | none — `:sessionId` passed to Stripe |
| POST | `/make-server-3eae23a6/email/order-confirmation` | index.tsx:7652 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/portal-deals` | index.tsx:7720 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/portal-deals/review` | index.tsx:7760 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/portal-deals/:id/decision` | index.tsx:7781 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/portal-deals/all` | index.tsx:7811 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/portal-deals` | index.tsx:7830 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| DELETE | `/make-server-3eae23a6/portal-deals/:id` | index.tsx:7932 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/weather-alerts/:id/acknowledge` | index.tsx:8043 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/bid-router/simple-test` | index.tsx:8138 | ROLE-CHECKED | N/A | NONE | requireStaffForBidRouter |
| POST | `/make-server-3eae23a6/bid-router/ai-analyze` | index.tsx:8143 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | requireStaffForBidRouter |
| POST | `/make-server-3eae23a6/bid-router/ai-route` | index.tsx:8188 | ROLE-CHECKED | N/A | PII | requireStaffForBidRouter |
| POST | `/make-server-3eae23a6/video/ai-edit` | index.tsx:8216 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/storage/repair-job-media` | index.tsx:8371 | ROLE-CHECKED | N/A | NONE | isStaffRequest |
| POST | `/make-server-3eae23a6/work-requests` | index.tsx:8386 | AUTHED-ONLY | MIXED | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/work-requests` | index.tsx:8437 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/work-requests/:id` | index.tsx:8448 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| PUT | `/make-server-3eae23a6/work-requests/:id` | index.tsx:8459 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/pipeline/clear-all` | index.tsx:8478 | ROLE-CHECKED | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/work-requests/:id/project-schedule` | index.tsx:8542 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/work-requests/:id/notes` | index.tsx:8565 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/work-requests/:id/notes` | index.tsx:8576 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| PUT | `/make-server-3eae23a6/work-requests/:id/notes/:noteId` | index.tsx:8591 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| DELETE | `/make-server-3eae23a6/work-requests/:id` | index.tsx:8629 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| DELETE | `/make-server-3eae23a6/work-requests/:id/notes/:noteId` | index.tsx:8694 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/work-requests/:id/schedule` | index.tsx:8706 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/public/reels` | index.tsx:8730 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/public/reels` | index.tsx:8740 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |
| DELETE | `/make-server-3eae23a6/public/reels/:id` | index.tsx:8790 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/social/accounts` | index.tsx:8838 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/social/connect/:platform` | index.tsx:8867 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/social/callback` | index.tsx:8931 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/DOCS/ADMIN | none — `userId` decoded from the `state` query param |
| DELETE | `/make-server-3eae23a6/social/disconnect/:platform` | index.tsx:9048 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/social/fetch/:platform` | index.tsx:9065 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |
| POST | `/make-server-3eae23a6/social/import-to-library` | index.tsx:9129 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |
| POST | `/make-server-3eae23a6/social/ai-repurpose` | index.tsx:9161 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/social/publish` | index.tsx:9196 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |
| POST | `/make-server-3eae23a6/social/submit-reel` | index.tsx:9310 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/social/pending-reels` | index.tsx:9345 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/social/approve-reel/:id` | index.tsx:9360 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/social/reject-reel/:id` | index.tsx:9411 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/ai-floorplan/generate-for-work-request` | index.tsx:9449 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/messaging/conversations/:userId` | index.tsx:9622 | ROLE-CHECKED | N/A | PII/ADMIN | isStaff |
| GET | `/make-server-3eae23a6/messaging/conversations/:convId/messages` | index.tsx:9649 | AUTHED-ONLY | ID-FROM-REQUEST | PII |  |
| POST | `/make-server-3eae23a6/messaging/conversations` | index.tsx:9675 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/messaging/conversations/direct` | index.tsx:9725 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/work-requests/:id/viewed` | index.tsx:9784 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/ADMIN | none — `adminName`/`customerEmail`/`customerName` from the body |
| POST | `/make-server-3eae23a6/messaging/messages` | index.tsx:9851 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/messaging/conversations/:convId/read` | index.tsx:9952 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/messaging/unread` | index.tsx:9978 | AUTHED-ONLY | N/A | PII |  |
| GET | `/make-server-3eae23a6/messaging/waiting` | index.tsx:9995 | ROLE-CHECKED | N/A | PII | isStaff |
| POST | `/make-server-3eae23a6/plan-checkout` | index.tsx:10082 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-add-on` | index.tsx:10360 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-quote-request` | index.tsx:10621 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/my-plan` | index.tsx:10680 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-addons/seed-content` | index.tsx:11116 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-tiers/:audience/:id/stripe-price` | index.tsx:11192 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/plan-addons/:audience/:id/stripe-price` | index.tsx:11193 | AUTHED-ONLY | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/stripe-prices` | index.tsx:11224 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-tiers/:audience/:id/attach-price` | index.tsx:11363 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/plan-addons/:audience/:id/attach-price` | index.tsx:11364 | AUTHED-ONLY | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/payments/stripe-separation` | index.tsx:11462 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/gift-cards/checkout` | index.tsx:11562 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/gift-cards/purchases/:id/confirm` | index.tsx:11614 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | `session_id` must equal the purchase's stored Stripe session id |
| GET | `/make-server-3eae23a6/gift-cards/owner/:email` | index.tsx:11632 | AUTHED-ONLY | MIXED | PII |  |
| GET | `/make-server-3eae23a6/gift-cards` | index.tsx:11651 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/gift-cards/:code` | index.tsx:11653 | † AUTHED-ONLY | ID-FROM-REQUEST | PII | none — card code is the only secret; emails stripped from the reply |
| POST | `/make-server-3eae23a6/gift-cards/:code/redeem` | index.tsx:11688 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/referrals/my-code` | index.tsx:11779 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/referrals/mine` | index.tsx:11789 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/referrals` | index.tsx:11800 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/referrals` | index.tsx:11810 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/referrals/records` | index.tsx:11825 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/referrals/records/:id` | index.tsx:11835 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/loyalty/:email` | index.tsx:11846 | AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/loyalty/:email/join` | index.tsx:11858 | AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/loyalty/:email/redeem` | index.tsx:11881 | AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/loyalty/events` | index.tsx:11912 | AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/affiliates/:email` | index.tsx:11935 | ROLE-CHECKED | ID-FROM-REQUEST | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/affiliates/join` | index.tsx:11944 | ROLE-CHECKED | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/affiliates/:email/payout-requests` | index.tsx:11959 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/affiliates/:email/payout-requests` | index.tsx:11963 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/affiliate-payouts` | index.tsx:11975 | ROLE-CHECKED | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/affiliate-payouts/:email/:id` | index.tsx:11979 | ROLE-CHECKED | MIXED | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/affiliate-attributions` | index.tsx:11992 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/referrals/attributions` | index.tsx:12021 | PUBLIC-LISTED | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/auth/me` | index.tsx:12089 | PUBLIC-LISTED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/organizations/backfill` | index.tsx:12162 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/owner-provisioning/invites` | index.tsx:12222 | AUTHED-ONLY | MIXED | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/owner-provisioning/invites` | index.tsx:12403 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/owner-provisioning/invites/:id/resend` | index.tsx:12432 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/owner-provisioning/invite-preview` | index.tsx:12467 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/owner-provisioning/invite-templates` | index.tsx:12492 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/owner-provisioning/invite-preview` | index.tsx:12516 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/owner-provisioning/invite-templates/:portalType` | index.tsx:12540 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/owner-provisioning/invite-test` | index.tsx:12566 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/owner-provisioning/invite-test-sms` | index.tsx:12602 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/me/entitlements` | index.tsx:12632 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/me/trial/start` | index.tsx:12675 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/intake/set-password` | index.tsx:12731 | PUBLIC-LISTED | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/intake/my-onboarding` | index.tsx:12811 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/intake/my-onboarding/profile` | index.tsx:12831 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/intake/my-access` | index.tsx:12877 | ROLE-CHECKED | SCOPED-TO-SESSION | PII | guard |
| GET | `/make-server-3eae23a6/intake/onboarding/:id` | index.tsx:12914 | AUTHED-ONLY | ID-FROM-REQUEST | ADMIN |  |
| POST | `/make-server-3eae23a6/intake/my-onboarding/documents` | index.tsx:12926 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| GET | `/make-server-3eae23a6/intake/onboarding/:id/documents/:documentId/download` | index.tsx:12960 | † AUTHED-ONLY | SCOPED-TO-SESSION | DOCS | intakeOwnedBy(c, id) |
| DELETE | `/make-server-3eae23a6/intake/onboarding/:id/documents/:documentId` | index.tsx:12972 | ROLE-CHECKED | SCOPED-TO-SESSION | DOCS/ADMIN | intakeIsAdmin |
| PATCH | `/make-server-3eae23a6/intake/onboarding/:id/documents/:documentId` | index.tsx:12989 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/DOCS/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/product-favorites` | index.tsx:13045 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY |  |
| POST | `/make-server-3eae23a6/product-favorites` | index.tsx:13057 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY |  |
| GET | `/make-server-3eae23a6/contracts` | index.tsx:13077 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/contracts` | index.tsx:13081 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/contracts/:id/sign` | index.tsx:13085 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/customers` | index.tsx:13106 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/customers/stats` | index.tsx:13107 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/customers` | index.tsx:13108 | AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/customers/:id` | index.tsx:13109 | AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN |  |
| DELETE | `/make-server-3eae23a6/customers/:id` | index.tsx:13110 | AUTHED-ONLY | ID-FROM-REQUEST | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/reporting/referral-sources` | index.tsx:13111 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/financial-reconciliation` | index.tsx:13127 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/financial-reconciliation/transactions` | index.tsx:13138 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/financial-reconciliation/transactions/:id/reconcile` | index.tsx:13147 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/work-orders/quoting-accuracy` | index.tsx:13173 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/work-orders/completion-reports` | index.tsx:13296 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/command-center/summary` | index.tsx:13330 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/invoices` | index.tsx:13343 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/payment-wallets/stellar` | index.tsx:13364 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/payment-wallets/stellar` | index.tsx:13368 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/invoices/:id/stellar-instructions` | index.tsx:13379 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/invoices/:id/stellar-payment-submissions` | index.tsx:13383 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/invoices` | index.tsx:13388 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/quotes/:id/convert-to-contract` | index.tsx:13450 | AUTHED-ONLY | MIXED | PII/MONEY/DOCS/ADMIN |  |
| PUT | `/make-server-3eae23a6/invoices/:id` | index.tsx:13484 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| DELETE | `/make-server-3eae23a6/invoices/:id` | index.tsx:13499 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/invoices/:id/apply` | index.tsx:13577 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/invoices/:id/record-payment` | index.tsx:13766 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/payments` | index.tsx:13861 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/condo-manager/financials` | index.tsx:13874 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/property-manager/payments` | index.tsx:13892 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/financials` | index.tsx:13914 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/payments/create-checkout` | index.tsx:13930 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/payments/:id/refund` | index.tsx:14101 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/payments/:id/refunds` | index.tsx:14239 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/payments/held` | index.tsx:14275 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/payments/held/:sessionId/resolve` | index.tsx:14308 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/insurance` | index.tsx:14356 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/insurance` | index.tsx:14388 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/insurance/:id` | index.tsx:14427 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/tips` | index.tsx:14442 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/tips/:id/paid-out` | index.tsx:14468 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/payments/confirm` | index.tsx:14497 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/payments/complete` | index.tsx:14528 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/store/webhook` | index.tsx:14842 | PUBLIC-LISTED | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/store/checkout` | index.tsx:14866 | PUBLIC-LISTED | N/A | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/store/checkouts/:id/confirm` | index.tsx:14947 | PUBLIC-LISTED | ID-FROM-REQUEST | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/store/checkouts/:id/complete` | index.tsx:14958 | PUBLIC-LISTED | ID-FROM-REQUEST | MONEY |  |
| GET | `/make-server-3eae23a6/store/orders` | index.tsx:14972 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/store/orders/:id` | index.tsx:14977 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/store/orders/recover` | index.tsx:14990 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/store/returns` | index.tsx:15029 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/store/returns` | index.tsx:15075 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/store/returns/:id` | index.tsx:15085 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/ai/vision` | index.tsx:15105 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/schedule/appointments` | index.tsx:15164 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/schedule/appointments` | index.tsx:15186 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/schedule/appointments/:id` | index.tsx:15193 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-plans` | index.tsx:15213 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-plans` | index.tsx:15217 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| DELETE | `/make-server-3eae23a6/maintenance-plans/:id` | index.tsx:15226 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-plans/:id/usage` | index.tsx:15230 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-plans/:id/log-hours` | index.tsx:15234 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-plans/:id/subscribe` | index.tsx:15351 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-plans/:id/billing` | index.tsx:15436 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-plans/:id/invoice` | index.tsx:15460 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-plans/:id/invoices` | index.tsx:15527 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-plans/webhook` | index.tsx:15555 | AUTHED-ONLY | N/A | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/config` | index.tsx:15667 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/initialize` | index.tsx:15668 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/toggle` | index.tsx:15669 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/inventory` | index.tsx:15670 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/orders` | index.tsx:15671 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/errors` | index.tsx:15672 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/sync-inventory` | index.tsx:15673 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/sync-tracking` | index.tsx:15674 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/store/fulfillment/settings` | index.tsx:16002 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/store/fulfillment/settings` | index.tsx:16014 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/store/fulfillment/run` | index.tsx:16043 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/store/sellable-providers` | index.tsx:16064 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| PUT | `/make-server-3eae23a6/store/sellable-providers` | index.tsx:16074 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/store/fulfillment/tick` | index.tsx:16101 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/orders/:orderId/retry` | index.tsx:16123 | AUTHED-ONLY | ID-FROM-REQUEST | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/inventory/publish` | index.tsx:16164 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/inventory/suggest-pricing` | index.tsx:16229 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/providers` | index.tsx:16325 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/catalog/staged` | index.tsx:16326 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/catalog/staging` | index.tsx:16328 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/dropshipper/catalog/stats` | index.tsx:16329 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/dropshipper/catalog/categories` | index.tsx:16330 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/catalog/import-to-live` | index.tsx:16331 | AUTHED-ONLY | N/A | ADMIN |  |
| DELETE | `/make-server-3eae23a6/dropshipper/catalog/clear` | index.tsx:16332 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/dropshipper/webhook/:kind` | index.tsx:16333 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/reviews` | index.tsx:16338 | PUBLIC-LISTED | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/reviews` | index.tsx:16346 | AUTHED-ONLY | ID-FROM-REQUEST | PII |  |
| PATCH | `/make-server-3eae23a6/reviews/:id` | index.tsx:16354 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/tech-tiers/config` | index.tsx:16376 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/tech-tiers/config` | index.tsx:16377 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/tech-roster` | index.tsx:16378 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/tech-roster` | index.tsx:16379 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| DELETE | `/make-server-3eae23a6/tech-roster/:id` | index.tsx:16380 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subcontractors/register` | index.tsx:16383 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/DOCS |  |
| POST | `/make-server-3eae23a6/follow-ups/schedule` | index.tsx:16396 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/follow-ups` | index.tsx:16400 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/follow-ups/process` | index.tsx:16401 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/me/upgrade-options` | index.tsx:16458 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subscriptions/checkout` | index.tsx:16583 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/subscriptions` | index.tsx:16600 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subscriptions/:id/checkout` | index.tsx:16601 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subscriptions` | index.tsx:16617 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subscriptions/:id/gift-hours` | index.tsx:16618 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/gift-hour-requests` | index.tsx:16628 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/gift-hour-requests` | index.tsx:16636 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| PATCH | `/make-server-3eae23a6/gift-hour-requests/:id` | index.tsx:16647 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/subscriptions/:id/hours` | index.tsx:16663 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subscriptions/:id/log-hours` | index.tsx:16672 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | guard |
| POST | `/make-server-3eae23a6/subscriptions/process-rollovers` | index.tsx:16740 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/subscriptions/:id` | index.tsx:16758 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subscriptions/:id/renew` | index.tsx:16759 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/quotes/:id/bids` | index.tsx:16762 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/quotes/:id/request-bids` | index.tsx:16763 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/quotes/:id/send-to-customer` | index.tsx:16794 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/quotes/:id` | index.tsx:16843 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| DELETE | `/make-server-3eae23a6/quotes/:id` | index.tsx:16910 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/quotes/by-token/:token` | index.tsx:17017 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/quotes/by-token/:token/sign` | index.tsx:17085 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/quotes/:id/revoke-link` | index.tsx:17249 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/purchase-orders/:id/send` | index.tsx:17300 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | requirePurchaseOrderCompany |
| POST | `/make-server-3eae23a6/change-orders/:id/send` | index.tsx:17432 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/change-orders/by-token/:token` | index.tsx:17476 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/change-orders/by-token/:token/decide` | index.tsx:17518 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY |  |
| POST | `/make-server-3eae23a6/access-requests` | index.tsx:17574 | AUTHED-ONLY | ID-FROM-REQUEST | PII |  |
| GET | `/make-server-3eae23a6/access-requests` | index.tsx:17575 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/access-requests/:id` | index.tsx:17576 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/subcontractor/bid-attachments` | index.tsx:17590 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS |  |
| DELETE | `/make-server-3eae23a6/subcontractor/bid-attachments/:id` | index.tsx:17605 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/subcontractor/bid-attachments/:id/download` | index.tsx:17612 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/subcontractor/bids` | index.tsx:17621 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/subcontractor/bids` | index.tsx:17625 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/giveaways` | index.tsx:17652 | PUBLIC-LISTED | N/A | NONE |  |
| POST | `/make-server-3eae23a6/giveaways` | index.tsx:17678 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/giveaways/entries` | index.tsx:17706 | PUBLIC-LISTED | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/giveaways/entries` | index.tsx:17710 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/territory/settings` | index.tsx:17754 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| PATCH | `/make-server-3eae23a6/territory/settings` | index.tsx:17762 | AUTHED-ONLY | MIXED | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/territory/customers` | index.tsx:17808 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| POST | `/make-server-3eae23a6/territory/customers` | index.tsx:17816 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/territory/subcontractors` | index.tsx:17835 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| POST | `/make-server-3eae23a6/territory/subcontractors` | index.tsx:17843 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/territory/customers/:id` | index.tsx:17858 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| PATCH | `/make-server-3eae23a6/territory/customers/:id/status` | index.tsx:17897 | AUTHED-ONLY | N/A | PII |  |
| PATCH | `/make-server-3eae23a6/territory/subcontractors/:id/status` | index.tsx:17901 | AUTHED-ONLY | N/A | DOCS |  |
| GET | `/make-server-3eae23a6/territory/subscriptions` | index.tsx:17909 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/territory/revenue` | index.tsx:17965 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/portal-crm/:portalType` | index.tsx:18051 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/portal-crm/:portalType/contacts` | index.tsx:18060 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| DELETE | `/make-server-3eae23a6/portal-crm/:portalType/contacts/:id` | index.tsx:18072 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/portal-crm/:portalType/contacts/:id/interactions` | index.tsx:18086 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-draft/:email` | index.tsx:18104 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-draft/:email` | index.tsx:18105 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-drafts` | index.tsx:18106 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| PATCH | `/make-server-3eae23a6/maintenance-drafts/:email/custom-items/:id` | index.tsx:18107 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/staff-notifications/recipients` | index.tsx:18121 | ROLE-CHECKED | N/A | PII/ADMIN | requireNotificationOwner |
| POST | `/make-server-3eae23a6/staff-notifications/recipients` | index.tsx:18159 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | requireNotificationOwner |
| DELETE | `/make-server-3eae23a6/staff-notifications/recipients/:id` | index.tsx:18222 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireNotificationOwner |
| POST | `/make-server-3eae23a6/staff-notifications/test` | index.tsx:18239 | ROLE-CHECKED | N/A | PII | requireNotificationOwner |
| GET | `/make-server-3eae23a6/staff-notifications/log` | index.tsx:18270 | ROLE-CHECKED | N/A | NONE | requireNotificationOwner |
| GET | `/make-server-3eae23a6/stock-photos/search` | index.tsx:18285 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/DOCS/ADMIN | none — stock-photo proxy, no customer data |
| POST | `/make-server-3eae23a6/work-request-drafts/save` | index.tsx:18337 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/work-request-drafts/:draftId` | index.tsx:18359 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/work-request-drafts/:draftId` | index.tsx:18370 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/treasury/balances` | index.tsx:18497 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/notifications/push/vapid-key` | index.tsx:18531 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/notifications/push/subscribe` | index.tsx:18541 | AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY |  |
| POST | `/make-server-3eae23a6/notifications/push/unsubscribe` | index.tsx:18563 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/notifications/push/send` | index.tsx:18575 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY/ADMIN | requireInteraction |
| GET | `/make-server-3eae23a6/product-ads/templates` | index.tsx:18671 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/product-ads/available-products` | index.tsx:18675 | AUTHED-ONLY | N/A | NONE |  |
| POST | `/make-server-3eae23a6/product-ads/create-bulk` | index.tsx:18755 | AUTHED-ONLY | N/A | MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/product-ads` | index.tsx:18809 | AUTHED-ONLY | N/A | NONE |  |
| PUT | `/make-server-3eae23a6/product-ads/:id` | index.tsx:18829 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/product-ads/:id/refresh` | index.tsx:18850 | AUTHED-ONLY | ID-FROM-REQUEST | MONEY/DOCS |  |
| DELETE | `/make-server-3eae23a6/product-ads/:id` | index.tsx:18882 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### invoice-linking.tsx

Mounted at `/` (index.tsx:1986)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/invoices/link-by-email` | invoice-linking.tsx:77 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |

### job-financials.tsx

Mounted at `/` (index.tsx:2067)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/job-financials/snapshot` | job-financials.tsx:79 | ROLE-CHECKED | N/A | MONEY/ADMIN | isStaff |
| POST | `/make-server-3eae23a6/job-financials/kv` | job-financials.tsx:96 | ROLE-CHECKED | N/A | MONEY/ADMIN | isStaff |

### jobs.tsx

Mounted at `/` (index.tsx:2007)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/jobs` | jobs.tsx:196 | ROLE-CHECKED | SCOPED-TO-SESSION | PII | isStaff |
| GET | `/make-server-3eae23a6/jobs/orphans` | jobs.tsx:232 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | isStaff |
| GET | `/make-server-3eae23a6/jobs/:id` | jobs.tsx:279 | ROLE-CHECKED | SCOPED-TO-SESSION | DOCS | isStaff |
| POST | `/make-server-3eae23a6/jobs` | jobs.tsx:298 | ROLE-CHECKED | SCOPED-TO-SESSION | PII | isStaff |
| PATCH | `/make-server-3eae23a6/jobs/:id` | jobs.tsx:323 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS | isStaff |
| POST | `/make-server-3eae23a6/jobs/backfill` | jobs.tsx:499 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |

### jurisdictions.tsx

Mounted at `/make-server-3eae23a6/jurisdictions` (index.tsx:1905)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/jurisdictions/:state/:town` | jurisdictions.tsx:89 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireStaff |
| GET | `/make-server-3eae23a6/jurisdictions/` | jurisdictions.tsx:101 | ROLE-CHECKED | N/A | NONE | requireStaff |
| POST | `/make-server-3eae23a6/jurisdictions/` | jurisdictions.tsx:116 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN | requireStaff |

### leads.tsx

Mounted at `/` (index.tsx:2191)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/leads/capture` | leads.tsx:75 | PUBLIC-LISTED | N/A | PII/MONEY/ADMIN | assertAiAllowed( |
| GET | `/make-server-3eae23a6/leads` | leads.tsx:194 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/leads/send-email` | leads.tsx:371 | AUTHED-ONLY | N/A | PII |  |
| POST | `/make-server-3eae23a6/leads/blast` | leads.tsx:381 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| DELETE | `/make-server-3eae23a6/leads/:id` | leads.tsx:422 | † AUTHED-ONLY | ID-FROM-REQUEST | PII | none |

### maintenance-config.tsx

Mounted at `/` (index.tsx:1944)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/maintenance-catalogue` | maintenance-config.tsx:68 | PUBLIC-LISTED | N/A | MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/maintenance-config` | maintenance-config.tsx:88 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/maintenance-config` | maintenance-config.tsx:98 | AUTHED-ONLY | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/subscription-plan-overrides` | maintenance-config.tsx:117 | ROLE-CHECKED | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/subscription-plan-overrides` | maintenance-config.tsx:127 | ROLE-CHECKED | N/A | MONEY |  |
| DELETE | `/make-server-3eae23a6/subscription-plan-overrides/:planId` | maintenance-config.tsx:146 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY |  |

### marketing-assets.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1995)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/marketing-assets/generate` | marketing-assets.tsx:92 | AUTHED-ONLY | N/A | PII/MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/marketing-assets/product/:productId` | marketing-assets.tsx:336 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/marketing-assets/:assetId` | marketing-assets.tsx:356 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/marketing-assets/generate-description` | marketing-assets.tsx:375 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/marketing-assets/generate-seo` | marketing-assets.tsx:484 | AUTHED-ONLY | N/A | ADMIN |  |

### media-library.tsx

Mounted at `/` (index.tsx:1764)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/media/upload` | media-library.tsx:179 | AUTHED-ONLY | N/A | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/media` | media-library.tsx:317 | AUTHED-ONLY | N/A | DOCS |  |
| GET | `/make-server-3eae23a6/media/:mediaId` | media-library.tsx:359 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/media/:mediaId` | media-library.tsx:394 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| PUT | `/make-server-3eae23a6/media/:mediaId` | media-library.tsx:448 | † AUTHED-ONLY | ID-FROM-REQUEST | PII | requireSignedIn (media-library.tsx:46-47) — authentication only, no owner check |
| GET | `/make-server-3eae23a6/media/folder/:folderId` | media-library.tsx:489 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |

### payment-processing.tsx

Mounted at `/make-server-3eae23a6/payment` (index.tsx:1852)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/payment/ecommerce/create-order` | payment-processing.tsx:124 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/payment/ecommerce/order/:orderCode` | payment-processing.tsx:193 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:orderCode` resolves to the order |
| GET | `/make-server-3eae23a6/payment/ecommerce/orders/customer/:email` | payment-processing.tsx:216 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY | none — `:email` from the path keys `customer_orders:{email}` |
| PATCH | `/make-server-3eae23a6/payment/ecommerce/order/:orderId/status` | payment-processing.tsx:240 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:orderId` from the path, `status`/`tracking` from the body |
| POST | `/make-server-3eae23a6/payment/subscription/process-payment` | payment-processing.tsx:273 | AUTHED-ONLY | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/payment/subscription/payment/:paymentCode` | payment-processing.tsx:361 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:paymentCode` resolves straight to the payment record |
| GET | `/make-server-3eae23a6/payment/subscription/:subscriptionId/payments` | payment-processing.tsx:383 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:subscriptionId` from the path |
| GET | `/make-server-3eae23a6/payment/transaction/:transactionId` | payment-processing.tsx:406 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none — `:transactionId` from the path |

### pipeline.tsx

Mounted at `/` (index.tsx:2048)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/pipeline/items` | pipeline.tsx:38 | ROLE-CHECKED | N/A | NONE |  |
| GET | `/make-server-3eae23a6/pipeline/items/:id` | pipeline.tsx:60 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/pipeline/items` | pipeline.tsx:89 | ROLE-CHECKED | N/A | NONE |  |
| PUT | `/make-server-3eae23a6/pipeline/items/:id` | pipeline.tsx:117 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| DELETE | `/make-server-3eae23a6/pipeline/items/:id` | pipeline.tsx:159 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/pipeline/items/:id/move` | pipeline.tsx:181 | ROLE-CHECKED | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/pipeline/items/batch` | pipeline.tsx:219 | ROLE-CHECKED | N/A | ADMIN |  |
| GET | `/make-server-3eae23a6/pipeline/health` | pipeline.tsx:258 | ROLE-CHECKED | N/A | NONE |  |

### plan-catalog.tsx

Mounted at `/` (index.tsx:2006)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/plan-tiers` | plan-catalog.tsx:142 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/plan-tiers/:audience/:id` | plan-catalog.tsx:187 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/plan-tiers/:audience` | plan-catalog.tsx:201 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| DELETE | `/make-server-3eae23a6/plan-tiers/:audience/:id` | plan-catalog.tsx:277 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-draft` | plan-catalog.tsx:357 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/plan-addons` | plan-catalog.tsx:555 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-addons/:audience` | plan-catalog.tsx:595 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| DELETE | `/make-server-3eae23a6/plan-addons/:audience/:id` | plan-catalog.tsx:657 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-catalog/import` | plan-catalog.tsx:712 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/plan-catalog/seed-ladders` | plan-catalog.tsx:825 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/public/plan-tiers` | plan-catalog.tsx:965 | PUBLIC-LISTED | N/A | PII/MONEY/ADMIN |  |

### plans.tsx

Mounted at `/` (index.tsx:1756)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/plans/test` | plans.tsx:143 | PUBLIC-LISTED | N/A | NONE | requirePlanActor |
| POST | `/make-server-3eae23a6/plans` | plans.tsx:150 | ROLE-CHECKED | MIXED | PII/MONEY/ADMIN | c.get('admin') |
| GET | `/make-server-3eae23a6/plans` | plans.tsx:234 | PUBLIC-LISTED | MIXED | PII/ADMIN | c.get('admin') |
| GET | `/make-server-3eae23a6/plans/:id` | plans.tsx:261 | PUBLIC-LISTED | SCOPED-TO-SESSION | ADMIN | c.get('admin') |
| PATCH | `/make-server-3eae23a6/plans/:id` | plans.tsx:279 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | c.get('admin') |
| POST | `/make-server-3eae23a6/plans/:id/usage` | plans.tsx:331 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY/DOCS/ADMIN | c.get('admin') |
| DELETE | `/make-server-3eae23a6/plans/:id` | plans.tsx:372 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | c.get('admin') |
| GET | `/make-server-3eae23a6/plans-stats` | plans.tsx:388 | PUBLIC-LISTED | SCOPED-TO-SESSION | ADMIN | c.get('admin') |

### pricingOverviewRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1840)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/pricing/overview` | pricingOverviewRoutes.tsx:91 | ROLE-CHECKED | N/A | PII/MONEY/ADMIN | isStaffRequest |
| GET | `/make-server-3eae23a6/pricing/needs-attention` | pricingOverviewRoutes.tsx:203 | ROLE-CHECKED | N/A | MONEY | isStaffRequest |

### project-vision.tsx

Mounted at `/` (index.tsx:1892)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/project-vision/analyze` | project-vision.tsx:90 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/project-vision/test` | project-vision.tsx:165 | AUTHED-ONLY | N/A | NONE |  |

### promotions-engine.tsx

Mounted at `/` (index.tsx:1985)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/promotions-engine` | promotions-engine.tsx:60 | PUBLIC-LISTED | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/promotions-engine` | promotions-engine.tsx:73 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/ADMIN |  |

### property-inspections.tsx

Mounted at `/` (index.tsx:2009)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/landlord/inspections` | property-inspections.tsx:91 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/landlord/inspections/:id` | property-inspections.tsx:104 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/inspections` | property-inspections.tsx:116 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| PUT | `/make-server-3eae23a6/landlord/inspections/:id` | property-inspections.tsx:156 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| DELETE | `/make-server-3eae23a6/landlord/inspections/:id` | property-inspections.tsx:246 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/inspections/:id/plan` | property-inspections.tsx:287 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| PUT | `/make-server-3eae23a6/landlord/inspections/:id/plan` | property-inspections.tsx:304 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/inspection-plan/:id` | property-inspections.tsx:397 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |

### property-management.tsx

Mounted at `/` (index.tsx:2200)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/property-management-test` | property-management.tsx:48 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/property-management/condos` | property-management.tsx:80 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/property-management/condos/:id` | property-management.tsx:93 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/property-management/condos` | property-management.tsx:113 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| PUT | `/make-server-3eae23a6/property-management/condos/:id` | property-management.tsx:139 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| DELETE | `/make-server-3eae23a6/property-management/condos/:id` | property-management.tsx:168 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/property-management/condos/:id/work-requests` | property-management.tsx:187 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/property-management/condos/:id/work-requests` | property-management.tsx:209 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| PUT | `/make-server-3eae23a6/property-management/condos/:id/work-requests/:requestId` | property-management.tsx:238 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/property-management/condos/:id/units` | property-management.tsx:267 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/property-management/condos/:id/units` | property-management.tsx:283 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/property-management/property-managers/:id/associations` | property-management.tsx:310 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/property-management/property-managers/:id/work-requests` | property-management.tsx:336 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/property-management/pending-counts` | property-management.tsx:365 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/property-management/${resource}` | property-management.tsx:387 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/property-management/${resource}/:id` | property-management.tsx:390 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/property-management/${resource}` | property-management.tsx:393 | AUTHED-ONLY | N/A | NONE |  |
| PUT | `/make-server-3eae23a6/property-management/${resource}/:id` | property-management.tsx:396 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/property-management/landlords/:id/properties` | property-management.tsx:402 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/property-management/landlords/:id/properties` | property-management.tsx:405 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/property-management/landlords/:id/work-requests` | property-management.tsx:408 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/property-management/landlords/:id/work-requests` | property-management.tsx:411 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| PUT | `/make-server-3eae23a6/property-management/landlords/:id/work-requests/:requestId` | property-management.tsx:414 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/property-management/stats` | property-management.tsx:419 | ROLE-CHECKED | N/A | ADMIN | requirePropertyAdmin |
| GET | `/make-server-3eae23a6/property-management/work-requests/pending` | property-management.tsx:423 | ROLE-CHECKED | N/A | ADMIN | requirePropertyAdmin |
| GET | `/make-server-3eae23a6/property-management/work-requests/approved` | property-management.tsx:424 | ROLE-CHECKED | N/A | ADMIN | requirePropertyAdmin |
| POST | `/make-server-3eae23a6/property-management/work-requests/:id/offer` | property-management.tsx:425 | ROLE-CHECKED | ID-FROM-REQUEST | PII/ADMIN | requirePropertyAdmin |
| POST | `/make-server-3eae23a6/property-management/offers/send` | property-management.tsx:426 | ROLE-CHECKED | N/A | PII/ADMIN | requirePropertyAdmin |
| POST | `/make-server-3eae23a6/property-management/work-requests/:id/assign` | property-management.tsx:452 | ROLE-CHECKED | ID-FROM-REQUEST | PII/ADMIN | requirePropertyAdmin |

### property-reports.tsx

Mounted at `/` (index.tsx:2010)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/property-reports/:propertyId` | property-reports.tsx:90 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/property-reports/:propertyId/:reportId` | property-reports.tsx:143 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/property-reports/:propertyId/property-health/view` | property-reports.tsx:185 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/property-reports/:propertyId/capital-plan/view` | property-reports.tsx:222 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/property-reports/:propertyId/revenue-opportunity/view` | property-reports.tsx:276 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |

### queryPerfRoutes.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1839)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/admin/slow-queries` | queryPerfRoutes.tsx:38 | ROLE-CHECKED | N/A | MONEY/ADMIN | isStaffRequest |
| POST | `/make-server-3eae23a6/admin/slow-queries/sample` | queryPerfRoutes.tsx:107 | ROLE-CHECKED | N/A | ADMIN | isStaffRequest |

### quote-from-blueprint.tsx

Mounted at `/make-server-3eae23a6/quotes` (index.tsx:2066)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/quotes/generate-from-blueprint` | quote-from-blueprint.tsx:51 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |

### quote-generator.tsx

Mounted at **UNKNOWN — no `app.route` found in index.tsx**

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `(unmounted)/test` | quote-generator.tsx:732 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `(unmounted)/generate-quote` | quote-generator.tsx:738 | AUTHED-ONLY | N/A | MONEY/ADMIN |  |
| POST | `(unmounted)/make-server-3eae23a6/auto-generate-quote` | quote-generator.tsx:794 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |

### quotes.tsx

Mounted at `/` (index.tsx:1883), `/` (index.tsx:6330)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/quotes` | quotes.tsx:209 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/quotes` | quotes.tsx:239 | ROLE-CHECKED | MIXED | PII/MONEY | requireQuoteStaff |
| POST | `/make-server-3eae23a6/quotes/:id/assign` | quotes.tsx:372 | † ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY | requireQuoteStaff (quoteActor → staff) |
| DELETE | `/make-server-3eae23a6/quotes/:id` | quotes.tsx:401 | † ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireQuoteStaff (quoteActor → staff) |

### reel-research.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2046)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/reel-research` | reel-research.tsx:113 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY/ADMIN | none — YouTube search only, no customer data; cost exposure |

### reel-scoreboard.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2047)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/reel-scoreboard/posts` | reel-scoreboard.tsx:128 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| PATCH | `/make-server-3eae23a6/reel-scoreboard/posts/:id/metrics` | reel-scoreboard.tsx:169 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| POST | `/make-server-3eae23a6/reel-scoreboard/sync-instagram` | reel-scoreboard.tsx:209 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| GET | `/make-server-3eae23a6/reel-scoreboard/instagram-status` | reel-scoreboard.tsx:270 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |
| GET | `/make-server-3eae23a6/reel-scoreboard` | reel-scoreboard.tsx:321 | AUTHED-ONLY | SCOPED-TO-SESSION | NONE |  |

### rental-portals.tsx

Mounted at `/` (index.tsx:2208)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/condo-manager/units` | rental-portals.tsx:135 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/condo-manager/units` | rental-portals.tsx:144 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/condo-manager/work-requests` | rental-portals.tsx:159 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| PATCH | `/make-server-3eae23a6/condo-manager/work-requests/:id/decision` | rental-portals.tsx:169 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/plan-item/quote` | rental-portals.tsx:257 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/landlord/work-requests` | rental-portals.tsx:359 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| PATCH | `/make-server-3eae23a6/landlord/work-requests/:id/decision` | rental-portals.tsx:370 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/tenants` | rental-portals.tsx:390 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/landlord/tenants` | rental-portals.tsx:405 | AUTHED-ONLY | MIXED | PII/ADMIN |  |
| DELETE | `/make-server-3eae23a6/landlord/tenants/:id` | rental-portals.tsx:460 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/tenants/:id/invite` | rental-portals.tsx:495 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/property-records/lookup` | rental-portals.tsx:656 | AUTHED-ONLY | N/A | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/properties/:id/enrich` | rental-portals.tsx:670 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/properties` | rental-portals.tsx:703 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/landlord/properties` | rental-portals.tsx:719 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/properties/:id/analyze` | rental-portals.tsx:794 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| PUT | `/make-server-3eae23a6/landlord/properties/:id` | rental-portals.tsx:845 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | landlordActor → landlordPortfolioKey(actor.user.email) |
| DELETE | `/make-server-3eae23a6/landlord/properties/:id` | rental-portals.tsx:917 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/properties/:id/create-work-orders` | rental-portals.tsx:936 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/landlord/turnover-request` | rental-portals.tsx:974 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/tenant/work-requests` | rental-portals.tsx:1019 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/tenant/work-requests` | rental-portals.tsx:1029 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| POST | `/make-server-3eae23a6/landlord/leases/draft` | rental-portals.tsx:1120 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/market-rent` | rental-portals.tsx:1171 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/stripe/connect` | rental-portals.tsx:1283 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/stripe/status` | rental-portals.tsx:1315 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/tenant/rent` | rental-portals.tsx:1330 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| POST | `/make-server-3eae23a6/tenant/rent/pay` | rental-portals.tsx:1355 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/tenant/rent/confirm` | rental-portals.tsx:1416 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| POST | `/make-server-3eae23a6/landlord/tenants/:id/charge` | rental-portals.tsx:1502 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/landlord/rent` | rental-portals.tsx:1594 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| PATCH | `/make-server-3eae23a6/landlord/rent/:id/mark-paid` | rental-portals.tsx:1608 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/tenants/:id/autopay` | rental-portals.tsx:1629 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/tenants/:id/autopay/status` | rental-portals.tsx:1684 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/tenants/:id/autopay/cancel` | rental-portals.tsx:1712 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/dashboard` | rental-portals.tsx:1734 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| PATCH | `/make-server-3eae23a6/landlord/tenants/:id/lease-terms` | rental-portals.tsx:1781 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/tenants/:id/renewal-offer` | rental-portals.tsx:1805 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/applications` | rental-portals.tsx:1839 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/landlord/applications/link` | rental-portals.tsx:1878 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| DELETE | `/make-server-3eae23a6/landlord/applications/link` | rental-portals.tsx:1904 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/landlord/applications` | rental-portals.tsx:1920 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| PATCH | `/make-server-3eae23a6/landlord/applications/:id` | rental-portals.tsx:1936 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/screening/:token` | rental-portals.tsx:2089 | PUBLIC-LISTED | ID-FROM-REQUEST | PII |  |
| POST | `/make-server-3eae23a6/screening/:token/apply` | rental-portals.tsx:2101 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/applications/:id/screening` | rental-portals.tsx:2435 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | guard |
| GET | `/make-server-3eae23a6/landlord/screening` | rental-portals.tsx:2645 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/landlord/screening/:id` | rental-portals.tsx:2668 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| POST | `/make-server-3eae23a6/screening/webhook` | rental-portals.tsx:2725 | PUBLIC-LISTED | N/A | PII/MONEY |  |
| GET | `/make-server-3eae23a6/landlord/screening/:id/adverse-action` | rental-portals.tsx:2780 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/screening/fee/:token` | rental-portals.tsx:2815 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY |  |
| POST | `/make-server-3eae23a6/screening/fee/:token/accept` | rental-portals.tsx:2840 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY |  |
| GET | `/make-server-3eae23a6/screening/order/:token` | rental-portals.tsx:2870 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY |  |
| POST | `/make-server-3eae23a6/screening/order/:token/begin` | rental-portals.tsx:2881 | PUBLIC-LISTED | ID-FROM-REQUEST | PII/MONEY |  |
| GET | `/make-server-3eae23a6/staff/screening/pricing` | rental-portals.tsx:2900 | ROLE-CHECKED | N/A | PII/MONEY | isStaffRequest |
| PUT | `/make-server-3eae23a6/staff/screening/pricing` | rental-portals.tsx:2908 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | isStaffRequest |
| GET | `/make-server-3eae23a6/staff/screening/audit` | rental-portals.tsx:2969 | ROLE-CHECKED | N/A | PII | isStaffRequest |
| GET | `/make-server-3eae23a6/staff/screening/revenue` | rental-portals.tsx:2995 | ROLE-CHECKED | N/A | PII/MONEY | isStaffRequest |
| POST | `/make-server-3eae23a6/staff/screening/:id/advance` | rental-portals.tsx:3010 | ROLE-CHECKED | ID-FROM-REQUEST | PII/MONEY | isStaffRequest |
| POST | `/make-server-3eae23a6/cron/screening/expire-invitations` | rental-portals.tsx:3054 | PUBLIC-LISTED / SECRET-GUARDED | N/A | PII/MONEY/DOCS/ADMIN | shared secret / signature |
| GET | `/make-server-3eae23a6/landlord/documents` | rental-portals.tsx:3194 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| POST | `/make-server-3eae23a6/landlord/documents` | rental-portals.tsx:3212 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/landlord/documents/:id` | rental-portals.tsx:3243 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/portal/documents` | rental-portals.tsx:3272 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| POST | `/make-server-3eae23a6/portal/documents` | rental-portals.tsx:3289 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/portal/documents/:id` | rental-portals.tsx:3319 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/leases/regenerate-section` | rental-portals.tsx:3336 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/leases` | rental-portals.tsx:3363 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/landlord/leases` | rental-portals.tsx:3373 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/leases/:id/download` | rental-portals.tsx:3422 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/DOCS/ADMIN | intakeIsAdmin |
| GET | `/make-server-3eae23a6/tenant/leases` | rental-portals.tsx:3439 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| PATCH | `/make-server-3eae23a6/tenant/leases/:id/sign` | rental-portals.tsx:3448 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| GET | `/make-server-3eae23a6/landlord/forms` | rental-portals.tsx:3493 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/forms` | rental-portals.tsx:3503 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/landlord/forms/:id` | rental-portals.tsx:3542 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/conditions-reports` | rental-portals.tsx:3636 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/landlord/conditions-reports` | rental-portals.tsx:3651 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/landlord/conditions-reports/:id` | rental-portals.tsx:3714 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| PATCH | `/make-server-3eae23a6/landlord/conditions-reports/:id` | rental-portals.tsx:3731 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN |  |
| PATCH | `/make-server-3eae23a6/landlord/conditions-reports/:id/costs` | rental-portals.tsx:3899 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| POST | `/make-server-3eae23a6/landlord/conditions-reports/:id/price-from-quote` | rental-portals.tsx:3967 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | intakeIsAdmin |
| DELETE | `/make-server-3eae23a6/landlord/conditions-reports/:id` | rental-portals.tsx:4038 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN | reportFor(c, id) → landlordActor |
| GET | `/make-server-3eae23a6/tenant/conditions-reports` | rental-portals.tsx:4069 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/tenant/forms` | rental-portals.tsx:4088 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| PATCH | `/make-server-3eae23a6/tenant/forms/:id/complete` | rental-portals.tsx:4097 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS |  |
| GET | `/make-server-3eae23a6/property-manager/properties` | rental-portals.tsx:4125 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/property-manager/properties` | rental-portals.tsx:4142 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/property-manager/work-requests` | rental-portals.tsx:4167 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| PATCH | `/make-server-3eae23a6/property-manager/work-requests/:id/decision` | rental-portals.tsx:4178 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |

### scheduleAssistant.tsx

Mounted at `/` (index.tsx:1888)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/schedule/proposals` | scheduleAssistant.tsx:98 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| POST | `/make-server-3eae23a6/schedule/confirm` | scheduleAssistant.tsx:169 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |

### store-analytics.tsx

Mounted at `/make-server-3eae23a6/analytics` (index.tsx:1915)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/analytics/store` | store-analytics.tsx:71 | AUTHED-ONLY | N/A | PII/MONEY/DOCS/ADMIN |  |

### store-boosters.tsx

Mounted at `/` (index.tsx:1984)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/store-boosters` | store-boosters.tsx:61 | AUTHED-ONLY | N/A | ADMIN |  |
| POST | `/make-server-3eae23a6/store-boosters` | store-boosters.tsx:73 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |

### store-content.tsx

Mounted at `/make-server-3eae23a6/store-content` (index.tsx:1982)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/store-content/reels` | store-content.tsx:107 | PUBLIC-LISTED | N/A | MONEY |  |
| GET | `/make-server-3eae23a6/store-content/reels/all` | store-content.tsx:119 | PUBLIC-LISTED | N/A | MONEY/ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/store-content/reels` | store-content.tsx:133 | PUBLIC-LISTED | N/A | MONEY/ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/store-content/reels/publish` | store-content.tsx:205 | PUBLIC-LISTED | N/A | MONEY/DOCS/ADMIN | requireAdmin |
| DELETE | `/make-server-3eae23a6/store-content/reels/:id` | store-content.tsx:263 | PUBLIC-LISTED | ID-FROM-REQUEST | ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/store-content/posts` | store-content.tsx:279 | PUBLIC-LISTED | N/A | ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/store-content/posts` | store-content.tsx:293 | PUBLIC-LISTED | N/A | DOCS/ADMIN | requireAdmin |
| DELETE | `/make-server-3eae23a6/store-content/posts/:id` | store-content.tsx:349 | PUBLIC-LISTED | ID-FROM-REQUEST | ADMIN | requireAdmin |

### territory-cohorts.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2000)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/territories` | territory-cohorts.tsx:33 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/territories/:id` | territory-cohorts.tsx:53 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/territories` | territory-cohorts.tsx:79 | AUTHED-ONLY | N/A | DOCS |  |
| PUT | `/make-server-3eae23a6/territories/:id` | territory-cohorts.tsx:116 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/applications/status/:status` | territory-cohorts.tsx:194 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| POST | `/make-server-3eae23a6/applications/:id/approve` | territory-cohorts.tsx:219 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/MONEY/DOCS | none — `reviewedBy` is whatever the body says |
| POST | `/make-server-3eae23a6/applications/:id/reject` | territory-cohorts.tsx:342 | AUTHED-ONLY | ID-FROM-REQUEST | NONE |  |
| GET | `/make-server-3eae23a6/members` | territory-cohorts.tsx:379 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/founders` | territory-cohorts.tsx:399 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/analytics` | territory-cohorts.tsx:418 | AUTHED-ONLY | N/A | MONEY |  |
| POST | `/make-server-3eae23a6/territories/from-company-hq` | territory-cohorts.tsx:479 | AUTHED-ONLY | N/A | PII/DOCS/ADMIN |  |

### tier-features.tsx

Mounted at `/` (index.tsx:1989)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/tier-features` | tier-features.tsx:41 | AUTHED-ONLY | N/A | NONE |  |
| PUT | `/make-server-3eae23a6/tier-features` | tier-features.tsx:52 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/tier-features/toggle` | tier-features.tsx:71 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |

### time-tracking.tsx

Mounted at `/make-server-3eae23a6/time-tracking` (index.tsx:1854)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/time-tracking/my-work-orders/:employeeId` | time-tracking.tsx:271 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/ADMIN | requireEmployeeAccess |
| GET | `/make-server-3eae23a6/time-tracking/employees` | time-tracking.tsx:303 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/time-tracking/employees/:id` | time-tracking.tsx:337 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/employees` | time-tracking.tsx:382 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/punch-in` | time-tracking.tsx:495 | ROLE-CHECKED | N/A | PII | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/punch-out` | time-tracking.tsx:577 | ROLE-CHECKED | N/A | PII/MONEY | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/break` | time-tracking.tsx:669 | ROLE-CHECKED | N/A | NONE | requireEmployeeAccess |
| GET | `/make-server-3eae23a6/time-tracking/entries` | time-tracking.tsx:748 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | c.get("admin") |
| PATCH | `/make-server-3eae23a6/time-tracking/entries/:id/allocations` | time-tracking.tsx:811 | ROLE-CHECKED | SCOPED-TO-SESSION | MONEY/ADMIN | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/entries/:id/submit` | time-tracking.tsx:947 | ROLE-CHECKED | ID-FROM-REQUEST | MONEY | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/entries/:id/finish-time` | time-tracking.tsx:1016 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/time-tracking/entries/:id/approve` | time-tracking.tsx:1093 | ROLE-CHECKED | ID-FROM-REQUEST | ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/time-tracking/payroll-report` | time-tracking.tsx:1136 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/time-tracking/reset-hours` | time-tracking.tsx:1221 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/time-tracking/hours-summary` | time-tracking.tsx:1255 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | c.get("admin") |
| POST | `/make-server-3eae23a6/time-tracking/dev/demo-held-shift` | time-tracking.tsx:1334 | ROLE-CHECKED | SCOPED-TO-SESSION | ADMIN | requireAdmin |
| DELETE | `/make-server-3eae23a6/time-tracking/dev/demo-held-shift` | time-tracking.tsx:1378 | ROLE-CHECKED | N/A | ADMIN | requireAdmin |
| GET | `/make-server-3eae23a6/time-tracking/tasks/:employeeId` | time-tracking.tsx:1405 | ROLE-CHECKED | ID-FROM-REQUEST | NONE | requireEmployeeAccess |
| POST | `/make-server-3eae23a6/time-tracking/tasks/:employeeId` | time-tracking.tsx:1420 | ROLE-CHECKED | ID-FROM-REQUEST | ADMIN | requireAdmin |
| POST | `/make-server-3eae23a6/time-tracking/tasks/:employeeId/:taskId/status` | time-tracking.tsx:1449 | ROLE-CHECKED | ID-FROM-REQUEST | ADMIN | requireEmployeeAccess |
| GET | `/make-server-3eae23a6/time-tracking/time/employers` | time-tracking.tsx:1483 | ROLE-CHECKED | N/A | MONEY/DOCS/ADMIN | requireAdmin |
| PUT | `/make-server-3eae23a6/time-tracking/time/employers/:orgId/burden` | time-tracking.tsx:1519 | ROLE-CHECKED | ID-FROM-REQUEST | ADMIN | requireAdmin |

### trash-estimator.tsx

Mounted at `/make-server-3eae23a6/trash-estimator` (index.tsx:1903)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/trash-estimator/read` | trash-estimator.tsx:108 | ROLE-CHECKED | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | assertAiAllowed( |
| GET | `/make-server-3eae23a6/trash-estimator/rates` | trash-estimator.tsx:436 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/ADMIN |  |
| PUT | `/make-server-3eae23a6/trash-estimator/rates` | trash-estimator.tsx:463 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/ADMIN |  |
| GET | `/make-server-3eae23a6/trash-estimator/estimates` | trash-estimator.tsx:509 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/trash-estimator/estimates/:id/ask-us-to-confirm` | trash-estimator.tsx:545 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | record.customerEmail === c.get('actorEmail') |
| GET | `/make-server-3eae23a6/trash-estimator/estimates/:id` | trash-estimator.tsx:619 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII | record.customerEmail === c.get('actorEmail') |

### unavailability.tsx

Mounted at `/` (index.tsx:1886)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| POST | `/make-server-3eae23a6/unavailability` | unavailability.tsx:83 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| GET | `/make-server-3eae23a6/unavailability` | unavailability.tsx:136 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/unavailability/:id/decide` | unavailability.tsx:167 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |
| POST | `/make-server-3eae23a6/unavailability/:id/cancel` | unavailability.tsx:208 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/ADMIN |  |

### vendor-billing.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2036)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/vendor-billing/billable-orders` | vendor-billing.tsx:144 | † AUTHED-ONLY | SCOPED-TO-SESSION | MONEY | billingActor — `vendorId` query honoured only when actor.isCompany |
| GET | `/make-server-3eae23a6/vendor-billing/invoices` | vendor-billing.tsx:190 | AUTHED-ONLY | MIXED | MONEY |  |
| POST | `/make-server-3eae23a6/vendor-billing/invoices` | vendor-billing.tsx:213 | AUTHED-ONLY | MIXED | PII/MONEY |  |
| PATCH | `/make-server-3eae23a6/vendor-billing/invoices/:id/status` | vendor-billing.tsx:309 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |
| GET | `/make-server-3eae23a6/vendor-billing/payments` | vendor-billing.tsx:349 | AUTHED-ONLY | MIXED | MONEY |  |
| POST | `/make-server-3eae23a6/vendor-billing/payments` | vendor-billing.tsx:374 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY |  |

### vendor-catalog.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2003)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/vendor-catalog/:vendorId` | vendor-catalog.tsx:125 | AUTHED-ONLY | MIXED | NONE |  |
| POST | `/make-server-3eae23a6/vendor-catalog/:vendorId/items` | vendor-catalog.tsx:311 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII/MONEY/DOCS/ADMIN | catalogActor + mayTouch(who, vendorId) |
| POST | `/make-server-3eae23a6/vendor-catalog/:vendorId/import` | vendor-catalog.tsx:524 | AUTHED-ONLY | MIXED | PII/MONEY/DOCS/ADMIN |  |
| DELETE | `/make-server-3eae23a6/vendor-catalog/:vendorId/items/:itemId` | vendor-catalog.tsx:596 | AUTHED-ONLY | MIXED | NONE |  |
| GET | `/make-server-3eae23a6/vendor-catalog-search` | vendor-catalog.tsx:624 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY/DOCS |  |
| GET | `/make-server-3eae23a6/vendor-catalog-all` | vendor-catalog.tsx:711 | AUTHED-ONLY | SCOPED-TO-SESSION | MONEY |  |
| GET | `/make-server-3eae23a6/vendor-catalog/:vendorId/feed` | vendor-catalog.tsx:785 | AUTHED-ONLY | MIXED | NONE |  |
| PUT | `/make-server-3eae23a6/vendor-catalog/:vendorId/feed` | vendor-catalog.tsx:796 | AUTHED-ONLY | MIXED | PII/MONEY/ADMIN |  |
| POST | `/make-server-3eae23a6/vendor-catalog/:vendorId/feed/test` | vendor-catalog.tsx:860 | AUTHED-ONLY | MIXED | NONE |  |
| POST | `/make-server-3eae23a6/vendor-catalog/:vendorId/feed/sync` | vendor-catalog.tsx:914 | AUTHED-ONLY | MIXED | MONEY |  |
| GET | `/make-server-3eae23a6/vendor-settings/:vendorId` | vendor-catalog.tsx:1075 | † AUTHED-ONLY | SCOPED-TO-SESSION | DOCS/ADMIN | catalogActor + mayTouch(who, vendorId) |
| PUT | `/make-server-3eae23a6/vendor-settings/:vendorId` | vendor-catalog.tsx:1105 | † AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN | catalogActor + mayTouch(who, vendorId) |
| GET | `/make-server-3eae23a6/catalog-products` | vendor-catalog.tsx:1197 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS |  |
| POST | `/make-server-3eae23a6/catalog-products/backfill` | vendor-catalog.tsx:1248 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/catalog-products/mirror-images` | vendor-catalog.tsx:1329 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/catalog-products/merge-proposals` | vendor-catalog.tsx:1444 | AUTHED-ONLY | SCOPED-TO-SESSION | ADMIN |  |
| POST | `/make-server-3eae23a6/catalog-products/merge` | vendor-catalog.tsx:1484 | AUTHED-ONLY | SCOPED-TO-SESSION | PII/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/catalog-products/:productId` | vendor-catalog.tsx:1549 | AUTHED-ONLY | SCOPED-TO-SESSION | DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/paint/colors` | vendor-catalog.tsx:1693 | AUTHED-ONLY | MIXED | NONE |  |
| GET | `/make-server-3eae23a6/paint/products` | vendor-catalog.tsx:1709 | AUTHED-ONLY | MIXED | NONE |  |
| POST | `/make-server-3eae23a6/paint/:vendorId/colors` | vendor-catalog.tsx:1727 | AUTHED-ONLY | MIXED | DOCS |  |
| POST | `/make-server-3eae23a6/paint/:vendorId/products` | vendor-catalog.tsx:1752 | AUTHED-ONLY | MIXED | DOCS |  |
| DELETE | `/make-server-3eae23a6/paint/:vendorId/colors/:code` | vendor-catalog.tsx:1777 | AUTHED-ONLY | MIXED | NONE |  |

### vendor-profile.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:2001)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/vendor/me` | vendor-profile.tsx:74 | AUTHED-ONLY | SCOPED-TO-SESSION | PII |  |
| GET | `/make-server-3eae23a6/vendor-profile/:vendorId` | vendor-profile.tsx:92 | † AUTHED-ONLY | ID-FROM-REQUEST | PII/DOCS | none |
| GET | `/make-server-3eae23a6/vendor-directory` | vendor-profile.tsx:150 | AUTHED-ONLY | N/A | PII |  |
| PUT | `/make-server-3eae23a6/vendor-profile/:vendorId` | vendor-profile.tsx:195 | † ROLE-CHECKED | SCOPED-TO-SESSION | PII/DOCS | vendorActor + STAFF_ROLE_SET / vendorId equality |
| GET | `/make-server-3eae23a6/vendor-profile/:vendorId/stats` | vendor-profile.tsx:271 | † AUTHED-ONLY | ID-FROM-REQUEST | MONEY | none |

### video-studio.tsx

Mounted at `/make-server-3eae23a6` (index.tsx:1999)

| Method | Path | Source | Auth tier | Scoping | Sensitivity | Check |
|---|---|---|---|---|---|---|
| GET | `/make-server-3eae23a6/video-studio/status` | video-studio.tsx:75 | AUTHED-ONLY | N/A | PII/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/video-studio/script` | video-studio.tsx:100 | AUTHED-ONLY | N/A | DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/video-studio/scene-image` | video-studio.tsx:185 | AUTHED-ONLY | N/A | DOCS |  |
| POST | `/make-server-3eae23a6/video-studio/describe-photos` | video-studio.tsx:272 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/video-studio/job-reel` | video-studio.tsx:490 | AUTHED-ONLY | N/A | PII/MONEY/DOCS/ADMIN |  |
| POST | `/make-server-3eae23a6/video-studio/product-reel` | video-studio.tsx:857 | AUTHED-ONLY | N/A | MONEY/DOCS/ADMIN |  |
| GET | `/make-server-3eae23a6/video-studio/job-photos` | video-studio.tsx:1137 | AUTHED-ONLY | N/A | MONEY/DOCS |  |
| POST | `/make-server-3eae23a6/video-studio/voiceover` | video-studio.tsx:1151 | AUTHED-ONLY | N/A | DOCS |  |
| POST | `/make-server-3eae23a6/video-studio/rendered` | video-studio.tsx:1218 | AUTHED-ONLY | N/A | DOCS |  |
| POST | `/make-server-3eae23a6/video-studio/projects` | video-studio.tsx:1279 | AUTHED-ONLY | N/A | NONE |  |
| GET | `/make-server-3eae23a6/video-studio/projects` | video-studio.tsx:1302 | AUTHED-ONLY | N/A | DOCS |  |
| DELETE | `/make-server-3eae23a6/video-studio/projects/:id` | video-studio.tsx:1327 | † AUTHED-ONLY | ID-FROM-REQUEST | DOCS | none |

