# PLAN — employees belong to a company, and a W-2 hour costs what it costs

Eric: *"yes editable as long as i can link them to what company it should be
good."* Two things, and they belong together: an employee is employed **by** a
company, and the payroll burden on their hour is a fact **about that company**.

## Where this starts from

    time_employee:<id>     a flat key-value list. id, name, email, role,
                           status, payType, payRate, billRate, workerType.
                           NO company of any kind.

    organizations          the real multi-company structure, already working.
                           Eric is a member of seven. This is what an employee
                           should be employed by.

Every read today is `kv.getByPrefix('time_employee:')` — the whole platform's
staff, in one list, implicitly Black Phoenix's.

## The two fields

    employee.employerOrgId        which organisation employs them
    organizations.labor_burden_percent   what their hour really costs on top

Burden goes on the **organisation**, not on the employee and not on the
`companies` table. It is one number per employer, every W-2 hour there carries
it, and the employee record should not hold a copy that can drift.

## The danger, and the rule that answers it

**Scoping a list that was never scoped is how people disappear.** The moment a
read filters by company, every employee without one vanishes — from the HR hub,
from rotas, from job costing. A crew member silently dropped from the schedule
is a van that does not arrive.

So: **an employee with no employer is treated as the operator's**, never as
excluded. Existing records are backfilled to the operator organisation, and
the filter is written so that unset means "ours" rather than "nobody's". That
is the same fail-safe direction as the rest of the platform — except here
failing closed would hide people, so the safe direction is to show them.

## The second danger: burden changes every margin in the system

`hourlyCostRate` feeds `jobOutcome`, the rate-learning loop and every margin
figure. Applying burden to it would change **every job's reported margin at
once**, including historical ones, which is a global change in the sense that
has needed sign-off twice before.

So this is split:

**Now** — the burden is stored, editable, and a tested pure function knows how
to apply it. `hourlyCostRate` is **unchanged**: no existing number moves.

**Separately, with Eric's agreement** — wire it into job costing. That is when
margins change, and it should be a deliberate act with its own before-and-after
rather than a side effect of adding a field.

## Items

- [ ] 1. `organizations.labor_burden_percent`, nullable. Null means not set,
      which means no burden applied and the screen says so — never a guessed
      default.
- [ ] 2. `employerOrgId` on the employee record, admin-only like the rates,
      backfilled to the operator organisation.
- [ ] 3. `employeeRates.ts` — `burdenedHourlyCost(rates, burdenPercent)`, pure
      and tested. W-9 never carries burden: a contractor's cost IS their rate.
      Unset burden returns the bare rate unchanged.
- [ ] 4. HR hub — an employer picker per employee, and a filter so a company's
      people can be seen on their own.
- [ ] 5. HR hub — the burden percentage, editable per company, shown with what
      it does to a real rate so the number is not abstract.
- [ ] 6. The employees list keeps showing everyone when no filter is chosen.

## Not in this

**Wiring burden into job costing and the rate-learning loop.** Named above,
deliberately held back.

**Scoping the scheduler.** It reads every employee today, and Black Phoenix is
the only company with crews. Scoping it before a second company has any is
inventing a requirement — and the failure mode, a tech missing from a rota, is
the expensive one.
