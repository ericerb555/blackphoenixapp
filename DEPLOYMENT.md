# Deployment Guide - Black Phoenix Builds

## Your Supabase Project
- **Project ID**: `plzsvzwwcdopnawtiwzm`
- **Project URL**: `https://plzsvzwwcdopnawtiwzm.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm`

---

## Step 1: Deploy Supabase Edge Functions ✅

Your backend server code needs to be deployed to Supabase.

### Install Supabase CLI

```bash
npm install -g supabase
```

### Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate with Supabase.

### Link to Your Project

```bash
supabase link --project-ref plzsvzwwcdopnawtiwzm
```

### Deploy the Edge Function

```bash
supabase functions deploy server
```

This deploys your entire backend server to:
`https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server`

### Set Environment Variables in Supabase

You need to add the API keys you've already provided as Supabase secrets:

```bash
# Set each secret (you already provided these values)
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set GRAINGER_API_KEY=your-key
supabase secrets set HOME_DEPOT_API_KEY=your-key
supabase secrets set LOWES_API_KEY=your-key
supabase secrets set RESEND_API_KEY=your-key
supabase secrets set TWILIO_ACCOUNT_SID=your-sid
supabase secrets set TWILIO_AUTH_TOKEN=your-token
supabase secrets set TWILIO_PHONE_NUMBER=your-number
supabase secrets set ADMIN_NOTIFICATION_PHONES=your-numbers
supabase secrets set COMPANY_NAME="Black Phoenix Builds"
```

---

## Step 2: Deploy Frontend to Vercel 🚀

### Option A: Deploy via Vercel CLI (Fastest)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Choose your account
- Link to existing project? **No**
- Project name? **black-phoenix-builds** (or your choice)
- Directory? **./` (current directory)
- Override settings? **No**

3. **Deploy to Production**
```bash
vercel --prod
```

### Option B: Deploy via GitHub + Vercel (Recommended for CI/CD)

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Name: `black-phoenix-builds`
   - Make it private
   - Don't initialize with README (you already have code)

2. **Push Code to GitHub**
```bash
git remote add origin https://github.com/YOUR-USERNAME/black-phoenix-builds.git
git branch -M main
git push -u origin main
```

3. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import from GitHub
   - Select `black-phoenix-builds`
   - Click "Deploy"

---

## Step 3: Configure Environment Variables in Vercel

In Vercel dashboard → Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=https://plzsvzwwcdopnawtiwzm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o
```

---

## Step 4: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://black-phoenix-builds.vercel.app`)
2. Create an account (first user becomes owner automatically)
3. Test features:
   - Sign up/Sign in
   - Customer portal
   - Command Center (for owners)
   - Data persistence

---

## Making Updates After Deployment

### Quick Updates (via CLI)
```bash
# Make your changes in Figma Make or locally
# Test them
vercel --prod  # Deploy immediately
```

### Via GitHub (Automatic)
```bash
# Make your changes
git add .
git commit -m "Your change description"
git push  # Automatically deploys to Vercel
```

### Rollback if Needed
In Vercel dashboard → Deployments → Click "..." → Promote to Production (on any previous version)

---

## Monitoring & Management

### Supabase Dashboard
- **URL**: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm
- View database, auth users, edge function logs
- Monitor API usage

### Vercel Dashboard  
- **URL**: https://vercel.com/dashboard
- View deployments, analytics, logs
- Manage domains, environment variables

---

## Custom Domain Setup (Optional)

### In Vercel:
1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.blackphoenixbuilds.com`)
3. Follow DNS configuration instructions

---

## Troubleshooting

### If deployment fails:
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Make sure Supabase functions are deployed

### If features don't work:
1. Check browser console for errors
2. Verify API keys in Supabase secrets
3. Check Supabase Edge Function logs

---

## Cost Estimate

**Current Setup (Free Tier):**
- Vercel: Free (100GB bandwidth, unlimited builds)
- Supabase: Free (500MB database, 2GB bandwidth, 500K edge function invocations)

**When to Upgrade:**
- 1000+ active users
- 10GB+ database
- Heavy API usage

---

## Need Help?

Commands to run in this order:
```bash
# 1. Deploy backend
supabase login
supabase link --project-ref plzsvzwwcdopnawtiwzm
supabase functions deploy server

# 2. Deploy frontend
vercel --prod

# Done! 🎉
```
