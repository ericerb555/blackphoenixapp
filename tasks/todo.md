# Making the platform actually work — proposed plan

## The honest position

A great deal has been built here very fast, across many surfaces. Almost none of
it has been watched working. That is the gap between where we are and "the
platform functions correctly", and it is not a gap that more building closes.

The evidence for saying so is our own history. The design centre was blank for
hours because a variable was read eleven lines before it was declared. The
siding takeoff threw on first render because `useEffect` was never imported.
Both passed `vite build` cleanly, because esbuild strips types and never checks
them — it will happily ship a reference to a name that does not exist. Both were
found by you, using the app, rather than by me before shipping.

So the honest answer to "what do you suggest" is: stop guessing which parts
work, and build the thing that tells us.

## What I checked before proposing this

- **Your data is fine.** The live server writes to `kv_store_57095a78` — 1225
  rows, 436 pipeline items, 6 vendors, 4 quotes, 5 design projects. The
  similarly named `kv_store_3eae23a6` is an unused empty table; the naming is
  inherited from the function that was retired in August, which is why it looked
  alarming at first glance.
- **The crash-causing class of type error is currently absent.** A type check
  reports zero `Cannot find name` errors across `src/`. The specific bug that
  has bitten twice is not sitting in the tree right now. Nothing prevents it
  from coming back, though: there is no `tsconfig.json` and no typecheck script,
  so TypeScript has never actually run on this codebase.
- Of the 4789 errors that check did report, roughly 4400 are React's types
  failing to resolve in a throwaway config I wrote in five minutes. That number
  is my probe's fault and should not be read as 4789 defects.

## The plan, in the order I would do it

### 1. Retire the two orphaned backends  (~30 min, security)

`make-server-824f083c` and `make-server-12c91054` are still ACTIVE with live
customer data and no source in this repository. Both answered an unprivileged
test account: one returned `HTTP 200` on `/customers`, the other returned a 500
from `/invoices` that leaked an internal table name, meaning it queried the
database before checking who was asking. Retire them behind the same 410 stub
that `make-server-57095a78` already uses, archiving each under
`supabase/functions/_retired/` so either can be restored.

### 2. A smoke harness that renders every screen  (the main event)

One command that mounts every page and portal in headless Edge and reports which
ones throw, which render empty, and which log console errors. This is precisely
the check that would have caught the blank design centre before you did.

It is worth being clear about why this matters more than it sounds: right now
"does the platform work" is answered by you opening screens until one is broken.
This replaces that with a list, produced in a couple of minutes, before anything
ships.

### 3. Fix whatever step 2 finds

Unknown size — that is the point of running it. Ranked worst-first, and I would
bring you the list before starting rather than disappearing into it.

### 4. A real `tsconfig.json` and a `typecheck` script  (~1 hour + triage)

So the `useEffect is not defined` class cannot come back silently. Configured
properly this time, with React's types resolving, so the output is a short list
of real problems rather than four thousand phantoms.

### 5. Then kitchens and bathrooms

Detailed measurements, 3D CAD, photorealistic render and a cabinet schedule.
The largest thing asked for so far, and it deserves a proper plan of its own
rather than being started at the end of a long day. Doing it on top of a
platform we have actually verified is a much better position than doing it on
top of one we hope works.

## Todo

- [ ] 1. Stub and archive `make-server-824f083c` and `make-server-12c91054`
- [ ] 2. Build the render smoke harness over every page and portal
- [ ] 3. Report the findings, ranked, and agree what to fix
- [ ] 4. Add `tsconfig.json` and a `typecheck` script; triage the real errors
- [ ] 5. Plan kitchens and bathrooms properly

## Review

(to be completed)
