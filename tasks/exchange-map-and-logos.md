# PLAN — the map as a main feature, and logos that arrive by claiming

Eric, 2026-10-13:

> *"should we have the map a main feature and compy logos will appear when the
> claim and add them?"*

Not started; waiting on him to verify the plan. Planned as one piece rather than
two, because they are one piece: a map of 1,108 pins all drawn the same way is a
grey field, and a logo is the thing that makes a claimed business look different
from the 1,090 that are not. Each is worth less without the other.

---

## What the ground actually says

Checked against production, not assumed:

    organizations                1,108
    with coordinates             1,092   (98.6%)
    claimed                         18   (1.6%)
    logo column                   none
    exchange_claim_challenge     phone_code and others — control is proved

Two of those numbers decide the whole plan.

**98.6% geocoded** is why the map is worth promoting. The usual failure — a
beautiful empty canvas because nothing was geocoded — does not apply here. The
map is also the one view where having 1,108 compiled listings is an asset rather
than a wall of text, because "who is near me" is the question a resident
actually has and a list cannot answer it.

**1.6% claimed** is why logos matter more than they look. Claiming today earns
the right to correct your own details, which is a chore, not a reward. "Claim
your listing and your logo appears" is a visible, immediate payoff — and it is
the only honest lever available, because the one thing the directory must never
do is invent the things that would make a listing attractive.

---

## The constraint that shapes the map half, and it is already decided

`routes.tsx` documents it, and the reasoning holds:

> *"`exchange` is the front door... the crawlable tree of categories and names
> the free-traffic plan rests on; a map is a canvas with nothing in it for a
> crawler to read. This sits beside it."*

So **the map must not become the front door.** The Exchange's entire acquisition
plan is free search traffic on a domain with no authority, and that rests on
crawlable category and listing pages. A map-first redesign would quietly delete
the acquisition strategy to improve the browsing experience.

The resolution is that "main feature" and "front door" are different jobs:

- [ ] `/exchange` stays the canonical, crawlable entry. Unchanged.
- [ ] The map becomes the **primary resident destination** — what someone lands
      on from inside the app, from a "near me" intent, and from the Exchange
      nav as a peer of Browse rather than a link buried below it.
- [ ] Every pin links to the same crawlable listing page the tree links to. The
      map is a way *in*, never a replacement for the page itself.

## The map, to be worth landing on

- [ ] **Clustering.** 1,108 pins is unusable at town zoom and slow on a phone.
- [ ] **A list beside the map, not instead of it.** The 16 listings with no
      coordinates are invisible on a map-only view — not merely unplaced,
      *absent*. They must still be reachable.
- [ ] **Claimed businesses read as different**: logo, and visible first in any
      overlapping cluster. This is where the two halves meet.
- [ ] **Know the cost.** This becomes the heaviest page in the app. Today's
      smoke work showed what heavy pages do to the harness; it should be lazy,
      and it should not be in the first bundle anyone downloads.

---

## Logos: the only way one can legitimately exist here

`exchangeIngest.ts` states the rule this plan obeys:

> *"a compiled listing carries the business's name, type, address, phone and
> website, and not one field more. No description, no hours, no photographs, no
> ratings — none of that can be trusted before an owner stands behind it."*

A logo is exactly that. It **cannot** be scraped, bought in, or guessed from a
website. It can only arrive from somebody who proved they control the business —
which is what the claim flow already does with a phone or email challenge. So
"logos appear when they claim and add them" is not a product preference; it is
the only shape the existing architecture permits.

- [ ] A `logo_path` on the organisation — a **stored file reference**, not a URL.
- [ ] Upload only on a **claimed** listing, by the account that holds the claim.
- [ ] Reuse the existing upload path rather than inventing a fourth. There is
      already `image-upload.tsx` (a public bucket), `media-library.tsx` (a
      private one), `UploadMyLogo` and `brands.tsx`. A logo shown to the public
      belongs in the public bucket with the other public imagery.
- [ ] Through the **approval gate** in `publishApproval.ts`. A logo is tenant
      content reaching other people, which is the standing rule for everything
      a tenant publishes.

### Three things to refuse, and why

**No remote URLs, ever.** A stored `logo_url` pointing at the owner's server
lets them swap the approved image for anything afterwards, and leaks every
viewer's IP to a third party. Store the bytes.

**No logo on an unclaimed listing**, even if somebody offers one. That is the
whole premise: an unclaimed listing carries only what public records said.

**No image from the website's favicon or og:image.** It is the obvious shortcut,
it would populate hundreds of listings at once, and it is precisely the
"invent nothing" line — a scraped image is a claim about a business that nobody
stood behind, and the first wrong one is a complaint from a business that never
asked to be listed.

### And the one real abuse to design against

Somebody claims a business they do not own and uploads its real logo, or a
competitor's. The claim challenge already makes that hard — it proves control of
the listed phone or email. The approval gate is the second lock. Worth stating
that neither is a trademark check and we are not performing one; what we have is
proof of control plus a human look, which is the same standard the rest of the
platform's published content holds.

---

## Why these two together are the conversion story

The Exchange's business model is businesses paying after a free trial. Nothing
in the product currently makes claiming feel like a gain. This pair does:

    a resident opens the map          → sees who is near them
    claimed businesses stand out      → logo, surfaced first
    an owner sees their own listing    → grey, anonymous, beside a rival's logo
    claiming is now worth doing        → and claiming is the top of the funnel

That is the tie-in the architecture rule asks for: the map gives the logo
somewhere to be seen, the logo gives claiming a reason, and claiming is what
turns a compiled record into an account that can later be sold a subscription.

