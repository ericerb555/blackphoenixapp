# Backend restructure plan — Black Phoenix Builds platform

Working doc. Drop this at the repo root so Claude Code can read it.

---

## Where things actually stand

**Supabase project:** `plzsvzwwcdopnawtiwzm` (Pro plan, Postgres 17, 455 MB)

**Four edge functions, four kv tables — one per Figma Make project:**

| Function | Table | Rows | Contents |
|---|---|---|---|
| `make-server-57095a78` | `kv_store_57095a78` | 1,390 | commerce, quotes, vendors, auth/tenancy |
| `make-server-12c91054` | `kv_store_12c91054` | 45 | permits, plot plans, deck renders |
| `make-server-3eae23a6` | `kv_store_3eae23a6` | 0 | unknown — deployed, maintained, empty |
| `make-server-824f083c` | `kv_store_824f083c` | 0 | unknown — deployed, maintained, empty |

Plus `smart-processor` and `swift-processor`, both untouched since creation.

**Relational tables that exist and are unused:** `companies` (2 rows, correct RLS),
`investment_opportunities`, `investor_commitments`, `payout_distributions`,
`investment_documents` — all 0 rows, all with real foreign keys.

**The core already exists in code.** `server/` contains `auth`, `tenants`,
`entitlements`, `plans`, `tier-features`, `companies`, `api-gateway`. The design
is done. It just has no database under it.

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

### 0. Establish the baseline — BLOCKING

Nothing below is safe until this is done.

- [ ] Finish the deployed-vs-local diff on `make-server-57095a78`.
      Layouts differ: deployed has files loose in the function folder, repo has
      them under `server/`. Deployed `updated_at` ≈ Aug 3.
- [ ] Answer: is the repo ahead of production, behind it, or diverged?
- [ ] Only then decide whether anything gets deployed.

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
