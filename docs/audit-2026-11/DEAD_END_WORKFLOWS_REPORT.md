# Phase 4 — Dead-end and broken workflows

Started 2026-11-19, from the leads in `BROKEN_BUTTONS_REPORT.md`. Each finding
below was read in the source and its backend checked for existence — the
difference between "not wired up" and "nothing to wire it to" decides the fix.

## W-1 (P1) — The job delete button cannot ever work

`src/app/pages/JobFinancialTracker.tsx:211`, routed at `/job-financial-tracker`.

```js
onClick={() => {
  if (confirm('Delete this job?')) {
    toast.success('Job deleted');
  }
}}
```

A red trash icon asks for confirmation, then reports success. **Nothing is
deleted.** The confirmation dialog makes it worse: it is the ritual that tells
a user this is serious and irreversible, and it is attached to nothing.

**There is no backend to wire it to.** The jobs module registers
`GET /jobs`, `GET /jobs/orphans`, `PATCH /jobs/:id` and `POST /jobs/backfill`
— no DELETE at any path.

**Recommendation:** remove the button, or build the endpoint deliberately
(with the authorisation question answered: a job carries financials, so who
may delete one is not obvious). Do not leave a confirm dialog in front of
nothing.

## W-2 (P1) — The same page seeds invented financial data into the browser

`src/app/pages/JobFinancialTracker.tsx:66-78`.

```js
await jobFinancialService.hydrateFromServer();
const hasTimeData = localStorage.getItem('time_entries_job_1');
if (!hasTimeData) {
  jobFinancialService.populateDemoData('job_1');
  toast.success('Starter financial data loaded! Check job JOB-2026-001');
}
```

Open the page with an empty browser store and it **writes demo time entries
and purchases** into it, then displays them alongside whatever the server
returned. The page offers a **CSV export** (line 356) of job number, customer,
project, estimated and actual revenue, costs and margin — so the invented
figures leave the browser in a spreadsheet, where nothing marks them as demo.

The toast does say "Starter financial data loaded", which is the only thing
standing between this and a silent fabrication. Three lines above it, a
comment reads **"Server-synced jobs (via jobFinancialService). No hardcoded
data."** — which the call three lines later contradicts.

**Recommendation:** delete the seeding. A financial screen with no data should
show no data. If a demo is wanted, it belongs behind an explicit control that
says so on every row it creates.

## W-3 (P1) — "Member added successfully" adds nobody

`src/app/components/TerritoryBasedCohortManagement.tsx:1086`.

```js
onClick={() => {
  toast.success('Member added successfully! They will receive an onboarding email.');
  setShowAddMemberModal(false);
  setSelectedTerritory(null);
}}
```

The user fills in a modal, presses Add Member, is told the member was added
**and that an onboarding email is on its way**, and the modal closes. No
request is made. No member exists. No email is sent.

This is the worst shape a dead end takes: the user has no reason to check,
because they were told it worked, and they will not find out until somebody
asks why the new person never got access.

**Unlike W-1, the backend exists** — `cohorts.tsx` registers `POST /cohorts`,
`/cohorts/bulk-update`, `/cohorts/applications/approve` and others. This is
unwired, not unbuilt.

**Recommendation:** wire it to the real route, or remove the modal until it is
wired. The claim about the email must only appear if an email was actually
requested.

## W-4 (P2) — "Reward payment processed"

`src/app/pages/SubscriptionHub.tsx:819`, plus `Subscription paused` at 695.

Entire handler is a toast. No money moves, so nothing is lost; the damage is a
person believing a payment was processed. Backend existence not yet checked.

## Already fixed during this audit

**`UserManagementHub`** — four of five tabs were a placeholder with three
handler-less buttons and invented statistics. Reported by Eric as "the add
button does nothing"; now renders the real team panel. 2026-11-18.

## Workflows not yet examined

Registration → first login, quote → contract → invoice → payment, service
request → assignment → completion, document and photo upload, subscription
enrolment and cancellation, emergency call routing, account deletion.

**None of these has been walked end to end.** They need either browser
automation with a real session or test accounts per role, which is one of the
three approvals still outstanding.
