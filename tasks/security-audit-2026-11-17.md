# Security audit — pass 4, 2026-11-17

Eric: *"please audit the entire app and find the security weak points just
list them out when you find them then lets plan the permant fixes to keep the
app safe?"*

Continues `tasks/security-audit-2026-10-16.md`, which ran three passes between
16 October and 11 November. **This pass did not re-run that work.** It went at
the two things that audit could not have covered: everything built since
11 November, and the places a probe with an anon key cannot reach.

A second session is concurrently auditing route-level authorization across all
~555 routes — auth tier and ownership scoping, with negative tests calling
routes as the wrong user. That is deliberately out of scope here to avoid two
sessions grading the same thing. Scope was divided in writing before either
started.

---

## What held up

Stated first, because an audit that only lists faults gives no sense of
whether the thing is well built. It is.

| Checked | Result |
|---|---|
| Secret values in the shipped browser bundle | **None.** 459 JS chunks scanned for service-role keys, Stripe live/test keys, Resend/Anthropic keys, Slack and Google key shapes. The only hits are UI strings naming env vars in setup instructions. |
| The nine newest or most sensitive API routes, called anonymously | **All 401** — `team/members`, `team/role-changes`, `trash-estimator/links`, `social/platforms`, `owner-provisioning/invites`, `owner-provisioning/portal-access`, `crm/contacts`, `media-library`, `images/upload`. **See the correction below: this proves less than it appears to.** |
| Machine routes (cron ticks, watchdog, escalation, probe reporting) | **Secret-gated and fail closed.** Each refuses when its secret is unset rather than running, and returns the same answer for "unset" and "wrong" so a caller learns nothing. |
| `/sms/test` — an unauthenticated endpoint that spends money | Gated on `SMS_TEST_SECRET`, 404 when unset. |
| Prompt injection on the public AI pricing path | **Genuinely defended.** Customer notes are fenced in `<customer-notes>` and labelled as description-not-instruction; the model answers with array indices only; an out-of-range answer is rejected whole rather than clamped; the price is computed downstream from a takeoff, never read off the model. |
| Live probe `npm run security` | **15 passed · 1 failed · 0 warnings · 2 skipped.** The CSP warning present on 11 November is gone. |

### Correction, same day — a 401 does not mean the route exists

Written into the table above as if nine 401s established nine working
controls. They do not, and the error is worth keeping rather than quietly
editing out.

The auth wall answers **before** routing. So an invented path returns exactly
what a real one does:

    GET /team/members                     401  {"error":"Sign in required."}
    GET /team/zzz-not-a-real-route-9f3a   401  {"error":"Sign in required."}
    GET /completely/invented/path         401  {"error":"Sign in required."}

Byte-identical. What the nine probes actually prove is that **no anonymous
caller reaches any of those routes** — which is worth knowing and is a real
control. What they do not prove is that the routes exist, that they are
mounted, or that the authorization *inside* them works. For the Team routes
that came from reading the deployed bundle instead.

This is good design and a real limitation at once: a uniform 401 defeats route
enumeration, and it also means **no amount of external anonymous probing can
verify authorization**. Anything past the wall needs a real, non-staff
credential. The concurrent route sweep is blocked on exactly this.

---

## Findings

### P4-1 — The client-side admin check fails open, on a page open to everybody · **MEDIUM** · FIXED 2026-11-17

`src/app/lib/utils/roleUtils.ts`:

```ts
export function getCurrentUserRole(): UserRole {
  const storedRole = localStorage.getItem('user_role') as UserRole;
  return storedRole || 'admin'; // Default to admin for development
}
```

Three facts compound:

1. **Nothing ever writes `user_role`.** `setCurrentUserRole` has zero callers
   anywhere in `src/`. So the fallback is not a fallback — it is the only
   path, and it returns `admin`.
2. **`isAdminOrHigher()` is what gates the admin UI** on
   `UnifiedDashboard.tsx` (lines 971, 1517), `ProjectsNew.tsx` (366, 531) and
   `UnifiedDashboardMobile.tsx`.
