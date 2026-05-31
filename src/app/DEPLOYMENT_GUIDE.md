# 🚀 Supabase Edge Function Deployment Guide

## Quick Start

Your Business Hub application is ready to deploy! Follow these steps to get your Supabase Edge Function live.

---

## 📋 Prerequisites

- ✅ Supabase account (already set up)
- ✅ Project ID: `plzsvzwwcdopnawtiwzm`
- ✅ All code exported from Figma Make

---

## 🔧 Step-by-Step Deployment

### 1️⃣ Export Your Project

1. Click **"Export"** button in Figma Make (top right)
2. Download and extract the ZIP file
3. Open terminal in the extracted folder

### 2️⃣ Install Supabase CLI

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows (Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**NPM (all platforms):**
```bash
npm install -g supabase
```

**Verify:**
```bash
supabase --version
```

### 3️⃣ Login to Supabase

```bash
supabase login
```

### 4️⃣ Link Your Project

```bash
cd /path/to/your/exported/project
supabase link --project-ref plzsvzwwcdopnawtiwzm
```

Enter your database password when prompted.

### 5️⃣ Deploy the Edge Function

```bash
supabase functions deploy server
```

Expected output:
```
✓ Function URL: https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server
✓ Deployed version: 1
✓ Status: ACTIVE
```

### 6️⃣ Set Environment Variables

**Required secrets:**

```bash
# Supabase credentials
supabase secrets set SUPABASE_URL=https://plzsvzwwcdopnawtiwzm.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o

# Get service role key from: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/settings/api
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database URL (from Supabase Dashboard > Settings > Database > Connection String > URI)
supabase secrets set SUPABASE_DB_URL=your_db_url_here
```

**API Keys (already configured):**

```bash
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set GRAINGER_API_KEY=your_key
supabase secrets set HOME_DEPOT_API_KEY=your_key
supabase secrets set LOWES_API_KEY=your_key
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set TWILIO_ACCOUNT_SID=your_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=your_phone
supabase secrets set ADMIN_NOTIFICATION_PHONES=your_admin_phones
supabase secrets set COMPANY_NAME=your_company_name
```

### 7️⃣ Test the Deployment

**Browser test:**
Open this URL:
```
https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health
```

**Terminal test:**
```bash
curl https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o"
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "Figma Make Server is running - HEALTHY",
  "version": "4.5-MEDIA-LIBRARY-DEPLOYED",
  "deployed": true,
  "projectId": "plzsvzwwcdopnawtiwzm"
}
```

---

## 🎯 Post-Deployment

### Re-enable Debug Mode (Optional)

To see logs again, edit `/components/BusinessProfilesHub.tsx`:

Change line 39:
```typescript
const DEBUG_MODE = false;  // Change to true
```

### Verify Data Sync

1. Open your app in the browser
2. Open browser console (F12)
3. You should see: `✅ Server health check PASSED`
4. Create a new company - it will save to the database!
5. Refresh the page - your data should persist

---

## 🐛 Troubleshooting

### "404 Not Found" on health endpoint

**Cause:** Function not deployed or wrong URL

**Fix:**
```bash
supabase functions deploy server --no-verify-jwt
```

### "Authorization error"

**Cause:** Missing or invalid service role key

**Fix:** Get the service role key from:
https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/settings/api

Then set it:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_actual_key
```

### "Function crashes on startup"

**Cause:** Missing environment variables

**Fix:** Check function logs:
```bash
supabase functions logs server
```

Look for which ENV variable is missing and set it.

### View Real-time Logs

```bash
supabase functions logs server --follow
```

---

## 📦 Database Setup (KV Store)

The app uses a key-value store table that's already configured in your code. After deployment, the server will automatically create the table on first use.

**No manual database setup required!** ✨

---

## 🌐 Frontend Deployment (Optional)

After the backend is deployed, you can deploy the frontend to:

- **Vercel** (recommended)
- **Netlify**
- **Cloudflare Pages**

### Vercel Deployment

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts. Your app will be live in minutes!

---

## ✅ Success Checklist

- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] Edge function deployed
- [ ] All environment variables set
- [ ] Health endpoint returns 200 OK
- [ ] App successfully connects to database
- [ ] Companies data persists across refreshes
- [ ] (Optional) Frontend deployed to Vercel/Netlify

---

## 🆘 Need Help?

If you encounter issues:

1. Check function logs: `supabase functions logs server`
2. Verify all secrets are set: `supabase secrets list`
3. Test the health endpoint in browser
4. Check browser console for frontend errors

---

## 🎉 You're Done!

Once deployed, your Business Hub will:
- ✅ Save all data to Supabase database
- ✅ Sync across devices
- ✅ Support multi-tenant companies
- ✅ Handle authentication
- ✅ Process payments
- ✅ Generate quotes with AI
- ✅ Manage vendor integrations
- ✅ And much more!

**Welcome to production!** 🚀
