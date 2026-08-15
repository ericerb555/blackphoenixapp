# Backend restructure plan — Black Phoenix Builds platform

Working doc. Drop this at the repo root so Claude Code can read it.

---

## Where things actually stand

**Supabase project:** `plzsvzwwcdopnawtiwzm` (Pro plan, Postgres 17, 455 MB)

**Four edge functions, four kv tables — but they do NOT pair up one-to-one.**
Verified 2026-08-13. Function slug and storage table are decoupled: both
`57095a78` and `3eae23a6` read and write the *same* table, `kv_store_57095a78`.

| Function | Reads/writes | Row count of same-named table | Status |
|---|---|---|---|
| `make-server-3eae23a6` | `kv_store_57095a78` | (`kv_store_3eae23a6` = 0) | **LIVE** — the only slug the frontend calls (257 files). v256, deployed Aug 9 |
| `make-server-57095a78` | `kv_store_57095a78` | 1,390 | **STALE** — v470, deployed Aug 3. Frontend calls it from 0 files, but it still has write access to live data |
| `make-server-12c91054` | — | 45 | permits, plot plans, deck renders |
| `make-server-824f083c` | — | 60 | was 0, now 60 — something is writing to it |

`kv_store_3eae23a6` is an orphan table auto-created by Figma Make. It has 0 rows
because nothing writes to it — not because data is missing.

Plus `smart-processor` and `swift-processor`, both untouched since creation.

**Relational tables that exist and are unused:** `companies` (2 rows, correct RLS),
`investment_opportunities`, `investor_commitments`, `payout_distributions`,
`investment_documents` — all 0 rows, all with real foreign keys.

**The core exists in code, but only half of it is running.** Verified 2026-08-13
against the deployed bundle:

| Live (imported by `index.tsx`) | Dead file (never deployed) |
|---|---|
| `auth`, `entitlements`, `plans`, `tier-features` | `tenants`, `companies`, `api-gateway` |

So it is not just "no database under it" — the multi-tenancy layer specifically
(`tenants`, `companies`, `api-gateway`) has never run in production at all. Treat
those three as unproven code, not as a working design awaiting tables.

---

## Known problems, in priority order

1. **RLS is decorative on the kv tables.** Enabled, zero policies. Everything
   reaches them via service role, which bypasses RLS entirely. Every authorization
   decision lives in TypeScript. A missed check in an edge function has nothing
   behind it.

2. **Secrets in plain text.** `companies.bank_account_number`,
   `bank_routing_number`, `tax_id`. Vendor API credentials will land in the same
   place if nothing changes — and those belong to other businesses.

3. **Multi-MB blobs in JSONB.** `deckrender:` entries run 4–8 MB each. 12 storage
   buckets hold only 61 objects. Renders belong in Storage with a URL in the row.

4. **Duplicate files committed.** `-1` variants of the configs, three variants of
   the edge function entrypoint, `growth-tools` through `growth-tools4`.
   Hygiene, not danger — but it makes "which file is real" a live question.

---

## Method: strangler, not rewrite

New tables go in **alongside** the kv store. One route at a time moves over.
The old path stays until the new one is proven. Nothing is deleted until a
portal has fully moved and stayed moved.

Consequence: the app works at every point. No cutover day.

**Isolation while working:**

| Layer | Production | Work |
|---|---|---|
| Code | `main` | `rebuild` branch |
| Deploy | live URL | Vercel preview (automatic per branch) |
| Database | current project | Supabase branch |

One codebase. Merging back is a pull request, not a re-typing exercise.

---

## Phases

### 0. Establish the baseline — ✅ DONE (2026-08-13)

- [x] Finish the deployed-vs-local diff on `make-server-57095a78`.
- [x] Answer: is the repo ahead of production, behind it, or diverged?
- [x] Only then decide whether anything gets deployed.

**Answer: the repo is strictly AHEAD. Not diverged. Nothing in production is
missing from the repo, so there is nothing to recover.**

