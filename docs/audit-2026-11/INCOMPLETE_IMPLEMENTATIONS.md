# Phase 8 — Incomplete implementations and invented data

Scanned 2026-11-19 across `src/app` and `supabase/functions/server`.

## Marker counts (files containing each)

| Marker | Files |
|---|---:|
| TODO | 14 |
| FIXME | **0** |
| HACK | 2 |
| "coming soon" | 9 |
| "not implemented" | 2 |
| mock | 60 |
| demo/sample data | 25 |

`placeholder` matched 382 files and is almost entirely the HTML attribute —
excluded as noise rather than reported as a finding.

## The honest half

The nine **"coming soon"** labels are not defects. They tell the user the
feature is not built — *"Document upload feature coming soon"*, *"Report
scheduling coming soon!"*, *"Coming soon — use browser screenshot for now"*.
That is the correct behaviour for an unfinished feature and the opposite of
the fake-success toasts in `BROKEN_BUTTONS_REPORT.md`. **Leave them alone.**

## I-1 (P1) — The alerts panel invents alerts when there are none

`src/app/components/AdminAlertsPanel.tsx:333-337`

```js
// Add demo alerts if no alerts exist
if (loadedAlerts.length === 0) {
  return demoAlerts;
}
```

**An owner with a quiet system does not see an empty panel. They see fiction**,
rendered identically to real alerts:

- *"Quote Approval Required — $45,000"* for "ABC Corporation", a quote that
  does not exist, marked **action required**, **high priority**, assigned to
  "Mike Johnson" — who is not on the payroll.
- *"User account john.smith@company.com has 5 failed login attempts in the
  last 10 minutes"* — **a fabricated security event**.

This is the same species as the seeded financial data in `W-2`, but on the one
screen whose entire purpose is to say what needs attention. The second item is
worse than a cosmetic defect: a fake brute-force alert either causes a response
to an attack that never happened, or teaches the owner that this panel can be
ignored. Both outcomes damage the thing the panel exists for.

**Recommendation:** delete `demoAlerts` and render an empty state. "Nothing
needs your attention" is a useful, true answer.

## I-2 (P2) — Invented people rendered as real records

61 lines across 25 files, after excluding input placeholders and comments.
The ones that render as data rather than as hints:

| File | What a user sees |
|---|---|
| `portals/MobileOwnerPortalView.tsx:64,66` | activity feed: *"Jane Doe — Payment received $299"*, *"John Smith received 5 bonus hours"* |
| `portals/AdminPortalView.tsx:293,311` | "John Smith" and "Jane Doe" as customers |
| `portals/CondoAssociationPortalView.tsx:360,373` | invented unit owners |
| `lib/services/jobFinancialService.tsx` | the demo time entries behind `W-2` |
| `utils/seedPipelineData.tsx` | seeds the pipeline with invented customers and emails |

A fabricated **payment** in the owner's activity feed is the worst of these,
for the same reason as `I-1`: it is indistinguishable from a real one.

## I-3 (P3) — Dev tooling shipped

`components/RoleSwitcher.tsx` carries invented contacts and exists to switch
roles in the browser. Worth confirming it is unreachable in production; the
authority it appears to offer is decided by the server regardless, so this is
noted rather than rated higher.

## What this phase did not do

No TODO was triaged individually, and the 60 "mock" files were not each
opened — the scan ranked them and the top of the list is reported. Nothing
here was deleted: the brief says to classify and recommend, and every
recommendation above is one line of judgement that belongs to Eric.
