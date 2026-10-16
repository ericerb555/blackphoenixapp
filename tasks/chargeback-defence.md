# PLAN — chargeback defence, one company at a time

Eric, 2026-10-16:

> *"can we make sure we have published return policy for my stripe checkout,
> charge back thresholds, a disput responce workflow/ ai assistant with facts,
> set up a command center workflow page, create responce templates with
> transaction logs, delivery conformations, refund policy with screen shots
> pre loaded"*
>
> *"this should be sperate for any companies added"*

---

## The finding that changes what this job is

**Per-company is already the architecture, and it is the reason none of this can
be one global policy.** `stripe-connect.tsx` says so at the top:

> *"each company is its OWN, fully independent Stripe account with its OWN
> secret key and OWN bank/payouts (managed in that account's own Stripe
> dashboard). This is NOT Stripe Connect — there is no platform account and no
> destination transfers."*

A `CompanyRecord` names the env var holding its key — `stripeKeyEnv`, e.g.
`STRIPE_SECRET_KEY` for BPB-8544 and `STRIPE_SECRET_KEY_2` for the next one —
and charges are created directly on that account.

That has a consequence worth stating plainly, because it is the whole reason
Eric's second message is right:

**A dispute lands on one company's account, and the card networks count their
monitoring ratios per acquiring account.** So each company has its own dispute
rate and its own jeopardy. One company's bad month cannot be averaged away by
another's good one — and a single platform-wide "dispute rate" would be a
number that describes nobody. Every artefact below is therefore keyed by
company: the policy, the thresholds, the templates, the evidence, the queue, the
alerting.

### The registry is empty, and that is step zero

    stripe_company:*  →  0 rows in production

`KNOWN_KEY_ENVS` has two slots. So today company #1 is charging through
`STRIPE_SECRET_KEY` with **no record in the registry naming it**. Nothing below
can be keyed by company until a company exists to key it to, which makes
registering the real one the first task rather than a nicety.

### Nothing in the app knows a dispute has happened

`supabase/functions/stripe-webhooks/index.ts` handles
`checkout.session.completed`, `customer.subscription.updated` / `.deleted`,
`invoice.payment_succeeded` / `.payment_failed`. There is no
`charge.dispute.created`, no `.updated`, no `.closed`. Grepping the whole server
for "dispute" or "chargeback" finds those words only in condition reports and
Exchange claim verification, which are unrelated features.

So the current process is: **Stripe emails you, a response clock starts, and the
application never finds out.** A dispute not answered inside the window is lost
by default no matter how good the facts were — which is the one failure mode
where having all the evidence and never being asked for it costs exactly as much
as having none.

**And the webhook axis is per PRODUCT, not per company.** The secrets are
`STRIPE_WEBHOOK_SECRET`, `..._STORE`, `..._SERVICES`, `..._INVESTMENTS`,
`..._TEST`. A second company's standalone account needs its own endpoint
registered in its own Stripe dashboard with its own secret, or its dispute
events arrive nowhere. That is a new axis crossing an existing one, and it is
the part most likely to be half-done and silently so — the same shape as the
cron trap that has now been written down five times in this repo.

### There is no published refund policy, and the Terms cannot stand in for one

`routes.tsx` has `privacy`, `privacy-policy`, `terms` and `terms-of-service`,
and nothing for refunds or returns. Searching for a policy page returns
`PrivacyPolicy`, `TermsOfService`, `ReturnPortal` and `ReturnsAdmin` — no
policy.

**A correction to an earlier draft of this plan**, which claimed the Terms
pointed at a named document that did not exist. They do not. `TermsOfService`
says:

> *"Refunds, cancellations, and deposits are handled according to the terms of
> your specific order, invoice, or service agreement."*

That is a real and defensible construction for a contracting business, where
the deposit schedule genuinely does live in the signed agreement. The earlier
claim came from reading a truncated search result and inferring a dangling
reference; it is wrong and the rest of this section does not depend on it.

What remains true, and is the actual gap:

- **Stripe's dispute evidence asks for a refund policy and the URL where the
  customer saw it.** "See your invoice" is not a disclosure a bank can check,
  and there is no URL to give. That field goes unanswered.
- **The store is not covered at all.** A dropshipped item has no "service
  agreement" — it has a return window, and that window has to be published
  somewhere a shopper passes before paying.

