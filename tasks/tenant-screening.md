# PLAN — tenant screening as an automated business line

Eric picked this out of ten candidates on 2026-10-03. Written before any code,
and checked against the running code the same day.

Not in `tasks/todo.md` because that file is a 12,500-line shared log and another
session is working in the tree right now. Same convention as
`store-autonomy.md` and `one-job-identity.md`.

---

## The business, in one paragraph

A landlord, property manager or condo association already collects rental
applications through this platform. Today an application arrives carrying the
applicant's own *estimate* of their credit score, which is worth nothing. The
business is to turn that into a real credit, eviction and criminal report —
ordered by machine, delivered in minutes, with no person in the loop — and to
earn the spread between what the consumer reporting agency charges us and what
the report sells for.

**Why it scales the way nothing else on the list does: revenue follows
applications, not units.** A single vacancy draws five to fifteen applicants.
A landlord with ten units might sign three leases a year and screen thirty
people. The unit count is the floor, not the ceiling.

**That thesis is half wrong in the two states Black Phoenix actually works in,
and the research below is what corrected it.** In Massachusetts a landlord may
not charge an applicant at all, so the fee is the landlord's cost. In New
Hampshire the applicant may be charged, but everything above documented cost
has to go back to anybody who is not rented to, within thirty days. So in both
home states the *margin* follows leases signed, not applications — the
application volume only recovers cost. The per-application thesis holds in
states like Florida, with no cap and no refund duty. This is worth knowing
before anybody forecasts on it.

---

## What already exists, verified in the code

    src/app/pages/TenantApplication.tsx        public application form, token link
    index.tsx:9619  GET  /screening/:token      validates the link
    index.tsx:9627  POST /screening/:token/apply stores the application
    index.tsx:9507  GET  /landlord/applications landlord inbox + shareable link
    index.tsx:9545  PATCH /landlord/applications/:id  approve -> creates a tenant
    index.tsx:8948  Stripe Connect Express, destination charges, application_fee_amount
    landlord_applications:{email}              the application records
    landlord_screening:{email}                 one permanent token per landlord

The form already has a `consentBackground` checkbox. **Nothing on the server
reads it.** `buildApplicationRecord` copies it into the record and no code path
ever looks at the value. That checkbox is the hook this entire business hangs
on, and it is currently decoration.

The form also asks for `creditScore` as a free-text "(est.)" field, which the
applicant types about themselves.

## What does not exist

No screening order, no provider integration, no fee, no decision record, no
adverse-action notice, no retention rule. The word "screening" appears in the
server only as that token name.

---

## The one architectural rule this plan is built around

**An applicant's Social Security number must never reach a Black Phoenix
server, a Black Phoenix log, or the key-value store.**

This is not caution, it is the design. The existing applications live as a
plain array under `landlord_applications:{landlord email}` holding name, email,
phone, address, employer and income. Adding a date of birth and an SSN to that
array would create, in one commit, the most attackable record in the repository
and a breach-notification obligation in fifty states.

So the integration shape is fixed: **the consumer reporting agency hosts the
identity collection.** We create an order and hand the applicant a link into
the partner's own flow. They enter their SSN and answer the identity
verification questions on the partner's page. The report is produced on the
partner's infrastructure and delivered to the landlord through a link we hold a
reference to and never the contents of.

What we store is an order and a status. Nothing else.

    screening_order:{id}   landlordEmail, applicationId, applicantEmail,
                           provider, providerRef, status, requestedAt,
                           completedAt, expiresAt, priceCents, costCents,
                           permissiblePurpose, authorizationCapturedAt
    screening_orders_landlord:{email}   index of order ids

No score. No report body. No identity fields. A landlord who needs the report
follows a short-lived link into the provider.

This also means the margin is computable per order — `priceCents` minus
`costCents` — which is the same discipline as a purchase order carrying what
the vendor was actually paid.

---

## How it ties into what is already here

**Identity and authorisation.** `landlordActor` already resolves the signed-in
landlord and refuses without an active portal. Every screening route uses it
unchanged. An order is reachable only from the landlord who created it; the
applicant reaches only their own, through a single-use token. Staff may read
order *metadata* for support and billing, and never the report.

**Price.** The fee comes from the published plan catalogue, like every other
price on the platform, rather than a constant in a route file. One catalogue
entry, one place to change it.

**Money.** The applicant pays the platform's own Stripe account, not the
landlord's connected one — we are selling our own service, so there is nothing
to split and no `application_fee_amount` involved. The partner's cost is
recorded against the order when the invoice arrives.

**The clock.** Three things need a tick, and all three go on the shared
scheduler being built in the other session, using the machine-auth pattern
`autopilot.tsx` already gets right (shared secret from `private_cron_config`,
refuse when unset): expire stale invitations, chase an applicant who has paid
and not finished identity verification, and purge orders past their retention
window.

**Documents.** A decline produces an adverse-action notice, which is a document
like any other here: viewable as it will really look, and printable to PDF.

**Portals.** Landlord first. Property manager and condo association reuse the
same provider interface with a different actor resolver, which is why the
provider call sits behind one small interface rather than inside the landlord
routes.

---

## What is genuinely blocking, and belongs to Eric

These are not engineering tasks and I should not pretend they are.

**1. A consumer reporting agency agreement.** We cannot order reports without
one, and the credible partners vet the requester before switching them on —
some require a site inspection of the office. Nothing in phases 1 onward can
be tested against anything real until this exists. The candidates to compare
are a hosted-flow product aimed at independent landlords versus a screening
API; the hosted flow is slower to customise and carries far less legal weight
on us, which is why this plan assumes it.

**2. Who the fee is charged to, by state. — ANSWERED 2026-10-03, by looking
it up.** This item used to say the question needed a lawyer. Eric pushed back
and asked why I could not just find the answer, and he was right: the general
rule is published statute, not a judgement call.

**In Massachusetts a landlord may not charge an application, credit-check or
screening fee at all.** G.L. c. 186 § 15B(1)(b) is a closed list of what may be
required at or before the start of a tenancy — first month's rent, last month's
rent, a security deposit of up to one month, and the cost of a key and lock.
A screening fee is not on the list, so it cannot be collected. Worse than
merely void: a § 15B violation is also an unfair practice under c. 93A, which
carries multiple damages and attorney's fees.

The one Massachusetts exemption is **licensed real estate brokers**, who charge
under 254 CMR 7 rather than § 15B. Black Phoenix is not a broker, so that door
is shut unless somebody deliberately walks through it.

**So in Massachusetts the screening fee is the landlord's cost, full stop.**
That is exactly what the build already defaults to, which is the one piece of
luck in this: the safe default turned out to be the only lawful option in our
own state.

