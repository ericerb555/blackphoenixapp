# Discounts: what the plan gives, and what an administrator grants

Two requirements from Eric, a few minutes apart:

> "we need to make sure that match whatever subscription or plan is being paid
> for"

> "i would like to be able and give admin the abilty to allow discounts and
> aditionall discounts if nessacary or needed at anytime"

**Nothing here is built.** Section 5 has the decisions that need making first,
because they change the arithmetic rather than the wiring.

---

## 1. What is there now, and why none of it can be kept

`src/app/lib/subscriptionDiscount.ts` calls itself the single source of truth
for subscriber discounts on contract jobs: 5% / 10% / 15% by tier, plus a 15%
landlord lifetime perk. Checked on 2026-09-21, it is broken in three
independent ways, and every one of them is silent.

**It falls back to `localStorage`.** `loadCustomerMembership` reads the server,
and on any failure reads `customer_membership_{email}` out of the browser. A
value the customer owns decides the discount on their own quote.

**The server read cannot succeed.** It requests `/kv/get/{key}` as a path
segment; the route reads a `?key=` query parameter. So it 404s every time and
falls through to the browser value on every call — not occasionally, always.

**Nothing writes `customer_membership`.** The Stripe webhook writes
`feature_grant:{email}`, a different record. A genuinely paying subscriber has
no membership row at all, and the tier it resolves comes from
`ALL_SUBSCRIPTION_PLANS` — the hardcoded client ladder, not the `plan_tier:`
catalogue being sold.

The two failures cut opposite ways, which is why neither was noticed: a paying
subscriber silently never receives the discount they bought, while anyone who
edits one browser value silently takes 15% off the company's margin.

---

## 2. The shape

A discount is **resolved**, never stored as a number on a quote and never
calculated in a browser. One server function answers "what discount applies
here", and everything that shows or bills a figure calls it.

    resolveDiscount({ customerEmail, jobId?, quoteId? })
      → { percent, capped, components: [ { source, percent, why } ] }

It draws on two sources.

**The plan.** A `discountPercent` on the `plan_tier:` record, reached through
the entitlement the payment actually wrote:

    Stripe payment → webhook → feature_grant:{email}
                                  ↓
                           resolveEntitlement()   already built, already tested
                                  ↓
                           plan_tier: record      the tier actually paid for
                                  ↓
                           discountPercent

Putting the percentage on the tier is what makes it **per portal and per tier**
— Listed, Stocked and Preferred each carry their own, edited in the Portal Plans
tab beside the price, with no new screen to learn.

**Grants.** `discount_grant:{id}` records an administrator creates at any time:

| field | why it exists |
|---|---|
| `percent` or `amountCents` | what is being given |
| `scope` | customer, job, or a single quote |
| `scopeId` | which one |
| `reason` | an administrator adding 15% for a good reason and one adding it by mistake look identical in a number and different in a record |
| `grantedBy`, `grantedAt` | who answers for it |
| `startsAt`, `expiresAt` | a discount that never ends is a price change |
| `revokedAt`, `revokedBy` | withdrawn, never deleted, so the history stands |

A grant is a record rather than a field because "at any time" means it has to
exist independently of any quote, and "additional" means there can be more than
one.

### If it cannot be resolved, it is zero

Never a cached tier, never a remembered value. Falling back is how a customer
keeps a discount they stopped paying for.

---

## 3. Who may do what

Granting is an administrator action, enforced in the route that writes the
grant. Not by hiding a button — a hidden button is not a check.

Reading resolves only for the caller's own account unless the caller is staff,
so one customer cannot discover another's terms.

What the customer is shown is the **resulting figure** and the reasons that are
safe to show. This is where `customers-never-see-our-discounted-pricing.md`
applies: a discount off our own price is fine to show; nothing in a component
line may reveal what a vendor charges us.

---

## 4. Order of work

- [ ] **D1. `discountPercent` on a tier.** A field in `planTier.ts`, editable in
      the Portal Plans tab beside the price. Pure, unit-tested.
- [ ] **D2. The grant record and its routes.** Create, list, revoke.
      Administrator only. Withdrawn rather than deleted.
- [ ] **D3. `resolveDiscount`, server-side.** The arithmetic of section 5, pure
      and tested — this is the piece that decides money, so it is tested the way
      `carryStripeLinkage` and `chooseJob` are.
- [ ] **D4. One route to ask.** Returns the figure and its components.
- [ ] **D5. Quoting reads it**, and `subscriptionDiscount.ts` and its
      `localStorage` path are deleted rather than left beside the new one.
- [ ] **D6. A grants screen** — who has what, why, and when it ends.

D1 belongs with U1 of `plan-catalogue-unification.md`, since both change the
shape of a tier.

---

## 5. What needs deciding, because it changes the arithmetic

**a) How do a plan discount and a grant combine?**

- *Additive* — 10% plan + 5% granted = 15%. What "additional" most naturally
  means, and the recommendation.
- *Greater of* — the customer gets 10%, not 15%. Safer, but then a grant is
  often worth nothing to a subscriber, which is the opposite of the intent.
- *Compounding* — 10% then 5% off the remainder = 14.5%. Arithmetically tidy,
  reads as a mistake on an invoice.

**b) Is there a ceiling?**

A cap — say 30% — is the guard against several grants stacking into a job sold
below cost. Without one, three well-meant grants can do it and nothing objects.
Recommended, with the number being Eric's.

**c) Do grants stack with each other, or only with the plan?**

Two grants of 10% on the same job: 20%, or does the later replace the earlier?

**d) Does a grant need an end date?**

Recommended: optional, but a grant with no end is flagged on the grants screen,
because an open-ended discount is a price change that never went through
pricing.
