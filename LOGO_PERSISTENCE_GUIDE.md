# Logo Persistence Guide

## Your Logo is Safe! ✅

Your Black Phoenix Company logo is already configured and will persist on the landing page. Here's how it works:

---

## How the Logo System Works

### 1. **Storage Locations**
Your logo is stored in multiple places for redundancy:
- **Database** (Supabase `companies` table) - Primary source
- **localStorage** (`company_branding_profile`) - Fast access cache
- **File System** (`/src/imports/_47E102CA-EE45-49F2-83C8-656C19BFAA58_.png`) - 198KB backup

### 2. **Auto-Loading on Landing Page**
The DirectoryLandingPage automatically:
1. Loads logo from localStorage (instant display)
2. Syncs from database in background
3. Updates if any changes detected
4. Listens for branding updates in real-time

### 3. **Logo Display Locations**
Your logo appears in **2 places** on the landing page:
- **Bouncing intro animation** - Shows when page loads
- **Hero section** - Main logo in center of page

---

## Verifying Your Logo is Loaded

### Check in Browser Console

1. Open your landing page
2. Press F12 to open Developer Tools
3. Look for these console messages:
   ```
   ✅ [Landing] Logo loaded from cache (XXX KB)
   ✅ [BrandingInit] Branding profile already exists with logo
   ```

### Check localStorage

In the browser console, run:
```javascript
JSON.parse(localStorage.getItem('company_branding_profile'))
```

You should see:
```javascript
{
  company_name: "The Black Phoenix Company",
  logo_url: "data:image/png;base64,iVBOR..." // Long base64 string
  primary_color: "#ea580c",
  secondary_color: "#f97316"
}
```

---

## If Logo is Missing

### Option 1: Automatic Upload (Easiest)

Your logo file is already in the project at:
`/src/imports/_47E102CA-EE45-49F2-83C8-656C19BFAA58_.png`

To upload it automatically:

1. Open your app in the browser
2. Press F12 to open console
3. Run this command:
   ```javascript
   window.uploadLogoFromImports()
   ```
4. Wait for success message:
   ```
   ✅ [UploadLogo] Logo uploaded successfully
   ```
5. Refresh the page

### Option 2: Manual Upload via Company Settings

1. Log in to your app
2. Navigate to **Company Setup** or **Settings**
3. Upload your logo file directly
4. System will automatically:
   - Save to database
   - Update localStorage
   - Trigger refresh across all pages

### Option 3: Force Sync from Database

If logo is in database but not showing:

```javascript
// In browser console
window.autoSyncBranding()
```

Then refresh the page.

---

## Logo Variants Supported

The system supports multiple logo variations:
- `logo_primary` - Main logo (used on landing page)
- `logo_secondary` - Alternative logo
- `logo_icon` - Small icon version
- `logo_square` - Square format
- `logo_horizontal` - Horizontal layout
- `logo_vertical` - Vertical layout
- `logo_white` - White version (for dark backgrounds)
- `logo_black` - Black version (for light backgrounds)

---

## Persistence Guarantees

Your logo will persist because:

✅ **Database Storage**: Permanent storage in Supabase
✅ **Auto-Sync**: Runs automatically on every page load
✅ **localStorage Cache**: Fast loading from browser cache
✅ **Event Listeners**: Detects and applies changes immediately
✅ **Fallback System**: If one source fails, others take over
✅ **Cross-Tab Sync**: Updates across all open browser tabs

---

## Testing Logo Persistence

### Test 1: Page Refresh
1. Refresh the landing page
2. Logo should appear immediately from cache
3. Check console for: `✅ [Landing] Logo loaded from cache`

### Test 2: Clear Cache & Reload
1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete)
2. Clear cached images and files
3. Reload page
4. Logo should reload from database
5. Check console for: `✅ [Landing] Logo loaded after sync`

### Test 3: New Browser Tab
1. Open landing page in new tab
2. Logo should appear immediately
3. Both tabs should show same logo

---

## Debug Tools Available

Run these in browser console for diagnostics:

```javascript
// Check logo loading flow
window.debugLogoFlow()

// Upload logo from imports folder
window.uploadLogoFromImports()

// Force sync from database
window.autoSyncBranding()

// View current branding profile
JSON.parse(localStorage.getItem('company_branding_profile'))

// View logo variants
JSON.parse(localStorage.getItem('company_logo_variants'))
```

---

## Common Issues & Solutions

### Logo Doesn't Appear
**Solution**: Run `window.uploadLogoFromImports()` in console

### Logo Appears Then Disappears
**Solution**: Check database connection, run `window.autoSyncBranding()`

### Different Logo on Different Pages
**Solution**: Clear localStorage, run auto-sync, refresh all pages

### Logo is Blurry/Low Quality
**Solution**: Upload higher resolution version (recommended 512x512px minimum)

---

## File Locations Reference

```
Logo System Files:
├── Logo File: /src/imports/_47E102CA-EE45-49F2-83C8-656C19BFAA58_.png (198KB)
├── Landing Page: /src/app/pages/DirectoryLandingPage.tsx (lines 309-318, 408-417)
├── Auto-Sync: /src/app/utils/autoSyncBranding.ts
├── Initialize: /src/app/utils/initializeBrandingProfile.ts
├── Upload Tool: /src/app/utils/debugLogoFlow.ts
└── Database: Supabase companies table (logo_primary, logo_url columns)
```

---

## Support

If you continue to experience issues:

1. **Check browser console** for error messages
2. **Run debug tools** listed above
3. **Verify database connection** (check Supabase dashboard)
4. **Test in incognito mode** to rule out extension conflicts

---

**Your logo is already configured and will persist automatically!** ✨

The system has multiple redundancies to ensure it always displays correctly.