Elsewhere it varies, and the shape of the variation matters more than any single
figure:

    Vermont          banned outright, no exemption
    Massachusetts    banned for landlords; brokers exempt (254 CMR 7)
    New Hampshire    allowed, no cap — but disclose in writing first, and
                     refund the markup to anybody you do not rent to
    New York         the lesser of actual cost or $20 — and the fee must be
                     WAIVED entirely if the applicant brings their own report
                     from the last 30 days
    New Jersey       $50 cap (2026)
    Washington DC    $54 (2026)
    Wisconsin        $25 per credit report
    California       $65.86 (2026, indexed) and only actual costs plus the
                     reasonable value of time
    MN / WA / CO     actual cost only, refundable if the screening is not used
    Florida          no statutory cap

Two patterns worth building around rather than against. Several states index
their cap annually, so any figure hardcoded here is wrong next year. And the
New York rule is not a cap at all but a *portability* rule: an applicant with a
recent report of their own cannot be charged, which is a feature request, not a
price.

### New Hampshire, looked up on Eric's instruction

Black Phoenix works both sides of the border, so this one matters as much as
Massachusetts — and it is the opposite answer with a sting in it.

**Charging the applicant is lawful in New Hampshire. There is no cap.** But
`RSA 540-A:3 VIII` — amended by 2024 ch. 46:1 and ch. 370:4, both effective
1 January 2025 — attaches two duties, and they are not optional:

> *"Prior to collecting any fee as part of the rental application or renewal
> process, the landlord shall clearly disclose, in writing to prospective
> tenants, the amount of the fee and the requirement for a satisfactory
> criminal background and credit check, if any."*

> *"If such fee is collected from an applicant, but the unit is not rented to
> that applicant, the landlord shall return any amount beyond the actual cost
> of the documented background check, credit check, and/or reasonable
> administrative costs to the applicant within 30 days of receipt."*

So in New Hampshire the fee is **cost recovery for everybody you turn down.**
The markup survives only on the applicant who actually gets the unit — unless
our platform fee itself counts as "reasonable administrative costs", which is
the one reading that decides whether this is a business in New Hampshire or a
break-even service. That is a real question for a lawyer and a narrow one.

It also lands squarely on this build. `costCents` is already stored per order,
which is exactly the "actual cost of the documented background check" the
refund is measured against — the design happens to support the obligation, but
nothing performs it yet. Two things are missing:

- **A written disclosure before the charge.** The checkout takes money with no
  disclosure screen in front of it. New Hampshire requires the amount and
  whether a satisfactory check is required, in writing, *prior to collecting*.
- **An automatic refund within thirty days** when an applicant-paid screening
  belongs to somebody who was not rented to.

The refund is worth distinguishing from the one this plan earlier refused to
automate. A refund because the provider failed after taking the money is a
judgement about an error nobody understands yet, and that stays with a person.
A refund because a statute says a rejected applicant is owed the difference
within thirty days is mechanical: the trigger is a recorded decision, the
amount is `priceCents - costCents`, and the deadline is fixed. **That one
should be automated**, and it belongs on the same clock as the expiry sweep.

**One to watch rather than act on.** `HB 1375` would bar more than one
application fee from the same prospective tenant in any twelve months,
regardless of how many units they apply for. As of the latest information it is
pending in the House Housing Committee and **not law**. If it passes it is a
real change to the model, because it makes the fee a property of the
*applicant* across every landlord on the platform rather than of the
application — which only a platform like this one could even detect. Worth
re-checking before New Hampshire pricing goes live.

**WHAT IS STILL GENUINELY A LAWYER'S QUESTION, AND IT IS NARROW**

Only this: whether **Black Phoenix** charging the applicant directly — as its
own service, not as the landlord's fee — escapes § 15B in Massachusetts. My
reading is that it does not, because it is the landlord's screening either way
and c. 93A reaches an unfair practice by any business, not only by a lessor;
and because the only published exemption is for brokers, which we are not.
That reading is worth one hour of a Massachusetts real-estate lawyer's time
**only if Eric wants applicant-paid screening in Massachusetts.** If the answer
is "the landlord pays", which is what the system already does, there is nothing
left to ask.

**AND NOTHING LEGAL IS HARDCODED, DELIBERATELY**

The table above lives in this document, not in the code. `jurisdictions.tsx`
already states the reason and it applies exactly: *"a rule this system did not
learn from a person is a rule it does not have... Shipping pre-loaded ordinances
would work on day one and rot in silence."* A statutory cap that was right in
2026 and wrong in 2027 is the same failure. The per-state payer stays data that
somebody set on purpose, and the code's only built-in rule is the one that
cannot go stale: an unknown state never charges the applicant.

**3. Adverse action.** When a landlord declines someone because of a report,
federal law obliges a notice naming the agency and the applicant's rights. The
machine can draft and send it; somebody has to approve the template once.

Until 1 and 2 are settled, phase 0 is the only phase that can ship, and it is
worth shipping regardless of whether this business ever launches.

---

## Phase 0 — the holes that exist today
*Shippable now, no partner, no legal dependency.* **Done 2026-10-03, see Review.**

- [x] **The application link never expires and cannot be revoked.**
      `landlord_screening:{email}` mints one token per landlord, once, forever,
      and `screening_token:{token}` carries only `landlordEmail` and
      `createdAt`. A link posted on a listing site three years ago still works.
      Add an expiry and a rotate-and-revoke control for the landlord.
- [x] **The public apply route has no rate limit.** `POST
      /screening/:token/apply` is unauthenticated and writes into an array that
      grows without bound, so anyone holding a link can fill a landlord's inbox
      and the key-value record behind it. Cap per token per hour.
- [x] **Say where the credit score came from.** Label the existing field
      self-reported in the landlord's inbox. It reads today like a fact.
- [x] **Record the consent properly.** Store a timestamp and the wording the
      applicant actually agreed to, not a boolean. A bare `true` proves
      nothing later, and this is the record the whole business rests on.

## Phase 1 — the order, behind a provider interface
*Done 2026-10-03, see Review.*

- [x] `ScreeningProvider` interface: `createOrder`, `inviteUrl`,
      `fetchStatus`, `reportUrl`. One file, no provider specifics outside it.
- [x] A `manual` provider that does nothing but move the status, so the whole
      flow is testable before any agreement exists.
- [x] The order record and its index; the state machine
      (`created → paid → invited → verifying → complete | expired | failed`).
- [x] Landlord routes: request screening for an application, list orders, open
      a report link. Per-record ownership on every one.
- [x] Applicant route: a single-use token that reveals only their own order.

## Phase 2 — money

- [x] A fee setting (not a catalogue entry — see the review) with a per-state payer.
- [x] Stripe Checkout against the platform account; the order advances only on
      a verified webhook, never on a browser redirect.
- [x] `costCents` recorded per order, and a margin figure in the revenue
      reporting that already exists.

## Phase 3 — the real provider and the decision

- [ ] The partner provider implementation, plus its webhook.
- [x] Permissible-purpose certification captured per order, before the invite.
- [x] Landlord records a decision; a decline produces the adverse-action
      notice as a viewable document with a PDF.
- [x] Expiry sweep on the clock, and the retention purge alongside it — the
      purge stays off until `SCREENING_RETENTION_DAYS` is set.