### Essentially pre-revenue, which makes this the cheapest it will ever be

    quotes 4 · payment records 2 · orders 0 · returns 0 · disputes 0

There have been no chargebacks because there have been almost no charges. Every
item here costs less to build before the first dispute than during one, and the
evidence that wins disputes is the evidence captured *at the time of sale* — it
cannot be reconstructed afterwards. This is the window.

### What already exists and should be reused rather than rebuilt

| already there | use it for |
|---|---|
| `/returns`, `/start-a-return`, `POST /returns/lookup`, `/returns/request`, `ReturnsAdmin` | the returns flow — but it is scoped to the dropship store and needs a company |
| `deliveredAt`, stamped once and never rewritten, plus `purchaseOrderDelivery.ts` | the delivery-confirmation pattern, already written with the right rule |
| `/ecommerce/order/` — public order tracking by opaque code | the customer-facing proof they could see their own order |
| `logSentEmail` — every send with recipient, subject, template, status | **the correspondence log is already a transaction log**, and it is dispute evidence |
| `mediaSigning.ts` | evidence files stay private and are read through short-lived signed URLs |
| the Automation tab + `PANEL_TABS` in `UnifiedDashboard` | the Command Center page slots in the same way |
| `withinIssueCap` (`exchangeClaim.ts`) | per-account daily caps, for anything that sends |

---

## The shape I would build

### 0. Register the companies (prerequisite, and small)

- [ ] Write the real `stripe_company:*` record for BPB-8544 naming
      `STRIPE_SECRET_KEY`, and confirm `chargesEnabled` against the account
      rather than assuming it.
- [ ] Everything below keys off `companyId`. No global fallback: a dispute that
      cannot be attributed to a company must be refused into a review queue, not
      filed under a default. Guessing which business took the money is worse
      than saying it is unknown.

### 1. A published refund and return policy, per company

- [ ] A `refund-policy` route and page, with the company's own text, its
      effective date, and a stable URL — because the URL is what gets submitted
      to Stripe as the disclosure.
- [ ] **Shown at checkout, not merely linked from a footer.** What the evidence
      field asks is where the customer saw it; "it was in our footer" is a far
      weaker answer than a checkout line the customer passed.
- [ ] **A snapshot stored against every order**: the policy text and version in
      force at the moment of that sale. A policy that has been edited since is
      not evidence about an older order, and editing it is exactly what somebody
      does after a bad dispute.
- [ ] Link the policy from `TermsOfService` alongside the existing sentence —
      the per-order agreement stays true for services, and the published page is
      what a card network can actually be shown.

### 2. Thresholds, per company

- [ ] Each company's dispute count and ratio, computed from its own account over
      a rolling window, with its own warning and alarm levels.
- [ ] **Do not hardcode card-network numbers from memory, mine included.** The
      programmes exist — Visa's and Mastercard's excessive-dispute monitoring —
      and the figures and windows change. Store them as configuration per
      company with a `source` field naming where the number came from and when
      it was checked, the way `pricingDefaults.ts` distinguishes a standard
      figure from this company's own. A threshold nobody can trace is a
      threshold nobody will trust at the moment it fires.
- [ ] Warn on the **trend**, not only the breach. A ratio that crosses the line
      has already done the damage; the useful alert is the one that fires while
      there is still time to change something.
- [ ] Surface on the Automation tab's "Needs you" list, which already exists.

### 3. The evidence packet, assembled rather than written

This is the heart of it, and the rule is the same one that made the trash
estimator honest: **the machine gathers facts, it does not compose claims.**

- [ ] For each order, assemble what Stripe's evidence form actually asks for:
      the receipt, the policy snapshot, the correspondence from the email log,
      the delivery or completion proof, the service date and address, and the
      customer's own acceptance where there is one.
- [ ] **Signatures and approvals are the strongest thing this business has** and
      they already exist: `quotes/by-token/:token/sign` records a signature, a
      typed name, a timestamp and the decision. A signed quote is a customer
      agreeing to a price in writing, which is better evidence than anything a
      template can say.
- [ ] Every item carries where it came from and when it was captured. An
      evidence packet that cannot say which of its parts are contemporaneous is
      one somebody has to check by hand.
- [ ] Gaps are listed as gaps. A packet that silently omits the delivery proof
      reads as complete and is not.

### 4. The workflow, and an assistant that drafts only from facts

