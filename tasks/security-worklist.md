# Security worklist

Eric, 2026-11-17: *"make a list an tackle one at a time."*

Ordered by real risk, not by ease. **Who** says whether it is mine to do or a
decision only Eric can make — a configuration change in Cloudflare or the
Supabase dashboard is not something a code change can fake.

Status: `OPEN`, `DOING`, `DONE`, or `WAITING` on somebody.

| # | Item | Why it is where it is | Who | Status |
|---|---|---|---|---|
| 1 | **`/cart` is public and takes `:customerId`** | Was the only remaining hole reachable with **no session at all**. Measured on production first — `DELETE /cart/victim-customer-id` answered 200 and emptied it — then closed by deciding on the SHAPE of the id: a minted `session_…` is a capability and stays public, anything else needs staff or the signed-in owner. Verified live. | me | **DONE 2026-11-17** |
| 2 | **WAF-1 — the firewall can be walked around** | `*.supabase.co` answers directly, so the Cloudflare rules never see the traffic. Every rate limit and bot rule above it is advisory until this closes. Needs `EDGE_ORIGIN_SECRET` set in two places, then `ORIGIN_LOCK_ENFORCE=true`. | Eric + me | WAITING |
| 3 | **~950 routes that check *something*** | `npm run authz:scan`. **Bucket B (the IDOR class) is empty** — 38 leads, 37 already correct, 1 real and fixed. Bucket A stands at 34, worst cluster done. | me | **DOING** |
| 4 | **`POST /variances/scan-fill` trusts `body.email`** | A signed-in caller can file a draft under somebody else's address. Not a disclosure; the guard above it already stops them reading it back. | me | OPEN |
| 5 | **9 `SECURITY DEFINER` functions executable by `anon`** | Measured as returning nothing without a session (`is_platform_operator()` answers `false`), so this is unnecessary surface rather than a hole. Revoke `EXECUTE` from `anon`. | me | OPEN |
| 6 | **IP reputation scores but never bans** | The middleware measures and records; enforcement is off. Switching it on can lock people out, so the threshold is a judgement call. | Eric | WAITING |
| 7 | **ANON-2 — leaked-password protection** | A Supabase dashboard toggle (Authentication → Policies). The probe cannot read it, so it reports `skip` forever. | Eric | WAITING |
| 8 | **RLS-2 reports `skip` forever** | Answered by hand today — 39 of 39 public tables have RLS on — but the probe cannot run it without a service key, and a check that never runs must never read as a pass. Give it a way to answer. | me | OPEN |
| 9 | **DEP-1 — `picomatch` ReDoS, high** | **No patched version exists** (`patched: <0.0.0`), and it is build-only tooling (`fdir`, `tinyglobby`) whose glob patterns come from our own config, never from a customer. Needs a recorded exception with a recheck, not an upgrade — a FAIL nobody can clear is how a probe gets ignored. | me | OPEN |
| 10 | **Dead `EnhancedCheckoutFlow.tsx`** | Card number and CVV fields behind a fake two-second "payment". Nothing imports it, so it is a loaded gun rather than a live one. Deleting a component is Eric's call. | Eric | WAITING |
| 11 | **Three accounts hold no role** | Fail-closed and inert since September. If one is a real customer their portal is empty for this reason. | Eric | WAITING |
| 12 | **Supabase Auth bypasses Cloudflare** | Sign-in and sign-up go straight to `*.supabase.co`, so none of the firewall protections apply to the credential endpoints. Related to #2 but not fixed by it. | Eric + me | OPEN |

## What is already closed, so it does not get re-litigated

Measured rather than assumed, all on 2026-11-17 — see
`docs/server-route-authorization.md` section 4 for the evidence.

- Four route modules with **no authorisation at all** — company config, every
  project, zoning variance drafts, the AI page generator. Guarded, deployed,
  and proven 20/20 against a real non-staff session.
- The pipeline board, which had no authentication on any route.
- The browser-derived admin role that defaulted **everyone** to admin.
- **RLS**: 39 of 39 public tables enabled; a signed-in customer and an
  anonymous caller are both refused at the GRANT level on every table.
