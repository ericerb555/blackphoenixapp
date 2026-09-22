# On-call, the portals and Phoenix Exchange — one path

## The honest finding first

There is no on-call system. There is a page that looks like one.

`OnCallEmergencyPortal.tsx` is 560 lines of hardcoded demonstration: six
invented emergency calls with made-up names and phone numbers, a "Demo Mode"
banner, and buttons that only speak. `handleTakeCall` says "Call assigned to
you!" and assigns nothing. `handleViewDetails` opens nothing. Searching every
route declaration on the server for on-call, oncall or emergency returns
nothing at all. So it is tied to nothing, in either direction.

## Which bid room is the real one — this matters

There are **two** bid rooms in this codebase, and only one is real.

**The real one is SQL.** `BidRoom.tsx` reads and writes `bid_requests`, `bids`,
`bid_invitations`, `bid_request_media`, `bid_request_lines` and
`bid_line_prices` directly through the Supabase client under RLS. That is
Phoenix Exchange.

**The other is KV and orphaned.** `aiBidRouter` writes `bid_opportunity:{id}`
and `providerBids` reads it. Nothing in the Bid Room page has ever looked at
those records. My first pass at this plan said "fix Send to Exchange to post a
real `bid_opportunity`" — that was wrong, and it would have moved the emergency
from one dead end into another. The emergency has to become a `bid_requests`
row or it is not in the exchange.

What the on-call page does today is write to `localStorage['bidRoomJobs']`,
which nothing anywhere reads, and then say "sent successfully".

## The good news: the schema is already built for this

`bid_requests` in production already carries exactly what an emergency needs:

    is_emergency            boolean, default false
    latitude, longitude     numeric
    first_refusal_until     timestamptz
    first_refusal_org_id    uuid -> organizations

So "an emergency, at this location, which Black Phoenix may take until 3:20am,
after which it opens to subscribers" is representable today, and `BidRoom.tsx`
already writes those four fields when a human ticks the box. Nothing has to be
invented for the exchange side of this. It has to be driven.

The bid tables are empty — zero rows — so nothing depends on current behaviour.

## The one real blocker: three portals cannot own a bid request

`organizations.type` is an enum with six values:

    operator, subcontractor, vendor, advertiser, customer, landlord

The eight portal audiences the plan catalogue sells to include
**condo_association**, **property_manager** and **content**. The first two are
exactly the accounts most likely to need emergency work, and neither can own an
organisation, so neither can post to the exchange or hold an on-call record
keyed to an org.

Adding enum values is a migration. Per the standing rule on schema changes it
goes onto a Supabase branch and is proven there first — "it is only additive"
is not a reason to skip that.

## The routing, which is the actual product

From the exchange model, in this order, and emergencies run through it the same
way ordinary bids do:

1. **Contracted vendors win outright.** If the account already has contractors
   under contract for that trade, the job goes *only* to them — invitations,
   never the open room. A condo association that has signed an agreement must
   not have it undercut by the platform it pays for. This check comes first or
   it is worthless.
2. **Black Phoenix first refusal inside 50 miles.** We see it first and choose:
   take it, or let it go.
3. **The open subscriber pool.** Posting and bidding both require a
   subscription; a lapsed subscriber keeps reading and loses writing.

## How on-call joins onto that

An urgent request arrives in a portal, or a call is raised on the on-call
screen. Then, once:

- Resolve that account's on-call record.
- **Contracted vendors for this trade?** Invite only them. Stop.
- **Has the account bought the on-call add-on?** Our rota is paged by SMS and
  phone, and the request is posted to the exchange with `first_refusal_org_id`
  set to the operator org and `first_refusal_until` set to the window below, so
  nobody else can bid until it expires.
- **No add-on, no rota of their own, they just need somebody?** This is the
  door you asked for: the emergency posts straight to the exchange as
  `is_emergency = true` and subscribed subcontractors take it.
- **Window expires with nobody?** It opens to the pool. That is the escalation,
  and it is the same mechanism rather than a second one.

Whichever door it goes through, the call carries the **job id**, so the call,
the quote, the purchase orders and the invoice all sit on one job.

## Two numbers I have assumed rather than asked

- **The first-refusal window on an emergency: 15 minutes.** Long enough to
  answer a phone, short enough that a burst pipe is not waiting on us. Say a
  different number and it is one constant.
- **Posting an emergency to the exchange needs a subscription, not the on-call
  add-on.** The add-on buys *us answering*. The exchange stays open to any
  subscribed portal, which keeps the add-on's value honest and matches the
  existing rule that the subscription is the gate.

## The work

- [x] **0. Guard the portal-settings write** before anybody mounts that router.
- [ ] **1. On-call as an add-on** in the existing plan catalogue, per audience,
      with its own Stripe price — so "do we answer for this account" is a
      question about their subscription and nothing else.
- [ ] **2. The per-account record.** `on_call_config:{audience}:{accountId}`:
      on or off, hours covered, the rota, the escalation ladder with wait
      times, the per-call extras, contracted vendors by trade, and who to
      reach. Readable and writable only by that account and by staff.
- [ ] **3. The org-type enum**, on a branch first, so condo associations and
      property managers can own an organisation.
- [ ] **4. One routing function** that takes a call and applies the three steps
      above in order, on the server, returning what it did and why.
- [ ] **5. Real intake.** An urgent work request from any portal opens a call
      against that account's config, carrying the job id.
- [ ] **6. Per-call extras that reach the pipeline.** Callout fee, after-hours
      rate and the work done, as real lines on the job, priced on the server
      from the account's own rates — never a total posted by a browser.
- [ ] **7. Paging.** An `emergency` event in the notification engine that
      already works, then Twilio SMS and voice behind one send function. Needs
      `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` set by
      you as Supabase secrets — I never see them.
- [ ] **8. Repair the on-call page.** The same screen, real calls, Take and
      View doing what they say, and Send to Exchange writing a `bid_requests`
      row. Repair, not a second screen alongside.
- [ ] **9. Expiry that runs with nobody watching.** The first-refusal window
      has to lapse on its own, which means pg_cron rather than a request — read
      the security note below before anything is added there.

Suggested first slice: **1, 2 and 3.** Until on-call is sellable, has somewhere
to keep a rota, and the three missing portals can own an organisation, every
item after it has nothing to read.

## Security note found on the way — your decision

`private_cron_config` has **Row Level Security disabled** and holds two rows,
`anon_key` and `compliance_cron_secret`. RLS off means anyone holding the
publishable key — which ships to every visitor's browser — can read that table
and write to it. The compliance secret authorises the scheduled
compliance-reminder endpoint, so reading it lets somebody trigger reminder runs
as though they were the scheduler, and overwriting it breaks the schedule.

The fix is one line, and unusually it needs **no policies at all**:

    alter table "public"."private_cron_config" enable row level security;

pg_cron reads this table from inside the database and the edge function reads it
with the service role. Both bypass RLS. The only readers RLS would block are
exactly the ones that should be blocked. After enabling it, rotate
`compliance_cron_secret` — the old value has been publicly readable and should
be treated as known. `tasks/todo.md` already documents that rotation procedure.

I have not run it. It is your database and your call.

## Review

Item 0 is done. This audit corrected two things I had wrong earlier: the
portal-settings route is unreachable rather than an open hole, and the real
exchange is the SQL tables rather than the KV `bid_opportunity` records.