3. **The Command Center is deliberately open to anyone.** `App.tsx:981` says
   so in a comment — *"Allow anyone to view unified-dashboard (command
   center) / Non-elevated users will see limited/demo version"*. The limited
   version is the thing that never happens, because the only check that would
   produce it answers `admin` to everybody.

And a visitor can set `localStorage.user_role = 'owner'` from the console
regardless.

**What this is not.** It is not data exposure on its own. Every route behind
those panels enforces separately against `app_metadata`, which the browser
cannot write — verified by the nine 401s above. The server is not fooled.

**What it is.** A control that reports success while doing nothing, on the
page the application treats as its front door; a map of the admin surface
handed to anyone who opens it; and the discovery path that makes any
weakly-gated route findable. It is also the exact pattern the 16 October audit
closed on the server (`trustedRole`, `app_metadata` only) and nobody carried
to the client.

---

### P4-2 — One uploader trusts the client's file label; its sibling does not · **MEDIUM** · FIXED 2026-11-17

Two uploaders, opposite behaviour, same codebase.

`supabase/functions/server/image-upload.tsx` does it correctly and says why:

> *"has to genuinely look like one, so a script cannot arrive wearing the
> label."*

It sniffs the bytes, checks GIF/BMP/TIFF signatures by hand, and for SVG —
which has no signature — requires `<svg` within the first kilobyte. A file
whose content does not match its label is refused.

`supabase/functions/server/media-library.tsx` does none of that:

```ts
const mediaType = getMediaType(file.type);   // the CLIENT's declared MIME
...
.upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });
```

The declared type is validated against an allow list **that includes
`image/svg+xml`** (line 72), and then stored as the object's content type. So
the bytes are never examined and the attacker chooses the header the file is
served with later.

**What caps it.** The bucket is `public: false`, so objects come back through
signed URLs rather than public ones, and they are served from
`*.supabase.co` — a different origin from the app. An SVG with script in it
executes there, not against the app's session.

**What does not cap it.** The content type is attacker-chosen and honoured on
retrieval; the file sits under a URL that looks like ours; and the moment
anything proxies storage through the app's own domain — as `vercel.json`
already does for `/design` — it becomes same-origin. Fifty megabytes of
anything can be stored as long as the label is on the allow list.

---

### P4-3 — Ten authorization gates read a record nothing writes · **LOW (as a control), HIGH (as a false signal)**

Already on `tasks/found-not-fixed.md`; repeated here because it belongs in an
audit record.

Ten server modules gate on a fine-grained permissions record —
`content-filter-admin`, `fulfillment`, `hot-products`, `investments-kv`,
`invoice-linking`, `promotions-engine`, `store-ai-pricing`, `store-boosters`,
`tier-features`, `design-links` — reading `user_permissions:<userId>` in KV or
the Postgres table of the same name.

**Nothing writes either**, except `/auth/signup`, which always writes
`"client"`. Six rows exist project-wide; all six say that. `auth.tsx:460`
documents this from the 2026-09-20 investigation.

Every one of those gates therefore falls through to its role check. Not a
hole — the role checks are real — but ten routes state a control that never
evaluates, and any audit reading the code (including the concurrent route
sweep) will score them as having a protection they do not have.

---

### P4-4 — No firewall in front of the API · **MEDIUM** · carried from pass 3

`WAF-1`, the one failing probe check. The origin can be addressed directly, so
the Cloudflare rules in `docs/security/waf.md` and the OWASP CRS runbook
protect a path that can be bypassed.

Related and still true from the earlier audit: **Supabase Auth bypasses
Cloudflare entirely.** `src/app/lib/supabase.ts` builds its client against
`<projectId>.supabase.co`, so every sign-in, sign-up, token refresh and
password reset goes straight to Supabase. A WAF on the API zone protects the
API and nothing that handles credentials — which is the half a WAF is usually
bought for.

---

### P4-5 — The anonymous pricer's per-IP ceiling rests on an undocumented dependency · **LOW, conditional** · CLOSED 2026-11-17, MEASURED

