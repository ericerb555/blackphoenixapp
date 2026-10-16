# Deploying

Three things ship independently, and nothing ships anything else. Knowing which
one you need is most of the job.

| what changed | what to run | how long |
|---|---|---|
| anything under `src/` | `git push origin main` — Vercel builds | ~2 min |
| anything under `supabase/functions/` | `supabase functions deploy …` (below) | ~1 min |
| a new file in `supabase/migrations/` | apply it by hand (below) | seconds |

**Nothing is automatic except the frontend.** There is no CI in this repository.
A push builds the site and does nothing else: it will not deploy the server and
it will not apply a migration. Those are two deliberate acts.

---

## The frontend

```bash
git push origin main
```

Vercel builds from `main` and serves `dist/`. It is the only piece that deploys
on its own.

To know when it has actually landed rather than guessing, watch the bundle
name change — `vercel.json` sends `no-cache` on everything, so there is no CDN
to wait out:

```bash
curl -s https://theblackphoenixcompany.com/ | grep -o 'assets/main-[^"]*\.js'
```

---

## The server (`make-server-3eae23a6`)

Nearly everything the app asks a server for — the Exchange, the store, portal
invites, quotes, Zendrop — is this one Edge Function. Until it is deployed, the
frontend is talking to whatever version was last pushed, which can be weeks
older than the code in front of you.

```bash
# One time
npm install -g supabase
supabase login

# Every time
supabase functions deploy make-server-3eae23a6 --project-ref plzsvzwwcdopnawtiwzm
```

### Do NOT pass `--no-verify-jwt`

This file used to tell you to, and that was wrong. `supabase/config.toml` sets
`verify_jwt = true` for this function and explains why: it is the only
platform-level gate in front of it while the per-route auth gap is still open.
Passing the flag turns that gate off silently, and nothing in the app would
look broken afterwards — which is exactly what makes it dangerous.

Let `config.toml` supply the settings. It also carries the `entrypoint`, which
this function cannot deploy without: the CLI expects
`functions/make-server-3eae23a6/index.ts`, while the source actually lives in
`functions/server/index.tsx`.

### Check it

```bash
curl -s https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/health \
  -H "Authorization: Bearer <the anon key from src/app/utils/supabase/info.tsx>"
```

`{"status":"ok", …}` is the answer you want. The response also reports whether
the Resend and AI keys are present, which is the quickest way to tell a missing
secret from a broken deploy. Do not check the `version` string against anything
written here — it changes, and this document will not.

An `UNAUTHORIZED_INVALID_JWT_FORMAT` reply means the header is missing or
malformed, not that the deploy failed. `verify_jwt` is on, so every request
needs a token; the anon key is one.

---

## Migrations

**Do not run `supabase db push`.**

Counted on 2026-10-15: 43 `.sql` files here, 44 migrations in the remote
history, and only 21 of them agree on a version number. The rest were applied
through the management API, which stamps its own version at apply time, so the
same migration sits under two different numbers:

```
exchange_taxonomy_seed      local 20261002133000   remote 20261003172406
exchange_claim              local 20261002140000   remote 20261003172524
exchange_follow_and_deals   local 20261013160000   remote 20261013151118
```

`db push` compares version numbers, not names. It would attempt **22**
migrations, of which **18 have already run** — the Exchange taxonomy and its
seed, the claim tables, the catalogue, two backfills — against a live directory
of 1,100 businesses.

The other four are the genuinely unapplied ones, and they are worth knowing
about on their own:

```
20260920000000  investment_system
20260927201500  one_provider_org_per_email
20260928140000  drop_dead_plan_tables      <- DROPS TABLES, and is armed
20261015120000  exchange_listing_logo      <- applied 2026-10-15
```

`drop_dead_plan_tables` drops `plans` and `subscriptions`. It guards itself and
refuses if either holds a row, and `tasks/todo.md` records it as deliberately
held back — but it is named `.sql`, not `.sql.pending`, so a `db push` would
run it. That mismatch between what was decided and what the filename says is
the clearest argument in this document for applying migrations by hand.

So a migration is applied **one at a time**, through the Supabase dashboard's
SQL editor or the management API, and then verified by reading the result back:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'organizations'
  and column_name like 'logo%';
```

Reading it back matters more than it sounds. A `.sql` file is the only thing in
this repository that is never typechecked, never built and never tested — the
logo migration shipped broken and nothing noticed until somebody read it.

### `.sql.pending`

A migration named `.sql.pending` is deliberately held back and must not be run
without reading why. The on-call, autopilot and store-clock ones carry that
suffix because applying them **starts something running** on a schedule. Rename
to `.sql` to arm one, as its own decision.

---

## Deploy order, when a change spans two of them

Prefer migration → server → frontend, so each piece arrives after the thing it
depends on. Where that is awkward, the better answer is code that does not care:
`exchangeDirectory.tsx` asks for its logo columns and falls back to asking
without them, which is what kept the directory serving during the gap between
the frontend shipping and the migration running.

A hard dependency turns a missed step into an outage. A soft one turns it into a
missing logo.

---

## Still outstanding

**The Zendrop API key was pasted into a chat and is exposed.** Unless it has
been rotated since, regenerate it in Zendrop → Settings → API Access and update
the `ZENDROP_API_KEY` secret. This note predates the current document and has
not been verified as done.
