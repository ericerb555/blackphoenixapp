# Wire the admin Dispatch Center to the pipeline

## What I found

The Dispatch Center is six invented work orders and six invented employees held
in `AdminPortalView.tsx`. The file makes **zero** server calls of its own.

But everything it needs already exists and is already working. Nothing new has
to be built on the server:

| Need | Endpoint | Status |
|---|---|---|
| The work orders | `GET /work-requests` | Real. An admin gets **every** request; reads the live keys. |
| The field team | `GET /time-tracking/employees` | Real, admin-gated. Name, role, department, phone, clocked-in state. |
| Assigning one | `POST /property-management/work-requests/:id/assign` | Real. Writes `assignedTo`, `assignedToEmail`, `assignedEmployeeId`, sets status, raises an admin alert. |
| Changing status | `PUT /work-requests/:id` | Real. Admin may set any field. |
| System alerts | `GET /notifications/admin-alerts` | Real — and it is the same `admin_alerts` the assign route writes into. |

So this is a screen that ignores its own backend, not a missing feature.

The assign endpoint matters more than it looks: it records the employee's
**email and id**, not just a typed name, and the employee portal decides which
jobs a person may bill time to by matching exactly those fields. Assigning from
this screen is therefore what puts a job on a technician's timesheet.

## The plan

- [x] 1. **Dispatch reads the pipeline.** Replace the hard-coded `workOrders`
      with `GET /work-requests`, and the hard-coded `employees` with
      `GET /time-tracking/employees`. Map the field-name variations that already
      exist in stored records (`title` / `serviceType` / `project_type`,
      `client_name` / `customerName`) the way `time-tracking.tsx` already does,
      rather than inventing a new spelling.
- [x] 2. **Assigning actually assigns.** `assignEmployee` calls the real
      endpoint with the employee's name, email and id, then re-reads the list.
      Failures surface as an error, not a success toast.
- [x] 3. **Status changes persist** through `PUT /work-requests/:id`.
- [x] 4. **The three lying buttons.**
      - *Call Customer* → a real `tel:` link to `client_phone`, hidden when
        there is no number.
      - *Message Tech* → a real `sms:` link to the assigned employee's phone,
        hidden until the job is assigned.
      - *Flag Urgent* → `PUT { priority: 'urgent' }`, so it is still true after
        a reload.
- [x] 5. **System Alerts reads `GET /notifications/admin-alerts`**, which is
      where assignments already write. Empty means nothing has happened, which
      is honest.
- [x] 6. **Collapse the three repeating Overview cards.** User Management,
      Revenue Analytics and System Analytics all open `unified-dashboard`. One
      card, "Analytics", going to the same place.
- [x] 7. **Update the admin guide** to match — steps 4 and 5 remove two of the
      four "this is a demonstration" notes.

## Deliberately NOT in this change

**Customer Service and Employee Support stay demos.** They have no backend at
all — there is no ticket store to read. Making them real is building a
helpdesk, which is a separate piece of work and not what was asked for. Their
guide notes stay, so the portal keeps telling the truth about them.

Real customer conversations already work, in the Messages tab of each
customer's portal.

## Risk

Dispatch will look emptier than the demo, because it will show the jobs that
actually exist rather than six invented ones. That is the point, but it is worth
expecting.

The assign endpoint requires property-admin rights. If the owner account does
not pass `intakeIsAdmin`, assignment will 403 — I will check that against the
running app rather than assume it.

## Review

All seven items done. `AdminPortalView.tsx` went from **zero** server calls to
reading and writing the same records the rest of the platform uses.

**What changed in behaviour**

- Dispatch shows every real work request, mapped across the field-name
  variations stored records actually carry, with a derived status so a job with
  somebody's name on it reads as Assigned.
- Dispatching calls the real endpoint with the employee's **name, email and
  id**. That is what makes the job billable by that person in the employee
  portal — the timesheet matches on the email and id, not the name.
- Status changes and Flag Urgent write to the work request, so they survive a
  reload.
- Call is a `tel:` link to the customer's own number; Text is an `sms:` link to
  the assigned technician. Each is hidden when there is no number to use,
  rather than present and lying.
- System Alerts reads `admin_alerts` — the same store the assign route appends
  to, so dispatching a job now produces a visible alert.
- Loading, error and empty states throughout, because all four lists can now
  legitimately be empty.

**Checked, not assumed**

`intakeIsAdmin` treats `ericerb555@proton.me` as a platform owner before any
`company_members` row exists, so the assign route will accept the owner
account. That was the open risk in this plan and it is closed.

All five endpoints probed live: `/work-requests`, `/time-tracking/employees`,
`/notifications/admin-alerts`, the assign POST and the work-request PUT each
return **401** unauthenticated. They exist and they fail closed.

typecheck 321 (baseline, nothing added), smoke 27 pages, 0 threw.

**Not yet verified**

Nobody has watched a real job move across this board signed in. The proof is
one work request assigned to one employee, then that employee seeing it in
their portal. Worth doing before it is relied on.

**Found on the way, not fixed**

`GET /property-management/work-requests/pending` and `/approved` both read the
`work_requests` key, which the code's own comment says holds nothing — real
submissions land in `all_work_requests`. Those two routes return an empty list
whatever the state of the platform. Dispatch routes around them, so this change
does not depend on them, but anything else calling them is being told there is
no work.
