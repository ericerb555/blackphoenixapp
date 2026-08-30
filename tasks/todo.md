# Close the self-assigned-role privilege escalation

## The hole

Supabase has two metadata bags on every account:

- `app_metadata` — writable only with the service-role key, i.e. only by our server.
- `user_metadata` — writable by the signed-in user, from the browser, via
  `supabase.auth.updateUser({ data: { ... } })`.

Eleven authority checks on the server read `user_metadata` when deciding what a
person may do. So any signed-in customer, vendor, tenant or subcontractor can
open the browser console and run

    supabase.auth.updateUser({ data: { role: 'admin' } })

and the server will treat them as an administrator on the next request. The app
already calls `updateUser` from `LandlordPortalView.tsx:168`, so this is a
capability the client demonstrably has, not a theoretical one.

## What each site currently grants to a self-declared role

| Site | Self-assign | Gets you |
| --- | --- | --- |
| `index.tsx:1195` `intakeIsAdmin` | `admin` | Everything gated on admin: invoices, payments, portal register, price book, work requests |
| `index.tsx:3764` `purchaseOrderActor` | *anything but* `vendor` | Every purchase order, all vendors — a vendor widens by DELETING their role |
| `index.tsx:5322` `internalWorkAccess` | `employee` | Internal schedules and field notes on any job |
| `advertising.tsx:77` | `admin` | Every advertiser's campaigns |
| `content-filter-admin.tsx:33` | `admin` | Content filter configuration |
| `design-links.tsx:70` | staff role | Share any file, read any design |
| `design-links.tsx:409` | staff role | Any customer's saved selections |
| `fulfillment.tsx:109` | `admin` | Every order |
| `gallery.tsx:53` | `admin` | Gallery writes |
| `hot-products.tsx:107` | `admin` | Hot-product administration |
| `house-capture.tsx:85` `isStaff` | `employee` | Unlimited AI renders — bypasses the spend ceiling, costs real money |

## Why it is safe to fix

Checked against the live account table before touching anything. Ten accounts
exist. Exactly one holds an admin-grade role in `user_metadata` —
`ericerb555@proton.me` — and that address is hardcoded on the platform-owner
allowlist, so it keeps admin from a source the user cannot write. The other nine
hold `landlord`, `vendor`, `employee`, `customer` or nothing. Nobody is locked
out by refusing to trust that bag for elevation.

## Todo

- [ ] 1. Back-fill `app_metadata.role` from `user_metadata.role` for the existing
      accounts, merging rather than overwriting so the `provider` keys survive.
      Behaviour-neutral: most sites already read `app_metadata.role` FIRST, so
      writing the same value there changes no decision. It exists so the real
      vendor and the real employee keep working once step 2 lands.
- [ ] 2. Stop reading `user_metadata` for authority at all eleven sites.
- [ ] 3. Fix `purchaseOrderActor` to fail CLOSED. Today an unrecognised role
      widens to "company, sees everything". It must narrow instead.
- [ ] 4. Write the role into `app_metadata` at every account-creation site so
      new vendors, tenants and employees land correct without a back-fill.
- [ ] 5. Test: prove a self-assigned admin role is refused and a real vendor
      still sees their own orders.
- [ ] 6. Deploy and report.

## Review

(to be completed)

---

## Review

All six items done. The escalation is closed and proven closed against the live
deployment, not merely reasoned about.

**Scope was bigger than first reported.** The opening count of eleven sites came
from too narrow a search. The real figure is **thirty-four** authority checks
across twenty-five server modules, every one of them reading the bag a browser
can write.

**What changed.** Thirty-four reads moved from `user_metadata` to
`app_metadata`. In most files that is a single line and nothing else moved. The
seven hand-edited gates call a new `trustedRole()` helper in
`trustedRole.ts`, which exists so there is one answer to "what role does this
account hold" rather than twenty-five slightly different ones. `trustedRole`
deliberately has no `user_metadata` fallback: a fallback is what made this
exploitable, because the moment an unwritable source may defer to a writable
one, the writable one is the security boundary.

**Two findings that were not about metadata at all**, both found while reading
the surrounding code:

- `purchaseOrderActor` decided the company-wide view with "anyone who is not a
  vendor". A signed-in customer is not a vendor, and neither is a landlord or a
  tenant, so the entire purchase-order book — every supplier and every price we
  pay — was one portal login away. It now proves staff positively; everyone else
  is scoped to the vendor record their address matches, and an unmatched address
  resolves to `__unresolved__`, which matches nothing.
- The vendor id was read from `user_metadata.vendorId` in three modules, so a
  vendor could have typed a competitor's id into their own account and read that
  competitor's catalogue and billing. It is now resolved by email against our
  own `vendor:` records, which cannot be forged from the browser.

**Nobody was locked out.** Checked before touching anything: of ten accounts,
only `ericerb555@proton.me` held an admin-grade role in the writable bag, and
that address is hardcoded on the platform-owner allowlist. The remaining roles
were back-filled into `app_metadata` first, so the change was behaviour-neutral
on the way in. Every account-creation path now writes both bags, and a re-invite
fills a blank role rather than leaving one.

**The proof.** A throwaway account was created holding `customer` in the trusted
bag and `admin` in the writable one — exactly the attack. Signed in against
production:

    role claimed in the writable bag   403 on every admin route, isAdmin false
    same account, role in trusted bag  200 on every admin route, isAdmin true

Same account, same password, same routes; only the bag differed. The account was
deleted afterwards. Note that `purchase-orders` and `advertising/campaigns`
returned empty lists, but `kv_store_3eae23a6` holds no rows under those
prefixes, so those two results are vacuous and prove nothing about scoping. The
403s are real denials and do not depend on stored data.

## Still open — needs your decision

Two old backends are still ACTIVE with live data of their own, and their source
is not in this repository, so nothing here can fix them:

- `make-server-824f083c` — 54 rows including invoices, subscriptions, customers,
  gift cards and ad campaigns. `/invoices` answered an unprivileged attacker
  with a 500 and leaked an internal table name, meaning it ran a database query
  before checking authorisation.
- `make-server-12c91054` — 47 rows including work requests, permits and deck
  renders. `/customers` answered the same attacker `HTTP 200 {"customers":[]}`.
  Empty because the data sits under other keys, not because access was refused.

The shipping app calls neither: all 598 apparent references are editor backup
files, `deploy.sh`/`deploy.bat` and a diagnostic HTML page. There is already a
precedent for retiring one of these — `make-server-57095a78` was stubbed on
2026-08-15 for this exact reason, with its source archived under
`supabase/functions/_retired/`, and it correctly answers 410 today.

Recommend retiring both the same way. Not done unasked: they are live services,
and taking two of them down is your call rather than mine.
