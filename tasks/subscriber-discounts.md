# Discounts: what the plan gives, and what an administrator grants

Two requirements from Eric, a few minutes apart:

> "we need to make sure that match whatever subscription or plan is being paid
> for"

> "i would like to be able and give admin the abilty to allow discounts and
> aditionall discounts if nessacary or needed at anytime"

**D1 and D3 are built and tested; nothing calls them yet.** Section 5 has the
rules Eric has set, section 6 what is still open, section 7 where the work is.

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

---

## 5. The rules Eric has set

| | |
|---|---|
| **How they combine** | **Additive.** A 10% plan discount and a 5% grant make 15%. Grants add to each other too. |
| **Quoted work** | Capped at **20%**, however many sources agree. |
| **Subscription fees** | Up to **30%** for the **first ten subscribers of every portal**, for the **lifetime** of the subscription. |

In his words: *"additive with a 20% cap"*, *"the 20% cap is on quote pricing"*,
and *"we will give up to 30% lifetime subscription fees to the first 10 of every
portal subscriptions"*.

Three things about that are easy to lose and are pinned by tests:

**The ceiling is not one number.** Quoted work and a subscription fee have
different economics — a subscription costs almost nothing more to serve, while
a job discounted too far is delivered at a loss — so they carry different caps.
`capFor` is the only place that decides which applies.

**"Up to" is a ceiling, not a rate.** Nobody receives 30% by existing. It bounds
what an administrator may give; what they actually get is the plan percentage
plus grants.

**Lifetime means the subscription's lifetime.** It survives renewals and price
rises and ends when they stop subscribing, so the grant carries no expiry date
and the thing that ends it is the entitlement lapsing.

Seats are counted **per portal**: the eleventh vendor is not founding even if
only three advertisers have signed up.

---

## 6. Still open

**a) Better deals for grouped portal options.** Eric: *"we can give better deals
when all portal options a grouped."* The principle is clear — somebody taking
several portal options together should pay less than the sum of them — and none
of the numbers are. What counts as grouped (two options? all of them?), how much
better, and whether a bundle discount sits under the same 20/30 ceilings or is a
third context of its own. Nothing is built for this.

**b) The subscription cap outside the founding ten.** Assumed 20% to match
quoted work, as the conservative reading, and given its own constant
(`SUBSCRIPTION_CAP_PERCENT`) so confirming it is one edit. Being wrong this way
is recoverable with a grant; being wrong the other way has already been given
away.

**c) Do grants stack with each other?** Built as additive, which follows from
the rule for plan-plus-grant. Two 10% grants on one job are 20%.

**d) Must a grant have an end date?** Built as optional, because lifetime grants
need to exist. A grants screen should flag the open-ended ones, since a discount
that never ends is a price change that never went through pricing.

---

## 7. What is built

- [x] **D1. `discountPercent` on a tier**, read and bounded server-side, edited
      in the Portal Plans tab beside the price, shown on the row, and warned
      about when set above the cap it can never exceed.
- [x] **D3. `resolveDiscount`**, pure and tested — the arithmetic above, the
      grant validity rules, the per-context ceilings, and `discountCents` so a
      figure is rounded once rather than wherever a total is assembled.
- [x] **D2. The grant record and its routes.**
- [x] **D4. One route to ask** for the resolved figure.
- [x] **D5. Quoting reads it**, and `subscriptionDiscount.ts` with its
      `localStorage` path is deleted rather than left beside the new one.
- [x] **D6. A grants screen.**

The broken system in section 1 is deleted. What remains unbuilt is D6, the
grants screen — grants are created and revoked through the routes until then.
