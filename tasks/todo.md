# Phoenix Exchange — major upgrade

## What I found before planning

**1. There were two Exchange pages, and the better-looking one was dead.**
`routes.tsx` defined `"bid-room"` twice. A later key wins, so `BidRoom.tsx`
rendered and `BidRoomV2.tsx` (1257 lines of filters, presets, search, sort) was
unreachable — and wired to a dead KV backend, while the live page sat on real
Postgres tables with row-level security.

**2. The portals and the landing page do not match each other.** `SponsoredMarquee`
(landing page) genuinely scrolls and is server-backed; `AdvertisingMarquee`
(~15 portals) is a localStorage rotating banner. Eric chose to match the portals.

**3. A security hole found on the way.** `AdvertisingMarquee.handleAdClick` sent any
non-`http` link to `window.location.href`. A stored `javascript:` scheme executed.

## Done

- [x] Removed the duplicate `"bid-room"` route key and deleted `BidRoomV2.tsx`
- [x] Marquee on the Exchange, using the portals' own component
- [x] `scroll` added as an **opt-in** prop — only the Exchange passes it, so the
      ~15 portals render exactly what they rendered before
- [x] Fixed the `javascript:` link hole (`safeAdUrl`), applied to both variants
- [x] Search across title, trade, address and scope — every word must match
- [x] Filters: trade, status, budget, distance, due window, emergency, has-media
- [x] Five one-click presets, each a real question rather than a demo
- [x] List / grid / radar-map views
- [x] Photos and video on a request, with an http(s)-only guard on the URL
- [x] Countdowns, first-refusal state, and a bid-spread bar (low / median / high)
- [x] Emergency lane — emergencies lead every sort order
- [x] 50-mile radius, measured with the same haversine the SQL uses
- [x] Migration `011_exchange_marketplace.sql` written
- [x] 45 unit tests on the filter logic, all passing
- [x] Verified in a real browser at 1440px and at 390px

## Not done

- [ ] **Migration 011 is not applied anywhere.** It needs a branch test first.
- [ ] The subscription gate (`010`) stays unapplied — separate decision.

## Review

### Where the design comes from

Spacing on this screen is real CSS in `exchangeStyles.ts`, not `p-*` / `m-*`.
Those utilities compute to 0px application-wide because the global reset is
deliberately unlayered — so the previous version of this page had been
rendering with no internal padding at all, which is a good part of why it looked
plain. A class selector out-specifies a bare `*`, so the named classes apply.
Measured in the browser: masthead 26px, card body 17px, shell 32px desktop and
20px mobile.

### What the tests caught

- Emergencies lead **every** sort, including budget and newest — otherwise a
  burst pipe sorts below a kitchen remodel.
- A request with no coordinates can never satisfy a radius filter. Including it
  would claim a job is nearby when nobody knows where it is.
- A request with no budget is never hidden by a budget filter.
- Budget filtering is overlap, not containment, so an $8k–$15k job answers
  "over $10k".
- A stale `vendorId`-style reference — here a lapsed first-refusal window — reads
  differently from one that was never set, and the UI says so.

### What the browser caught

- The bid spread read "**3 of 2 bids**" whenever the posting org priced its own
  job or an invitation was withdrawn after a bid landed. Now two separate facts.
- The view toggle and preset chips were 38px. Now 44px on touch, desktop
  density kept.
- The marquee's dismiss button was 28px on a phone.
- The `javascript:` test ad is **inert** when clicked, confirmed by asserting no
  side effect fired.

### Three false alarms worth recording

My own probe produced three "bugs" that were not bugs: a case-sensitive text
match against a `text-transform: uppercase` pill; mangled selector quoting after
patching the probe with escaped strings; and a `.bpx-` prefix where the
component uses `.bp-`. Each looked like a product failure. The fix was to stop
patching probe files with string replacement and rewrite them whole.

### Not verified

The page has not run against a real database with migration 011 applied. Every
new column and the media table are treated as optional, so it works either way,
but the media strip and the radius filter cannot show anything real until 011
is applied.