## Phase 4 — the other portals

- [ ] Property manager and condo association, same interface, different actor.

---

## What I am deliberately not proposing

**No score, band or recommendation stored by us, and no approve-or-decline
suggestion from the machine.** The moment this software appears to decide who
gets housing, it is in fair-housing territory and a disparate-impact argument
is somebody else's lawsuit against Eric. The landlord decides; we deliver the
report and record what they chose.

**No scraping of court or eviction records as a cheaper substitute for a
partner.** It is the obvious shortcut, it is what the low-cost competitors do,
and it is how screening companies end up as defendants — a name match is not a
person.

## Review — phase 0, 2026-10-03

### What changed

**A new file holds the rules: `supabase/functions/server/screeningLink.ts`.**
The link's state machine, the submission caps and the consent wording live
there rather than in `index.tsx`, for the reason `aiCeiling.ts` gives for its
own existence: the test runner strips types from `.ts` only, so a rule written
inside a `.tsx` route file cannot be checked by hand. These decide who may
reach a landlord's records, which is exactly the kind of rule that should be
tested. `tests/screeningLink.test.ts` pins sixteen of them.

**The link now expires and can be turned off.** A token carries `expiresAt` and
`revokedAt`, ninety days by default. Two new routes — `POST` and `DELETE` on
`/landlord/applications/link` — replace and revoke it, and the portal shows the
expiry date next to the link with *Replace link* and *Turn off* beside it.

Three details worth knowing:

- **The loader no longer mints silently over a dead token.** It used to create a
  link whenever none was stored, which would have undone a revoke on the
  landlord's very next page load. A landlord with no usable link is now told
  which of the three things happened and presses a button.
- **Expired, revoked and never-existed are reported separately**, because only
  one of them is the landlord's deliberate act, and a prospect in front of the
  form should not be told their link is invalid when the landlord switched it
  off. Both public routes answer `410` for those two and `404` only for a token
  that was never real.
- **Old tokens are grandfathered, not killed.** Tokens minted before this
  carried no expiry; treating that as expired would have broken every live
  advert the moment this deployed, so the first read stamps ninety days on. A
  *revoked* token never takes that path — there is a test for exactly that,
  because the one thing worse than an immortal link is one that resurrects.

**The public route has caps.** Five submissions per fifteen minutes and forty
per day, per link. Counted from the timestamps on the applications already
stored rather than a separate counter, which cannot then disagree with the
truth, and only `source: 'public'` records count — a landlord typing in forty
applications by hand must never lock out their own link. The refusal names the
window that bit so a flood is distinguishable in the log from a busy week.

**The consent is a record instead of a boolean.** `consentAt` and the exact
`consentText` are stored, and the wording is owned by the server: the form asks
`GET /screening/:token` for it and renders what comes back, so what was shown
and what was stored cannot drift. A `true` with no wording and no timestamp
proved nothing, and this record is the entire basis for ever ordering a report
about somebody. The landlord's inbox shows the date and quotes the sentence.

**The self-reported credit score says so.** It read as `Credit: 740`. It now
reads `Credit score: 740 — self-reported by the applicant, not a credit report`.

### Checks

    typecheck   app 316, server 89 — both at baseline, nothing added
    smoke       18 rendered, 0 threw
    tests       1453 pass, 0 fail (16 of them new)

### Not verified, and how

The server half is a Supabase edge function, so **none of the route behaviour
has been observed running** — the function has not been deployed. What is
proven is the logic (unit tests) and that both touched screens still mount
(smoke). The expiry, the revoke, the `410`s and the caps are unverified against
a live request until the function ships.

### Deliberately not done (phase 0)

**Consent is still optional on the form.** The plan said record it properly, not
require it, and a landlord who never screens anybody should not be forced to
collect a consent they will not use. When phase 1 can actually order a report,
consent becomes a precondition of *ordering* — which is the right place for it,
since that is the moment it matters.

**No migration of existing records.** Applications already stored keep their
bare `consentBackground` with no timestamp and no wording. Back-filling a
consent date we never recorded would be inventing evidence; the inbox simply
shows nothing where there is nothing. Such a record cannot support a screening
order, and phase 1 must refuse to build one from it.

---

## Review — phase 1, 2026-10-03

### The production bug found on the way in

**The public rental application form was returning 401 to every prospect.**

`AUTH_ENFORCE` is on, `/screening/` appeared in none of the public lists, and
`intakeActor` resolves no user from the anonymous publishable key the form
sends — so the tier for the path was `user`, the gate refused, and the form
turned the refusal into *"this application link is invalid or has expired."*
The link was fine. Every prospect a landlord ever sent a link to was turned
away and told it was their link's fault.

This is the third instance of the same bug class already documented in that
file: a share link sitting behind the wall it exists to bypass. The comment
above `/quotes/by-token/` records the same discovery about quote signing links,
and `/architect-review/review/` the same about architects.

`/screening/` is now exempt as a whole prefix — deliberately the opposite of the
one-path-at-a-time treatment `/exchange/` gets, because everything under
`/screening/` is addressed *by* a token and nothing under it is reachable
without one. The landlord's side lives at `/landlord/screening` and the test
harness at `/staff/screening`, both outside the prefix and both still behind
the wall.

**This is unverified in production**, like the rest of the server half. It is a
one-line addition to a list whose behaviour is well understood, but the proof
is a signed-out request to `/screening/:token` answering 200, and that needs
the function deployed.

### What was built

**`screeningOrder.ts`** — the state machine, the consent gate, the ownership
check and the projections. **`screeningProvider.ts`** — the `ScreeningProvider`
interface and the `manual` provider. Twenty tests in
`tests/screeningOrder.test.ts`.

Six routes: order a screening for an application, list orders, read one order
with a report link, the applicant's own view, the applicant starting
verification, and a staff-only route to advance a manual order.

The landlord's review modal now shows a Tenant screening panel with an **Order
screening** button, the order's status, and a plain note that the applicant's
Social Security number is never entered here.

### The decisions worth knowing

**No route writes a status.** Everything goes through one `advanceOrder`
helper over `transition()`. A handler that assigned `order.status` directly
would bypass the only rule stopping a finished report being walked backwards by
a late webhook, so there is exactly one place that can move an order.

**A repeated status is a noop, not an error.** Providers resend; a webhook
delivered twice has to be boring.

**The consent gate is where phase 0's record earns its keep.** An order is
refused unless the application carries consent, a parseable date and the
wording. Applications from before phase 0 have the boolean and nothing else,
and they are refused with a message telling the landlord to send a current
link — as promised in the phase 0 review, and tested.

**A provider that is not `live` is refused a report link.** Without that, a
landlord could advance a manual order to `complete` and be shown something
that resembles a screening report and is not one. A fake report is worse than
no report, because somebody acts on it.

**Advancing a manual order is staff-only.** A landlord who could move their own
order to `complete` could manufacture the appearance of a screening.

