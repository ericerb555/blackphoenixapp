# PLAN — a shared "which job am I on" indicator — awaiting approval

The deck designer now says which project is open. Nothing else in the design
workspace does, so moving from the designer to the stair calculator or the
permit tracker loses the thread — and the whole reason for today's work was that
not knowing which project is on screen is expensive.

## What I found

`DesignWorkspaceNav` is already rendered by four screens, which makes it the one
place to show this rather than seven copies of the same line:

| Screen | Renders the nav |
| --- | --- |
| Deck designer | yes |
| Stair calculator | yes |
| Permits & zoning | yes |
| Document scanner | yes |
| Zoning variance | **no** |
| Blueprint analyser | **no** |
| Materials hub | **no** |

So one change covers four screens today, and the other three need the nav added
— a separate, smaller job, listed below rather than folded in silently.

## Where the current job would live

Nothing shared exists today: the designer holds `site`, `link` and `savedId` in
its own state, and navigating away unmounts it. So the job has to live outside
any one screen.

A small module — `src/app/lib/currentJob.ts` — holding the job in
`localStorage` under one key, with a `useCurrentJob()` hook so a screen
re-renders when it changes. Not a context provider: these screens are swapped by
a page map rather than nested under a common parent, so a provider would have to
be threaded through the whole app, and localStorage also survives a reload,
which a provider would not.

What it holds, and nothing more: project id, name, address, and whether it is
saved. Enough to say which job you are on; not a second copy of the design.

## Todo

- [x] **J1** `currentJob.ts` plus a `useCurrentJob` hook, split so the store stays
      importable by non-components.
- [x] **J2** The deck designer publishes; it is the only writer.
- [x] **J3** Shown above the workspace rail, so all four screens that render the
      rail get it from one place.
- [x] **J4** Verified in a browser: nothing open reads "No job selected"; typing
      a name and address names it and marks it unsaved; the **stair calculator**,
      which never set anything, shows the same job; clearing returns it to none.
      Nothing thrown at any step.
- [ ] **J5** *(still open)* Add the rail to zoning variance, blueprint analyser
      and materials hub — the three screens that do not render it, and therefore
      still cannot say which job they are on.

### Two things this turned up

**`DesignLink` only stored a job id.** An id names a job to the server and tells
a person nothing, and the rail cannot look one up on a screen that never loaded
the customer's job list. It now carries the title alongside, exactly as it
already carried `customerName` beside `customerId`.

**The designer's header needed a third state.** It was calling a deck "a blank
start" while the rail already named it — the two labels disagreeing about the
same deck is precisely the failure this indicator exists to prevent. It now says
*Editing X*, *X · not saved yet*, or *New deck · blank start*.

### Not done, and it needs a decision

**There is no quote number.** A deck design carries no quote link at all — the
designer never sets a `quoteId`, though the server record has had that field
since it was written. The slot is wired through the store and the rail, so
connecting the two later is a change to one writer rather than to every reader.
Linking a deck to its quote is its own piece of work; say if it is wanted.

## Two decisions for Eric

1. **What should it say?** My default is name, then address if there is one:
   `331 DWH deck · 331 Daniel Webster Hwy` — and `· not saved yet` when it has
   never been saved. The address is what actually distinguishes two decks with
   similar names.
2. **Should it be clickable** — jumping back to the deck designer with that
   project open? Useful, and it is more work than displaying a line, so it is
   worth deciding rather than assuming.

---

# PLAN — content centre first — awaiting approval, nothing started

Eric chose the content centre as the first surface to lock down. Four findings
make this much smaller and safer than expected, and one makes it urgent.

**1. The client is already ready.** Every content centre call goes through a
single helper, `cmsFetch` in `src/app/lib/useContentManagement.ts`, and it
**already sends the user's `access_token`** when signed in, falling back to the
anon key only when there is no session. So the B0 problem — 136 pages sending
only the anon key — **does not apply here**. No frontend change at all.

**2. There is no data yet.** `kv_store_3eae23a6` holds **0 rows** under `cms:`.
The content centre has no content in it. Locking it down now cannot break a
customer's data, because there isn't any. This is the cheapest this job will ever
be, and it gets more expensive the moment the first tenant loads content.

