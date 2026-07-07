# ✅ Deployment Checklist

Use this checklist to ensure your Business Hub is fully deployed and operational.

---

## 📦 Pre-Deployment

- [ ] Exported project from Figma Make
- [ ] Extracted ZIP file to local folder
- [ ] Opened terminal/command prompt
- [ ] Navigated to project folder (`cd /path/to/project`)

---

## 🛠️ Setup Supabase CLI

- [ ] Installed Supabase CLI
  - macOS: `brew install supabase/tap/supabase`
  - Windows: `scoop install supabase`
  - NPM: `npm install -g supabase`
- [ ] Verified installation: `supabase --version`
- [ ] Logged in: `supabase login`
- [ ] Successfully authenticated in browser

---

## 🔗 Link Project

- [ ] Ran: `supabase link --project-ref plzsvzwwcdopnawtiwzm`
- [ ] Entered database password
- [ ] Confirmed: "Linked to project plzsvzwwcdopnawtiwzm"

---

## 🔐 Environment Variables

### Required Secrets

- [ ] **SUPABASE_URL** - Set automatically by script
- [ ] **SUPABASE_ANON_KEY** - Set automatically by script
- [ ] **SUPABASE_SERVICE_ROLE_KEY** - ⚠️ **REQUIRED!**
  - Get from: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/settings/api
  - Copy the `service_role` key
  - Set via: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key`

### Optional Secrets

- [ ] **SUPABASE_DB_URL** (recommended)
  - Get from: Dashboard > Settings > Database > Connection String > URI
  
- [ ] **OPENAI_API_KEY** (for AI features)
  - Get from: https://platform.openai.com/api-keys
  
- [ ] **RESEND_API_KEY** (for email notifications)
  - Get from: https://resend.com/api-keys
  
- [ ] **TWILIO_ACCOUNT_SID** (for SMS)
  - Get from: https://console.twilio.com
- [ ] **TWILIO_AUTH_TOKEN**
- [ ] **TWILIO_PHONE_NUMBER**

- [ ] **GRAINGER_API_KEY** (for product sourcing)
- [ ] **HOME_DEPOT_API_KEY**
- [ ] **LOWES_API_KEY**

- [ ] **ADMIN_NOTIFICATION_PHONES** (comma-separated)
- [ ] **COMPANY_NAME**

### Verify Secrets

- [ ] Ran: `supabase secrets list`
- [ ] Confirmed all required secrets are set
- [ ] No secrets show as "not set"

---

## 🚀 Deploy Edge Function

- [ ] Made scripts executable (macOS/Linux): `chmod +x deploy.sh set-secrets.sh`
- [ ] Ran deployment: `./deploy.sh` or `deploy.bat`
- [ ] Saw "✅ DEPLOYMENT SUCCESSFUL!"
- [ ] Noted function URL in output

---

## ✅ Verify Deployment

### Test Health Endpoint

- [ ] **Browser Test:**
  - Opened: `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health`
  - Saw JSON response with `"status": "ok"`

- [ ] **Terminal Test:**
  ```bash
  curl https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o"
  ```
  - Saw successful response

### Check Function Logs

- [ ] Ran: `supabase functions logs server`
- [ ] Saw startup messages
- [ ] No critical errors visible
- [ ] Confirmed routers are loaded

---

## 🎯 Test Application

### Open App

- [ ] Opened Figma Make preview OR deployed frontend
- [ ] App loaded without errors
- [ ] Command Center is visible

### Check Console

- [ ] Opened browser DevTools (F12)
- [ ] Navigated to Console tab
- [ ] Looked for: `✅ Server health check PASSED`
- [ ] No red error messages about server connection

### Test Database Connection

- [ ] Navigated to **Business Profiles Hub** (Company Profile)
- [ ] Created a test company
  - [ ] Filled in company name
  - [ ] (Optional) Uploaded logo
  - [ ] Saved successfully
- [ ] Saw success toast notification
- [ ] Company appears in list

### Test Data Persistence

- [ ] Refreshed the browser (F5)
- [ ] Test company still appears
- [ ] All data preserved (name, logo, etc.)
- [ ] ✅ **DATABASE IS WORKING!**

---

## 🔄 Optional: Frontend Deployment

### Choose a Platform

- [ ] **Vercel** (Recommended)
  ```bash
  npm install -g vercel
  vercel login
  vercel
  ```

- [ ] **Netlify**
  ```bash
  npm install -g netlify-cli
  netlify login
  netlify deploy --prod
  ```

- [ ] **Static Hosting**
  ```bash
  npm run build
  # Upload /dist folder
  ```

### Verify Frontend

- [ ] App accessible at public URL
- [ ] All features working
- [ ] Backend connection successful
- [ ] SSL certificate active (HTTPS)

---

## 📊 Post-Deployment Monitoring

### Check Metrics

- [ ] Opened Supabase Dashboard
- [ ] Navigated to Edge Functions > server
- [ ] Checked invocation count
- [ ] Reviewed error rate (should be 0% or very low)

### Review Logs

- [ ] Ran: `supabase functions logs server --follow`
- [ ] Used app features
- [ ] Observed logs in real-time
- [ ] Confirmed requests are logging properly

### Test Key Features

- [ ] **Authentication**
  - [ ] Sign up works
  - [ ] Sign in works
  - [ ] User session persists

- [ ] **Company Management**
  - [ ] Create company
  - [ ] Update company
  - [ ] Switch companies
  - [ ] Delete company

- [ ] **Project Pipeline**
  - [ ] Create project
  - [ ] Update status
  - [ ] View pipeline

- [ ] **Quote Generation** (if OpenAI key set)
  - [ ] Upload blueprint
  - [ ] Generate quote
  - [ ] Review results

- [ ] **Vendor Integration** (if API keys set)
  - [ ] Search products
  - [ ] View product details

---

## 🐛 Troubleshooting Checklist

If something isn't working:

- [ ] Checked function logs: `supabase functions logs server`
- [ ] Verified all secrets: `supabase secrets list`
- [ ] Tested health endpoint in browser
- [ ] Checked browser console for errors
- [ ] Cleared browser cache and cookies
- [ ] Tried in incognito/private mode
- [ ] Redeployed function: `./deploy.sh`

---

## 🎉 Launch Checklist

Ready to go live?

- [ ] All core features tested
- [ ] Database persisting data correctly
- [ ] Frontend deployed to production URL
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] All integrations working (payment, email, SMS)
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] Team trained on using the platform
- [ ] User documentation prepared

---

## 📝 Notes

**Project Info:**
- Project ID: `plzsvzwwcdopnawtiwzm`
- Function Name: `server`
- Route Prefix: `/make-server-824f083c`

**Important URLs:**
- Dashboard: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm
- Health: https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server/make-server-824f083c/health
- API Base: https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server

**Deployment Date:** _________________

**Deployed By:** _________________

**Notes:**
________________________________________________________________
________________________________________________________________
________________________________________________________________

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] App fully functional
- [ ] Ready for production use
- [ ] Team notified
- [ ] **🎉 LAUNCH SUCCESSFUL!**

---

**Congratulations! Your Business Hub is live!** 🚀