Reviewed at the author's request: `anonPricer.ts` plus its call site, added
after this pass began. It lets anyone price a job with no credential, and
every call spends an Anthropic request.

**The design is right.** Two ceilings — 3 per address per day, 150 overall —
with the date in the key so nothing needs resetting, deliberately *not*
through `aiSpend`, whose budgets never reset and would have permanently
refused everyone behind a carrier NAT after two estimates. Counted after a
price exists, so our own failure to read a photograph does not consume one of
a stranger's three. The global ceiling is what actually bounds the money, and
it holds regardless of everything below.

**The dependency.** The per-IP half rests on `clientIp()`
(`ipReputation.ts:380`), which reads `cf-connecting-ip` **unconditionally** —
unlike `x-client-ip`, which is correctly gated behind `viaTrustedProxy`. A
client-supplied `cf-connecting-ip` is therefore trusted on any path where one
survives to the function.

It almost certainly does not: Supabase fronts these functions with its own
Cloudflare, which *overwrites* `cf-connecting-ip` rather than passing a
client's through — that is the only reason the header is trustworthy anywhere.
`x-forwarded-for` is handled correctly for the same topology (the code takes
the **last** element, which is the one the nearest trusted proxy appends).

**So this is not a claim that it is exploitable.** It is a claim that nobody
has written down why it is safe, and that the reason lives in another
company's edge configuration. If the per-IP ceiling is ever bypassed, the
global 150 still caps the spend — but a stranger could exhaust the day's
pricing for real customers at the cost of rotating one header fifty times.

**Cheap verification, before trusting it:** log the resolved address once on
the anonymous path, then send a request with `cf-connecting-ip: 1.2.3.4`. If
the log shows the real address, the dependency holds and should be written
into `clientIp()`'s header comment. If it shows `1.2.3.4`, gate
`cf-connecting-ip` behind `viaTrustedProxy` exactly as `x-client-ip` already
is.

---

### P4-6 — Open items that are configuration, not code · carried

| Item | Waiting on |
|---|---|
| `ANON-2` — leaked-password protection | A dashboard toggle. Not probeable. |
| Origin lock → enforcing | Cloudflare. Fails open while unset, by design. |
| IP reputation → enforcing | An observation period of `would-block` lines. |
| `public.slow_queries()` | A live function with no migration in this repository — the only schema drift found, and the one still carrying an unpinned `search_path`. |
| Three anonymous `auth.users` rows from 16 Oct | A decision. Deleting auth rows is destructive. |
| Phase 3 stages 3–4, Phase 4 items 12–14 | A calendar and a budget. |

---

## The plan

Ordered by what reduces risk per hour of work, not by severity label.

### Now — code, small, testable

1. **P4-1.** Delete `getCurrentUserRole`'s `|| 'admin'` and make the client
   read the same answer the server gives. `/me/permissions` already returns
   `isAdmin`, `isPlatformOwner` and `role` from `app_metadata` — it exists,
   it is deployed, and this file predates it. Default to the *least*
   privileged answer while that request is in flight, so the admin UI appears
   on proof rather than on absence of proof. **Test:** no client-side
   authority check may default to a privileged role.

2. **P4-2.** Point `media-library` at `image-upload`'s `resolveType`, so one
   sniffer serves both, and store the *sniffed* type rather than the declared
   one. Decide deliberately whether SVG is allowed at all; if it is, it should
   be stored with `content-disposition: attachment` or sanitised.
   **Test:** a file whose bytes disagree with its label is refused, by both
   uploaders.

3. **P4-3.** Decide whether per-feature permissions are a product requirement.
   If yes, the writer belongs beside `POST /team/members/role`. If no, delete
   the ten reads so the code stops claiming a control it does not have.
   Either way it stops being a false signal.

### Next — the structural one

4. **P4-4.** The firewall only becomes real when the origin cannot be
   addressed around it, and credentials only get covered when auth stops
   bypassing it. Those are one piece of work: Supabase's custom-domain add-on
   for the auth hostname, or routing `/auth/v1` through the existing
   `api-origin-proxy` Worker, plus origin lock moved to enforcing. Until then
   the WAF is a control on paper.

