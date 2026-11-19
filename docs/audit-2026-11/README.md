# Enterprise security & functionality audit — November 2026

Eleven phases against the live platform, 2026-11-18 to 2026-11-19.
**26 numbered findings.** Retested 2026-11-19.

**Dashboard:** `AUDIT_DASHBOARD.html` (open locally), also published at
<https://claude.ai/artifact/7mheH5Jc48QQDEMzvYUxbu>

## Read in this order

1. `FINAL_VERIFICATION_REPORT.md` — what was re-run today and what it said.
   Start here; it is the shortest route to what is true right now.
2. `REMEDIATION_PLAN.md` — six batches, ordered and costed, plus the four
   decisions that are the owner's.
3. `SECURITY_AUDIT_REPORT.md` — the umbrella, with the OWASP mapping.

Then by area: `API_SECURITY_AUDIT.md`, `DATABASE_RLS_AUDIT.md`,
`AI_AGENT_SECURITY_AUDIT.md`, `AUDIT_LOGGING_REPORT.md`,
`FUNCTIONALITY_AUDIT_REPORT.md`, `BROKEN_BUTTONS_REPORT.md`,
`DEAD_END_WORKFLOWS_REPORT.md`, `INCOMPLETE_IMPLEMENTATIONS.md`,
`APPLICATION_INVENTORY.md`.

## The three method rules every claim here obeys

1. **A control is not verified until a request proves it.** Reading a guard in
   source establishes intent, not behaviour.
2. **Probe as an outsider, not as the author.** Anonymously, and then as a real
   signed-in non-staff customer — because the auth wall answers before any
   route guard, which makes 401 meaningless as evidence.
3. **An absence is not a presence.** A query returning zero rows may mean
   "nothing matched" or may mean the table has never existed. Several findings
   are the second case.

## What these documents do not claim

Not tested, and recorded as gaps rather than passes: the WAF's own rules (every
probe here bypassed Cloudflare by design), cross-tenant isolation between two
staff accounts, restoration from the nightly storage backup, load behaviour,
payment flows, nine autonomous cron jobs, and OWASP A10/SSRF.

## Tools written during the audit, and still runnable

| Command | What it answers |
|---|---|
| `node scripts/security-probe.mjs` | 18 production controls, credential-free |
| `npm run authz:scan` | Routes with no caller resolved, and the IDOR class |
| `node scripts/dead-ui-scan.mjs` | Controls with no handler, and handlers that only show a message |

The first of those predates this audit and was re-run as the retest. The other
two were written for it, and both should keep running — every finding they
produced came from asking the application, not from reading it.
