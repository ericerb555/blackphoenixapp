# Data Persistence System - Deployment Instructions

## 🚨 **IMPORTANT: Server Deployment Required**

The Data Persistence system has been implemented but requires **one final step** to become fully operational:

### **The server must be redeployed to Supabase**

---

## ✅ **What's Been Implemented:**

### **Frontend (Already Active):**
- ✅ Auto-backup system running every 30 seconds
- ✅ Auto-restore on page load if data is missing
- ✅ localStorage monitoring for deletions
- ✅ Manual backup/restore controls in Owner's Dashboard → Settings
- ✅ Data persistence diagnostics panel

### **Backend (Needs Deployment):**
- ✅ Data backup router created: `/supabase/functions/server/data-backup.tsx`
- ✅ Routes registered in server index
- ⚠️ **NOT YET DEPLOYED** to Supabase

---

## 🔧 **How to Deploy the Server**

### **Option 1: Supabase CLI (Recommended)**

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the server function
supabase functions deploy server

# OR deploy all functions
supabase functions deploy
```

### **Option 2: Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project: `plzsvzwwcdopnawtiwzm`
3. Navigate to **Edge Functions**
4. Find the `server` function
5. Click **Deploy** or **Redeploy**

### **Option 3: Git Push (if configured)**

If you have automatic deployments configured:

```bash
git add .
git commit -m "Add data persistence system"
git push
```

---

## 📋 **Available Endpoints (After Deployment)**

Once deployed, these endpoints will be active:

- **Health Check:**
  ```
  GET https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-824f083c/data/health
  ```

- **Backup Data:**
  ```
  POST https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-824f083c/data/backup
  ```

- **Restore Data:**
  ```
  GET https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-824f083c/data/restore
  ```

- **List Backups:**
  ```
  GET https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-824f083c/data/backups
  ```

---

## 🧪 **Test After Deployment**

After deploying, you can test the system:

### **1. Check Server Health:**

Open browser console and run:

```javascript
fetch('https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-824f083c/data/health')
  .then(r => r.json())
  .then(d => console.log('Health check:', d));
```

Expected response:
```json
{
  "status": "ok",
  "service": "data-backup",
  "timestamp": "2026-04-21T..."
}
```

### **2. View Diagnostics Panel:**

1. Go to **Owner's Dashboard** → **Settings Tab**
2. Scroll to **Data Persistence Status** panel
3. Click **Refresh** button
4. All indicators should show green ✅

### **3. Test Manual Backup:**

1. In Owner's Dashboard → Settings → **Data Backup & Recovery**
2. Click **"Backup Now"** button
3. Should see success message: "✅ Data backed up successfully!"

---

## ⚠️ **Current Behavior (Before Deployment)**

**Right now, without deployment:**
- ❌ Backups fail with 404 errors (endpoint doesn't exist)
- ❌ Auto-restore won't work
- ✅ Data is still safe in localStorage (browser storage)
- ✅ Manual export/import to files still works

**After deployment:**
- ✅ Full automatic backup every 30 seconds
- ✅ Automatic restore if data is lost
- ✅ All features operational

---

## 📊 **How the System Works (After Deployment)**

### **Automatic Protection:**

1. **Every 30 seconds:** All localStorage data → Supabase database
2. **On page load:** Check if data exists → If not, restore from database
3. **Before unload:** Final backup before closing page
4. **On deletion:** Detect localStorage.clear() → Auto-restore

### **Manual Controls:**

- **Backup Now** - Force immediate backup to database
- **Restore Latest** - Restore from latest database backup
- **Export to File** - Download JSON backup file
- **Import from File** - Restore from JSON file

---

## 🎯 **What Data is Protected:**

### **Critical Data:**
- companyData
- company_primary
- companies_offline
- currentUserProfile
- userProfiles
- materials
- customers
- invoices
- projects
- employees

### **ALL Data:**
Actually, **everything** in localStorage is backed up, not just critical keys!

---

## 🔍 **Troubleshooting**

### **"404 Not Found" errors:**
→ Server hasn't been deployed yet. Follow deployment steps above.

### **"No backup found in database":**
→ Normal on first run. The system will create a backup within 30 seconds.

### **Diagnostics show "Offline":**
→ Server needs deployment or check internet connection.

---

## ✅ **Deployment Checklist**

- [ ] Deploy server to Supabase
- [ ] Test health endpoint
- [ ] Check diagnostics panel (all green)
- [ ] Test manual backup
- [ ] Verify auto-backup after 30 seconds
- [ ] Test restore functionality

---

## 🎉 **After Successful Deployment**

Your data will be **fully protected** with:
- ✅ Automatic backups every 30 seconds
- ✅ Auto-recovery from data loss
- ✅ 10 version history
- ✅ Manual backup/restore controls
- ✅ Export/import capabilities
- ✅ Real-time monitoring

**Your data loss problem will be completely solved!** 🚀