**Someone else's order answers 404, not 403.** A 403 confirms the id exists,
which is a slow way to enumerate other landlords' screenings.

**The projections are allow-lists.** `landlordView` and `applicantView` can
only emit the fields named in them, so a field added to the record later is
invisible until somebody decides it should be visible. Tests assert that a
record carrying `ssn`, `reportBody` and a credit score emits none of them, and
that the provider reference — the handle on the report itself — never reaches
either party.

**One live order per application.** Re-ordering a screening somebody is part
way through would charge twice in phase 2 and leave the applicant holding two
invitations.

**The applicant is emailed only when there is somewhere real to send them.**
The manual provider returns no invitation URL, and an email asking somebody to
verify their identity at nowhere is worse than silence.

### Where this departs from the plan

**"A single-use token" is implemented as single-*order*, not single-*read*.** A
token that burned on first read would break a page refresh, which is the first
thing an anxious applicant does. It is 128 bits, bound to one order, and
reveals that order alone. Expiry on the invitation itself is the provider's,
once there is one.

### Checks

    typecheck   app 316, server 88 — nothing added (server is one BELOW the
                89 baseline; the other session fixed one in marketplace.tsx)
    smoke       23 rendered, 0 threw
    tests       1473 pass, 0 fail (20 of them new)

### Not verified, and what it would take

No route has been exercised against a running server — the edge function is not
deployed. Deployed, the whole of phase 1 is checkable by hand without a
provider agreement: submit an application with consent, order a screening, see
it sit at `invited`, advance it as staff through `verifying` to `complete`,
confirm the report link is refused because the provider is not live, and
confirm a second landlord's account gets a 404 for the same order id.

### Deliberately not done (phase 1)

**No expiry sweep.** `invited → expired` is legal in the machine and nothing
performs it, because that is the clock's job and the clock belongs to the other
session's work. Phase 3 attaches it.

**No `fetchStatus` polling route.** The manual provider never advances on its
own, so a poll would be a no-op with a cost. The real provider arrives with a
webhook in phase 3, which is the right shape anyway.

**No condo or property-manager access.** Phase 4, and the only reason it is
cheap is that the provider call never learned who the actor was.

---

## Review — the expiry sweep, 2026-10-03

Taken out of phase 3 because phase 2 is blocked on the two answers that are
Eric's, and this part needed neither.

### What was built

`POST /cron/screening/expire-invitations`, plus `inviteDeadline` and
`inviteLapsed` in `screeningOrder.ts` and eight more tests. The schedule is
parked as `20261003120000_schedule_screening_expiry.sql.pending`, hourly at
seven minutes past, in the same shape as the two jobs already waiting beside
it.

**Why a sweep and not a check when somebody opens the page.** Because an order
nobody looks at still has to stop being live. Expiring lazily would show
`invited` for an invitation that died three weeks ago, and in phase 2 it would
mean a refund was decided by who happened to load a page.

**The deadline is the provider's when there is one**, and fourteen days from the
invitation when there is not. An order with no readable invitation date gets no
deadline at all and is left alone — expiring it would destroy the only evidence
of what went wrong.

**Everything goes through the same `advanceOrder`.** The sweep cannot do
something a route could not, so it cannot expire a `complete` order. That is
asserted from both sides: the machine refuses the transition, and `inviteLapsed`
returns false for every status except `invited`. Stated twice on purpose — a
sweep that asks for a refused transition would log a refusal every night for
ever.

**Idempotent.** A second run finds nothing, because the first moved those orders
out of `invited`. Overlapping schedules are harmless.

**It scans the orders themselves, not each landlord's index.** An order that no
index points at is exactly the kind that would otherwise sit in `invited` for
ever.

### What was checked in production while doing it

The on-call migration parked since September says `private_cron_config` is
"readable and writable by anyone holding the publishable key" and lists closing
that as a precondition for switching any further cron job on. I read the live
database, found row-level security enabled on the table with no policies, and
wrote that the hole "is closed" — and that `compliance_cron_secret` should be
rotated because it had sat there in the open.

**The second half of that was wrong, and so was the premise.** The other session
checked the grants rather than just the RLS flag: `anon` and `authenticated`
hold no grants on that table at all, so the publishable key could never reach
it through the REST API. The table was never exposed, no secret leaked, and
nothing needs rotating. RLS is a second lock, not a repair. Both my migration's
notes and the on-call file have been corrected; the precondition genuinely does
not block the clock, but not for the reason I first gave.

### A blocker for the other session's clock — since fixed by them

**`/autopilot/cron-tick` was not in `PUBLIC_POST_PATHS`.** Flagged here rather
than fixed, for the collision reason below; the other session has since listed
both it and `/store/cron-tick`, and their migration's notes call this "the third
time the trap has come up". Leaving the original note intact because the
reasoning is the useful part. The two live-or-parked
sweeps are there by exact path — `/compliance/run-reminders` and
`/on-call/escalate-due` — because a scheduler carries only the publishable key
and the wall refuses it. The autopilot tick is not, so renaming
`20260928120000_schedule_autopilot_tick.sql.pending` would produce a job that
is refused every time it runs and tells nobody. It is a one-line addition to
the same list.

**Not fixed here on purpose.** The clock is being built in another session, that
line is in their path, and two sessions adding the same line to a 17,000-line
file produces a conflict rather than a fix.

### Checks

    typecheck   app 316, server 87 — nothing added (server is two BELOW the 89
                baseline; the other session is fixing them in marketplace.tsx)
    smoke       23 rendered, 0 threw
    tests       1481 pass, 0 fail (8 of them new)

### Not verified

The route has not been called. The sweep's logic is tested, but the secret
check, the `getByPrefix` scan and the schedule itself are unproven until the
function is deployed and the migration renamed — and the migration must not be
renamed before `SCREENING_CRON_SECRET` exists, or the job will be refused every
hour in silence, which is the exact failure the parked on-call file warns about.

---

## Review — permissible purpose, and why phase 4 was not built, 2026-10-03

Asked for "next" after the expiry sweep. Phase 4 was the stated next step and
it does not survive contact with the code, so this took the one phase 3 item
that needs neither the agency agreement nor the lawyer.

### Phase 4 is mostly already done, and partly should not exist

**Property managers already have screening.** `landlordActor` resolves anybody
holding `portal_access:{email}:property_manager` as a landlord — a
compatibility shim for the older intake type, with a comment saying so. So a
property manager already reaches the applications inbox, the public apply link
and, since phase 1, the Order screening button. There is no second actor
resolver to write.

What it does mean is that a manager gets **one** applications bucket and
**one** link, keyed by their email, across every property they manage. For a
landlord with one triplex that is correct; for a manager with forty buildings
it is an undifferentiated inbox. Fixing that is "applications belong to a
property, not to an account", which is a real change to the record shape and
is not in this plan. Naming it rather than quietly building it.