- **Storage**: every bucket holding customer files is private. All four public
  buckets listed object by object — website gallery, logo variants, logo cache.
- Card fields removed from signup.
- Retired API generations confirmed dead, with a check that now requires a
  positive marker instead of accepting a 401.

## Item 3 in progress — `npm run authz:scan`

The scanner is in the repo now rather than a one-off. It lists writes that take
an identifier from the request, split by the distinction that matters:

    A  no caller resolved at all                    36 routes
    B  caller resolved, never compared to the
       record — the IDOR class                      38 routes

**It is a lead generator, not a verdict.** Two false positives were fixed
before any of it was trusted, and both are how this kind of scan lies:

- `design-links.tsx` passes `requireStaff` as **per-route middleware**, so the
  handler body never names it. All five of its routes were flagged. The scan
  reads the argument list now.
- `rental-portals.tsx` `PATCH /tenant/leases/:id/sign` resolves `intakeActor`
  and compares the caller's email to `lease.tenantEmail` **inline**. Textbook
  correct, and flagged because the check is an expression rather than a helper
  call. That is why one question became two.

Staff-only routes are excluded on purpose: "every staff member may touch every
record" is a policy, not a defect.

### Done from item 3

- **`property-management.tsx`** — twelve writes at tier "user" with no caller
  resolved at all: condo associations, landlords' properties, their work
  requests, the offers on them, and the crew assigned. Staff-only now. The
  module's own header had recorded the problem and declined it, fearing a staff
  gate would break the landlord portals — checked, and nothing landlord-facing
  calls the module at all; the real landlord features are in `rental-portals`
  with their own ownership checks. Separately, `index.tsx` claimed this module
  "stays unmounted" while it was mounted and live, which is corrected in place.

### Next clusters, largest first

`growth-marketing` (5, three at admin tier), `crm-content` (4, two admin),
`ecommerce-orders` (3, behind middleware), `ecommerce-products` (3, behind
middleware), `rental-portals` (3), then a long tail of ones and twos. The
admin-tier and middleware-covered ones are probably fine and need reading to
confirm rather than guarding.

### Item 3 — bucket B is empty, and that is the headline

**38 leads, 37 of them already correct, 1 real.** The IDOR class — knows who
you are, never checks the record is yours — is clean in this codebase. That is
the opposite of what the bucket was opened expecting, and it is worth stating
plainly so nobody re-opens it.

Each of the 37 is a thing the scan could not see, and each is now a marker:

| What it missed | Where |
|---|---|
| `requireStaff` passed as **per-route middleware** | `design-links.tsx`, all five routes |
| an **inline** email comparison rather than a helper call | `rental-portals.tsx` lease signing |
| **scoped by construction** — the key is built from the caller | `landlord/tenants/:id/charge` |
| **delegated** to a per-record standing helper two layers down | `condo-associations.tsx` |
| the admin flag under another property name | `who.isAdmin`, `me.admin`, `actor.isCompany`, `actor.admin` |

The third is the one worth remembering: `POST /landlord/tenants/:id/charge`
takes the landlord from the token and looks the tenant up in *that landlord's
own roster*, so a tenant id belonging to somebody else is not in the list it
searched. There is no comparison to find because there is nothing to compare.
That is stronger than fetch-then-compare, and the scan called it a finding.

**The one real one: `reel-scoreboard.tsx`, and it was the whole module.** Every
route resolved a caller, checked nothing, and sat on no gate list — so any
customer could read the company's social performance and overwrite the metrics
on any post. No data leaks and no money moves; what breaks is that the numbers
the company judges its own marketing by could be written by anyone with an
account. Staff-only now, reads included.

### Item 3 — bucket A is where the rest is

34 writes that resolve no caller at all. The worst cluster went earlier today
(twelve property-management writes). The remainder are mostly admin-tier or
behind path middleware and need reading to confirm rather than guarding, with
a tail at tier "user" that does not.