### Standing — so this does not need a person

5. **Fold the checks into the gate.** `npm run security` already runs 18
   checks against production. The two code findings above are the kind that
   never recur if a test asserts them — and both are cheap to assert, unlike
   the config items, which need a human and a dashboard.

6. **Dependency scanning on a schedule.** `pnpm audit` is clean today. The
   16 October audit found 14 high-severity CVEs, so "clean today" is a
   snapshot, not a property.

---

## Disclosure about this pass

What was **verified by request against production**: the bundle scan, the nine
anonymous route probes, the live security probe. What was **verified by
reading**: the upload paths, the cron gates, the AI prompt handling, the
client role check. What was **not verified at all**: anything needing the
service-role key or the Supabase dashboard — `RLS-2` was run with database
access on 10 November and passed, and nothing in this pass re-ran it.

No finding here was reached by running an exploit against live data.

---

## Fixed, 2026-11-17

### P4-1 — closed

`roleUtils.ts` no longer answers "who is the current user?" at all. The
localStorage read, the `|| 'admin'` default and the four helpers built on them
are gone; what remains is a pure hierarchy comparison over a role you pass in,
which cannot fail open because it cannot decide who you are.

The three pages that gated admin UI on it — `UnifiedDashboard`, `ProjectsNew`,
`UnifiedDashboardMobile` — now take `isAdmin` from `useAuth()`, which was
already asking `GET /me/permissions` and already deriving it from
`app_metadata` on the server. Nothing needed building; it needed using.

`tests/clientRoleAuthority.test.ts`, 8 assertions. The structural ones matter
most: the module may not reference `localStorage`, may not export a
"who-am-I" helper, and may not use a privileged role as a fallback value. The
call sites are checked at the source too, because unit-testing the helpers
proves the helpers are safe and the original bug was entirely in the using.

Checked and deliberately left alone: `CondoAssociationPortalView` also reads a
role from storage, and is already correct — the stored value is a *preview*,
offered only to somebody who already holds full authority and ignored for
everybody else. That is the shape the fix above aims at.

### P4-2 — closed

`media-library.tsx` reads the bytes now. `mediaSniff.ts` wraps the existing
`imageSniff` — which guards a public bucket and is deliberately narrow — and
adds the video signatures the media library needs: MP4/MOV by the ISO `ftyp`
box, WebM by EBML, AVI by RIFF, FLV by its own magic.

The stored object carries the **sniffed** content type, not the declared one.
That was the sharper half of the finding: the old code let the uploader choose
the header its file would be served back with.

**SVG is now refused**, matching the documented decision in `imageSniff`. The
bucket being private weakens the public-XSS argument but does not remove it —
the stored type is honoured when a signed URL is opened, and `vercel.json`
already proxies third-party content under our own domain at `/design`, so
"storage is a different origin" is not a property to rely on. If somebody ever
needs to upload an SVG, the answer is to sanitise it or serve it as an
attachment, not to trust the label.

`tests/mediaSniff.test.ts`, 8 assertions, with the real leading bytes of every
format written out by hand rather than generated by the code under test. It
asserts an SVG, an HTML page, a script, a Windows executable, an ELF binary, a
zip and a PDF are all refused — and that `sniffMedia` takes bytes and nothing
else, so there is no parameter a future edit could pass a claimed type into.

### Still open from this pass

`P4-3` needs a product decision, not a keyboard. `P4-4` and `P4-6` are
configuration — Cloudflare, a Supabase add-on, and dashboard toggles. `P4-5`
is one request away from being settled and belongs to whoever next deploys.

Verified after both fixes: **3911 tests pass, 0 fail**; server typecheck 82,
exactly at baseline; app typecheck 286, and the ratchet lowered to meet it.

### P4-5 — closed by measurement, not by argument

I filed this as "almost certainly safe, and nobody has written down why".
It is now written down, and it was settled against the deployed function
rather than reasoned about. Three requests:

