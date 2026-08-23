# Subscriptions, features, and the bid room gate

Eric: the bid room gate has to attach to every subscription — and should we make
everything build-your-own, or keep stock plans with add-ons?

## You already have the hybrid. Three pieces, already built.

| Piece | Where | What it does |
|---|---|---|
| Stock plans | `subscriptionPlans.ts` | priced tiers per category, each with a feature list |
| Add-ons | `PORTAL_OPTIONS_BY_CATEGORY` | per-category extras — extra hours, reserve study, after-hours dispatch |
| Build-your-own | `PlanBuilderTab` | "Build Your Own Plan with AI", already in the portals |
| **The allow-map** | `tier-features.tsx` | owner-controlled `{category: {tier: {feature: bool}}}` — you can switch any feature on in any tier |
| **A ledger** | `entitlements.tsx` | event-sourced, idempotent, tracks hours, credits **and named features** |

The last two matter most and are easy to miss. `tier-features` already lets you
decide, per category and tier, which features are unlocked — without editing
code. And the entitlement ledger already counts named features per plan, not
just hours.

## The recommendation: keep stock plans. Sell tiers, gate on features.

Not because build-your-own is badly built — it works — but because of how people
buy.

**Against pure build-your-own as the front door:** a buyer facing a blank plan
builder has to know your product before they can price it, which is the one
thing a new subscriber does not have. It also costs you a headline price to
advertise, makes two customers impossible to compare, makes revenue impossible
to forecast, and gives support a different product per account.

**Stock tiers with add-ons** is the model almost every successful subscription
business converged on, and it is the one you already have. Three prices someone
can compare in ten seconds, then extras for the ones who want more. Keep the
plan builder for the customer who asks for something unusual — it is a good
closing tool, a poor shop window.

## The architectural point, which is the real answer to "attach to every subscription"

**Do not attach the bid room to plans. Attach it to a feature, and let plans
grant features.**

Define two:

    bid_room.post     may put work out to bid
    bid_room.quote    may bid on work

Then every route asks one question — *does this org hold `bid_room.quote`?* —
and never asks which plan they are on. Stock tier, add-on, or a bespoke plan
built for one customer: all three answer the same question, and your pricing can
change forever without anyone touching the gate.

This is also why the answer to his question is "both": once the check is on a
feature, the plan shape stops being an architectural decision and becomes purely
a commercial one, which is where it belongs.

## The gap that is the actual work

Neither existing piece can answer the question yet:

- `tier-features` is keyed by **(category, tier)** — not by who is asking.
- The entitlement ledger is keyed by **planId** — not by organisation.
- `organizations` in Postgres has **no link to a subscription at all**.

So the missing join is: **organisation → subscription → tier → features.** That
is the work, and it is not large, but it is the whole job.

And it lands on the same seam noted in the bid room plan: the gate wants to run
inside a Postgres RLS policy, while subscriptions live in the key-value store.
Two honest options:

- **Mirror the answer into Postgres** — a small `org_entitlements` table holding
  the resolved features per org, refreshed when a subscription changes. RLS can
  then enforce the gate itself, which is what makes it real rather than
  advisory. Extra moving part, but the check is where it needs to be.
- **Check in the edge function only** — simpler, no mirroring, but the gate is
  then advisory: anything talking to Postgres directly is not covered.

For a revenue gate I would mirror. An unsubscribed account being able to quote
is not a bug, it is somebody using the product without paying.

## Order of work

1. **Two feature names**, and add them to the allow-map so tiers can grant them.
2. **The join** — organisation to subscription, resolving to a feature set.
3. **`org_entitlements`** mirrored into Postgres, refreshed on subscription
   change.
4. **The gate**, in RLS: posting requires `bid_room.post`, bidding requires
   `bid_room.quote`.
5. Only then the rest of the marketplace — first refusal, contracted vendors,
   radius.

Nothing here is research. Step 2 is the one with real thinking in it, because it
decides what happens to an organisation whose subscription lapses mid-bid.
