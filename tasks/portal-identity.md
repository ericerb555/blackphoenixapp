# Portals must tell an account the truth about itself

## The problem, stated once

Seven portal views build the signed-in account's own profile from
`localStorage.getItem('demo_role_profile')`, and fall back to hardcoded
invented data when that key is absent — which it is for everybody except a
member of staff who has used the role switcher in that same browser.

So a real paying account signing into its own portal is shown somebody else's
company, somebody else's contact details, and an account history that never
happened. This is the same shape of bug as the subscription tier that used to
live in `localStorage`: **a fact about the account, read from a place the
browser controls, with an invented value when it is empty.** That one was fixed
by resolving the tier from `GET /my-plan` on the server and failing closed to
the entry tier. The same move applies here.

`RoleSwitcher` — the writer of that key — is correctly gated to
`isOwner || isAdmin || OWNER_EMAILS`. The *readers* are not gated at all, so
any visitor can set the key and any visitor with it unset gets the fabrication.

## Done — the vendor portal, 2026-10-12

`VendorPortalView` showed every vendor:

    Premier Building Supplies Co. · Sandra Lee · sandra@premierbuild.com
    342 total orders · 15 active · 4.8 rating · member since March 2022

None of it theirs. **And it was not only cosmetic:** that name was passed as
`ownerName` into the plan builder, the plan tracker and the investments tab, and
as `submitterName` into reel submission — so a real vendor's plan and a real
vendor's reel were recorded against a company that does not exist.

The fix was small, because the data was already arriving. `GET /vendor/me`
returns `vendor` (the record) and `email` (the signed-in address) in the very
response the portal was already reading for `linked` and `vendorId`. Both were
being discarded. They are now kept, and `vendorInfo` is derived from them.

Gone and deliberately not replaced: `accountManager`, `rating`, `totalOrders`,
`activeOrders`, `memberSince`. No vendor record carries any of those fields on
either record shape (`vendor:VEN-001`-style seeds carry `name`, `contactEmail`,
`website`, `category`; applied vendors carry `name`, `email`, `phone`,
`paymentTerms`), so there is nothing to read and nothing honest to put there.
Four of the five were never rendered anyway. `accountManager` was, and is now
the company name.

Failing closed: an account with no vendor link gets **its own email address**,
never a company name. That is a real state the portal already handles — it
shows `linkReason` — and the honest label for somebody we cannot identify as a
company is the address they signed in with.

What this costs: previewing the vendor portal from the role switcher no longer
shows the Premier Building Supplies persona. It shows the previewing admin's own
email. That is the correct trade.

## Still to do — seven portals

| Portal | What it invents |
|---|---|
| `CustomerPortalView` | `demo_role_profile` fallback |
| `LandlordPortalView` | `demo_role_profile` fallback |
| `PropertyManagerPortalView` | `demo_role_profile` fallback |
| `CondoManagerPortalView` | `demo_role_profile` fallback, plus a hardcoded unit roster including an owner named "Sandra Lee" |
| `SubcontractorPortal` | `demo_role_profile` fallback |
| `SubTenantPortal` | `demo_role_profile` fallback |
| `TerritoryPortalView` | `demo_role_profile` fallback |

Each needs the same treatment and each needs its own answer to one question:
**what does the server already return about this account, and is it being
thrown away like the vendor's was?** That is worth checking per portal before
writing anything, because in the vendor's case the entire fix was to stop
discarding a field.

Verification note: smoke mounts `vendor-portal` and `vendor-portal-new` without
throwing, but the identity path only runs for a signed-in vendor session, which
cannot be created from here. Seeing the real company name in the header needs a
vendor login.

## Done — the condo association portal, 2026-10-12

Three separate fabrications, and they needed three different answers, which is
the useful lesson from this one: **the fix depends on whether a real source
exists.**

### 1. Vendor contracts — nothing to read, so nothing shown

The dashboard listed, under "Active Vendor Contracts" with an ACTIVE badge:

    Green Lawn Care       Landscaping   $4,500/mo   ends 2024-12-31   ★ 4.8
    CleanPro Services     Janitorial    $6,200/mo   ends 2024-09-30   ★ 4.9
    SecureWatch           Security      $8,500/mo   ends 2025-03-31   ★ 4.7

Shown to every board that could see financials. So a board reading its own
portal was told it holds $19,200 a month of contracts it does not have, two of
them already expired, with vendors it has never engaged. That is a number
somebody budgets from or questions a treasurer about.

The condo server has routes for associations, members, standing and consent and
**none for vendor contracts** — no such record exists anywhere, so there was
nothing being discarded that could be shown instead. The array is now empty with
the reason recorded, the dashboard says plainly that no contracts are recorded,
and the "View All" button only appears when there is something to view. Contract
tracking has to be built before this can display anything.

### 2. The team roster — a real source existed and was being ignored

The Team tab listed two hardcoded people to every board: "Robert Martinez,
Board President, robert@harborview.com" and "Lisa Anderson, Property Manager,
lisa@propertymanagement.com". Listing somebody as your board president implies
they hold access, which makes this worse than a cosmetic placeholder.

`GET /condo/associations/:id/members` already returns the real grants **and
enforces its own authorisation** — it refuses with 403 unless the caller's
standing allows `members`. So the roster is now fetched, and an empty result
means either no members or no permission; showing nothing is right in both
cases. A member whose status is not `active` is badged with that status, because
a pending invitation is not the same as access.

Removed with it: a `+ Invite Team Member` button that had no `onClick` and did
nothing. `POST /condo/associations/:id/members/:email/invite` exists, so wiring
it up is a real follow-up rather than a restoration.

### 3. The association itself — the fallback that was claimed to be gone

`associationInfo` fell through to a hardcoded "Harborview Condo Association,
1250 Waterfront Drive, Miami, FL 33139, 240 units, 4 buildings".

A comment above `realAssociation` already claimed that a member of no
association "gets an honest empty state rather than somebody else's building in
Miami". **It did not.** `loadCondoData()` runs on mount for everybody and calls
`loadDemoData()` unconditionally, so `condoData` was always the Miami demo and
the fallback always had something to show. The comment described an intention,
not the code — worth remembering when reading the other portals, because their
comments may do the same.

Non-staff with no real association now get blank fields and "No association
linked to this account yet". Platform staff keep the sample, labelled as one,
because previewing the portal is what it is for. `PropertyRecordsPanel` will not
look up records for an empty address, which is the right outcome when the
building is unknown.

### Still in this portal, not fixed

- `budgetData` — hardcoded $45,000 maintenance, $28,000 utilities and the rest,
  rendered as the association's budget allocation.
- The sample work requests and units from `loadDemoData()`, which the original
  comment already flagged as the next piece.
- The Vendors and Documents tabs are stubs reading "would be displayed here".

Typecheck app 316 / server 87, both on baseline. Smoke 28 rendered, 0 threw,
`condo-association-portal` among them.
