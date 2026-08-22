# Plan — a master condo account that issues its own sub-portals

Eric asked how the condo role switcher really works and who controls it, and
proposed a master condo account that hands out portals beneath it the way a
landlord does, reaching unit owners, property managers and vendors.

## First, the honest answer about the switcher

**Nobody controls it.** It is a demo device, not a permission system.

`CondoAssociationPortalView` reads the current role from
`localStorage.getItem('condo_user_role')`, and the header carries a "Switch
Role" dropdown offering Board President, Board Member, Property Manager and
Resident to whoever is looking at the screen. Choosing one writes a string to the
browser and re-renders. No server is consulted, nothing is recorded, and no
account is involved. The financials, vendors, units, team and approvals tabs are
gated on that string.

Two details make it worse than it sounds. The fallback is
`|| 'board_president'`, so a visitor with nothing stored lands as the *most*
privileged role rather than the least. And the condo routes on the server —
`/property-management/condos` and friends — have **no authentication at all**;
`CondoService` sends the public anon key rather than a signed-in user's token,
so the server never establishes who is asking. A client-side gate decides what a
screen draws. It does not decide what the server hands out.

So the switcher is not a permission model with a hole in it. There is no
permission model. Which is why Eric's instinct to design the structure rather
than patch the dropdown is the right call.

## Second: you already sell the master account

This is the useful find. `PROPERTY_MANAGEMENT_PLANS` already contains:

    id: 'condo-manager'
    portalType: 'condo_manager'
    name: 'Condo Manager Plan'      tagline: 'For condo associations'
    regularPrice: 399
    limits: { tenantSubPortals: 50, teamMembers: 3 }

"Up to 50 tenant sub-portals" is already a selling feature of a plan already in
the catalogue. The commercial shape Eric described exists. What is missing is the
wiring beneath it.

## What already exists, and what does not

**Exists and is sound:**
- `CondoManagerPortalView`, with Units, Owners, Work Requests and Financials tabs
- Real server routes `/condo-manager/units` and `/condo-manager/work-requests`,
  behind a `condoManagerActor` that checks the account's role or an active access
  record — proper authentication, unlike the `property-management/condos` routes
- The Condo Manager Plan, sold, with a 50 sub-portal quota

**Does not exist:**
- Any way for the condo manager to *invite* anyone. The landlord has this; the
  condo manager has no equivalent.
- Real data in either condo portal. Both run on hardcoded demo constants.
- Any link between the association portal and the manager portal.

## The model to copy, because it already works

The landlord flow is the template and it is well built:

| Piece | Landlord | Condo equivalent to build |
|---|---|---|
| Who is asking | `landlordActor(c)` | `condoManagerActor(c)` — already exists |
| The roster | `landlord_tenants:{email}` | `condo_members:{associationId}` |
| Quota from the plan | `landlordSubPortalPlan(actor)` | same helper, condo plan |
| Issue a login | `POST /landlord/tenants/:id/invite` | `POST /condo/members/:id/invite` |
| Route requests back | `tenant_landlord:{email}` | `condo_member:{email}` |

The landlord invite provisions a Supabase auth user with the right role,
confirms the email, and returns a temporary password when mail fails so the
landlord can pass it on. Copying that rather than inventing a second invitation
mechanism is the whole point.

## What this replaces the switcher with

A person's role stops being something they pick and becomes **something they
were invited as**. The master account adds someone to the roster with a role,
sends the invite, and that role rides on their account from then on. There is
nothing left for a dropdown to switch.

The switcher survives in exactly one place: a platform owner or admin previewing
the portal. That cannot escalate anyone, because the person using it already has
full authority.

Proposed roles beneath the master account:

- **Board president / board member** — approvals, financials, governance
- **Property manager** — operations and work requests, no governance
- **Unit owner / resident** — their own unit, submit requests, see their dues
- **Vendor** — only the work assigned to them

## One thing worth getting right about vendors

A condo inviting a vendor must **not** create a second, parallel vendor
identity. Vendors are already paying subscribers with their own portal,
catalogue and purchase orders. What a condo grants is *access to that
association's work* for a vendor who already exists — a membership record
pointing at the existing vendor, not a new vendor account.

Getting this backwards would fork the vendor registry a second time. There is
already a `supplier:` / `vendor:` split in this codebase that has cost real time.

## Settled: anyone may administer, with the association's consent

Eric's answer to who holds the master account: **it could be anyone, but the
condo association has to give consent to allow it.**

That resolves the data model, and more cleanly than picking a party would have.
Authority is not decided by what *kind* of account holder it is. It is decided
by a consent record.

So:

- The **association is the root entity** and owns its data. Everything —
  members, units, dues, work requests, vendor access — keys to the association,
  never to whoever happens to administer it.
- **Administration is a grant**, recorded against the association: who was
  granted it, by whom, when, with what scope, and revocable.
- A management company running four associations therefore holds four grants,
  and the four sets of records stay separate on their own. An association
  administering itself simply holds its own grant. Same machinery either way.

This is also right in the real world. An association is a legal entity that
hires a management company under an agreement and can end that agreement and
hire another. If the management company *owned* the account, the association's
records would leave with them — which would be both wrong and a bad thing to
have to explain to a customer.

Note this is a deliberate departure from the landlord model. `landlord_tenants`
keys to the landlord's email, which is correct there because one landlord is one
owner of their properties. Copying that shape here would put several
associations into one bucket the moment one manager ran two.

### What consent looks like as a record

    condo_grant:{associationId}:{granteeEmail}
      role         manager | board_president | board_member | owner | vendor
      grantedBy    who consented, and on what authority
      grantedAt    / revokedAt
      scope        what this grant permits

Every condo route then answers one question: does this caller hold a live grant
on this association, and does that grant permit what they are asking to do.
Nothing is inferred from a role string on the account, which is what the
`localStorage` switcher was doing wrong in miniature.

## Todo

- [ ] `condo_grant:{associationId}:{email}` — the consent record above, with
      granting and revoking, and one helper every condo route calls to ask
      whether this caller may do this thing on this association
- [ ] `condo_members:{associationId}` roster — name, unit, email, role, status
- [ ] Members tab on the condo manager portal: add, edit, remove, invite,
      showing quota used against the plan's 50
- [ ] `POST /condo/members/:id/invite`, mirroring the landlord invite exactly
- [ ] Role derived from the invitation on the association portal; switcher
      restricted to platform admins
- [ ] Vendors invited by reference to the existing vendor record, never by
      creating a new one
- [ ] Authentication on the `property-management/condos` routes, and
      `CondoService` sending the real session token instead of the anon key
- [ ] Per-association scoping, so one board cannot read another's data

## What I would do first, and separately

The unauthenticated condo routes are worth closing **before** any of this,
because they are open right now and the fix does not depend on the design
question. That is a small, self-contained change: require a signed-in user,
require admin authority for the writes, and have `CondoService` send the session
token. It is the piece Eric originally asked for, and it stands on its own.
