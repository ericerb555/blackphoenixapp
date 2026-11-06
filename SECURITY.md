# Security

Report a vulnerability to **security@blackphoenixbuilds.com**.

We acknowledge every report within **three business days** and keep you
informed until it is resolved. That is the same commitment made on our public
security page and in our internal incident response plan — one number, so
nobody has to work out which promise applies.

This file exists because it is the first place a security researcher looks and
the first file a technical reviewer opens. Phase 4 of
`tasks/security-audit-2026-10-16.md`.

## What to include

Enough to reproduce it. In practice that means:

- the URL or endpoint, and the method
- what you sent and what came back
- what you expected instead, and why the difference matters
- whether you were signed in, and as what kind of account

A report we can reproduce gets fixed. A report we cannot reproduce gets a reply
asking for the above, which costs us both a round trip.

## In scope

- `theblackphoenixcompany.com` and its subdomains
- the API at `plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6`
- the customer, employee, vendor, landlord, investor and condo portals
- share links — quote signing, change-order approval, tenant screening
- the storefront and its checkout

## Out of scope

Not because they do not matter, but because a report about them tells us
nothing we can act on:

- **Denial of service, load testing, and traffic flooding.** Our API is priced
  per request. A volumetric test is a bill, not a finding.
- **Findings from a scanner with no demonstrated impact.** A missing header on
  a page with no session, a version banner, a `SameSite` default — tell us if
  you can show what it leads to.
- **Social engineering of our staff, customers or subcontractors**, and
  anything physical.
- **The publishable Supabase key**, which appears in the JavaScript bundle by
  design. It is the key the browser is supposed to hold; row-level security
  and the authorisation gate are what stand behind it. If you can get data
  with it that you should not, *that* is the report.
- Self-XSS, clickjacking on pages with no state-changing action, and missing
  rate limits with no demonstrated abuse.

## Safe harbour

If you make a good-faith effort to follow this policy, we will not pursue or
support legal action against you for your research, and we will say so in
writing if you ask.

Good faith means:

- Use your own accounts and your own data. Do not access, modify, download or
  retain anybody else's.
- Stop as soon as you have proved the issue. Confirming you can read one record
  that is not yours is a finding; reading the table is an incident, and we will
  treat it as one.
- Do not degrade the service for anybody else.
- Give us a reasonable chance to fix it before you publish. Tell us your
  intended disclosure date and we will tell you honestly whether we can meet
  it.

We do not currently run a paid bug bounty. We will credit you by name in the
fix if you want to be credited, and we would rather hear about a problem than
not.

## What happens after you report

1. **Acknowledgement**, within three business days.
2. **Triage** against the severity scale in `docs/security/incident-response.md`
   — confirmed exposure of data, money or platform control is dropped on
   immediately, at any hour; a real vulnerability with no confirmed
   exploitation is begun the same day and contained within 24 hours.
3. **A fix, and a note telling you it shipped.** If we decide not to fix
   something, you get the reasoning rather than silence.

## How we check our own work

So you know what has already been looked at:

- `npm run security` — the October 2026 external assessment, rewritten as an
  executable probe. It runs against production with only the publishable key,
  so a pass is a statement about the exposed surface rather than about the
  source. It writes nothing and creates no accounts.
- Every push and pull request runs dependency advisories (blocking at high),
  secret scanning across full history, and CodeQL. See
  `.github/workflows/security.yml`.
- The probe also runs weekly on a schedule, because a control that stops
  enforcing is invisible until somebody else finds it.

`tasks/security-audit-2026-10-16.md` is the assessment these came from,
including the findings and what was done about each one.
