# Phase 2 — Security audit

The umbrella document. Two of its three parts have their own file because they
ran long:

- **2A — identity, roles and secrets.** Here.
- **2B — the API.** `API_SECURITY_AUDIT.md`
- **2C — database, RLS and storage.** `DATABASE_RLS_AUDIT.md`

Also in scope and filed separately: `AI_AGENT_SECURITY_AUDIT.md`,
`AUDIT_LOGGING_REPORT.md`.

## Method, and what that method cannot tell you

Three rules governed every claim in these documents, and they are the reason
the findings are worth reading:

1. **A control is not verified until a request proves it.** Reading a guard in
   source establishes intent, not behaviour.
2. **Probe as an outsider, not as the author.** Anonymously, and then as a
   real signed-in non-staff customer, because the authentication wall answers
   before any route guard and therefore makes 401 meaningless as evidence.
3. **An absence is not a presence.** A query that returns zero rows may mean
   "nothing matched" or may mean the table has never existed. Several of this
   audit's findings are the second case.

What the method does **not** cover, stated plainly rather than left for the
reader to discover:

- Every probe reached the edge function directly, bypassing Cloudflare. **No
  finding here depends on the WAF, and nothing here verifies it.**
- Cross-tenant isolation between two *staff* accounts at different companies
  is untested. It needs a second staff account, which needs the owner's
  approval to create.
- No load testing, no payment testing, no destructive testing. Production is
  the only environment.
- One hostile prompt-injection payload is designed and unsent, awaiting
  approval (`AI-1`).

## 2A-1 — Identity and the role model

Authentication is Supabase GoTrue; the server never implements its own
password handling, session format, or reset flow. Tokens are verified
server-side by `getUser`, and `c.get('actor')` carries only what the verified
token asserted.

**The important decision in this codebase is which metadata bag a role is read
from**, and it is the right one:

```
app_metadata   written only with the service-role key — only by this server
user_metadata  written by the signed-in person, from the browser
```

`trustedRole` reads `app_metadata` only, with no fallback. Eleven authority
checks on this server used to read `user_metadata` — the bag the account
itself can write. A customer could have set their own role.

That is fixed, and the absence of a fallback is deliberate: a fallback would
have reinstated the hole for any account whose `app_metadata` had not been
backfilled. Every account-creation path now writes both bags.

## 2A-2 — Secrets. Measured in the live bundle, not assumed.

Scanned: the deployed production JavaScript, and all of `src/` (which is where
every lazily-loaded chunk comes from, so source covers the 629 chunks the entry
file references).

| Looked for | Found |
|---|---|
| `service_role` key material | **none** |
| `sk-…` / `sk_live_…` / `AIza…` | **none** |
| `sb_secret_…` / `sbp_…` | **none** |
| `import.meta.env.*` secrets reaching the client | **none** (the only `process.env` reference in `src/` is `COMPANY_NAME`) |
| JWTs | 4 literals, **every one decoding to `"role":"anon"`** |

The anon key is the publishable key and belongs in a browser. So the frontend
ships no secret — the single most common way an application of this shape
leaks everything, and it is clean.

### S-1 (P4) — The publishable key is pasted in four places

`utils/supabase/info.tsx`, `set-secrets.sh`, `set-secrets.bat`, and
`components/ShopIntelligenceSuite.tsx`. Harmless today; a rotation hazard
tomorrow, and Supabase is migrating this key to a new `sb_publishable_…`
format. One module, three imports.

### S-2 (P2) — The strong secret scanner only runs after the push

Two layers exist:

- **Local pre-commit** prefers `gitleaks` (~160 maintained detectors) and
  falls back to `scripts/scanSecrets.mjs` when it is absent. **gitleaks is not
  installed on this machine** — the hook says so on every commit — so the
  weaker scanner is what actually guards the working tree. It is not a toy: it
  decodes JWT role claims rather than pattern-matching them, which is exactly
  how the four `anon` keys above were cleared.
