# The vendor and subcontractor side of Phoenix Exchange

## What I found

**Your providers exist in two places that do not talk to each other.**

| | where | count | used by |
|---|---|---|---|
| KV `vendor:*` | key-value store | **6 vendors** | vendor portal, catalogues, purchase orders, billing |
| Postgres `organizations` | platform core | **1 vendor, 1 subcontractor** | Phoenix Exchange directory, invitations, bids |

The Exchange reads Postgres. The six real vendors are in KV, so none of them
could be found, invited, or asked to bid.

**The one vendor organisation has zero active members.** An organisation with no
person attached is invisible to its own company: invite it, the row is written,
the notification has nowhere to land, and nobody ever opens it.

**Nothing closed the loop.** No code in the server had ever inserted into
`organizations` or `organization_members`. The eleven organisations that exist
came from the one-off backfill in migration 002, so the directory could never
fill itself however many people applied.

## Decisions

- **No bridge.** The existing KV vendors are left alone; the Exchange fills from
  new applications going forward.
- **Create the organisation even with no account**, and invite the contact to
  claim it, so they can be invited to bid immediately.

## Done

- [x] Approving a vendor or subcontractor application creates their organisation
- [x] Contact with an account is attached as owner
- [x] Contact without an account gets a portal invitation to claim it
- [x] Idempotent — approving twice does not create a second organisation
- [x] Provider experience proved end to end against the production schema

## Not done

- [ ] An organisation with no member is not flagged on screen. The invite goes
      out, but you cannot see at a glance who has not claimed theirs.
- [ ] The claim invitation has not been watched arriving in a real inbox.

## Review

### What the tests caught

Two different firms sharing a name were being merged into one organisation. The
reuse check fell back to matching on company name whenever the email missed, so
a second "Apex Tile" at a different address joined the first one. That is not a
tidiness problem — members of one company would have sat inside the other and
read their sealed bids. The email is now the only identity matched on, and the
company name is consulted only when an application carries no email at all.

39 assertions on the real module, all passing, including approving twice, a
renamed company, a slug collision between two genuinely different firms, and an
application with no company name being refused rather than guessed at.

### The sealed-bid guarantee, verified

Tested against the production schema inside a transaction that rolls itself
back, so nothing was left behind — confirmed afterwards: still exactly 11
organisations, zero requests, zero bids.

| actor | requests seen | drafts seen | bids seen | highest bid visible |
|---|---|---|---|---|
| invited subcontractor | 1 | 0 | 1 | 7200 — their own |
| rival subcontractor | 1 | 0 | 1 | 6800 — their own |
| the poster | 2 | 1 | 2 | both |

Neither provider can read the other's price, and neither sees a draft job even
when invited to one — which is the leak that was closed for invitations back in
migration 003 and now demonstrably holds for the whole flow.