- [ ] Handle `charge.dispute.created`, `.updated`, `.closed` per company, each
      on its own webhook endpoint and secret. Record the dispute, its reason
      code, its amount, and **the deadline** — the clock is the single most
      important field.
- [ ] A state machine with the deadline as a first-class citizen: `received` →
      `evidence gathering` → `drafted` → `submitted` → `won` / `lost`, with
      escalating alerts as the window closes.
- [ ] The assistant drafts a response **from the packet and nothing else**, and
      writes `[no evidence of this]` where the packet is empty rather than
      filling the gap with plausible prose. The failure to design against here
      is the one this session has already met twice: a model producing a
      confident, complete, fabricated document. In a dispute response that is
      not merely wrong, it is a false statement to a bank.
- [ ] **Nothing is submitted automatically.** A person reads and sends it. The
      reason is not caution for its own sake: a submission is a one-shot,
      irreversible assertion of fact, and the reason code determines which facts
      matter — a "product not received" needs delivery proof, a "not as
      described" needs the scope and the sign-off. Those are different arguments
      and choosing between them is judgement.

### 5. Response templates, per reason code and per company

- [ ] One per reason code, because the argument differs: unrecognised, not
      received, not as described, duplicate, subscription cancelled.
- [ ] Templates are **slots filled from the packet**, never free text with
      invented specifics. An unfilled slot renders as a visible gap in the
      draft, so the person sending it can see what is missing.
- [ ] Per company, because the voice, the policy and the service are theirs.

### 6. Delivery and completion confirmation worth submitting

- [ ] Physical goods: carrier, tracking number, and the delivery event — stamped
      once and never rewritten, which `deliveredAt` already does correctly.
- [ ] Services, which is most of this business: the completion record, the
      photographs, the date, and the customer's acknowledgement. The condition
      reports and job photos already exist; what is missing is that none of it is
      assembled into anything a bank would read.
- [ ] Digital goods: the download or access event, which is the only delivery
      proof that exists for them.

### 7. The Command Center page

- [ ] A **Disputes** tab beside Automation, following the same pattern —
      `PANEL_TABS`, one panel, staff only, every figure read from the server.
- [ ] Ordered by deadline, soonest first. On a dispute screen the clock is the
      organising principle, not the amount.
- [ ] Per-company, with a company switcher, and the ratio against that company's
      own thresholds.
- [ ] It must be honest about the same thing the Automation tab is honest about:
      a dispute it could not read is not the same as no disputes.

---

## Built: the policy mechanism, 2026-10-16

Step 1, except the checkout disclosure and the per-order snapshot wiring. **No
policy is published**, deliberately — see below.

### What exists now

| piece | where |
|---|---|
| the rules, 23 tests | `refundPolicy.ts` — versions, `canPublish`, `policyInForce`, `policySnapshot` |
| public read | `GET /refund-policy/:companyId` — published versions only, in `PUBLIC_PREFIXES` |
| staff read incl. drafts | `GET /company/:companyId/refund-policy` |
| save a draft | `PUT /company/:companyId/refund-policy` |
| publish one version | `POST /company/:companyId/refund-policy/:version/publish` |
| the page | `RefundPolicy.tsx`, routed as `refund-policy`, `refunds`, `return-policy` |
| the link | `TermsOfService`, added beside the per-order sentence rather than replacing it |

The page is on App's public route list, for the same reason the read route is
public: **the URL is the product.** It is what gets submitted to Stripe as the
disclosure, and it is read by the issuer's analyst reviewing a dispute and by
somebody who has stopped being a customer. Neither can sign in.
`customer-quote-approval` was once missing from that list and every quote link
sent to a signed-out customer was a dead end — the same trap.

### The two rules worth knowing

**`policyInForce` returns the version in effect ON THE DAY OF THE CHARGE, and
returns null rather than falling back to the current one.** The fallback is one
line, it reads perfectly on a screen, and it would be a false statement to a
bank about what the customer could have seen. Null means "this company had no
published policy when that money was taken", which is the only honest answer.

**`policySnapshot` copies the text onto the order rather than referencing it.**
A reference follows a later edit, and the moment after a losing dispute is
exactly when somebody goes and edits the policy. A test mutates the source after
snapshotting and asserts the frozen copy is unchanged.

### Nothing is published, and nothing was invented

`canPublish` refuses a draft that still reads like one: no sections, a heading
with nothing under it, `{{placeholder}}` or `TODO`, a body under twenty
characters — which is there to catch "n/a" and "see invoice" rather than to have
an opinion about prose — and a missing effective date, because a policy that
cannot say when it started cannot be matched to an order.