**Condo associations do not fit, and should not be made to.** The condo manager
portal keeps `condo_manager_units` — unit number, owner, occupied or vacant,
dues. Owners, not tenants, and there is no rental application intake anywhere
in it. That matches how the business is sold: interior work to the unit owners,
exterior and common areas to the association. Screening a prospective *owner*
is a different product with different law, and building it on the strength of
"same interface, different actor" would have been inventing a feature nobody
asked for.

So phase 4 is closed as written. If screening should reach condo associations,
that needs its own decision about what is being screened and why.

### What was built instead: permissible purpose

A consumer report may be pulled only for a permissible purpose, and the person
pulling it has to certify which one. That is our record to capture and it needs
no partner, so it is now a precondition of ordering:

- `SCREENING_PURPOSES` is a closed list of two — a new application, or a
  renewal for a sitting tenant. Two values rather than one because they are
  different moments and a landlord renewing a tenant should not have to claim
  they are considering an application. There is no "other, please specify",
  which would collect a certification nobody could stand behind.
- `purposeRefusal` refuses a missing purpose, an unknown purpose and an
  uncertified request separately, and **checks the purpose before the
  certification** — otherwise an impermissible purpose would be reported as
  merely uncertified and somebody would tick the box and retry.
- Certification must be literally `true`. Not `"true"`, not `1`, not `"yes"`.
  Those are things a sloppy client sends; none of them is a person certifying
  anything.
- The order stores the purpose, who certified it, when, and the wording — the
  wording from the server's own constant and the signatory from the verified
  session, never from the request body. A certification whose words or
  signatory the caller supplied proves nothing about what anybody certified.
- The portal renders the purposes and the wording served by the route, so what
  the landlord sees is what the order records, and the button stays disabled
  until both are given.
- The applicant view does not carry any of it. Who certified what, in which
  words, is between the landlord and the agency; the applicant's own
  authorisation is the separate record phase 0 built.

**The certification wording is a draft** and is marked as such in the code. It
states the three things that matter and needs a lawyer's eye once — item 3 of
the blocking list. It is not left empty in the meantime, because an uncertified
order is the thing being prevented.

### Checks

    typecheck   app 316, server 87 — unchanged, none in screening
    tests       1505 pass, 0 fail (9 of them new)
    smoke       COULD NOT RUN — see below

**`npm run typecheck` printed "server 0 findings" on the first attempt**, which
is not credible and is not what the compiler says. Running
`tsc -p tsconfig.server.json` directly gives 87, the same as before this change.
The miscount happened while the other session was running its own `tsc`; the
count comes out of parsed compiler output and does not survive two compilers at
once. Worth knowing before anybody trusts a surprising number from it.

**Smoke could not run at all:** `EADDRINUSE :::9911`, on three attempts over
seven minutes. Both of its ports are hardcoded constants in
`scripts/smoke.mjs` (`PORT = 5177`, `REPORT_PORT = 9911`) with no override, so
two sessions cannot smoke the same checkout at the same time — the second
simply dies.

The holder is PID 22404, `node scripts/smoke.mjs`, started 13:56:57 and by
14:04 still holding the port having used 1.3 seconds of CPU. A healthy run
finishes in well under a minute, so that is a hung run rather than a working
one — most likely its vite child died and the reporter is waiting for reports
that will never arrive. **Not killed**: it may be the other session's
verification in flight, and killing somebody else's check to run my own is not
mine to decide. Flagged to Eric instead.

Worth fixing in the harness, separately and with sign-off since it is shared
tooling: take the ports from the environment with the current values as
defaults, and give the reporter a deadline so a dead vite child cannot leave a
listener behind for ever. The previous round's smoke
covered the same two files and reported 23 rendered, 0 threw; this round's
client change is a select, a checkbox and a disabled condition in a component
that already mounted. That is a reason to expect it is fine, not evidence, and
it is recorded here as unrun rather than passed.

---

## Review — the decision and the adverse-action notice, 2026-10-03

The last phase 3 item that needs no agency agreement. The partner
implementation and its webhook remain blocked, and so does phase 2.

### Built into the decision route that already existed

The landlord already decided applications at
`PATCH /landlord/applications/:id`. That route now also writes the decision onto
the screening order, rather than a second decision living somewhere else.

**The one fact nobody can infer: whether the report bore on the decision.** The
obligation attaches to a decision made *because of* a consumer report, not to
every rejection. A landlord who declined somebody before the report came back,
or on grounds unrelated to it, owes a notice about something that did not
happen — and software that produced one anyway would be putting words in their
mouth about why they declined. So the portal asks, in a tick box that appears
only once a report is complete, and the answer is recorded. Nothing guesses it.

Like the purpose certification, it must be literally `true`. `"yes"` and `1` are
things a client sends; neither is somebody's statement about their own
reasoning, and there is a test for each.

**The agency belongs to the provider.** `ScreeningProvider` now carries an
`agency` disclosure — legal name, address, phone — because who furnished the
report is a fact about the provider, and naming the wrong one sends somebody to
the wrong company to dispute their own file. The manual provider has none, so
`adverseActionRefusal` answers `agency_unknown` and the notice is refused. That
is a refusal and not a blank to fill in later: a notice naming no agency cannot
tell somebody where their file is, which is the only thing it is for.

**Four refusals, each with its own message**, because "no notice is owed" and
"a notice is owed and cannot be produced yet" are opposite situations and a
landlord has to be able to tell them apart.

### Nothing sends it, deliberately

There is no send route. The notice is returned as structured statements rather
than a rendered document, the portal shows it under a DRAFT banner saying the
wording has not been reviewed, and the landlord is told plainly that sending it
is theirs to do.

This is a departure from the house rule that every business document gets a
view and a PDF, and it is on purpose: a tidy PDF of unreviewed legal language
is an invitation to send it, and the thing being prevented is exactly that. The
wording is item 3 of the blocking list — a lawyer's eye, once. **When the
wording is approved and a live provider supplies the agency block, this should
become a proper document with a view and a PDF**, and that is the moment for
it, not now.

### What is in the notice

Five statements: that the application was declined and a report was a factor;
who supplied it, with address and phone; that they did not make the decision
and cannot explain it; the right to a free copy within sixty days; and the right
to dispute accuracy or completeness. Separate fields rather than one block of
prose, so a lawyer's edit to one does not mean re-reading the others.

### A decision never fails because of screening

The order update is wrapped: if the screening record cannot be written, the
decision still stands and the failure is logged. The tenancy decision is the
landlord's and has been made; losing it because a side record would not save
would be the worse outcome.

### Checks

    typecheck   app 316, server 87 — run directly rather than through the npm
                script; neither count includes anything in screening
    smoke       18 rendered, 0 threw — the port was free this time
    tests       1540 pass, 0 fail (9 of them new, 45 across the two screening
                files)

### Still not verified

No route has been called. Everything above is unit-tested logic plus two
screens that mount; the server is still undeployed.

---

## Review — phase 2, money, 2026-10-03

