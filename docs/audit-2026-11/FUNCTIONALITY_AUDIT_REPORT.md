# Phase 3/4 — Walked in a real browser

2026-11-19, Chrome automation against **production**, in Eric's own signed-in
session (`ericerb555@proton.me`, role `owner`).

**Every write boundary was approached and not crossed.** The brief forbids
modifying production data, so each workflow was walked to the point where it
would write, the gating behaviour verified there, and the step not taken. Where
that happened it is marked *stopped at the boundary*.

## Behaviour-tested and working

| What | Evidence |
|---|---|
| Landing page renders, brand mark visible | screenshot; the glowing phoenix is in its disc |
| "Junk Removal" → anonymous pricer | click navigated to `/customer-portal-app?tab=trash-estimate` |
| Pricer "30–60 seconds" note | visible under the button, as shipped 2026-11-18 |
| **Pricer submit gating** | ticked the attestation and filled the name with **zero photos** — "Price it" stayed disabled. All three conditions genuinely required, not just the checkbox. |
| User Management Hub | two honest tabs; the real team panel renders with 2 real members |
| **Bulk role selection** | selecting a member raised the bulk bar with a live count |
| **Bulk two-click arming** | first press relabelled the button **"Yes — make 1 person Employee"** — it names the count and role before acting. Nothing sent. |
| **Own-row protection** | the owner's own checkbox renders disabled; only the other member is selectable |

The bulk feature shipped yesterday is therefore verified in production, by
clicking, without changing anybody's role.

## F-1 (P2) — The header shows the wrong account

**The header reads `jbrenes19@gmail.com`, labelled "Platform Owner (You)".
The actual session is `ericerb555@proton.me`.**

Proof the session is correct: the team panel marks `ericerb555` as "you" —
that comes from `actorEmail` on `GET /team/members`, which the server derives
from the verified token. The server has the right person.

What the two accounts are, from `auth.users`:

| Email | Role | Last signed in |
|---|---|---|
| `ericerb555@proton.me` | **owner** | today |
| `jbrenes19@gmail.com` | **no role at all** | 2026-09-21 |

So the header is displaying a **stale, role-less account from two months ago**
as the current user.

**Root cause — `src/app/App.tsx:774-785`:**

```js
if (user && user.email) { userEmail = user.email; }   // the verified session
if (currentUserProfile) {
  const profile = JSON.parse(currentUserProfile);     // from localStorage
  if (profile.email) { userEmail = profile.email; }   // overrides it
}
```

**A browser-owned `localStorage` record overrides the authenticated session's
identity.** Whatever `currentUserProfile.email` holds wins.

This is the same family as the `|| 'admin'` localStorage role removed earlier
in this audit, with one important difference: **it grants nothing.** The server
decides access from `app_metadata`, and it had the right user throughout. The
damage is confusion, on the screens that control access — and the same profile
supplies `accountType`, which influences which portal the app shows. The code
twenty lines below even carries a hardcoded "FORCE owner" patch keyed on the
owner's email, which is a plaster over this exact behaviour.

**Recommendation:** take identity from the session and let the profile supply
only decoration. `user.email` should win; the profile should never override it.

**Severity P2, not P1:** no access is granted by it, and the server is correct.

## F-2 (P3) — The company name is clipped on the landing page

At 1410px the hero headline overflows both edges: "The" is cut off on the left
and "Company" runs past the right. Visible in the first screenshot. The code
comment on the sign-in button already describes this type as "enormous white
display type that overflows the viewport".

## A note on the tooling

One screenshot call timed out mid-walk and reported the renderer as possibly
frozen. It was not: the console showed no error and no React "maximum update
depth" warning, and `find` immediately returned the live element tree
including the newly rendered bulk bar. **The timeout was the automation
channel, not the application** — recorded because the opposite conclusion was
available and would have been wrong.

## Not walked, and why

Anything that writes: submitting an estimate (real model spend and a real
record), sending an invitation (a real email to a real person), applying a
bulk role change (changes a real person's access), payments, deletions. Each
was approached and stopped at the boundary.