## Not in this plan

**No photo galleries, hours, or descriptions.** Each is a separate decision
about what a claimed listing may carry, and each has the same "who stands behind
it" question. A logo first, because it is one small file and the visual payoff
is immediate.

**No change to `/exchange` or to the category tree.** The crawlable surface is
load-bearing for acquisition and this plan deliberately does not touch it.

**No paid placement on the map.** Selling position is a different product with
different disclosure obligations, and mixing it into the first version would
make "surfaced first" mean two things at once.

## Review — built 2026-10-15

### The map half was already there

Checked rather than assumed, and most of it had been built with the map itself:
clustering (`clusterRadius: 48`, `clusterMaxZoom: 13`, with a cluster knowing
whether it holds a search match), the list beside the map rather than instead of
it, the lazy load that keeps MapLibre out of every other page bundle, and the
map door sitting **above** the category tree on `/exchange` rather than below
it. So the only map item left was the one that needed the logo half to exist.

- [x] `/exchange` stays the canonical crawlable entry. Untouched.
- [x] The map is a first-class destination, linked above the tree.
- [x] Every pin links to the same crawlable listing page.
- [x] Clustering.
- [x] A list beside the map, so the 16 unplaceable listings stay reachable.
- [x] Lazy, and not in the first bundle.
- [x] **Claimed businesses read as different**, which is what this round added:
      `circle-sort-key` puts a search match above a claimed listing above
      everything else, so where two businesses share an address the one
      somebody stands behind is the one you can see and tap. A claimed pin also
      keeps full opacity and a stronger stroke rather than being dimmed.

The logo itself is **not** painted into a pin. That needs an image loaded per
business, and 1,092 of them would cost more than the map is worth. The logo
lives on the list beside the map and on the listing page; on the map, claiming
buys a pin that reads as solid rather than faint.

### Logos

- [x] `logo_path` on the organisation — an object path, never a URL.
- [x] Upload only on a **claimed** listing, by the account holding the granted
      claim. Checked against `exchange_claim`, the same thing the claim flow
      already decided.
- [x] Through the approval gate: a business can reach `submitted` and nothing
      else. `businessMayMove` refuses every transition to `approved` from every
      state, so no sequence of business-side requests publishes an image.
- [x] All three refusals written in: no remote URLs, no logo on an unclaimed
      listing, no favicon scraping — there is no code path that fetches an
      image from anywhere.

**The rule that does the most work** is `logoIsPublic`, which requires an
approved logo **and** a listing still in the hands of whoever claimed it. The
suspend route can put `claim_state` back to `listed`; a logo that kept showing
after that would be the directory asserting a brand nobody stands behind, which
is the invent-nothing rule being broken by the back door. It has a test.

### Where the plan had to be corrected

**"Reuse the existing upload path rather than inventing a fourth" was not
possible.** Both candidates were checked:

- `image-upload.tsx` — right bucket, right byte-sniffing, **staff only**. A
  business owner is not staff, and widening that gate would hand every
  signed-up account the project’s storage.
- `media-library.tsx` — signed in, but a **private** bucket with 24-hour signed
  URLs. A logo has to display in a year to somebody who is not logged in.

So `exchangeLogoRoutes.tsx` is new, and what is reused is everything that
should be: the same public bucket, the same `sniffImage`, the same
approval rule. What is new is only the authorisation, which neither existing
route could express.

**Replacing an approved logo takes it down until it is looked at again.** Not in
the plan, but it follows from `publishApproval.ts`: the thing reviewed and the
thing shown have to be the same thing. Otherwise approval is bypassed by anybody
willing to submit something inoffensive and swap it afterwards. The business
side says so before they upload, because finding out later would feel like a bug.

### The migration, and two wrong things I said about it

**First I said** it was "written but not applied, and Eric's to authorise" while
naming it `.sql` — and `.sql.pending` is this repo's name for one deliberately
held back. Named and described inconsistently, which is the one combination that
means nothing.

**Then I said** a `.sql` migration is applied by a deploy. Also wrong, and worse,
because it sounded reassuring. There is no CI here, and `deploy.md` documents
exactly one command — `supabase functions deploy make-server-3eae23a6` — which
applies no migrations at all. **Nothing applies migrations automatically. A
person runs `supabase db push`.**

That matters because it makes the two steps independent and manual, in either
order, with an arbitrary gap between them. So the fix was not to argue about
which should go first:

**The serving code no longer depends on the migration.** `exchangeDirectory.tsx`
asks for the logo columns and falls back to asking without them if the database
has never heard of them, remembering the answer per isolate —
`looksLikeMissingLogoColumn`, which has tests, including one asserting that an
unrelated missing column is *not* swallowed as "no logo yet". A logo not
appearing is a disappointment; a hard dependency would have made a missing
migration into a 500 on every listing in the directory.

So the order genuinely stops mattering. Until somebody runs `db push`,
everything works as it does today and no logo can be uploaded — the upload route
is the one place that does need the columns, and it says so.

What the migration does is additive and dull: six nullable columns and one enum
type, no existing column altered, no row rewritten, a NOT NULL default that
Postgres records as metadata rather than a table rewrite, a check constraint
every existing row already satisfies, and a partial index on a condition no row
yet meets. On the first day all 1,108 listings read `logo_state = none` and
render exactly as they do today.

### Done since

- [x] The staff menu links the logo queue, beside the deal and claim queues.
      The three are one job — deciding what a tenant shows everybody else — and
      a queue nothing links to is a queue nobody empties. An unemptied logo
      queue means a business that claimed its listing and uploaded a logo waits
      with no idea why.