- **CI** runs the real gitleaks over *history*, not just the diff.

The order is backwards for the one thing that matters. CI runs after the push,
and **once a credential is pushed, only rotation helps** — that is the whole
point of the pre-commit refusal added in `3adbdff11`. Installing gitleaks
locally (`winget install gitleaks`) moves the strong pass to before the
mistake is public.

### S-3 (P2) — 35 history-only fingerprints, and one of them needs confirming

`.gitleaksignore` carries 35 annotated fingerprints: 15 `github-pat`, 20
`generic-api-key`. Every one is **history-only** — none is reachable in the
current tree — and each entry records why it is suppressed. Suppressing a
history finding is correct: rewriting history does not un-leak a credential,
rotation does.

Which leaves the open item. The GitHub PAT was reported deleted on Tuesday.
**Deleted is not revoked**, and the `.gitleaksignore` entry says so explicitly.
This needs a yes or no from the owner, and it is the single highest-value
unanswered question in this audit, because it is the only finding where the
credential may still be live.

## OWASP Top 10 (2021) — where this application actually stands

| | Category | Status |
|---|---|---|
| A01 | Broken access control | **The main event.** 25 routes in `docs/server-route-authorization.md`; `authz:scan` bucket B 20 → 0; 25 bucket-A leads open. Cart IDOR measured open, fixed, re-measured closed. |
| A02 | Cryptographic failures | No custom crypto. TLS enforced; HSTS set. Share tokens are 256-bit. |
| A03 | Injection | No string-built SQL on the server; the KV layer is parameterised. XSS surface reviewed in `BROKEN_BUTTONS_REPORT.md`; a hostile QR label is escaped, with a test. |
| A04 | Insecure design | The `_anonymous` KV keys (`A-1`) and eleven non-existent tables (`D-1`) are design-level: features that fail quietly instead of loudly. |
| A05 | Misconfiguration | `origin:"*"` tolerable (bearer-only auth). Two staged defences still report-only, and one of them **breaks the backups when enabled** (`A-2`). 9 `SECURITY DEFINER` functions anon-callable (`D-3`). |
| A06 | Vulnerable components | Not audited this pass. `npm audit` in CI; no dependency review done here. **Gap.** |
| A07 | Identity failures | GoTrue. The `app_metadata` fix above closed the real one. No lockout policy of our own — delegated. |
| A08 | Integrity failures | Storage objects are outside Supabase's daily backup; `storage-backup-nightly` covers it, has run once, and **restoration has never been exercised**. |
| A09 | Logging failures | `AUDIT_LOGGING_REPORT.md`. A permission denial leaves no trace (`L-1`); the one instrumented security event logs to the denied user's own browser (`D-2`). |
| A10 | SSRF | `outboundGuard.ts` exists and gates outbound fetches. Not probed this pass. **Gap.** |

Two honest gaps in that table — A06 and A10 — are listed as gaps rather than
passes. Per the brief: an untested item is not a passing item.

## The pattern underneath most of this

Nearly every finding in all nine documents is the same shape: **a failure that
returns a success-shaped answer.**

- A table that never existed, queried by a client that discards the error, so
  the screen renders empty instead of broken (`D-1`).
- An RPC that never existed, so every company switch is denied and the feature
  looks merely unused (`D-2`).
- A permission denial that returns an empty list, indistinguishable from an
  empty history, and unlogged (`API §Authorization`).
- A toast that says "Saved" because the handler never checked the response
  (`BROKEN_BUTTONS_REPORT.md`).
- A dashboard firing 1,300 unauthenticated requests a day and showing a blank
  board (`A-1`).

This is why the method's third rule exists. The security posture here is
genuinely strong where it was built deliberately — RLS on every table,
GRANT-level denial proven against two identities, no secret in the bundle,
`app_metadata` for authority. The risk is concentrated in the places where
something silently does nothing at all.
