# Sixteen server modules that nothing imported

Moved out of `supabase/functions/server/` on 2026-10-16. None of them was
imported by any file in that directory, including `index.tsx`, so none ran — but
`supabase functions deploy` uploads **every file in the function directory**,
not just the import graph, so all sixteen were being shipped on every deploy.
213 KB of code that could not be reached.

They are here rather than deleted because `tsconfig.server.json` already
excludes `_retired/**`, with a comment that says what this directory is for:
*"the record of what was taken out of service; they do not ship, and checking
them would bury real findings under problems in code nobody runs."* Git has the
history either way; this keeps them readable without a `git show`.

## What they are, in three groups

**Superseded by a working implementation elsewhere** — these are the ones worth
understanding before anybody reinstates them.

- `providerBids.tsx`, `serviceProviders.tsx`, `aiBidRouter.tsx` — the old bid
  room. Every route in `providerBids` reads or writes `bid_opportunity:`, and
  the only writer of that key is `aiBidRouter./ai-route`. The live bid room is
  in `index.tsx` on Postgres tables with RLS through `userScopedClient`, plus
  `/bid-intake`, and it keeps state under `bid_route:`. Production holds zero
  rows under every prefix these touch.
- `unifiedProductSearch.tsx` — a second products catalogue over the same
  `product_` prefix that `ecommerce-products.tsx` serves, unpaginated and with
  no admin check on its read.
- `property-management.tsx`, `tenants.tsx` — twenty-one of the twenty-two routes
  in the first are duplicates of guarded ones in `index.tsx`. Mounting either
  would have shadowed working routes with unguarded copies, which is the trap
  the PRODUCTS CATALOG note in `index.tsx` describes.

**Named as dead weight in `tasks/ready-for-use.md` item 4** and still dead:
`kitchen-cabinet-schedule.tsx`, `materials-api.tsx`, `cohort-settings.tsx`,
`data-backup.tsx`, `api-gateway.tsx`, `portalSettings.tsx`.

**Orphans found by the same sweep**: `schedulePlan.ts`,
`analytics-summary.tsx`, `weather.tsx`, `plan-builder.tsx`.

## If you bring one back

Move it to `server/`, then check two things rather than one. That it is
imported, and that mounting it does not shadow a route already answered in
`index.tsx` — Hono takes the first matching handler, and `app.route` registers
ahead of the inline `app.get`/`app.post` definitions further down that file. The
unmounted-router note near the top of `index.tsx` has the full reasoning and the
history of the four times this has caught somebody.

## What this did not fix

It was done while chasing a deploy failing with
`Function source code exceeds the maximum deployment size (5 MB)`, and it did
not fix that. The 5 MB ceiling applies to **server-side** bundling; bundling
locally with the CLI allows 20 MB, and that needs Docker. See the deploy notes
in `tasks/ready-for-use.md`.
