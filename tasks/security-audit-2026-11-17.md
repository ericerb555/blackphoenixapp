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
| The nine newest or most sensitive API routes, called anonymously | **All 401.** `team/members`, `team/role-changes`, `trash-estimator/links`, `social/platforms`, `owner-provisioning/invites`, `owner-provisioning/portal-access`, `crm/contacts`, `media-library`, `images/upload`. |
| Machine routes (cron ticks, watchdog, escalation, probe reporting) | **Secret-gated and fail closed.** Each refuses when its secret is unset rather than running, and returns the same answer for "unset" and "wrong" so a caller learns nothing. |
| `/sms/test` — an unauthenticated endpoint that spends money | Gated on `SMS_TEST_SECRET`, 404 when unset. |
| Prompt injection on the public AI pricing path | **Genuinely defended.** Customer notes are fenced in `<customer-notes>` and labelled as description-not-instruction; the model answers with array indices only; an out-of-range answer is rejected whole rather than clamped; the price is computed downstream from a takeoff, never read off the model. |
| Live probe `npm run security` | **15 passed · 1 failed · 0 warnings · 2 skipped.** The CSP warning present on 11 November is gone. |

---

## Findings

### P4-1 — The client-side admin check fails open, on a page open to everybody · **MEDIUM**

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

### P4-2 — One uploader trusts the client's file label; its sibling does not · **MEDIUM**

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

### P4-5 — Open items that are configuration, not code · carried

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
