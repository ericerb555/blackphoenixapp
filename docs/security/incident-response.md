# Incident response plan

**Owner:** Eric (platform owner) · **Version 1.0, 2026-10-16** · Review every 6 months

Written as Phase 4 of `tasks/security-audit-2026-10-16.md`, which found that no
plan existed. It is deliberately short. A forty-page plan written for an
auditor is not read at 2am; this one is meant to be followed by one person
under pressure, and everything in it is something that can actually be done
with the access and tooling this platform has today.

> **If you are in an incident right now:** go to [The first hour](#the-first-hour).
> Read the rest afterwards.

---

## What counts as an incident

Any of these, suspected or confirmed:

- Customer, tenant, or employee data reached someone who should not have it.
- An account was accessed by someone other than its owner.
- A credential leaked — an API key, the service-role key, a password, a token.
- Someone modified data or money records without authorisation.
- Malicious code reached the platform (a compromised dependency, an injected script).
- A vulnerability report arrives at `security@blackphoenixbuilds.com` describing
  any of the above as possible.

A service outage with no data or access component is **not** a security
incident. Fix it as an outage.

## Severity

Decide this in the first ten minutes. It sets everything that follows. When
torn between two levels, **choose the higher one** — over-reacting costs a few
hours, under-reacting costs the notification deadline.

| | Meaning | Examples | Response |
|---|---|---|---|
| **SEV-1** | Confirmed exposure or loss of personal data, money, or platform control | Service-role key leaked · customer records downloaded · payment records altered · admin account taken over | Drop everything. Start now, any hour. |
| **SEV-2** | A real vulnerability with no confirmed exploitation | Auth gate found open on a sensitive route · a table readable by the wrong role · credential in a public repo | Begin same day. Contain within 24 hours. |
| **SEV-3** | Weakness with no plausible path to data | Missing security header · a dependency CVE not reachable from our code | Normal work queue. Track it. |

Personal data here means anything identifying a person: name, address, email,
phone, tenant screening records, payment history. **Tenant screening records
are the most sensitive data on this platform** — treat any incident touching
them as SEV-1 until proven otherwise.

---

## The first hour

Work down the list. Do not skip step 1 to get to step 2.

### 1. Write it down — start the log (5 min)

Open a file at `docs/security/incidents/YYYY-MM-DD-short-name.md` and start a
timestamped log. Every action, every finding, every time. Keep writing
throughout.

This is first because it is the step always skipped and always regretted. The
log is what you reconstruct the notification from, what your insurer asks for,
and what a buyer's counsel reads. Memory three days later is not evidence.

### 2. Preserve evidence before you change anything (10 min)

Containment destroys evidence. Capture first:

- **Supabase logs** — API, Postgres, and Auth, via the dashboard or
  `query_logs`. Retention is limited, so this is genuinely urgent: a week from
  now the logs that prove scope will be gone.
- **Vercel deployment and function logs** for the window.
- **Stripe events and logs**, if money is involved.
- `select * from auth.users order by created_at desc` and the audit log, if an
  account is involved.
- Screenshots of anything in a dashboard you are about to change.

Save them into the incident folder. Do not rely on being able to query it later.

### 3. Contain (rest of the hour)

Pick what fits. Containment beats elegance — reversing an over-reaction is easy.

| Situation | Action |
|---|---|
| Service-role key or API key leaked | Rotate in the Supabase dashboard → `supabase secrets set` → `npm run deploy:server`. Rotate the third-party key at its own provider too. |
| An account is compromised | Revoke its sessions, force a password reset, check `app_metadata` for a role it should not hold. |
| A route is exposing data | Add it to the auth gate in `supabase/functions/server/index.tsx` and deploy, or set `AUTH_ENFORCE`-adjacent controls. Fastest honest fix wins. |
| A table is exposing data | `REVOKE` from `anon`/`authenticated` and enable RLS. Takes seconds. |
| Malicious dependency | Pin or remove it, rebuild, redeploy. |
| Active ongoing attack | Pause the Supabase project. It takes everything down — justified only for SEV-1 live exfiltration. |

### 4. Confirm containment

Run `npm run security`. It is the fastest external check that the hole is
actually shut, and it tests from outside with only a public key — the same
position the attacker is in. **A fix is not contained until a probe says so**;
reading the code you just changed is not confirmation.

---

## Then: scope it

Before notifying anyone, answer these in the log. The notification obligation
depends on the answers.

1. **What data was reachable?** Which tables, which fields, whose records.
2. **Was it actually accessed, or only reachable?** Logs decide this. "We cannot
   tell" is a valid and important answer — write it down as that, and do not
   quietly round it down to "no".
3. **How many people are affected, and in which states?** New Hampshire changes
   the deadline — see below.
4. **When did it start?** First exposure to containment.
5. **How did it happen?** The actual root cause, not the proximate error.

---

## Notification

### Legal — New Hampshire RSA 359-C:20

This platform holds personal information about New Hampshire residents, so the
state's breach notification law applies.

If personal information was **acquired** by an unauthorised person, and misuse
is reasonably possible, then:

- **Notify affected individuals** without unreasonable delay.
- **Notify the NH Attorney General** (Consumer Protection Bureau).
- **If more than 1,000 people** are affected, notify the nationwide consumer
  reporting agencies as well.

Personal information under the statute is a name together with a Social
Security number, driver's licence or other government ID number, or a financial
account or card number with any code that would permit access. **Tenant
screening is the obvious exposure here** — it is where government ID numbers
and financial history live.

> **This is not legal advice.** For any incident where notification is even
> arguably required, engage a lawyer before sending anything. The statute has
> specific content requirements and getting them wrong creates a second
> problem. Budget for this in advance — see
> `look-up-the-law-before-naming-a-lawyer` in the working notes.

### Customers

Notify when their data was exposed, when their account was accessed, or when
they must act (change a password, watch a statement). Say plainly: what
happened, what data, when, what you have done, what they should do, and how to
reach you. Do not minimise and do not speculate about who did it.

### Payment providers

If card or payout data is implicated, contact Stripe immediately — they have
their own obligations and will advise.

### The vulnerability reporter

If the incident came from a report to `security@blackphoenixbuilds.com`,
acknowledge within three business days (the commitment made on the public
security page) and keep them informed until it is closed. People who report
problems quietly are an asset; treat them like one.

---

## Afterwards

Within a week of closing a SEV-1 or SEV-2, write a review in the same incident
file:

- **Timeline** — first exposure, detection, containment, resolution.
- **Root cause** — the real one.
- **Why it was not caught earlier.** The most useful question on the page. If
  an automated check could have caught it, that check is the actual fix.
- **What changes** — specific, owned, with a date.
- **Add the check.** Any incident that could have been caught from outside
  should become a new check in `scripts/security-probe.mjs`. That is how this
  plan compounds instead of repeating. Every current check came from a real
  finding.

Blame-free and factual. The goal is that the same failure cannot recur, not
that somebody feels bad.

---

## Contacts

Fill these in before an incident, not during one.

| Role | Who | How |
|---|---|---|
| Incident lead | Eric | — |
| Legal counsel | *(to arrange)* | — |
| Cyber insurance | *(to arrange)* | — |
| Supabase support | Dashboard → Support | project `plzsvzwwcdopnawtiwzm` |
| Vercel support | Dashboard → Support | — |
| Stripe support | Dashboard → Support | both accounts |
| NH Attorney General | Consumer Protection Bureau | doj.nh.gov |
| Vulnerability reports | — | `security@blackphoenixbuilds.com` |

**Two gaps to close:** there is no lawyer on retainer and no cyber insurance
policy. Both are things you want to have arranged *before* the incident that
needs them, and both are standard diligence questions.

---

## Access inventory

Who can reach what, reviewed quarterly. An incident response that does not know
who holds the keys starts an hour behind.

| System | Who has access | MFA |
|---|---|---|
| Supabase dashboard | *(to enumerate)* | *(to verify)* |
| Vercel | *(to enumerate)* | *(to verify)* |
| Stripe (both accounts) | *(to enumerate)* | *(to verify)* |
| GitHub repository | *(to enumerate)* | *(to verify)* |
| Domain registrar / DNS | *(to enumerate)* | *(to verify)* |

Filling this table in is Phase 4 item 13 of the audit. Until it is complete,
the honest answer to "who can access production?" is that nobody has checked.
