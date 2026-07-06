# Multi-Logo Manager & Company Documents Guide

## ✅ What I Just Added

### 1. **Multi-Logo Manager** 🎨
Upload and manage **8 different logo variants** for different use cases:

| Logo Type | Use Case | Recommended Size |
|-----------|----------|------------------|
| **Primary Logo** | Main logo across the platform | Any size, transparent PNG |
| **Secondary Logo** | Alternative logo for different contexts | Any size, transparent PNG |
| **Icon/Favicon** | Browser tabs, mobile apps | 512x512px, square |
| **Square Logo** | Social media profiles (Instagram, Facebook) | 1000x1000px minimum |
| **Horizontal Logo** | Headers, banners, email signatures | Wide format |
| **Vertical Logo** | Sidebars, narrow spaces | Tall format |
| **White Logo** | For dark backgrounds | White/light on transparent |
| **Black Logo** | For light backgrounds | Black/dark on transparent |

### 2. **Company Documents Manager** 📄
Manage all your important company documents:
- Licenses
- Insurance certificates
- Certifications
- Contracts
- Policies
- Other documents

**Features:**
- ✅ Upload files (PDF, DOC, DOCX, JPG, PNG)
- ✅ Track expiration dates
- ✅ Public/private visibility settings
- ✅ Document categorization
- ✅ Download/delete capabilities
- ✅ Visual expiration warnings

### 3. **Unified Branding Center** 🏢
Everything in one place:
- All logo variants
- All company documents
- Easy-to-use interface
- Organized by tabs

---

## 🚀 How to Use

### Step 1: Access the Branding Center

1. Go to **Owners Dashboard**
2. Click the **"Branding & Documents"** tab (3rd tab in navigation)
3. You'll see the Company Branding Center

### Step 2: Upload Logos

1. In the Branding Center, you'll see **"Logo Library"** by default
2. Each logo variant has its own card
3. Click **"Upload"** on any logo type
4. Select your image file (PNG, JPG, SVG recommended)
5. Image uploads instantly and saves to database

**Tips:**
- PNG with transparency is best
- SVG files scale perfectly
- Keep files under 5MB
- Use the preview button to check your logos

### Step 3: Manage Documents

1. Click the **"Company Documents"** tab
2. Click **"Manage Documents"**
3. Click **"Upload New Document"**
4. Fill in:
   - Document name (e.g., "General Liability Insurance")
   - Document type (License, Insurance, etc.)
   - Expiration date (optional)
   - Description (optional)
   - Public visibility checkbox
5. Select your file (PDF, DOC, images)
6. Click upload

**Document Features:**
- Download any document anytime
- Toggle public/private visibility
- Set expiration dates (get warnings 30 days before)
- Delete outdated documents
- Categorize by type

---

## 📊 Database Setup (IMPORTANT!)

You need to run 2 SQL migrations in Supabase:

### Migration 1: Main Tables (If not done yet)
```sql
-- Copy from: supabase/migrations/20260502_create_companies_tables.sql
-- This creates the companies and company_documents tables
```

### Migration 2: Logo Fields (NEW)
```sql
-- Copy from: supabase/migrations/20260502_add_logo_fields.sql
-- This adds the 8 logo variant fields to companies table
```

**How to run migrations:**
1. Go to: https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/sql
2. Click SQL Editor
3. Copy the SQL from each migration file
4. Paste and click "RUN"
5. Do this for both migration files

---

## 💡 Best Practices

### Logo Best Practices:

1. **File Format:**
   - PNG with transparency (best for most uses)
   - SVG (scales perfectly, small file size)
   - Avoid JPG (no transparency)

2. **Sizing:**
   - Icon/Favicon: 512x512px minimum
   - Square: 1000x1000px minimum
   - Horizontal: At least 1000px wide
   - Others: High quality, will be auto-scaled

3. **Colors:**
   - Have white version for dark backgrounds
   - Have black version for light backgrounds
   - Primary should be full color

4. **Quality:**
   - High resolution (at least 1000px)
   - Clean edges
   - Transparent background when possible

### Document Best Practices:

1. **Naming:**
   - Be specific: "General Liability Insurance 2026"
   - Include dates in name
   - Keep it searchable

2. **Organization:**
   - Use correct document type
   - Add descriptions
   - Set expiration dates

3. **Security:**
   - Keep sensitive docs private (isPublic = false)
   - Only mark marketing/public docs as public
   - Download backups regularly

---

## 🎯 Where Your Logos Appear

Once uploaded, your logos automatically appear in:

- **Primary Logo:**
  - Landing page header
  - Email signatures
  - Invoices
  - Quotes
  - Main navigation

- **Icon:**
  - Browser favicon
  - Mobile app icon
  - Bookmarks

- **Square:**
  - Social media profiles
  - App listings
  - Directory listings

- **Horizontal:**
  - Email headers
  - Banner ads
  - Wide headers

- **White/Black:**
  - Auto-selected based on background
  - Marketing materials
  - Print materials

---

## 🔄 How Logo Syncing Works

```
Upload Logo
    ↓
Saves to Database (companies table, logo_primary field)
    ↓
Also saves to BrandingService (logo_url)
    ↓
Cached in localStorage (offline access)
    ↓
Appears everywhere automatically
```

All logos sync across:
- Landing Page Editor
- Company profiles
- Invoices
- Quotes
- Email templates
- Marketing materials

---

## 📍 Where to Find Things

| Feature | Location |
|---------|----------|
| Upload logos | Owners Dashboard → Branding & Documents → Logo Library |
| Manage documents | Owners Dashboard → Branding & Documents → Company Documents |
| Company info | Owners Dashboard → Companies tab |
| Export backup | Owners Dashboard → Settings → Export Data |
| Database migration | Owners Dashboard → Settings → Database Migration |

---

## 🆘 Troubleshooting

**Logo not showing up?**
- Check file size (under 5MB)
- Make sure it's an image file
- Try PNG format
- Refresh the page

**Document upload failed?**
- File must be under 10MB
- Accepted formats: PDF, DOC, DOCX, JPG, PNG
- Check internet connection

**Logos disappeared?**
- Run database migration
- Check Supabase for data
- Use Export/Import to restore

**Can't find branding tab?**
- Make sure you're in Owners Dashboard
- Look for "Branding & Documents" tab
- It's the 3rd tab (after Companies)

---

## 🎁 Bonus Features

**Logo Preview:**
- Click the eye icon to see full-size preview
- Test on light/dark backgrounds

**Document Expiration Alerts:**
- Yellow warning: Expires in 30 days
- Red alert: Already expired
- Automatic visual indicators

**Public Documents:**
- Can be shown on landing page
- Customer portal access
- Marketing materials

---

## 📝 Quick Start Checklist

- [ ] Run both SQL migrations in Supabase
- [ ] Go to Owners Dashboard → Branding & Documents
- [ ] Upload primary logo
- [ ] Upload icon/favicon (512x512px square)
- [ ] Upload white and black logo variants
- [ ] Switch to Company Documents tab
- [ ] Upload your business license
- [ ] Upload insurance certificate
- [ ] Set expiration dates on documents
- [ ] Export a backup (Settings → Export Data)

---

## 🎉 You're All Set!

Your branding is now:
- ✅ Stored in database (permanent)
- ✅ Multiple logo variants ready
- ✅ Documents organized and tracked
- ✅ Expiration dates monitored
- ✅ Synced across entire app
- ✅ Backed up automatically

**Need help?** Check the browser console for detailed logs or contact support with the error messages.