| Sent | Result |
|---|---|
| A client-supplied `cf-connecting-ip` | **403 at the edge** — Cloudflare error 1000. The function never runs. |
| A spoofed `x-forwarded-for` | Reaches the function and still resolves to the **real** address: Cloudflare appends the connecting IP to the end of whatever list it is handed, and the code reads the rightmost entry. |
| `x-client-ip` with `viaTrustedProxy` false | Ignored. |

So the header cannot be forged from outside, and the conclusion is the
opposite of my suggested fix: **gating `cf-connecting-ip` behind
`viaTrustedProxy` would make things worse.** It would buy nothing — the header
is already unforgeable — and would hand the decision to `x-forwarded-for`, and
to `null` on the day the edge stops setting it.

Worth keeping as a method note: my instinct was to add a gate, and the
measurement said the gate was the dangerous change. The reasoning was sound
and the conclusion was wrong, which is the usual outcome when a security
question about somebody else's infrastructure is answered from first
principles. The repeatable procedure now sits above `clientIp` in
`ipReputation.ts`, alongside the earlier 2026-11-11 measurement of Supabase's
own Cloudflare overwriting the same header.

### A note on the build stamp, which had the fault it was built to fix

The first stamped build reported `dirty: true` from a tree holding nothing but
committed code, for two reasons I had missed and the other session caught:

- `taskDigest.generated.ts` is modified in a normal tree nearly always, and
  neither generated file was excluded from the stamp the way both are
  excluded from `predeploy-check`. So the flag was going to read `true` for
  ever.
- The `git` helper `.trim()`s its whole output, which strips the leading
  status space off the **first** porcelain line only. A fixed `slice(3)` then
  removes a character from that one path — `supabase/…` becomes
  `upabase/…` — so an exclusion by path would have missed the first file and
  only the first file. Confirmed on the exact failing input.

Both now fixed upstream by parsing the last field of each line. The point
worth keeping: a flag that reads the same on every build carries no
information, which is precisely the fault in the hand-written `version` string
the stamp exists to replace. The fix had reproduced the bug.

---

## P4-7 — Twelve more phantom tables, in the browser · found 2026-11-17

Found by building the check the server findings asked for, and the check paid
for itself on first run: **the server came back clean and the front end did
not.**

A `.from('…')` naming a table that does not exist returns an error OBJECT,
not a throw. So every call site does one of two things with it, and both are
silent:

    const { data } = await supabase.from('stakeholders')…   // data is null
    (data || []).map(…)                                     // renders empty

    if (error) throw error;  } catch { return false }       // refuses everybody

| Table | Where | What it means |
|---|---|---|
| `user_companies` | `companyScope.validateCompanyAccess` | Throws, catches, returns **false**. The same shape as `rewardsAdmin` — a gate that refuses everybody. One caller, `CompanyContext.tsx:592`. |
| `stakeholders`, `stakeholder_activity`, `stakeholder_notifications`, `audit_logs`, `notification_templates` | `StakeholderEngagementDashboard`, `StakeholderAuditLogViewer`, `NotificationAnalyticsDashboard` | Three dashboards that are rendered and can never show anything. |
| `company_members` | `CompanyContext` | The same phantom the server read until today. |
| `user_profiles`, `user_activity_log` | `userService` | |
| `company_documents` | `companyDatabaseService` | |
| `company_settings` | `ClientWorkRequestForm` | |
| `portals` | `portalService` | |

**Not fixed, deliberately.** Each wants one of three answers — build the
table, delete the feature, or point it at the server route that already holds
the data in KV — and which one is right differs per entry and is a product
decision. Guessing twelve times would be worse than recording them once.

They are carried in `supabase/known-tables.json` as `knownMissing`: a ratchet,
not an allowlist. A thirteenth fails the gate; the twelve are visible with
their call sites; and a second test fails if a name stays on the list after
nothing queries it any more, so the list can only get shorter.

This is the same failure as P4-3 with a different blast radius. There it
refused an administrator; here it renders an empty dashboard. **Both look
exactly like working software**, which is the property that let three dead
tables survive on the server for years and twelve survive in the browser
until something finally compared the names against the schema.
