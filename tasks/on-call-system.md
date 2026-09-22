# The on-call system — audit, and the plan you approved the shape of

## The honest finding first

There is no on-call system. There is a page that looks like one.

`OnCallEmergencyPortal.tsx` is 560 lines of hardcoded demonstration: six
invented emergency calls with made-up names and phone numbers, a "Demo Mode"
banner across the top, and buttons that only speak. `handleTakeCall` says
"Call assigned to you!" and assigns nothing. `handleViewDetails` says "Opening
call details..." and opens nothing. There are no on-call or emergency routes
anywhere on the server — searching every route declaration for on-call, oncall
or emergency returns nothing at all.

So the answer to "is it tied in correctly to the portals" is that it is tied to
nothing, in either direction. No portal can raise an emergency into it, and it
holds nothing to send out.

## The one thing it does write, it writes into a drawer

"Send to Phoenix Exchange" pushes a job into `localStorage['bidRoomJobs']`.
Nothing in this codebase ever reads that key. The real bid room keeps
opportunities on the server under `bid_opportunity:{id}`, created by
`/bid-router/ai-route` and read by `providerBids`. So sending an emergency to
the exchange today files it inside one browser, where no subcontractor will
ever see it, and the screen says "sent successfully".

That is the pipeline-alongside failure by the letter.

## Per portal has nowhere to live yet

Portal settings today are a single global record — `portal_global_settings:default`
— holding branding, the asset library, notification switches and email
templates. There is no per-account settings record for any of the eight portal
audiences. "Set up per portal" has no storage behind it at the moment.

**A correction to my first pass on this.** I wrote that `POST /portal-settings`
was an open hole anyone could write through. The route has no authorisation
check, which is true, but the router is never mounted — nothing in `index.tsx`
imports it — so neither route is reachable and nothing could be written through
it. It is a foot-gun waiting for the day somebody mounts it, not a live hole,
and I should not have called it live. The guard is now in place so that mounting
it is safe; it is still unmounted, which is also why the Portal Global Settings
screen fails when you press Save. Mounting it is a separate decision about a
screen you did not ask about, so I have left it alone.

## What does exist, and is closer than it looks

**A real notification engine.** `staff-notifications.tsx` already keeps
recipients with roles, subscribes each to chosen events, de-duplicates a repeat
inside ten minutes, logs every delivery, and always includes the owner
addresses from the secret so a misclick cannot silence every alert. For on-call
it lacks three things: no emergency event (only signup, payment, work_request),
recipients are company-wide rather than per portal, and nothing is time-aware.

**Real emergency intake.** Emergencies already arrive as work requests with
`priority: 'urgent'`, and the landlord email colours urgent red. They arrive;
nothing routes them to a person.

**The add-on machinery.** `planTier.ts` already has `PlanAddOn`,
`addOnAvailableOn`, `addOnIncludedIn` and `subscriptionTotalCents`. On-call is
sold through that, not through a new parallel path.

**Technician levels** — apprentice, intermediate, advanced, master — exist and
are what a rota assigns from.

## The shape you chose

- **The rota belongs to the account.** Each portal account sets up its own
  on-call — their people, their number, their hours. Black Phoenix is the
  escalation when nobody there answers.
- **We run it when they buy it.** On-call added to their subscription means our
  rota answers their emergencies instead. Which mode applies is decided by
  what the account is actually paying for, resolved on the server.
- **Every call bills on its own.** The subscription buys the answering and the
  rota; the callout is charged per call, as real lines on the job.
- **Paging is SMS and phone, through Twilio.** Email alone is a record of an
  emergency, not a response to one.

## The work

- [x] **0. Guard the portal-settings write** before anybody mounts that router.
- [ ] **1. On-call as an add-on.** One add-on per portal audience in the
      existing catalogue, with its own Stripe price, so "do we answer for this
      account" is a question about their subscription and nothing else.
- [ ] **2. The per-account record.** `on_call_config:{audience}:{accountId}`:
      on or off, hours covered, the rota, the escalation ladder with wait
      times, the per-call extras, and who to reach. Readable and writable only
      by that account and by staff — the isolation rule applies here as
      strictly as anywhere.
- [ ] **3. Per-call extras that reach the pipeline.** A callout fee, an
      after-hours rate and the work done, landing as lines against the job the
      call belongs to. Priced on the server from the account's own rates; never
      a total posted by a browser.
- [ ] **4. Real intake.** An urgent work request from any portal opens an
      emergency call against that account's config, carrying the job id so the
      call, the quote and the invoice sit on one job.
- [ ] **5. Paging.** An `emergency` event in the existing notification engine,
      then Twilio SMS and voice behind one send function. Needs
      `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` set by
      you as Supabase secrets — I never see them.
- [ ] **6. Repair the portal page.** The same screen, reading real calls, with
      Take and View doing what they say. Repair, not a second screen alongside.
- [ ] **7. Fix Send to Exchange** to post a real `bid_opportunity` through the
      server instead of into localStorage.
- [ ] **8. Escalation when nobody answers.** Needs a timer rather than a
      request, so it is designed last.

## Review

Item 0 is done. Everything else is unstarted and waiting on your go-ahead for
the order — my suggestion is 1 and 2 together, because until on-call is
sellable and has somewhere to store a rota, everything after it has nothing to
read.
