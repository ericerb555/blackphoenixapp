# Clear Browser Cache - Instructions

The application has been updated with new features. **You MUST clear your browser cache** to see the changes.

## ✅ **FIXED Issues:**

1. ✅ **Customer Documents Page** - Now fully functional
2. ✅ **DataPersistence Timeout** - Reduced timeout warnings
3. ✅ **Role Switcher** - No more blinking/redirect loops

## 🔥 **IMPORTANT: Clear Cache NOW**

### **Method 1: Hard Refresh (Easiest)**
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cached images and files"**
3. Select **"All time"**
4. Click **"Clear data"**
5. Then press `Ctrl + F5` or `Cmd + Shift + R` to reload

### **Method 2: DevTools (Most Reliable)**
1. Press `F12` to open Developer Tools
2. Right-click the **Reload button** (next to address bar)
3. Select **"Empty Cache and Hard Reload"**

### **Method 3: Incognito Window (For Testing)**
1. Open an **Incognito/Private** window
2. Navigate to your app URL
3. This completely bypasses cache

## 📋 **New Bundle Info:**

- **New Bundle**: `main-z3DmEHYk-1777815109752.js`
- **Old Bundle**: `main-BkXsPkj5-1777814967345.js` (cached in your browser)

If you still see errors, your browser is loading the old bundle!

## 🧪 **How to Verify It's Working:**

After clearing cache, open browser console and look for:
```
🔍 Looking for: customer-documents
🔍 Route exists in pageMap? true
🔍 Component type: function
✅ Page component found: customer-documents
```

If you see `❌ Page component not found`, **you still have old cached files!**

## 🎯 **What to Test:**

1. **Role Switcher** - Switch between different roles (should work smoothly)
2. **Customer Documents** - Go to Financial > Customer Documents
3. **Portal Upgrades** - Switch to Vendor/Advertiser/Subcontractor and click premium features

---

**Current Version**: 1.0.1  
**Build Date**: 2026-05-03T13:30:00Z
