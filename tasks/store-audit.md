# The online store — what works, what does not, 2026-09-23

Audited against the goal: a store that sells by itself, posts to social media,
and makes money without being driven by hand.

## The headline, and it is not about social media

**A real customer paid and never received anything.**

`store:order:BP-F42D79D34D` — Denise, $22.10, paid through live Stripe on
7 August 2026 (`pi_3U1YW7JanINQl89p0HyC8iD5`). Six weeks later it reads:

    fulfillment_status            pending
    fulfillment_attempts          4
    fulfillment_forwarded_count   0
    fulfillment_error             No items were forwarded: Zendrop rejected the
                                  order — Insufficient scope:
                                  'order_issues:write' required.

The money is ours. The goods were never ordered from the supplier. The system
tried four times, was refused each time by a permissions problem on the Zendrop
API token, and then stopped — and **nothing told anybody**. There is no alert,
no staff notification and no console error on that path; the failure is a field
on a record nobody opens.

Before anything else is built, that order needs settling with the customer and
that token needs its scope fixed.

## What does work, and works properly

**Checkout takes real money.** Probed against production during this audit: a
cart posted to `/store/checkout` came back with a live Stripe session
(`cs_live_…`) for $23.94 on the TBPCO e-commerce account. That path is sound —
prices are looked up server-side from our own records, an item that cannot be
priced is refused rather than sold at whatever the browser suggested, and the
two Stripe accounts are guarded against sharing a key.

**There is a catalogue.** Twenty CJ Dropshipping products, live and priced,
with images, costs and categories.

**The storefront exists and is public**, and the server modules behind it —
products, cart, orders, shipping rates and labels, boosters, promotions,
analytics — are all mounted and reachable.

## What does not work

**1. Fulfilment is not automatic.** The daily sweep is
`POST /store/fulfillment/tick`, and it requires an administrator to call it.
There is one cron job on this database and it is the compliance reminder, so
nothing runs this on a schedule. Orders advance when a person opens a screen.

**2. Nothing is connected to social media.** Zero accounts are linked — the
store has never posted anywhere. The module itself is real: Facebook publishes
through the Graph API and Instagram through the linked Business account, and it
needs `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` plus the callback URL
whitelisted in the Facebook app. TikTok is explicitly unimplemented and says so.

**3. There is no scheduler for posting at all.** No scheduled-post records, no
queue, no cron. Publishing is a button somebody presses. "Runs by itself" does
not exist yet in any form — that is the gap between what is built and what you
asked for.

**4. Three store screens send the publishable key instead of the session.**
AutoProductPilot, ProductPagePilot and DigitalStorefront. This is the same bug
class as the Build Plan button: a signed-in person is told to sign in.
AutoProductPilot builds its headers as a module constant, so every call it
makes resolves to nobody.

**5. Two product stores exist side by side.** Twenty `product_cj_*` records and
twenty-one `marketplace_product` records. Which one is authoritative, and
whether they are meant to be the same products, needs settling before anything
automated writes to either.

## What "runs by itself" would actually require

In the order that unblocks the most:

1. **Fix the paid order and the Zendrop token.** Nothing else matters while a
   customer is out of pocket.
2. **Alert on fulfilment failure.** The notification engine already exists and
   already knows who to tell. A silent failure on a paid order is the worst
   thing this system currently does.
3. **Run the fulfilment sweep on a schedule** rather than on a button. Same
   pg_cron pattern as the on-call escalation, and the same prerequisite: close
   the row-level security on `private_cron_config` first.
4. **Connect Facebook and Instagram.** Secrets and the callback whitelist are
   yours; the code is written.
5. **Build the posting loop** — pick a product, generate the post, publish it,
   record what it drove. This is the only genuinely new build on the list, and
   it should not start until 1 to 3 are done, because posting drives traffic to
   a store that currently cannot ship what it sells.
6. **Fix the three anon-key screens**, which is mechanical.
7. **Settle the two catalogues.**

## What I have not audited

Whether the twenty products are ones you want to sell, what margin they carry
after CJ's cost and shipping, and whether the store's copy and branding are
right. Those are commercial rather than technical and I have not touched them.