**No starter text is seeded in code.** A refund policy is a term this business
is bound by; one written by software and published unread is a worse outcome
than a page that admits the gap. So the page says plainly that nothing is
published and that the per-order agreement governs — which is true, and is a
visible gap rather than a plausible invented one.

### Proposed wording, for Eric to edit — NOT published

These are a starting point, not advice, and they should be read by whoever
handles this company's contracts before anything is published. The store window
and the deposit terms in particular are commercial decisions.

    Services — deposits and cancellations
      The deposit secures materials and a place in the schedule. Cancel more
      than N days before the start date and the deposit is refunded in full,
      less any materials already ordered specifically for the job. Cancel
      inside N days and the deposit covers the slot and the ordering already
      done. Once work has begun, cancellation is settled against work
      completed and materials supplied to that point.

    Services — if the work is not right
      Tell us within N days of completion. We come back and put it right at no
      charge. Where that is not possible we refund the part of the price
      covering the work in question. This is in addition to the one-year
      workmanship guarantee in our terms.

    Store items — returns
      Unused items in original packaging may be returned within N days of
      delivery for a refund of the item price. Return shipping is the
      customer's unless the item arrived damaged, wrong, or faulty, in which
      case we pay it and replace or refund at your choice. Start a return at
      /start-a-return.

    Store items — what cannot be returned
      [list the categories, if any]

    How refunds are issued
      To the original payment method, within N business days of us receiving
      the return or agreeing the refund. Card refunds then take your bank's
      own time to appear.

    Talk to us first
      If something is wrong, email <address> before raising a dispute with your
      bank. We answer within one business day and we would rather fix it than
      argue about it.

That last section is there on purpose: a published invitation to contact you
first is both the decent thing and a reasonable line in a dispute response.

To publish, once the words are agreed — `PUT` the sections as a draft, read the
page, then `POST` the publish. Two acts, because publishing is a decision.

### Still to do on step 1

- [ ] **The checkout disclosure.** `shownAt` defaults to `'page'`, the weaker
      claim, and must be asserted as `'checkout'` only where a customer really
      passed it. "They saw it at checkout" is a far better answer than "it was
      published somewhere", so it has to be true.
- [ ] **Wire `policySnapshot` into order creation.** There are several checkout
      paths and zero orders in production today, so nothing is lost yet — but
      every sale from here is a sale with no frozen policy, and that cannot be
      backfilled honestly.
- [ ] A staff screen for drafting and publishing. The routes work; there is no
      UI, so today it is a `curl` with a staff token.
- [ ] Register the company so `bpb-8544` is a real id rather than this page's
      default. Step 0, still blocked on which accounts are live.

---

## What the assistant must never do

Stated separately because it is the part that can cause real harm:

- **Never assert a fact the packet does not contain.** Not a delivery date, not
  a conversation, not a policy the customer saw.
- **Never submit.** Drafting and sending are different acts and only one of them
  is reversible.
- **Never characterise the customer.** A dispute response argues about evidence,
  not about the person.
- **Never present a draft as a likely outcome.** It does not know, and a
  confidence number here would be exactly the invention this plan exists to
  avoid.

---

## Deliberately not in this plan

**No automatic refunding to avoid a dispute.** It is sometimes right and it is a
commercial decision per case, not a rule to automate.

**No Stripe Connect migration.** The standalone-account model is deliberate and
documented; this plan works with it.

**No dispute-prevention scoring at checkout.** Radar is Stripe's job and is
bought, not built.

**No rewriting the returns system.** It exists for the dropship store; it needs
a company key and a policy behind it, not a replacement.

---

## Decisions needed from Eric

1. **Which companies exist today, and which Stripe accounts are live?** The
   registry is empty, so this cannot be inferred — and getting it wrong attaches
   one business's disputes to another.
2. **Is the refund policy the same for services and for the store?** They are
   genuinely different products: a cleanout cannot be returned, a dropshipped
   item can. Likely two policies under one page.
3. **Who answers a dispute?** The workflow needs a named owner and an escalation
   path, because the deadline does not care who is busy.
4. **How much is worth fighting?** Below some amount the staff time exceeds the
   charge, and that is a real figure to set rather than discover case by case.

---

## Review

*(To be completed when the work is done.)*
