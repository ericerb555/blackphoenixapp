# Windows Deployment Instructions

## Step 0: Download Your Code

**First, you need to get this code from Figma Make to your computer:**

1. In Figma Make, click the **"Export"** or **"Download"** button (if available)
2. Or use the file explorer to download all files

**Alternative**: If you can't download from Figma Make, I can help you push this to GitHub first.

## Step 1: Install Prerequisites

### Install Node.js (if not already installed)
1. Download from https://nodejs.org/
2. Run the installer
3. Restart PowerShell after installation

### Verify Installation
Open PowerShell and run:
```powershell
node --version
npm --version
```

## Step 2: Open PowerShell in Your Project Folder

1. Navigate to where you downloaded the code
2. **Right-click** in the folder
3. Select **"Open in Terminal"** or **"Open PowerShell window here"**

Or manually navigate:
```powershell
cd C:\path\to\black-phoenix-builds
```

## Step 3: Run the Deployment Script

```powershell
.\deploy.ps1
```

If you get an error about execution policy, run this first:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run:
```powershell
.\deploy.ps1
```

## Step 4: Follow the Prompts

The script will:

1. **Install Supabase CLI** (if needed)
   - Will install automatically via npm

2. **Install Vercel CLI** (if needed)
   - Will install automatically via npm

3. **Login to Supabase**
   - Browser window will open
   - Login with your Supabase account
   - Return to PowerShell

4. **Deploy Backend**
   - Uploads Edge Functions to Supabase
   - Takes ~1-2 minutes

5. **Login to Vercel**
   - Browser window will open
   - Login with GitHub/GitLab/Email
   - Return to PowerShell

6. **Deploy Frontend**
   - You'll be asked:
     - Project name: `black-phoenix-builds`
     - Directory: Just press Enter (current directory)
     - Override settings: `N` (No)
   - Takes ~2-3 minutes

## Step 5: Done! 🎉

You'll see output like:
```
✅ Deployment Complete!

Preview: https://black-phoenix-builds-abc123.vercel.app
Production: https://black-phoenix-builds.vercel.app
```

Visit the Production URL to see your live app!

---

## Alternative: Manual Commands (Step by Step)

If the script doesn't work, run these commands one by one:

### 1. Install CLI Tools
```powershell
npm install -g supabase vercel
```

### 2. Login to Supabase
```powershell
supabase login
```

### 3. Link Supabase Project
```powershell
supabase link --project-ref plzsvzwwcdopnawtiwzm
```

### 4. Deploy Backend
```powershell
supabase functions deploy server
```

### 5. Deploy Frontend
```powershell
vercel --prod
```

---

## Troubleshooting

### "execution policy" Error
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### "command not found" After Installing
Close and reopen PowerShell, then try again.

### "npm not found"
Install Node.js from https://nodejs.org/ and restart PowerShell.

### Deployment Fails
- Check internet connection
- Make sure you're in the correct folder
- Verify you're logged into Supabase and Vercel

---

## Need Help?

Run commands one-by-one using the "Alternative: Manual Commands" section above to see exactly where it fails.
