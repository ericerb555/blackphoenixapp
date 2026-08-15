# Retired deployment — `make-server-57095a78` (archived 2026-08-15)

This is the **exact source that was running in production** as
`make-server-57095a78` (version 470, deployed 2026-08-03) at the moment it was
retired. It is kept because it is **not reconstructible from the rest of the
repo**: the deployed `index.tsx` was 74 lines, while
`supabase/functions/make-server-57095a78/index.tsx` in the working tree is over
8,000, and the deployed modules addressed the `make-server-57095a78` slug
throughout where the repo now uses `make-server-3eae23a6`.

## Why it was retired

- **The frontend called it from zero files.** Every request the app makes goes
  to `make-server-3eae23a6`.
- **It shared live data.** Its `kv_store.tsx` read and wrote
  `kv_store_57095a78` — the same table holding all production rows — so a
  second, older server had write access to the live dataset.
- **It was running a known bug.** `plans.tsx` registered its auth guard with
  `use('*')` on a router mounted at `/`, so the guard ran for *every* request
  in the whole server. Confirmed live before retirement: every route except
  `/health` returned `401 {"success":false,"error":"Sign in required."}`. The
  repo fixed this; this deployment never received the fix.

## What replaced it

A stub (`supabase/functions/make-server-57095a78-stub/index.ts`) that answers
`/health` exactly as before and returns **410 Gone** for everything else. That
removes the write access to `kv_store_57095a78` while keeping green whatever
was polling `/health` every 60 seconds — a caller that could not be identified,
because `edge_logs` does not record function invocations and `function_logs`
carries no path or user-agent.

## To restore

Deploy this directory as `make-server-57095a78` with entrypoint `index.tsx`:

    supabase functions deploy make-server-57095a78 \
      --project-ref plzsvzwwcdopnawtiwzm --use-api

(a `supabase/config.toml` entry is needed to point the entrypoint at
`index.tsx` rather than the CLI default `index.ts`).

**Do not restore without re-applying the `plans.tsx` auth-guard fix**, or the
401-on-everything bug comes back with it.