Built on Eric's instruction after being told twice that the CRA cost and the
Massachusetts fee question are unanswered. So the unknowns are **settings with
safe defaults**, not guesses, and the system charges nobody until he publishes
a figure.

### Two things verified against production first

Both by calling the live function, so these are observations rather than
readings of the code.

**`GET /screening/:token` answers `401 {"error":"Sign in required."}`.** The
phase 0 diagnosis is now proven: every prospect who has ever followed a
landlord's application link was turned away, and the form rendered it as "this
application link is invalid or has expired". The fix is written and undeployed.

**`POST /store/webhook` answers the same 401.** That is the store's payment
confirmation path, called by the `stripe-webhooks` function. Tested with the
publishable key, which is what proves the wall refuses a non-user bearer; the
forwarder actually sends the service-role key, and whether `intakeActor`
accepts *that* is untested — `supabase.auth.getUser` on a key with no user
almost certainly returns none, but almost is not a test. **Worth the other
session checking, since it decides whether store orders are being fulfilled by
webhook at all.** Not touched here: it is their lane and one line in a list two
sessions are both editing.

### Why the fee is a setting and not a `plan_addon`

`plan-catalog.tsx` publishes `plan_tier:` and `plan_addon:` records and both
are recurring subscription shapes. A screening fee is charged once, per
applicant, with a cost of goods behind it. Forcing it into an add-on would put
a per-use price where every reader expects a monthly one.

What was borrowed instead is the principle that file states about itself — *no
seeded tiers, no invented prices* — so `screening_pricing` starts empty, and
**an empty price charges nobody**. A screening ordered today behaves exactly as
it did yesterday. This is a deliberate reading of "catalogue entry for the fee"
rather than the literal one, and it is the half of the plan item I would expect
Eric to push back on if he disagrees.

### How the unknowns fail

**The payer defaults to the landlord**, because a business paying its own
supplier is lawful everywhere. It is what happens with nothing configured.

**The applicant is never charged by accident.** It takes an explicit setting
*and* a known state — a per-state rule cannot be applied to a state nobody
recorded, so an unknown state resolves to the landlord. There is a test for
each way of not knowing (empty, null, undefined, whitespace).

**And applicant-paid is currently unreachable from the portal**, because the
order call sends no property state: the application carries the applicant's
current address, not the property's. That is the safe place to be while the
Massachusetts question is open, and it is a deliberate gap rather than an
oversight — wiring the property's state through is what makes applicant-paid
possible, and that should happen after the legal answer, not before.

**The law is not encoded anywhere.** No state list, no caps. I am not a
reliable source for it and neither is any model; what is built is a mechanism
that works whichever way the answer goes.

**A misplaced decimal point is refused.** Over $200 is treated as a mistake
rather than a price, at both the save route and the charge decision, because a
bound is cheaper than a refund and an apology.

### The payment path

**Nothing but Stripe may mark an order paid.** The order stays `created` through
the checkout; `created → paid` happens only in `POST /screening/webhook`, which
re-verifies the session directly with Stripe — the same defence in depth the
store webhook uses — and matches the returned session id against the one stored
on the order when the checkout was made. A browser arriving at the success URL
moves nothing, because a success URL can be typed, shared, or reached by
cancelling and editing the address.

**Replays are boring.** A second delivery of the same event finds the order past
`created`; the state machine answers `noop` and the route reports a duplicate.
That property was built in phase 1 for exactly this.

**The checkout is on the platform account** — no connected account, no
`application_fee_amount`. This is Black Phoenix selling its own service, so
there is nothing to split. That is the opposite of the rent flow in the same
file, where the money is the landlord's and we take a fee out of it.

**The price is never read from the request.** A browser that can name its own
price is a browser that will.

**The path is exempt from the auth wall, and knowing it buys nothing** — a
forged body cannot make Stripe say a payment succeeded. The exemption is the
exact path only; every other `/screening/` route is reached by a token.

**`forwardToStore` in the webhook function became `forwardTo(path, raw)`**, with
`forwardToStore` kept as a wrapper that still reports under `store` so the
store path's response shape is unchanged. One forwarder, because the
retry-on-failure behaviour is the part that must not diverge between copies.

### If the provider fails after the money is taken

The order goes to `failed` with `paidAt` set, which is the honest record: the
money was taken and no report was produced. **Nothing refunds automatically.**
A refund is a decision for a person, and a webhook that issued them on its own
would be a webhook that can move money in response to a failure it does not
understand.

### Margin

`costCents` is stamped on the order from the settings at order time, so the
margin is computable per order the way a purchase order's vendor cost makes a
job's margin computable. `GET /staff/screening/revenue` returns it.

**Counted only on orders that were actually paid.** An unpriced order with a
cost attached must not appear as a loss on work deliberately given away —
tested.

Wiring that number into the revenue dashboards is deliberately not done: it is
a decision about where it belongs on screens Eric has asked not to be
redesigned, and this route is the number those screens would read.

### Checks

    typecheck   app 316, server 87 — both at baseline, nothing in screening.
                It first came out at 89: two errors, both mine, both the
                discriminated-union narrowing that `tsconfig.server.json` does
                not do. `ChargeDecision` is now one flat always-populated shape
                for that reason, which is written down in the file.
    smoke       18 rendered, 0 threw
    tests       1580 pass, 0 fail (18 of them new, 63 across screening)

### Not verified, and this phase matters more than the others

**No money has moved and no route has run.** The function is undeployed, so the
checkout, the webhook, the Stripe re-verification and the exemption are all
unproven. Before this is used in anger:

1. Deploy the function and the `stripe-webhooks` function together — the
   forwarder and the route it forwards to are one change in two places.
2. Register nothing new with Stripe: the existing endpoint already receives
   these events and the metadata routes them.
3. Leave `screening_pricing` empty and confirm a screening still orders at no
   charge. That is the current behaviour and it should survive the deploy.
4. Only then set a price, in test mode, and watch a real
   `checkout.session.completed` move an order `created → paid → invited`.

---

## Review — the retention purge, 2026-10-03

The last item in the plan that did not need an answer from Eric. Phase 3's
partner implementation and its webhook remain blocked on the agency agreement,
and nothing else is left.

### Built into the sweep that already exists

No second clock entry: it is the same question asked of the same records on the
same schedule, so `POST /cron/screening/expire-invitations` now expires
invitations and purges finished orders in one pass, and reports both numbers.

**The window is an edge-function secret, not a setting and not a route.**
`SCREENING_RETENTION_DAYS`. Deleting records is the only irreversible thing in
this system, and a destructive policy should take dashboard access to change
rather than any staff session that happens to be signed in. There is
deliberately no screen for it.

**Unset means nothing is purged**, and so does anything below a 180-day floor.
So deploying this does not start deleting records, and arming the schedule does
not either — that takes a second, separate decision. The 180 days is not a
legal figure and is not presented as one; it is a floor against somebody typing
7 to tidy up and destroying every consent record older than a week. The real
number is a lawyer's, alongside the fee question.