The diff was run against the wrong function. `make-server-57095a78` is not what
the app talks to — `make-server-3eae23a6` is, and that one matches the repo
exactly:

- **All 62 files of deployed `make-server-3eae23a6` are byte-identical to
  `supabase/functions/server/`.** Zero differences, zero deployed-only files.
  `index.tsx` included.
- The repo holds **52 additional modules** (`bidRoom`, `companies`, `tenants`,
  `api-gateway`, `growth-tools`…) that are **not imported by `index.tsx`** and
  therefore not deployed. Confirmed by exact-match import scan: 0 of 52 are
  wired in. They are dead files, not pending work.
- vs the stale `make-server-57095a78`: 11 of 13 differing files differ *only* by
  the slug string `57095a78` → `3eae23a6`. The repo also carries a real bug fix
  the stale function lacks — `plans.tsx` scopes its auth guard to the plans
  prefix, where deployed uses `use('*')` on a root-mounted router and rejects
  every request in the server with "Sign in required." CORS was dropped from
  `plans.tsx` only because `index.tsx:162` applies it globally.

**Deploy decision: deploy nothing.** The live function already equals the repo.

**New risk surfaced — the stale function is still armed.** `make-server-57095a78`
is ACTIVE and its `kv_store.tsx` points at `kv_store_57095a78`, the same table
holding all 1,390 live rows. Two servers with different code can mutate one
dataset. The frontend calls it from zero files, so the safe move is to
**disable/delete `make-server-57095a78`** before any migration work starts.
Do that first, and confirm nothing external calls it.

### 1. Core schema

Apply `001_platform_core.sql` to a Supabase branch. Three tables plus two
helper functions (`my_org_ids()`, `org_has_feature()`) that make every later
RLS policy a one-liner.

- [ ] Confirm the `org_type` enum matches reality — especially whether
      customers are organizations or individuals
- [ ] Map existing `auth_profile:` / `account:` / `staff:` / `portal_access:` /
      `feature_grant:` keys onto the new tables
- [ ] Backfill from kv, verify counts match

### 2. First portal: bid room

Chosen because it's the platform's center of gravity, not because it's easiest.

- [ ] Tables for bids, quotes, provider responses — all hanging off `org_id`
- [ ] RLS policies using the helpers
- [ ] Dual-write: new writes go to both kv and tables
- [ ] Move read routes one at a time, verify against kv
- [ ] Cut writes over once reads are stable

### 3. Collapse the edge functions

Four functions = four deploy cycles = four places to fix the same auth bug.
Once modules share a core, they share a server.

- [ ] Determine what `3eae23a6` and `824f083c` are before folding them in
- [ ] Retire `smart-processor` / `swift-processor` if confirmed dead

### 4. Commerce module

The big one — 1,390 rows. Same pattern, third time through.

### 5. Secrets migration

- [ ] Vendor API credentials → Supabase Vault / pgsodium
- [ ] Bank + tax fields in `companies` → same treatment
- [ ] Blobs out of JSONB → Storage

### 6. CAD / permits

Own project, own timeline. See `drawing-package-spec.md`.
Gate logic before any drawing code.

### 7. Investment portal

Schema exists and is relational. Sequenced last: taking money against
projected returns is regulated activity. Securities attorney before it goes
live, not after.

---

## Parallel tracks (don't block the above)

**Placeholder audit.** Figma Make stubs things to keep demos moving. In Claude
Code:

> Go through every route in `supabase/functions/*/server/`. For each one, tell
> me in a table whether it reads or writes real data, returns hardcoded values,
> or is an unfinished stub.

**Phone calls.** Merrimack, Nashua, Pelham building departments:
- Do you accept a non-survey plot plan for a residential deck permit?
- Is there required wording on it?
- Which IRC edition have you adopted?

Free, and settles questions no amount of code will.

---

## Rules for this work

- Nothing gets deleted until its replacement has been proven in use
- Every new table has RLS enabled **and** policies written
- No secrets in plain text columns, ever
- One portal fully working beats three at 80%
- Stop building new features in Figma Make — each one is one more thing to port
