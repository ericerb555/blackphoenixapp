# Deploy Supabase Edge Function

Your data sync is now set up, but you need to deploy the Supabase Edge Function so your API endpoints work.

## Prerequisites

1. **Supabase Account**: https://supabase.com
2. **Supabase CLI**: Install it
   ```bash
   npm install -g supabase
   ```

## Step 1: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate.

## Step 2: Link Your Project

If you haven't created a Supabase project yet:
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Give it a name (e.g., "Black Phoenix")
4. Choose a region close to you
5. Set a strong database password (save it!)
6. Click "Create new project"

Then link it:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find YOUR_PROJECT_REF in your Supabase project settings under "Project Settings" → "General" → "Reference ID"

## Step 3: Deploy the Edge Function

```bash
supabase functions deploy server
```

This deploys the `supabase/functions/server/` directory as an Edge Function.

## Step 4: Get Your Supabase Credentials

After deployment, you need these values for your Vercel environment variables:

1. **SUPABASE_URL**: Found in Project Settings → API → Project URL
   - Format: `https://xxxxx.supabase.co`

2. **SUPABASE_ANON_KEY**: Found in Project Settings → API → anon/public key
   - Starts with `eyJ...`

3. **SUPABASE_SERVICE_ROLE_KEY**: Found in Project Settings → API → service_role key
   - Starts with `eyJ...`
   - ⚠️ **KEEP THIS SECRET!** Never expose it in frontend code

## Step 5: Add Environment Variables to Vercel

Go to your Vercel project:
1. Click "Settings"
2. Click "Environment Variables"
3. Add these three variables:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key

4. Make sure they're available for **Production**, **Preview**, and **Development**
5. Click "Redeploy" to apply the changes

## Step 6: Test It

After Vercel redeploys, your Vercel URL should now:
- ✅ Load company name and logo from Supabase
- ✅ Persist data across browser sessions
- ✅ Work for all users visiting your site

## How It Works

1. **On First Load (Figma Make)**:
   - You enter your company name/logo in localStorage
   - The sync function uploads it to Supabase

2. **On Vercel Deployment**:
   - App loads with empty localStorage
   - Sync function downloads company data from Supabase
   - Your branding appears automatically!

3. **Auto-Sync**:
   - Every 30 seconds, localStorage data syncs to Supabase
   - Any changes you make persist to the database

## Troubleshooting

**Function not deploying?**
```bash
supabase functions deploy server --no-verify-jwt
```

**Can't find project ref?**
- Go to Supabase Dashboard → Project Settings → General → Reference ID

**Environment variables not working?**
- Make sure you clicked "Redeploy" in Vercel after adding them
- Check they're enabled for Production environment

**Still no company data on Vercel?**
- Check browser console for sync errors
- Verify the Edge Function deployed successfully: `supabase functions list`
- Test the endpoint directly: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-57095a78/health`

## Need Help?

The deployment should take about 5-10 minutes total. If you get stuck, let me know which step is failing!