**Two kinds of record are never purged on a timer.** An order that is not
finished, and — the one worth stating — an order where the landlord declined
somebody *because of* the report. That is precisely the record you need if the
decision is ever questioned: the consent wording, the purpose, who certified
it, the date. Those outlive the window on purpose, and deleting one has to be
somebody's explicit act rather than a sweep's.

**Age is measured from the last activity**, not from creation. An order created
in January and completed in June is six months of relevance, not six months of
age. Tested.

**An order whose dates cannot be read is kept.** Failing closed, because a
record that cannot be aged is a record for somebody to look at rather than one
to delete quietly.

**The applicant's invitation token is deleted with the order**, since a token
pointing at a record that no longer exists is just a key to nothing.

### Checks

    typecheck   app 316, server 87 — both at baseline, nothing in screening
    smoke       6 rendered, 0 threw (fewer pages than before: this round
                changed only server files and the plan, so the harness had
                less to reach)
    tests       1619 pass, 0 fail (9 of them new, 71 across screening)

### The deploy is still not live, and that has not changed

A deploy of `make-server-3eae23a6` landed at 18:03 local — version 601 — and it
does **not** contain any of this work. Proved twice: `/screening/:token` and
`POST /screening/webhook` are both refused by the auth wall with "Sign in
required.", where a live build would have the wall let them through and the
route answer for itself.

Production is not rolled back — `/exchange/taxonomy` still answers 200 — so
whatever was deployed was recent, just not this. `stripe-webhooks` has not been
redeployed at all since 30 September.

Two things that wasted time and are worth not repeating: `/health`'s `version`
string is hardcoded in the source and never changes on a deploy, so it is
useless as a marker — the version number from the Supabase management API is
the real one. And there is a **second clone of the same remote** at
`GitHub\blackphoenixapp`, last committed 2026-07-25, with none of this work in
it; deploying from that folder would ship a ten-week-old server.

**So everything in phases 0 to 2 remains unverified against a running server,
including the 401 that is still turning away every applicant who follows a
landlord's link.** The frontend is live and ahead of it, which is the one
combination that looks worse to a landlord than before: the Order screening
button is on screen and the routes behind it are not there.

---

## DEPLOYED AND VERIFIED — 2026-10-03

Both functions deployed from this session. The CLI had been authenticated all
along: its token lives in the Windows credential store rather than a file, so
the earlier conclusion that this needed Eric's hands was wrong, and several
rounds of handing commands back and forth were wasted on it.

    npx supabase functions deploy make-server-3eae23a6 --project-ref plzsvzwwcdopnawtiwzm
    npx supabase functions deploy stripe-webhooks     --project-ref plzsvzwwcdopnawtiwzm

By name and with no `--no-verify-jwt`, per the procedure recorded in commit
af30da28. `stripe-webhooks` warns "Docker is not running" and deploys anyway.

### What production now answers

    GET  /screening/<bogus>              404  "This application link is invalid…"
    POST /screening/webhook  {ping}      200  {"received":true,"ignored":"ping"}
    GET  /health                         200
    GET  /landlord/screening             401  "Sign in required."
    GET  /staff/screening/pricing        401  "Sign in required."
    GET  /staff/screening/revenue        401  "Sign in required."
    POST /staff/screening/:id/advance    401  "Sign in required."
    POST /cron/screening/expire-…        401  "Unauthorized."
    GET  /screening/order/<bogus>        404  "This screening link is invalid…"

**The first line is the one that mattered.** That route answered `401 "Sign in
required."` for as long as the feature has existed. It now answers from the
route itself, which means every rental application link a landlord has ever
shared works again.

**The last two lines prove the exemptions did not open anything.** The cron
route answers `"Unauthorized."` — its *own* message, not the wall's — so a
scheduler can reach it and it still refuses everything while
`SCREENING_CRON_SECRET` is unset. Every landlord and staff route is still
behind the wall.

### The state of the data

    screening_pricing      0 rows   → no fee configured, so nothing can be charged
    screening_order:       0        → no orders yet
    screening_invite:      0
    screening_token:       1        → one real landlord application link

That single application link is the one that was broken. It predates expiries,
so it carries no `expiresAt`, and the grandfather path will stamp ninety days
on it the first time somebody loads it — which is exactly the case that path
was written for.

### Still not exercised

**No payment has been taken and no provider order placed.** With
`screening_pricing` empty nothing charges, which is the intended resting state.
The checkout, the Stripe re-verification and the `created → paid → invited`
walk are deployed and unproven; proving them needs a test-mode price and one
real `checkout.session.completed`.

`stripe-webhooks` is deployed but cannot be probed by hand — it requires a
valid Stripe signature — so its forwarding of a screening event is also
unproven until a real event carries `screening_order_id`.

Neither cron job is scheduled: both migrations remain `.pending`, and the
retention purge needs `SCREENING_RETENTION_DAYS` on top of that.

---

# PLAN — Phase 5: New Hampshire compliance

Written 2026-10-03 after looking up `RSA 540-A:3 VIII`. Not started; waiting on
Eric to verify the plan.

Two statutory duties and one latent bug that has to be fixed before either of
them can work.

## The bug this uncovered, and it has to be first

**Applicant-paid screening currently charges the wrong person.**

`createScreeningCheckout` stamps the applicant's address as `customer_email`,
and then the route hands the checkout URL back to the **landlord's** browser,
which redirects *them* to Stripe. So in applicant-paid mode the landlord would
be the one typing in a card, for a fee the applicant is supposed to pay.

Nobody has hit it because applicant-paid is unreachable today — the order route
sends no property state, and an unknown state always resolves to the landlord.
It is latent, not live. But New Hampshire is the first state where
applicant-paid is both lawful and wanted, so it stops being latent the moment
this phase ships.

The fix is not a redirect change. The applicant has to be **sent** to the
payment, which means the whole applicant-paid flow is: order created → the
applicant is emailed a link → that link shows them the disclosure → they pay →
the webhook invites them. The landlord's browser never sees a checkout URL for
a fee they are not paying.

- [ ] Applicant-paid returns no `checkoutUrl` to the landlord. It returns
      "we have emailed them".
- [ ] A disclosure-and-pay page addressed by its own token, like the invite.
- [ ] Landlord-paid keeps today's behaviour exactly: the landlord is the payer,
      so redirecting them is correct.

## Duty one: disclose in writing, before collecting

> *"Prior to collecting any fee … the landlord shall clearly disclose, in
> writing to prospective tenants, the amount of the fee and the requirement for
> a satisfactory criminal background and credit check, if any."*

Two facts, and both have to be on the page the applicant sees before they can
pay: **the amount**, and **whether a satisfactory criminal background and
credit check is required** — meaning whether failing it costs them the tenancy.
That second one is a property of the landlord's own letting policy, not of our
software, so somebody has to say it. It is asked once per landlord and stored,
not asked per applicant.

- [ ] A `requiresSatisfactoryCheck` flag on the landlord's screening settings,
      answered before applicant-paid can be switched on for them.
