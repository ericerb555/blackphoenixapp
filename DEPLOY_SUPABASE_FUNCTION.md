# Deploy Supabase Edge Function for Investment System

The investment opportunities system is currently using localStorage as a fallback. To enable cloud synchronization and full backend functionality, you need to deploy the Supabase Edge Function.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

## Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

1. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref plzsvzwwcdopnawtiwzm
   ```

2. Deploy the edge function:
   ```bash
   supabase functions deploy server
   ```

3. Verify deployment:
   ```bash
   curl https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-57095a78/health
   ```
   
   You should see:
   ```json
   {"status":"ok","message":"Black Phoenix Server Running","timestamp":"...","version":"1.1.0"}
   ```

### Option 2: Deploy via Supabase Dashboard

1. Go to your Supabase dashboard: https://app.supabase.com/project/plzsvzwwcdopnawtiwzm

2. Navigate to **Edge Functions** in the left sidebar

3. Click **"Deploy new function"**

4. Name it: `server`

5. Copy the contents of `/workspaces/default/code/supabase/functions/server/index.tsx`

6. Paste into the editor and click **Deploy**

## What This Enables

Once deployed, the investment system will:
- ✅ Store data in Supabase database (cloud-synced)
- ✅ Auto-update stats via database triggers
- ✅ Enable Row Level Security for investor data
- ✅ Support multi-user access
- ✅ Provide real-time portfolio analytics

## Current State (Without Deployment)

The system currently works with localStorage:
- ✅ All CRUD operations work
- ✅ Data persists in browser
- ⚠️ No cloud sync (data is local only)
- ⚠️ No multi-device access

## Testing After Deployment

1. Open the app
2. Check browser console - you should see successful API calls instead of fallback warnings
3. Create/edit/delete opportunities - changes will be saved to Supabase
4. Open app in different browser/device - data should sync
