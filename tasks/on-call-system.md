# The on-call system — what is actually there, and what tying it in means

## The honest finding first

There is no on-call system. There is a page that looks like one.

`OnCallEmergencyPortal.tsx` is 560 lines of hardcoded demonstration: six
invented emergency calls with made-up names and phone numbers, a "Demo Mode"
banner across the top, and buttons that only speak. `handleTakeCall` shows
"Call assigned to you!" and assigns nothing. `handleViewDetails` shows
"Opening call details..." and opens nothing. There are no on-call or emergency
routes anywhere on the server — searching every route declaration for
on-call, oncall or emergency returns nothing at all.

So the answer to "is it tied in correctly to the portals" is that it is not
tied in to anything, in either direction. No portal can raise an emergency into
it, and it holds nothing to send out.

## The one thing it does write, it writes into a drawer

"Send to Phoenix Exchange" pushes a job into `localStorage['bidRoomJobs']`.
Nothing in this codebase ever reads that key — I checked every file. The real
bid room keeps opportunities on the server under `bid_opportunity:{id}`,
created by `/bid-router/ai-route` and read by `providerBids`. So sending an
emergency to the exchange today files it inside one browser, where no
subcontractor will ever see it, and the screen says "sent successfully".

That is the pipeline-alongside failure by the letter: a document produced next
to the system instead of inside it.

## Per portal has nowhere to live yet

Portal settings today are a single global record — `portal_global_settings:default`
— holding branding, the asset library, notification switches and email
templates. There is no per-audience settings record for any of the eight
portal audiences (vendor, subcontractor, advertiser, customer, content,
property manager, landlord, condo association). "Set up per portal" has no
storage behind it at the moment.

**Separate and more urgent: `POST /portal-settings` has no authentication.**
No actor check, no staff check, nothing. Anyone holding the publishable key —
which ships in the browser to every visitor — can overwrite the company's
branding, its email templates and its access-control flags. That is not part of
the on-call work but it was found on the way and it should be closed first.

## What does exist, and is closer than it looks

**A real notification engine.** `staff-notifications.tsx` already keeps
recipients with roles, subscribes each to chosen events, de-duplicates a repeat
inside ten minutes, logs every delivery, and always includes the owner
addresses from the secret so a misclick cannot silence every alert. What it
lacks for on-call is three things: there is no emergency event (only signup,
payment and work_request), the recipients are company-wide rather than per
portal, and nothing is time-aware — it has no idea whether it is 3am.

**Real emergency intake.** Emergencies already arrive as work requests with
`priority: 'urgent'`, and the landlord email in `property-management.tsx` even
colours urgent red. They arrive and nothing routes them to a person.

**Technician levels** — apprentice, intermediate, advanced, master — exist
already and are what a rota would assign from.

## The question I cannot answer for you

"Set up per portal" reads two completely different ways, and they build
differently enough that guessing would waste the work:

**A — Black Phoenix runs the on-call, configured per portal type.** One rota,
hours, escalation ladder and emergency rate per audience, edited by you in the
Owners Dashboard. A landlord emergency pages your plumber; a condo association
emergency pages a different ladder at a different rate.

**B — each portal account runs its own on-call.** This landlord sets their own
emergency number and their own people; that condo association sets theirs;
Black Phoenix is the escalation when nobody answers. Edited by them, in their
portal, and it becomes a feature of their subscription.

B is the bigger product and the one that is sellable. A is what an emergency
service company needs on day one. They can both exist, with A as the fallback B
escalates to, but which one is built first changes the storage, the screens and
who can edit them.

**And: how does an on-call person actually get told?** Email alone is not
on-call — nobody reads email at 3am. Real paging means SMS or a phone call,
which means a Twilio account and its credentials, set by you as secrets the way
the Stripe keys were. Worth knowing before this is designed rather than after.

## Proposed work, once those are answered

- [ ] **0. Close the unauthenticated portal-settings write.** Independent of
      everything below, and small.
- [ ] **1. One per-portal on-call record.** `on_call_config:{audience}` (or
      `:{audience}:{accountId}` for B), holding: whether on-call is on, the
      hours it covers, the rota, the escalation ladder with wait times, the
      emergency rate, and where it sends what it cannot place.
- [ ] **2. A fourth event in the notification engine.** `emergency`, reusing
      the recipients, the dedupe and the log that already work, with recipients
      resolvable per portal rather than only company-wide.
- [ ] **3. Real intake.** An urgent work request from any portal opens an
      emergency call against that portal's config, and the call carries the
      job id so it lands on the same job as the quote and the invoice.
- [ ] **4. Replace the mock page with the real one.** Repair rather than build
      alongside: the same screen, reading real calls, with Take and View doing
      what they say.
- [ ] **5. Fix Send to Exchange** to post a real `bid_opportunity` through the
      server instead of writing to localStorage.
- [ ] **6. Escalation that runs when nobody answers.** This is the part that
      needs a timer rather than a request, and the one to design last.

## Review

Nothing built yet — this is the audit and the two decisions it depends on.