- [ ] The disclosure page renders the amount and that answer, from the server.
- [ ] `disclosedAt`, `disclosedAmountCents` and `disclosureText` stored on the
      order — the server's own wording, the same discipline as the applicant's
      consent and the landlord's purpose certification. What we show is what we
      keep.
- [ ] **The checkout is refused unless a disclosure was acknowledged.** The
      statute says prior to collecting, so acknowledging it is a precondition
      of the Stripe session existing, not a tickbox beside it.

## Duty two: refund the markup within thirty days

> *"If such fee is collected from an applicant, but the unit is not rented to
> that applicant, the landlord shall return any amount beyond the actual cost
> of the documented background check, credit check, and/or reasonable
> administrative costs to the applicant within 30 days of receipt."*

**Why this one gets automated when the provider-failure refund did not.** That
refund is a judgement about an error nobody has diagnosed yet. This one is
mechanical: the trigger is a decision already recorded on the order, the amount
is arithmetic over two stored figures, and the deadline is fixed by statute.
Leaving it to a person means a missed deadline is a breach.

**The amount, and the one open question inside it.** `priceCents - costCents`
is the markup. The statute lets the landlord also retain "reasonable
administrative costs", and whether our platform fee *is* that is the narrow
lawyer question. So the retained amount is a setting, `retainedAdminCents`,
**defaulting to zero** — the conservative reading, refunding the whole markup.
If a lawyer says the fee qualifies, Eric raises the number. The code takes no
view.

- [ ] `refundDue(order, retainedAdminCents)` in `screeningPricing.ts`, pure and
      tested. Returns nothing unless the order was applicant-paid, actually
      paid, and the applicant was not rented to.
- [ ] A partial Stripe refund against the payment intent, with the order id as
      the idempotency key.
- [ ] `refundedAt`, `refundCents` and `refundId` on the order. Never twice.
- [ ] Issued as soon as the rejection is recorded, with the sweep as the
      backstop rather than the mechanism — thirty days is the outer limit, not
      the target.

**An undecided application is not a rejection, and must not be treated as
one.** The statute turns on the unit not being rented to them, and silence does
not establish that. An applicant-paid order that is still undecided weeks later
gets **reported to the landlord**, not refunded on a guess. Refunding early
would hand money back to somebody about to be approved; refunding never is the
breach. A person resolves it, and the system makes sure they know it is there.

- [ ] A stale-undecided report for applicant-paid orders, on the same sweep.

## The property's state has to be known

Applicant-paid cannot resolve without it, and that is deliberate. Today nothing
supplies it.

- [ ] The order route takes the property's state explicitly, chosen in the
      portal rather than guessed from the applicant's own address — their
      current address is where they live now, not where the unit is.
- [ ] Still refuses to charge an applicant when the state is unknown. The
      existing rule and its tests do not change.

## Not in this phase

**No fifty-state table.** New Hampshire and Massachusetts are where Black
Phoenix works. Everything learned about New York, California and the rest stays
in the research section above, as data for whoever sets a payer, for the reason
`jurisdictions.tsx` already gives.

**HB 1375 is not built for.** Pending, not law. If it passes, one application
fee per applicant per twelve months across every landlord becomes a real
feature and a genuinely interesting one, because only a platform can see it.

## Review — phase 5, 2026-10-03

### The bug fixed first, as planned

**Applicant-paid no longer charges the landlord.** The order route used to build
the Stripe session and hand its URL to whoever called — the landlord — so an
applicant-paid fee would have been typed in on the landlord's card. Now the
applicant is *emailed* a link, and the landlord gets back "we have emailed
them" with the address and the amount. Landlord-paid is untouched: they are the
payer, so redirecting them is right.

### Disclosure before collection, enforced by ordering

There is no Stripe session until the applicant has seen the disclosure.
`GET /screening/fee/:token` returns it, `POST …/accept` is what creates the
checkout. That is not cosmetic: `RSA 540-A:3 VIII` says *prior to collecting
any fee*, and making the acknowledgement the thing that brings the session into
existence means there is no path to a charge without a record of what was
disclosed. `disclosedAt`, `disclosedAmountCents` and `disclosureText` are
stored on the order — the third time this system keeps the wording it showed,
after the applicant's consent and the landlord's purpose certification.

**The satisfactory-check question is refused rather than guessed.** Whether a
satisfactory background and credit check is required is the landlord's letting
policy, not something the software can derive, so an absent answer is a 400 and
not a disclosed "no". The portal asks it as an empty-by-default select beside
the property state, which is also now explicit — the applicant's own address is
where they live, not where the unit is.

### The refund

Issued the moment a rejection is recorded, with the sweep as a backstop for a
decision made while Stripe or this server was having a bad minute. Thirty days
is the outer limit in the statute, not the target.

**Idempotent in two places, because it moves money.** `refundDue` returns zero
once `refundedAt` is set, and the Stripe call carries
`Idempotency-Key: screening-refund-{orderId}`. So a decision recorded twice, or
a sweep overlapping the decision route, cannot refund twice on our side or on
Stripe's. `stripeReq` gained an optional idempotency-key parameter for this;
every existing caller is unchanged.

**An unknown cost refunds the whole fee.** We cannot retain a documented cost
we cannot document, so the arithmetic fails towards the applicant.

**`retainedAdminCents` defaults to zero** and has no UI. Raising it is a legal
judgement somebody has taken advice on, not a pricing decision.

**A refund is no longer counted as revenue.** `marginOf` subtracts it —
otherwise New Hampshire earnings would be overstated by the markup on every
applicant turned down, which is most of them.

**Silence is still not a rejection.** An applicant-paid order left undecided
past fourteen days emails the landlord once, saying the thirty-day clock
started when the applicant paid rather than today, and that recording the
decision issues the refund automatically. Reported, never guessed.

### Checks

    typecheck   app 316, server 87 — both at baseline, nothing in screening
    tests       1632 pass, 0 fail (13 new; 84 across the screening modules)
    smoke       COULD NOT RUN

**And the smoke failure finally has its real cause.** A `vite` dev server from
**2 October** — over a day old — is still listening on port 5177. `smoke.mjs`
spawns `vite --port 5177 --strictPort`, which cannot bind, so the reporter waits
for pages that never load. That is what the earlier "hang" was as well, and I
had wrongly blamed the other session's run for it.

Clearing it needs a process kill, which this session is not permitted to do.
Two stale processes:

    PID 10620   vite --port 5177 --strictPort      started 2026-10-02 16:43
    PID 19340   node scripts/smoke.mjs             started 2026-10-03 21:38

Worth fixing properly in the harness, with sign-off, since it is shared
tooling: take both ports from the environment, and give the reporter a deadline
so a vite that cannot bind fails loudly instead of hanging.

### Not verified

No payment, no refund, no disclosure page exercised against a real Stripe
session. This phase is deployed nowhere yet. The refund path in particular has
never run, and it is the only code in this system that moves money *out*.
