# PLAN — one company number, changed once, true everywhere

Eric: *"we need to be able to change this number and it automatically updates
app wide when i save it."*

Prompted by the tenant portal showing **"Black Phoenix Emergency Line:
(603) 555-0199"** — a placeholder, presented to tenants as the number to ring
in an emergency.

**Nothing in here is started until Eric approves it.**

---

## Why this is not a one-line fix

Changing that string would fix that screen and nothing else. The requirement is
that it is changed *once* and is true *everywhere*, and today three separate
things prevent that.

### 1. Company information lives in three places

    companies (SQL table)        the real record: name, legal name, email,
                                 phone, website, address, logos, colours, tax,
                                 bank, licence, insurance. Written by
                                 CompanySetup via POST /companies.

    kv public_branding           a CACHE of a subset, served by
    kv public_branding_profile   GET /public/branding.

    kv COMPANY_CONFIG_KEY        a third shape — `contactInfo.phone/email/
                                 website` — served by GET /company/config,
                                 and currently empty.

A number typed into one of these does not reach the others.

### 2. Saving does not clear the cache

`GET /public/branding` returns the cached `public_branding` value as its first
step and only falls through to the `companies` table when the cache has no
usable logo. **Nothing clears that cache when the company record is saved** —
the only path that does is `POST /public/branding/refresh`, which has to be
called by hand.

So even with one source of truth, saving a new number today would leave the old
one being served. This is the specific reason "it updates when I save" does not
happen, and it is the crux of the request.

### 3. There is no field for it, and the screens do not read it anyway

`companies` has `phone`, `email` and `website` but **no emergency line and no
support address**. And the tenant portal does not read any of them — it has the
number typed into the component, as do many other screens.

The scale, measured rather than guessed: **61 hardcoded `555` numbers and 20
references to `blackphoenixbuilds.com`** across about twenty files.

**Most of those 61 are legitimate demo data** — invented customers, sample
rosters — and must stay invented. Only the ones presented as *Black Phoenix's
own* contact details should be wired up. Replacing all 61 would put the
company's real phone number on fictional customer records, which is worse than
the problem.

---

## The shape, once joined

    companies table          the one source of truth, + emergency_phone
                             and support_email
         |
         | POST /companies  → also clears the branding cache
         v
    GET /public/branding     serves name, phone, emergency phone, support
                             email, website, logo, colours
         |
         v
    useCompanyInfo()         one hook, one fetch, shared
         |
         v
    every screen that shows a Black Phoenix contact detail

---

## Items

- [ ] 1. `companies` gains `emergency_phone` and `support_email`. A migration,
      tested on a branch or applied the way the Exchange ones were.
- [ ] 2. `POST /companies` clears `public_branding` and
      `public_branding_profile` after a successful write. **This is the item
      that makes the request true**; without it the rest is decoration.
- [ ] 3. `GET /public/branding` serves the two new fields.
- [ ] 4. `useCompanyInfo()` — one hook, fetching once and shared, with the
      company's own details and sensible empty states. A missing emergency
      number renders as "not set", never as a fabricated one.
- [ ] 5. The company settings form gains the two fields.
- [ ] 6. The tenant portal's Emergency Contacts block reads the hook. **This is
      the screen that prompted it**, and the one to prove it on.
- [ ] 7. Then, and only then, the other screens that show the company's own
      contact details — one at a time, each checked, demo data left alone.

Items 1 to 6 are the change. Item 7 is the sweep, and it is where the blast
radius is: it touches many screens, so it is a separate approval.

---

## What this deliberately does not do

**It does not replace all 61 hardcoded numbers.** Invented customers need
invented numbers.

**It does not invent an emergency number.** Until Eric types a real one, the
block says the number is not set. A placeholder that looks real is how
`(603) 555-0199` came to be shown to tenants as an emergency contact in the
first place, and shipping another one would repeat exactly that.

**It does not touch `COMPANY_CONFIG_KEY`.** That third store should eventually
go, but removing it is its own change with its own blast radius.

---

## The decision Eric has to make

**What is the real emergency number?** The company phone on record is
`(617) 710-0058`. If that is the emergency line, it is one value to enter. If
there is a different one, it needs to come from him. Until then the honest
screen says "not set" — which is ugly, and is better than a number that rings
nowhere during an emergency.

---

## BUILT — items 1 to 6 (2026-10-03)

Eric gave the number: **(603) 207-2248**, describing it as the placeholder,
which is exactly the case this work exists to make easy to change.

### What was actually wrong — worse than the plan said

The plan said company information lived in three places and the cache was never
cleared. Reading the save path showed a fourth problem that makes the first
three moot:

**`POST /companies` does not write the `companies` table.** It writes a
per-user key-value entry, `companies_{user.id}`, which only `GET /companies`
ever reads. Meanwhile `/public/branding` — the endpoint every screen gets
company details from — reads the `companies` TABLE, whose contact fields
**nothing but the logo upload has ever written.**

So the company settings form has been saving into a place no screen has ever
looked. There was no broken link in the chain; there was no chain.

### What was built

1. `companies` gains `emergency_phone` and `support_email`, applied to
   production, and the emergency number set to Eric's value.
2. `PUT /company/contact` — staff only. Writes the row the branding route
   actually serves, then clears **both** caches so the next read rebuilds from
   the table. This is the item that makes "it updates when I save" true.
3. `/public/branding` selects and serves the two new fields.
4. `useCompanyInfo()` — one fetch, shared between components, no invented
   fallbacks. A missing number comes back null.
5. The tenant portal's Emergency Contacts block reads the hook and renders
   "Not set" rather than a blank line when a value is missing.

**No plausible default anywhere.** A believable-looking placeholder is exactly
how `(603) 555-0199` came to sit in front of tenants as an emergency number,
and shipping a second one would be the same mistake with different digits.

### Clearing the cache exposed a latent bug, now fixed

With the cache gone, `/public/branding` returned **`logo_url: null`** — the
newest `companies` row has no logo, and the cache had been hiding that for
however long. The logo was copied onto the row the route serves, and branding
returns it again. Worth recording: the cache was not only stale, it was
load-bearing.

### Verified

    /public/branding   emergency_phone (603) 207-2248, logo restored
    rehearsal          writing the row + clearing the caches changes what
                       branding would serve; rolled back cleanly

Typecheck app 316 / server 87, both baselines. Suite 1,632 passing.

### Still Eric's to decide: there are four company rows and they disagree

    newest, served   (617) 710-0058   info@blackphoenixbuilds.com   blackphoenixbuilds.com
    older            6032072248       tbpco@pm.me                   theblackphoenixcompany.com
    older            6032072248       BlackPhoneixBuilds@proton.me  blackphoenixbuilds.com

`/public/branding` serves the newest, which carries the domain being retired.
The older rows look more current — the 603 number Eric just gave, a `pm.me`
address, the live domain. **The whole app shows whatever is in the newest row**,
so which row is the company is not a tidying question.

Until that is settled, `PUT /company/contact` deliberately writes the newest
row — the same one the read path serves — so a save is never silently applied
to a record nobody displays.

### Not done, and still a separate approval

Item 7, the sweep: the other screens showing the company's own contact details.
61 hardcoded `555` numbers and 20 references to the retiring domain exist, but
most of the former are legitimate demo data and must stay invented.