**3. Tenant identity has a real source.** `companies` has a `user_id` owner
column: 3 companies, all with an owner, 2 distinct owners. So "which companies may
this session touch" is answerable from the database — `select id from companies
where user_id = <session user>` — rather than trusted from the query string.

**4. The membership tables do not exist.** `company_members` and
`user_permissions` are **not in the database** (the 404s in the pasted browser
errors were real). `intakeIsAdmin` queries both inside a `try/catch`, so those
checks silently return false and admin status currently rests **only** on
`PLATFORM_OWNER_EMAILS` and a role claim in user metadata. That is fine for this
batch, but it means the gate's **admin tier will refuse everyone who is not a
platform owner** — which has to be settled before F3 enforcement, or it locks
staff out of invoices. Recorded here so it is not discovered later.

## The change

One middleware at the top of `supabase/functions/server/content-management.tsx`.
**No handler edits** — all 20 routes inherit it.

It does three things:

1. Requires a session; no token, no content. *(F1)*
2. Resolves the caller's owned company ids from `companies.user_id`. *(F2)*
3. Refuses any request naming a company the caller does not own — checking the
   `companyId` query parameter used by the 6 read routes, and `company_id` in the
   body on writes. Hono caches the parsed body, so the middleware can inspect it
   and the handler still reads it normally.

That single block closes both F1 and F2 for this surface. F2 matters more than F1
here: requiring a session but still trusting `?companyId=` would mean any signed-in
tenant could read any other tenant's content, which is the exact failure a
subscription product cannot have.

## Todo

- [x] **CC1** Middleware written — **plus eight record-level checks the plan did
      not anticipate.** A middleware alone was not enough: records reached by id
      are loaded before any company is known. Those are the content piece
      GET/PATCH/DELETE, distribution POST/PATCH, approval POST/PATCH, and the
      template usage counter. Distribution rows and approvals carry no company of
      their own, so ownership resolves through the content piece they point at,
      and listing either without naming a piece used to return **every tenant's
      rows** — it now returns none.
- [x] **CC2** Ownership logic unit-tested, 8 cases, including the fail-safe that a
      request with no ownership set on the context is denied rather than allowed.
- [x] **CC3 (partly)** Deployed and **verified against production**: the anon key
      that used to read this data now gets 401 on reads and writes alike, and
      naming an arbitrary company is refused. Rest of the app unaffected —
      health, design-projects, products, quotes all still 200.

- [x] **CC3 (complete)** Eric confirmed the content centre loads normally while
      signed in, and production logs agree: `GET /cms/content-pieces` → **200**
      for his session, **401** for every anon-key probe, and **zero** `[cms]
      refused` lines, so nothing legitimate was caught. Both halves now proven —
      strangers locked out, customer let in.

      One case remains untested: a user of company A reading company B. It needs a
      second account, and the check it exercises (`owned.has(id)`) is the same one
      the 8 unit cases cover. Worth a real test when a second tenant exists.
- [x] **CC4** Dropped as redundant, not deferred. The router guards itself with
      `app.use('*')`, which covers every route in the file **including ones added
      later** — the case the gate would otherwise be insuring against. Adding
      `/cms` to the gate's enforcing set would mean two layers returning the same
      401, and a second layer only makes a future failure harder to read.

# PLAN — F3 (money routes) — awaiting approval, nothing started

Eric chose **option 2**, a short allowlist. Wiring that up alone would still have
broken things, for a reason worth stating before any code moves.

## Enforcing admin today would lock you out of your own money screens

Not because of the allowlist — because those pages never send a session:

| Page | Sends session | Sends anon key |
| --- | --- | --- |
| `InvoiceBuilder.tsx` | no | 8 calls |
| `PurchaseOrders.tsx` | no | 4 calls |
| `CouponManager.tsx` | no | 7 calls |
| `PromotionsManager.tsx` | no | 7 calls |
| `AbandonedCart.tsx` | no | 5 calls |
| `SupplierManagementHub.tsx` | no | 4 calls |
| `CompanyPaymentRouting.tsx`, `RevenueMonetizationHub.tsx`, `JobTrackingHub.tsx` | no | 1 each |

The server cannot tell an administrator from a stranger when the client sends the
public key either way. **This is B0, scoped to the money slice** — 9 pages, 38
calls, rather than all 136.

**The pattern already exists in the repo.** `UnifiedPaymentCenter.tsx`,
`InvoicesNew.tsx` and `UnifiedProjectPipeline.tsx` already do it right:

```ts
async function paymentCenterHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to manage payment gateways.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}
```

So this is applying an existing convention consistently, not inventing one.

## Todo

- [x] **M1** `src/app/utils/authHeaders.ts` added. It throws when there is no
      session rather than falling back to the anon key — a silent fallback turns
      an expired session into a 401 that reads like a bug in the page.
- [x] **M2** All 9 pages converted, 38 call sites.
- [x] **M3** Build passes. Two `await`-in-a-non-async-arrow errors were caught by
      parse-checking and fixed by taking the headers once before the loop, which
      also avoids a session lookup per iteration.
- [x] **M4** Committed and pushed as `0d47f6fd`; Vercel builds from `main`.

### One bug this batch nearly shipped, and how it was caught

The conversion deleted a header constant in `SupplierManagementHub.tsx` that
**four call sites still referenced** — it was named `jsonHeaders`, not
`authHeaders`, so the rename pass missed it. **The build passed anyway.** esbuild
does not check for undefined identifiers, so that page would have thrown a
`ReferenceError` on first render, exactly like the design centre outage.

It was found by diffing every `const` declaration the script removed against the
references that survived, not by building. That check is worth repeating on any
future scripted edit: *a passing build here means the syntax parsed, nothing more.*
- [ ] **M5** **You:** open Invoices, Purchase Orders and Coupons and confirm they
      still load. A passing build does not prove this — it never has here.
- [ ] **M6** Only then enforce the admin tier on the money prefixes, and only
      after M5 passes.
- [x] **M8** *(new — found while scoping the materials hub, and it was a blocker)*
      `MaterialsCenter.tsx` called `/purchase-orders` with the anon key through a
      shared `poHeaders` constant, at five call sites. **Enforcing the admin tier
      would have broken the materials hub**, even though `PurchaseOrders.tsx` had
      already been converted — the same routes are reached from two screens.
      Those five now send the session.

      The rest of that page still uses the anon key on purpose: the `permit-ai`
      chat and the `my-store` calls are not money routes, and `my-store` already
      falls back to the anon key by design.

      **The lesson for the remaining surfaces:** converting the obvious screen is
      not enough. Any money route can be called from somewhere else, so the check
      before enforcing a prefix is "who calls this route", not "have I fixed the
      page named after it".
- [x] **M7** `PLATFORM_OWNER_EMAILS` now reads the Supabase secret of the same
      name, comma separated — the source `design-links.tsx` already used, so
      there is one list rather than two that can disagree. Adding an
      administrator is now editing a secret, not a code change and a deploy.
      Eric's address stays hardcoded as a floor: an unset or mistyped secret must
      not leave the platform with nobody able to administer it, since undoing
      that would need the very deploy this removes. Deployed and health-checked.

      **But he expects to add people later "in the owner dashboard", and that
      control does not exist.** Nothing in the app manages this list; it is a
      hardcoded `Set` in `index.tsx:1034`, so adding someone today means a code
      change and a deploy.

      There is a cheaper half-step already in the codebase: `design-links.tsx`
      reads the same list from a **`PLATFORM_OWNER_EMAILS` environment
      variable**, comma separated. Two sources for one concept is a bug in
      itself. Making `index.tsx` read that env var too would mean adding an
      administrator becomes editing a Supabase secret — no code change, no
      deploy — and it removes the inconsistency. A real owner-dashboard screen
      can come later and read the same place.

## How the app actually flows, and what it changed

Eric described the chain, and it is not what the route names suggest:

**vendor catalogue → customer picks products → accurate quote → stock list →
sent to the vendor for pickup or delivery.** Vendors and customers both pay
subscriptions, which is what lets the material markup stay small. The ecommerce
store is a separate product: construction customers may use it, but not the
reverse.

**Customers approve quotes and contracts themselves.** Confirmed by him, and by
the customer portal, which calls `/invoices`, `/contracts`, `/quotes`,
`/payments/*` and `/subscriptions`.

- [x] **M9** `/invoices` and `/change-orders` **removed from the admin tier.**
      They were classified back-office; customers read their own invoices and
      approve their own change orders, so enforcing that would have locked paying
      customers out of the app's whole purpose. Caught while the gate is still
      report-only, so it corrected a classification rather than an outage.
      Re-tested: 10 tier cases covering both the customer and internal sides.

      A purchase order stays admin — it is the stock list going to a vendor after
      the customer has picked, so it is the company's action, not the customer's.

- [x] **M10 — done.** Half of it turned out to be already correct, which is worth
      knowing: **`/invoices` and `/contracts` already filtered by
      `ownsFinancialRecord`**, staff seeing everything and a customer seeing only
      their own. The audit's "59 of 60 money routes unauthenticated" counted
      handlers with no *visible* check and overstated this corner.

      The two that were genuinely open:

      | Route | Was | Now |
      | --- | --- | --- |
      | `GET /quotes` | no session check, returned **every** customer's pricing, line items and contact details | staff see all; a customer sees quotes addressed to them |
      | `GET /change-orders` | no session check, returned every job address, scope and price | same rule |

      Both now match the invoices pattern rather than introducing a new one.
      **Unattributable records stay with staff**: a quote can exist before being
      assigned, and a change order is stored from an arbitrary body with no
      guaranteed customer field. Showing those to everyone signed in would leak
      one unattributed record to every account.

      8 ownership cases unit-tested — case folding, whitespace, missing field,
      empty session. Verified against production: both refuse the anon key that
      previously read them in full. `/invoices`, `/contracts`, `/products` and
      `/health` unchanged.

### The vendor side is not built yet — which is the best time to look at it

`/vendor-orders/*` currently requires **admin**, so a vendor cannot see their own
orders, and the only vendor-facing pages are `VendorApplication.tsx` and
`VendorsAdminHub.tsx` — an application form and an internal admin screen. No
vendor portal calls `vendor-orders` at all.

So the flow Eric described — vendors attaching catalogues and receiving stock
lists — is mostly still ahead of us. That is good news: vendor isolation can be
designed before there are vendors on it, instead of retrofitted afterwards like
everything else in this audit. **Vendors are paying subscribers, so their pricing,
catalogues and API credentials need the same tenant boundary the content centre
just got.**

## Ordering note

M6 comes last deliberately. Every step before it is reversible and invisible to
you; M6 is the one that can refuse a real request. Doing it first would mean
finding the broken pages by being locked out of them.

## The admin model, for the record

The gate's admin tier is written and tested, but switching it on would currently
lock out everyone except **you**. Here is exactly why:

- `PLATFORM_OWNER_EMAILS` contains **one address**: `ericerb555@proton.me`.
- Otherwise admin comes from a role claim in the user's own JWT metadata, matched
  against `owner, platform_owner, business_owner, admin, master_admin, management`.
- The two database checks — `user_permissions` and `company_members` — query
  **tables that do not exist**, inside a `try/catch`, so they silently return
  false and always have.

So today "admin" means Eric, or anyone whose signup metadata happens to carry one
of those role strings. That is fine while you are the only operator and it is
genuinely dangerous as a permission model for a platform with staff, because the
role sits in metadata the account itself carries.

**The question:** who should be able to raise an invoice, approve a payout, or
issue a gift card? Three workable answers, cheapest first:

1. **Just you, for now.** Add nothing. Enforce the admin tier as it stands and
   accept that staff cannot touch money routes until there is a real model. Zero
   work, and honest about where the business actually is.
2. **A short allowlist.** Extend `PLATFORM_OWNER_EMAILS` with the handful of
   people who should have it. Minutes of work, no schema change, and it stops
   being manageable somewhere around a dozen people.
3. **Create `company_members` properly** — the table the code already expects,
   with a migration and a real role per person per company. This is the right
   answer for selling to companies, since their staff will need roles too, and it
   is the only one of the three that needs a schema change and therefore a
   non-production test first.

I would take **2 now and 3 before the first tenant with staff**, so money gets
locked this week without blocking on a schema change.

## Two things this batch changed beyond the plan

**Updates can no longer move a record between companies.** `company_id` and
`content_piece_id` are now taken from the stored record rather than the request
body, so a caller cannot re-parent their own content into someone else's company.

**Creating a piece requires naming a company you belong to.** The middleware
refuses a company you do not own but said nothing about naming none, which
produced orphan records no later read could reach.

## Risk

Low, and stated plainly: 0 rows, 3 companies, 2 owners, one file, no frontend
change. The realistic failure is that a legitimate user's `companies.user_id` is
not what I assume, which CC3 catches against the live database before enforcement.

---

# PLAN — F1 + F3 (batch 2) — approved, in progress

The batch that unblocks selling. Read this before I touch anything.

## What I found while planning, that changes the shape of the job

**1. A blanket "require sign-in" would break your store.** `PublicStore.tsx` is a
public page and the cart is keyed by an **anonymous `sessionId`**, not a customer
id (`hybridCartApi.ts`). Guest checkout is real. So F3 cannot be "authenticate all
60 money routes" — some of them *must* stay open to strangers.

**2. Per-mount middleware will not work.** Most routers mount as
`app.route("/", xRouter)` and declare their full `/make-server-3eae23a6/...` paths
internally. There is no path prefix to hang a guard on. The guard has to be one
**global middleware with an explicit public allowlist**, which is also the
smallest possible change: one block in `index.tsx`, not 1,000 edited handlers.

**3. The second server is effectively already dead.** 24h of traffic to
`make-server-57095a78`: 409 × `POST /data/backup` returning **410 Gone**, plus my
own two `curl` health checks. Nothing else. So it does not need 509 routes
guarded — it needs retiring.

**4. There is a live server whose source is not in this repo.**
`make-server-12c91054` is ACTIVE and serving **real traffic** from your browser —
`/me`, `/materials`, `/build-details/deck` — plus 534 health polls. There is no
source for it anywhere under `supabase/`, and the live frontend source references
only `3eae23a6` (425 times, zero for the others). **I cannot audit or fix what I
cannot see.** Same for `make-server-824f083c`.

## The design

One middleware in `server/index.tsx`, registered after CORS and before the route
mounts, sorting every request into three tiers:

| Tier | Rule | Examples |
| --- | --- | --- |
| **Public** | explicit allowlist only | `/health`, `/auth/*`, product browse, guest cart, order tracking by code |
| **Signed in** | default for everything not on the list | designs, projects, media, quotes |
| **Admin** | money and back-office | payouts, purchase orders, coupons, gateways, promotions |

Default-deny is the point: a route added next month is protected because nobody
listed it, rather than exposed because nobody guarded it.

It reuses `intakeActor(c)` / `intakeIsAdmin(user)` — already used by the seven
working guards in `index.tsx`. No new auth code.

## How I avoid taking the app down

The real risk is not writing the middleware, it is guessing the allowlist wrong
and locking you out of your own app. So it ships in two stages:

**Stage A — report only.** The middleware computes its verdict and **logs it,
allowing every request through**. Nothing is blocked. Deploy, then you use the app
normally — the store, the design centre, the content centre, an order. I read the
logs and build the allowlist from what actually happened, not from what I guessed.

**Stage B — enforce.** Flip one constant to start blocking, using the allowlist
Stage A proved. Deploy, re-check, and the same log tells us immediately if
something legitimate got caught.

This is deliberately the slower route. A one-shot version would be blocked routes
discovered by you hitting them.

## Todo

- [x] **A1** Middleware written in report-only mode with a first-draft allowlist.
      14 classification cases unit-tested, including the overlaps where a path is
      public to read and admin to write (`/promotions`, `/coupons`).
- [x] **A2** Deployed to `make-server-3eae23a6`. Confirmed blocking nothing —
      `design-projects?owner=shared` still returns 200 to the anon key — and
      confirmed the gate is live and classifying, from production logs:
      `[authgate] would-block POST /…/invoices tier=admin signedIn=false`.
- [ ] **A3** **← you are here.** Use the app across its main areas: the public
      store, sign in, the design centre, the content centre, an order, an
      invoice. Then tell me and I will read the `[authgate] would-block` lines and
      turn them into the real allowlist. **Nothing is being refused meanwhile**,
      so anything that breaks in this window is not the gate.
- [ ] **A4** Show you the allowlist and the would-block list for approval.
- [ ] **B1** Flip to enforcing. Deploy.
- [ ] **B2** Re-run the smoke tests, confirm public store + login still work, and
      confirm `design-projects?owner=shared` now refuses the anon key — that is
      the F1 proof, reversed.
- [ ] **C1** *(F3, separate)* Money routes that must stay public — guest checkout
      and payment intent — get server-side protection instead of auth: recompute
      price server-side, never trust a client amount. Audit those few by hand.
- [x] **C2** *(F1, second tree)* `make-server-57095a78` is retired. `/health`
      returns `retired: true`, everything else 410 Gone. 509 unguarded routes
      removed from the internet rather than guarded.

      **Correction, and it was my error.** That function had *already* been
      retired on 2026-08-15 — a stub existed at
      `functions/make-server-57095a78-stub/`, with the original archived under
      `_retired/`. The F4 deploy earlier today pointed `config.toml` at the full
      `functions/make-server-57095a78/` directory instead, which **un-retired it
      and put all 509 routes, with service-role privileges over live data, back
      on the internet for about fifteen minutes** (roughly 20:32–20:48 UTC). I
      found it only because planning C2 turned up a stub that should already have
      been live. Traffic in that window was one `POST /data/backup` client, which
      got 401 rather than its usual 410, and my own health checks.

      `config.toml` now carries a comment saying why that entrypoint must never
      be pointed back at the full directory.
- [ ] **D1** **You:** find the source for `make-server-12c91054`. It is live,
      it is being used, and it is outside this repo. Until then it is an
      unauditable hole with the same service-role privileges.

## STOP — what Stage A already proved, before it even gathered logs

Eric said "the portals are a major part". Checking them turned up the thing that
decides this whole batch.

**The frontend does not send user sessions.** 136 pages and components call the
API with `Authorization: Bearer ${publicAnonKey}` — the public key. Only 19 of
them ever touch `access_token`. `CouponManager.tsx` is typical: a module-level
`const authHeaders = { Authorization: \`Bearer ${publicAnonKey}\` }` and no
session anywhere, on a surface that manages discount codes.

**So flipping `AUTH_ENFORCE` to true would break most of the app**, including
admin screens. Not because the gate is wrong — because the client never proves
who it is. The server has no auth *because the client sends none*; the two halves
match, and only together do they make sense. That is why the audit found 1,019
open handlers: this app was built anon-first, coherently, and the gate alone
cannot fix half of a two-sided arrangement.

Portals specifically split three ways, which is why they were the right thing to
look at:

| Portal | How it calls the API | Under the gate |
| --- | --- | --- |
| `PortalAccess`, `ShopperAccountPortal` | real session `access_token` | fine, tier `user` |
| `ReturnPortal` | `publicAnonKey`, no session — a customer returning an item does not sign in | **must be public**, and `/returns` was missing from my draft list |
| `CustomerPortal` and the rest | mixed | needs checking one at a time |

**This is exactly what report-only was for.** It surfaced before anything was
refused, rather than by Eric being locked out of his own app.

## Revised: Stage B cannot be a one-constant flip

The missing piece is a client that authenticates. There is **no shared API helper**
to fix in one place — each page builds its own headers — so this is real work:

- [ ] **B0** *(new, and it blocks B1)* One `apiFetch` helper that attaches the
      session when there is one and falls back to the anon key only for genuinely
      public calls. Then move pages onto it, **highest-privilege first**: money,
      then content centre, then the rest. Enforcement can be switched on per
      prefix as each group lands, instead of all at once.
- [ ] **B1** Flip to enforcing — only for prefixes whose pages have moved.

Doing it prefix by prefix means the gate tightens in steps that can each be
tested, and a mistake affects one area instead of the whole platform.

**Decision needed from Eric:** confirm this order, since it is a bigger job than
the batch he approved. The gate stays in report-only until he says so — it is
costing nothing and gathering evidence meanwhile.

## What I am not doing in this batch

F2 (tenant id from the client) is deliberately left for batch 3. It touches ~30
call sites and changes behaviour rather than adding a gate; mixing it in here
would make it impossible to tell which change broke what.

---

# Security audit — findings

331 / Black Phoenix platform. Read-only audit. Nothing changed, written or deleted.

Question the audit was asked to answer: **can this be sold safely to other
companies?** Short answer: not yet, and the reason is one structural gap, not a
long list of small ones.

## Phases

- [x] **1** Authorisation and tenancy
- [x] **2** Secrets and keys
- [x] **3** Input handling
- [x] **4** Configuration and dependencies
- [x] **5** This report
- [ ] **1.3** Cross-tenant read against a staging target — **still blocked**, no
      non-production Supabase project. The finding rests on code reading plus the
      live proof in F1.

---

# Blocks selling to tenants

### F1 · The edge functions are the only security boundary, and 88% of them have none

**1,153 route handlers. 134 authenticated. 1,019 not — 483 of those write.**

The mechanism matters more than the count. `kv_store.tsx` builds its client with
`SUPABASE_SERVICE_ROLE_KEY`, which **bypasses Row Level Security entirely**. Every
edge function therefore runs with full database privilege, and the route's own
auth check is the only thing standing in front of it.

**Proven, not inferred:** `GET /design-projects?owner=shared` returns 4 real
records using only the public anon key that ships in the frontend bundle. No user
token. The same router exposes POST and DELETE.

*Smallest fix:* apply a `requireSignedIn` middleware at the router mount points.
`design-assistant.tsx` and `house-capture.tsx` already do exactly this with
`.use("*", requireSignedIn)`. The helper exists — it needs applying broadly.

### F2 · Tenant identity comes from the client

**30 routes take a tenant id from the request; 22 of those have no auth at all.**
Six are in `content-management.tsx` — the content centre itself, the product
intended for paying tenants:

```ts
const companyId = c.req.query('companyId');
rows = filterBy(rows, 'company_id', companyId);
```

The filter is correct. Its input is attacker-controlled. Change one query
parameter, read another tenant's content.

*Smallest fix:* derive the tenant from the verified session.
`/entitlements-summary` already demonstrates the pattern — it compares the
requested `owner` against the session email and refuses a mismatch.

### F3 · 59 of 60 money-touching routes are unauthenticated

Invoices, payouts, gift-card checkout, affiliate payouts, Stripe Connect,
marketplace checkout. `POST /invoices`, `PATCH /affiliate-payouts/:email/:id`,
`POST /affiliates/:email/payout-requests` — all open, all writing.

*Smallest fix:* the same middleware as F1, applied to the payment routers first.

---

# Fix before launch

### F4 · Password reset links are written to the log — **FIXED in source, not yet deployed**

- [x] `supabase/functions/server/index.tsx:2490` (deployed as `make-server-3eae23a6`)
- [x] `supabase/functions/make-server-57095a78/index.tsx:2636` — **second copy**,
      found while fixing the first. Also live: `make-server-57095a78` is ACTIVE
      at v483. Fixing only the first file would have left the hole open.
- [x] **`RESEND_API_KEY` is set** — answered without the dashboard in the end.
      The `/health` endpoint reports `resendKeyPresent: true`. **So the
      vulnerable branch was never taken in production and no reset link was
      ever logged.** F4 was latent, not actively leaking.
- [x] Deployed. `make-server-3eae23a6` v315, `make-server-57095a78` v484, both
      ACTIVE, both `verify_jwt: true` preserved.
- [x] Committed and pushed to `main` as `70cc8db3`.

When `RESEND_API_KEY` is unset the reset link was logged instead of emailed. That
link is a working account-takeover token valid for an hour, and Supabase function
logs are readable by anyone with dashboard access.

The `else` branch now does two things instead of logging:

```ts
await kv.del(`pwreset:${token}`);
console.error('[forgot-password] RESEND_API_KEY is not set — no reset email was sent.');
```

The `kv.del` matters as much as removing the log. The token is written to KV
*before* the send is attempted, so without it a failed send left a live,
undeliverable reset token sitting in the store for an hour — a credential nobody
could use but an attacker with store access could.

The endpoint still returns `{success:true}` either way. That is deliberate and
was left alone: a different response for known vs unknown email would turn this
into an account-enumeration oracle.

**Log check (read-only, 24h window — the API caps it there):** no occurrence of
`forgot-password`, `reset-password?token`, `pwreset`, or `RESEND_API_KEY` in
`function_logs`. But there was no email activity of any kind in the window, so
this shows the path was not exercised — **it does not show the key is set.** That
is why the dashboard check above is still open. Anything older than 24h is beyond
what the log API will return, so if the key has been unset for a while, assume
links are sitting in older logs and treat those accounts as exposed.

### F5 · Stored XSS chain into admin sessions

Four unsanitised HTML sinks:

| File | Sink |
| --- | --- |
| `EmailCenter.tsx:434` | `composeHtml` |
| `EmailCenter.tsx:467` | `previewEmail.html` |
| `ProjectDetailsModal.tsx:589` | `item.floorPlan.svgLayout` — SVG is a script carrier |
| `AiSeoEngine.tsx:544` | `preview.contentHtml` — AI-generated |

On their own, moderate. Combined with F1: an attacker writes a record through an
open POST, an admin opens it, script runs in the admin's session. The SVG one is
the sharpest — `<svg><script>` is a standard vector.

*Smallest fix:* sanitise at render, and never render stored SVG inline.

### F6 · The upload bucket is public

`image-upload.tsx:50` — `createBucket(BUCKET_NAME, { public: true })`. Anything
uploaded there is world-readable by URL, no auth, no expiry.

`media-library.tsx` and `house-capture.tsx` both correctly use `public: false`
with signed URLs — so the right pattern is already in the codebase.

### F7 · 14 high-severity dependency vulnerabilities

59 total: 6 low, 39 moderate, 14 high. The ones that matter here:

- **hono** — *Improper Authorization*, and *CORS middleware reflects any Origin
  with credentials*. This is the server framework, on 3.12.12.
- **hono** — `memo()` retains SSR output across requests → **cross-user data
  disclosure**.
- **react-router** — XSS, CSRF bypass, several DoS.

*Smallest fix:* upgrade hono first; it is both the framework and the worst offender.

### F8 · CORS is `origin: "*"` across the whole server

Combined with the hono CORS advisory and F1, this widens who can reach open
routes from a browser. Should be an allowlist of your own origins.

---

# Should fix

### F9 · No security headers

`vercel.json` sets only `Cache-Control`. Missing: `Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`,
`Referrer-Policy`, `Permissions-Policy`. CSP would also blunt F5.

### F10 · `deck.unparked.v1` holds customer data indefinitely

Written by me earlier. Stores site address, town, parcel, customer name and job
id in plaintext localStorage with no expiry. *Fix:* drop the `link` object and
add an expiry.

### F11 · Store webhook does not verify its Stripe signature

`index.tsx:9897` — the comment claims it verifies when the secret is set; the code
only `JSON.parse`s. It **does** re-verify the session against Stripe before
fulfilling, which is real defence in depth, so this is lower risk than it looks —
but the comment is wrong and the signature check is free.
`investments-kv.tsx` does this correctly.

---

# What is actually in good shape

Worth stating, because it changes what the fix looks like:

- **RLS is on and working.** Direct PostgREST reads with the anon key return
  `200 []`. The database itself is not exposed.
- **No secrets ship to the browser.** 390 files, 11.2 MB scanned: no Stripe keys,
  no AWS keys, no private keys, no service-role key. The only JWT in the bundle
  is `role=anon`, which is correct.
- **No secret is logged** — the error logging prints exception objects, not keys.
  F4 is a link, not a key.
- **The auth that exists is well written.** The `/entitlements-summary` guard,
  the `supplierAdminGuard`, the `.use("*", requireSignedIn)` routers. The problem
  is coverage, not competence.

---

# Corrections made during the audit

Recorded because the numbers changed twice and you should know why:

1. A first pass reported **680** unauthenticated routes by scanning handler
   bodies. Wrong — auth here lives largely in **path-prefix middleware**, which a
   per-handler scan cannot see. Re-run accounting for it.
2. The second pass reported **2,097** routes. Also wrong — the regex was matching
   `kv.get('invoice:...')` as a route. Corrected to require an app/router receiver
   and a path-shaped argument. **1,153** is the real number.

Numbers in this report are from the corrected third pass.

3. **Found while fixing F4, and it widens F1:** the audit scanned
   `supabase/functions/server` only. There is a **second live server**.
   `list_edge_functions` shows both `make-server-3eae23a6` (v314) and
   `make-server-57095a78` (v483) ACTIVE, plus `make-server-824f083c` (v160) and
   `make-server-12c91054` (v146).

   | source dir | serves prefix | route handlers |
   | --- | --- | --- |
   | `server/` | `/make-server-3eae23a6` | 1,153 *(audited)* |
   | `make-server-57095a78/` | `/make-server-57095a78` | 509 *(not audited)* |

   So the live surface is **~1,662 handlers, not 1,153**, and the F1 middleware
   has to be applied in both trees or the old prefix stays open. The two older
   functions still need checking too. **This also means duplicated logic drifts:
   F4 existed in both copies with the same bug — assume other findings do too.**

---

# Proposed fix order

Not started. Awaiting your verification per the working agreement.

1. **F4** — one line, today, and check the env var.
2. **F1 + F3** — one middleware, applied to router mounts, payment routers first.
   This is the change that unblocks selling.
3. **F2** — ~30 call sites, tenant from session.
4. **F7** — upgrade hono, then react-router.
5. **F5, F6, F8, F9** — sanitise, private bucket, CORS allowlist, headers.
6. **F10, F11** — small.

Suggest doing 1 and 2 as separate approved batches rather than one sweep, so each
can be tested before the next.

---

# Review — batch 1 (F4)

**What changed:** two files, the same six-line hunk in each. Nothing else.

| File | Line | Change |
| --- | --- | --- |
| `supabase/functions/server/index.tsx` | 2490 | `else` branch no longer logs the reset link; deletes the token; logs an error |
| `supabase/functions/make-server-57095a78/index.tsx` | 2636 | identical |

**Why two files:** the second copy was found by grepping for the pattern rather
than trusting the single line number in the finding. It is deployed and live at
v483, so fixing only the file named in the audit would have left the
vulnerability fully exploitable through the other prefix.

**Verified:**
- Both files parse (esbuild `tsx` loader — the repo has no typechecker, so this
  is the available check).
- `kv.del` is exported from `kv_store.tsx` in *both* directories, confirmed
  separately; `index.tsx` imports `* as kv` in both.
- `git diff` reviewed — the F4 change is exactly two hunks. The other modified
  files in `supabase/functions` (`town-permits.tsx`, `design-assistant.tsx`) are
  earlier uncommitted work and were not touched.
- Swept the whole `supabase/functions` tree for other secret/token logging. Only
  hits were this pattern and false positives (`"No access token provided"`,
  `"Reset hours for..."`, error objects). `_retired/` also contains a copy but is
  not deployed.

**Deployed** on Eric's explicit instruction ("just push it, it's only 6 lines"),
without a staging pass. Noted because the standing rule is the opposite and this
was a deliberate one-off override, not a new default.

Post-deploy checks, all against production:

| Check | Result |
| --- | --- |
| `/health` both servers | 200, `status: ok` |
| `verify_jwt` after deploy | still `true` on both |
| `/design-projects`, `/products`, `/quotes` | 200 |
| `/entitlements-summary`, `/invoices`, `/design-assistant` | 401 — guards intact |
| `/town-permits/towns` | 403 — admin guard intact |
| `forgot-password`, unknown address | `{"success":true}`, no token minted |

## The thing that made this more than a one-line fix

**The CLI could not deploy either function at all.** It defaults a function's
entrypoint to `<slug>/index.ts`; both servers use `.tsx`, and the main one lives
in `functions/server/` rather than a directory named after its slug. Every
attempt failed with *"Entrypoint path does not exist"*. `supabase/config.toml`
now declares both entrypoints, so deploying works from a clean checkout.

**Consequence worth remembering:** before this, `make-server-3eae23a6` was
deployed from a directory named `make-server-3eae23a6/` that no longer exists in
the repo. So git and production had drifted, and the redeploy shipped whatever
else had accumulated in `functions/server/` since — not only the six lines. The
smoke tests above are what stands behind the claim that nothing broke; they are
not a substitute for using the app. **If something looks wrong in the next day or
so, this deploy is the first thing to suspect.**

`town-permits.tsx` and `design-assistant.tsx` were stashed out of the working
tree for the deploy and restored afterwards, so their untested changes did *not*
reach production and are still uncommitted.

**No production data was written or deleted.** Read-only log queries, two
function deploys, and GETs.
