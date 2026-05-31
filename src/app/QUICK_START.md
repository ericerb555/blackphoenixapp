# ⚡ Quick Start - Deploy in 5 Minutes

## 🎯 Goal
Get your Business Hub app from Figma Make to production on Supabase.

---

## 📦 What You Need

1. ✅ Your exported Figma Make project (download the ZIP)
2. ✅ Terminal/Command Prompt access
3. ✅ Supabase Service Role Key (we'll get this in Step 3)

---

## 🚀 5-Minute Deployment

### Step 1️⃣: Extract & Navigate (30 seconds)

```bash
# Extract the downloaded ZIP file
# Open terminal and navigate to the folder
cd /path/to/your/extracted/project
```

### Step 2️⃣: Install Supabase CLI (1 minute)

**Choose your platform:**

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
# Install Scoop first if needed: https://scoop.sh
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Any platform (NPM):**
```bash
npm install -g supabase
```

**Verify:**
```bash
supabase --version
```

### Step 3️⃣: Get Your Service Role Key (1 minute)

1. Open: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/settings/api
2. Scroll to **Project API keys**
3. Find **`service_role`** key
4. Click the eye icon to reveal it
5. **Copy it** (you'll paste it in Step 5)

⚠️ **Keep this secret!** Don't share it publicly.

### Step 4️⃣: Login & Deploy (2 minutes)

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref plzsvzwwcdopnawtiwzm

# Make scripts executable (macOS/Linux only)
chmod +x deploy.sh set-secrets.sh

# Set required secrets
./set-secrets.sh
# (On Windows, run: bash set-secrets.sh)
```

When prompted, paste your **Service Role Key** from Step 3.

Skip the optional keys for now (just press Enter).

### Step 5️⃣: Deploy! (1 minute)

```bash
./deploy.sh
# (On Windows, run: bash deploy.sh)
```

You should see:
```
✅ DEPLOYMENT SUCCESSFUL!
📍 Function URL: https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server
```

---

## ✅ Verify It's Working

### Test the Health Endpoint

**Option A: Browser**
Open this URL:
```
https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health
```

**Option B: Terminal**
```bash
curl https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o"
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Figma Make Server is running - HEALTHY",
  "version": "4.5-MEDIA-LIBRARY-DEPLOYED",
  "deployed": true
}
```

✅ **If you see this, YOU'RE LIVE!** 🎉

---

## 🎯 Test Your App

1. **Open your Figma Make preview** (or exported app)
2. **Open browser console** (F12)
3. **Look for:** `✅ Server health check PASSED`
4. **Create a company** in the Business Profiles Hub
5. **Refresh the page** - your data should persist!

---

## 🐛 Troubleshooting

### "404 Not Found"

The function URL might be slightly different. Try:

```bash
supabase functions deploy server --no-verify-jwt
```

### "Authorization error"

Your Service Role Key might be incorrect. Reset it:

```bash
# Get the key again from Supabase Dashboard
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_actual_key
```

### "Function not starting"

Check the logs:

```bash
supabase functions logs server
```

Look for which environment variable is missing.

### Still stuck?

View real-time logs:

```bash
supabase functions logs server --follow
```

Then try to use your app and watch the logs.

---

## 📚 What's Next?

### Deploy Your Frontend (Optional)

**Vercel (Recommended):**
```bash
npm install -g vercel
vercel login
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify login
netlify deploy
```

### Add More Features

Your app already has:
- ✅ Multi-tenant company management
- ✅ Role-based access control
- ✅ AI quote generation
- ✅ Vendor integrations
- ✅ Payment processing
- ✅ And 60+ other features!

**Explore the features** in the Command Center!

### Enable Optional Services

Go back and set up:
- 🤖 **OpenAI** for AI features
- 📧 **Resend** for email notifications
- 📱 **Twilio** for SMS alerts
- 🏪 **Vendor APIs** for product sourcing

Run `./set-secrets.sh` again to add them.

---

## 🆘 Need Help?

1. Check `/DEPLOYMENT_GUIDE.md` for detailed instructions
2. View function logs: `supabase functions logs server`
3. Test individual endpoints in the browser
4. Check browser console for frontend errors

---

## 🎉 Congratulations!

Your Business Hub is now live on Supabase! 

**What you just deployed:**
- ✅ Production-ready backend API
- ✅ Multi-tenant database
- ✅ Authentication system
- ✅ 40+ API endpoints
- ✅ AI-powered features
- ✅ Enterprise-grade security

**You're ready for business!** 🚀

---

## 📊 Monitor Your App

**View logs:**
```bash
supabase functions logs server --follow
```

**Check secrets:**
```bash
supabase secrets list
```

**Update function:**
```bash
./deploy.sh
```

---

**Happy building! 🎨**
