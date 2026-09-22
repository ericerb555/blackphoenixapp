# Volume pricing

Eric: *"so what happens when our cohort changes prices due to volume?"*

**Nothing here is built.** Section 5 has the decisions; section 4 is the list of
things that break if this is attempted without them, and it is the important
section.

---

## 1. "Volume" is four different products

They sound alike and they are not, and picking the wrong one is expensive to
undo because customers are already billed under it.

**a) Per-unit.** The price is per thing — $5 a unit a month, $3 a seat. A
landlord with 40 units pays more than one with 4. Stripe does this with
`quantity` on the line item against a normal Price.

**b) Graduated.** The first 10 units cost $5 each, the next 40 cost $3, the rest
cost $2 — and a customer with 60 units pays all three bands. Stripe does this
with a *tiered* Price (`billing_scheme: tiered`, `tiers_mode: graduated`).

**c) Volume banded.** Same shape, but the whole quantity is charged at the band
it lands in: 60 units means all 60 at $2. Stripe calls this
`tiers_mode: volume`.

**d) A discount for being big.** The price does not change; a particular
customer gets a percentage off it because they buy a lot.

**(d) is already built** and is the only one that needs no new machinery — a
discount grant scoped to that customer, carrying "volume — 40 orders in Q3" as
its reason, revocable, with history kept. If what is wanted is "this vendor has
earned a better rate", stop here and use that.

The rest of this document is about (a), (b) and (c).

---

## 2. What exists now

A tier stores **one flat amount**: `priceCents`, plus an interval. One Stripe
Price per tier per mode, created from those two fields.

`limits` on a tier already names the dimensions volume would be measured in —
`products`, `units`, `seats`, `deals`, `bidQuotesPerMonth` — which is the
natural vocabulary for this. But **nothing enforces a limit today**:
`withinLimit()` exists in `planTier.ts`, is unit-tested, and no route calls it.
So the catalogue can already *describe* a ceiling and cannot *hold* one.

Checkout sends exactly one line item, at quantity one:

    'line_items[0][price]': priceIdFor(tier, mode),
    'line_items[0][quantity]': '1',

---

## 3. Which model suits which portal

A recommendation, not a decision.

| portal | what varies | suggested |
|---|---|---|
| landlord, property manager, condo association | units under management | **per-unit (a)**, on top of a small base |
| vendor | catalogue size, orders | **flat tiers + a grant (d)** — the ladder already works |
| subcontractor | seats, quotes per month | **per-unit (a)** on seats |
| advertiser | campaigns live | flat tiers; volume here is better sold as an add-on |
| content | sites or seats | **per-unit (a)** |

Graduated (b) is the one to avoid unless somebody asks for it by name. It is
correct, it is what large SaaS does, and it produces an invoice a small landlord
cannot check by hand — which costs more in support than it earns in revenue.

---

## 4. What breaks if this is bolted on without changing the plumbing

Each of these is a real, specific failure in code that exists today.

**The attach route refuses every tiered price.** It reads
`Number(price.unit_amount ?? 0)` and compares it with the tier's amount. A
tiered Stripe Price has `unit_amount: null` — so it reads as 0, mismatches, and
is refused with a message about the portal advertising one number while the card
is charged another. The guard is right; it simply has no idea tiered prices
exist.

**Checkout would bill everyone for one unit.** `quantity` is hardcoded to `'1'`.
A per-unit price with no quantity is a landlord with 40 units paying for one.
This is the failure that loses money quietly and for a long time, because the
invoice looks plausible.

**`purchasable` would be wrong.** `isPurchasable` requires `priceCents > 0`. A
tier whose price is entirely in Stripe's tiers — with no single flat amount —
would read as having no price and never go on sale.

**`subscriptionTotalCents` would under-report.** It adds a tier's flat amount to
its add-ons. With per-unit pricing the total depends on a quantity it never
sees, so every figure shown before checkout would be the one-unit price.

**And the amount check that protects the customer stops protecting them.** The
comparison between what the portal advertises and what Stripe will charge is
only possible because both are single numbers today. That safety has to be
rebuilt in whatever shape replaces it, not dropped.

---

## 5. What needs deciding

**a) Which model, per portal?** Section 3 is a recommendation. The answer
changes what gets built and cannot be cheaply revisited once customers are
billed under it.

**b) What is the unit, and who counts it?** "Units under management" has to
resolve to a number this app can defend. Is it what the landlord typed into
their portfolio, or what we can verify? A quantity the customer sets is a
quantity the customer can set to one.

**c) When quantity changes mid-month, what happens?** A landlord who adds ten
units on the 14th: charged pro rata now, at the next renewal, or not until they
are told? Stripe supports all three and they feel very different to the person
paying.

**d) Does a volume price interact with the discount caps?** Quoted work is
capped at 20% and founding subscriptions at 30%. If a per-unit price already
falls with volume, a volume *discount* on top is the same benefit paid twice.

---

## 6. Order of work, once (a) is answered

- [ ] **V1. The tier carries a pricing model.** `flat` or `perUnit` on the
      record, with the unit named. Pure, unit-tested, no behaviour change while
      everything is still `flat`.
- [ ] **V2. Quantity through the chain.** Resolved server-side from what the
      app already knows — never posted by the browser — and passed to checkout.
      This is where (b) gets answered concretely.
- [ ] **V3. The sellability and amount checks understand both models**, so a
      per-unit tier can be created, attached and verified with the same
      confidence a flat one is.
- [ ] **V4. The portal shows the real figure** before checkout, including the
      quantity it is based on, so nobody is surprised by their first invoice.
- [ ] **V5. Quantity changes.** Per (c). Until this exists, a change is
      something a person applies in Stripe, and that should be said out loud
      rather than assumed to work.

V1 and V3 are worth doing together: the checks are what make the model real, and
a model the checks do not understand is worse than no model at all.

---

## 7. What this does not change

- **Existing subscribers keep their price.** A Stripe Price is immutable and a
  subscription points at the one it was created with, so a cohort on $39 stays
  on $39 until somebody deliberately migrates them. That is true today and
  stays true; none of this work moves anybody.
- **Migrating a cohort is still not built.** It remains deliberate work in
  Stripe, per subscription. Worth its own plan if it is going to be routine.
- **There is still no view of who is on which price.** The data supports the
  question — every grant carries its `stripeSubscriptionId` — and nothing asks
  it.
