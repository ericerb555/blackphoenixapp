# Security worklist

Eric, 2026-11-17: *"make a list an tackle one at a time."*

Ordered by real risk, not by ease. **Who** says whether it is mine to do or a
decision only Eric can make — a configuration change in Cloudflare or the
Supabase dashboard is not something a code change can fake.

Status: `OPEN`, `DOING`, `DONE`, or `WAITING` on somebody.

| # | Item | Why it is where it is | Who | Status |
|---|---|---|---|---|
| 1 | **`/cart` is public and takes `:customerId`** | The only remaining hole reachable with **no session at all**: read, add to, modify or empty a named customer's basket. Everything below needs either a session or Eric. | me | DONE |
| 2 | **WAF-1 — the firewall can be walked around** | `*.supabase.co` answers directly, so the Cloudflare rules never see the traffic. Every rate limit and bot rule above it is advisory until this closes. Needs `EDGE_ORIGIN_SECRET` set in two places, then `ORIGIN_LOCK_ENFORCE=true`. | Eric + me | WAITING |
| 3 | **~950 routes that check *something*** | The scan that found the four unguarded modules finds only the *absence* of a check. A route that checks the wrong thing — the wrong role, or an id taken from the request — still reads as guarded. This is the largest unknown left and needs its own scanner. | me | OPEN |
| 4 | **`POST /variances/scan-fill` trusts `body.email`** | A signed-in caller can file a draft under somebody else's address. Not a disclosure; the guard above it already stops them reading it back. | me | OPEN |
| 5 | **9 `SECURITY DEFINER` functions executable by `anon`** | Measured as returning nothing without a session (`is_platform_operator()` answers `false`), so this is unnecessary surface rather than a hole. Revoke `EXECUTE` from `anon`. | me | OPEN |
| 6 | **IP reputation scores but never bans** | The middleware measures and records; enforcement is off. Switching it on can lock people out, so the threshold is a judgement call. | Eric | WAITING |
| 7 | **ANON-2 — leaked-password protection** | A Supabase dashboard toggle (Authentication → Policies). The probe cannot read it, so it reports `skip` forever. | Eric | WAITING |
| 8 | **RLS-2 reports `skip` forever** | Answered by hand today — 39 of 39 public tables have RLS on — but the probe cannot run it without a service key, and a check that never runs must never read as a pass. Give it a way to answer. | me | OPEN |
| 9 | **DEP-1 — `picomatch` ReDoS, high** | **No patched version exists** (`patched: <0.0.0`), and it is build-only tooling (`fdir`, `tinyglobby`) whose glob patterns come from our own config, never from a customer. Needs a recorded exception with a recheck, not an upgrade — a FAIL nobody can clear is how a probe gets ignored. | me | OPEN |
| 10 | **Dead `EnhancedCheckoutFlow.tsx`** | Card number and CVV fields behind a fake two-second "payment". Nothing imports it, so it is a loaded gun rather than a live one. Deleting a component is Eric's call. | Eric | WAITING |
| 11 | **Three accounts hold no role** | Fail-closed and inert since September. If one is a real customer their portal is empty for this reason. | Eric | WAITING |
| 12 | **Supabase Auth bypasses Cloudflare** | Sign-in and sign-up go straight to `*.supabase.co`, so none of the firewall protections apply to the credential endpoints. Related to #2 but not fixed by it. | Eric + me | OPEN |

## What is already closed, so it does not get re-litigated

Measured rather than assumed, all on 2026-11-17 — see
`docs/server-route-authorization.md` section 4 for the evidence.

- Four route modules with **no authorisation at all** — company config, every
  project, zoning variance drafts, the AI page generator. Guarded, deployed,
  and proven 20/20 against a real non-staff session.
- The pipeline board, which had no authentication on any route.
- The browser-derived admin role that defaulted **everyone** to admin.
- **RLS**: 39 of 39 public tables enabled; a signed-in customer and an
  anonymous caller are both refused at the GRANT level on every table.
- **Storage**: every bucket holding customer files is private. All four public
  buckets listed object by object — website gallery, logo variants, logo cache.
- Card fields removed from signup.
- Retired API generations confirmed dead, with a check that now requires a
  positive marker instead of accepting a 401.
