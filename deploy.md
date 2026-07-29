# Deploying the backend (`make-server-3eae23a6`)

Everything in the app — Zendrop connect/sync, portal invites, the online store,
tech tiers — talks to one Supabase Edge Function called **`make-server-3eae23a6`**.
The frontend updates instantly, but this server function only changes when it's
**deployed**. Until it's deployed, the Zendrop card will show "Not connected"
because there's no live server for it to reach.

## Option A — Supabase CLI (most reliable)

Run these from your own computer (not from inside Figma Make):

```bash
# 1. Install the CLI (one time)
npm install -g supabase

# 2. Log in — this opens a browser to create a personal access token
supabase login

# 3. Deploy the function.
#    --no-verify-jwt matters: this function does its own auth internally.
supabase functions deploy make-server-3eae23a6 \
  --project-ref plzsvzwwcdopnawtiwzm \
  --no-verify-jwt
```

When it finishes, you'll see a success line with the function URL:
`https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6`

## Verify it's live

Open this URL in your browser (or curl it):

```
https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/health
```

You should get:

```json
{ "status": "ok", "message": "Black Phoenix Server Running", "version": "2.0.0" }
```

## After deploy

1. Open the **Dropshippers** area in the app.
2. The Zendrop card auto-connects using your saved `ZENDROP_API_KEY` secret and
   imports products — no key entry needed.
3. Click **Sync Catalog** anytime to refresh the store.

## Security note

The Zendrop API key you pasted in chat is exposed. Once everything works,
regenerate it in Zendrop → Settings → API Access, then update the
`ZENDROP_API_KEY` secret with the new value.
