# Check Logo Status - Quick Diagnostic

Your landing page isn't showing the logo. Let's debug this step-by-step.

## Step 1: Open Browser Console

1. Go to your landing page
2. Press **F12** (or Cmd+Option+J on Mac)
3. Click the **Console** tab

## Step 2: Check What's in the Database

Run this command in the console:

```javascript
// Check database for logo
const { data, error } = await supabase.from('companies').select('logo_url, logo_primary, company_name').limit(1);
console.log('Company:', data);
console.log('Has logo_primary:', !!data?.[0]?.logo_primary);
console.log('Has logo_url:', !!data?.[0]?.logo_url);
```

### Expected Results:

**If you see:**
- `Has logo_primary: true` ✅ Logo exists! Skip to Step 4
- `Has logo_primary: false` and `Has logo_url: false` ❌ No logo uploaded yet → Go to Step 3

---

## Step 3: Upload Your Logo to Database

You mentioned you uploaded a logo to your company profile. Let's make sure it's saved to the database.

### Option A: Use the Company Settings Page

1. Log in to your app
2. Go to **Company Settings** or **Profile Settings**
3. Re-upload your Black Phoenix logo
4. Save/Submit
5. Refresh the landing page

### Option B: Use Debug Tool (Quick Fix)

Run this in the console:

```javascript
// This will try to upload the logo from your existing profile
await window.forceUploadLogo()
```

Wait for the success message, then refresh the page.

---

## Step 4: Verify Logo is Loading

After ensuring the logo is in the database, refresh your landing page and check the console for:

```
✅ [Landing] Logo loaded from database (XXX KB)
```

### Still Not Showing?

If you see the success message but logo still doesn't appear, run:

```javascript
// Check localStorage
const profile = JSON.parse(localStorage.getItem('company_branding_profile'));
console.log('Logo in cache:', !!profile?.logo_url);
console.log('Logo size:', profile?.logo_url ? (profile.logo_url.length / 1024).toFixed(1) + 'KB' : 'None');
```

---

## Quick Fix: Manual Logo Upload

If nothing above works, you can manually set the logo:

1. **Get your logo file ready** (PNG or JPG)
2. **Convert to base64** at https://base64.guru/converter/encode/image
3. **Run in console:**

```javascript
// Replace YOUR_BASE64_HERE with the base64 string from step 2
const logoBase64 = 'data:image/png;base64,YOUR_BASE64_HERE';

// Save to database
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await supabase.from('companies')
    .update({ logo_primary: logoBase64 })
    .eq('user_id', user.id);
  console.log('✅ Logo uploaded!');
  
  // Also cache it
  localStorage.setItem('company_branding_profile', JSON.stringify({
    company_name: 'The Black Phoenix Company',
    logo_url: logoBase64,
    primary_color: '#ea580c',
    secondary_color: '#f97316'
  }));
  
  // Refresh page
  window.location.reload();
}
```

---

## Common Issues

### Issue: "Error: Not authenticated"
**Solution:** You need to be logged in to upload to the database. Log in first, then try the upload commands.

### Issue: "Logo loads but doesn't show"
**Solution:** Check if the base64 data is valid. It should start with `data:image/png;base64,` or `data:image/jpeg;base64,`

### Issue: "Companies table not found"
**Solution:** Your database might not be set up. Contact support or check Supabase dashboard.

---

## Need More Help?

Run this comprehensive diagnostic:

```javascript
// Full diagnostic
console.log('=== LOGO DIAGNOSTIC ===');

// Check localStorage
const cache = localStorage.getItem('company_branding_profile');
console.log('1. LocalStorage cache:', cache ? 'EXISTS' : 'EMPTY');
if (cache) {
  const profile = JSON.parse(cache);
  console.log('   - Has logo:', !!profile.logo_url);
  console.log('   - Logo size:', profile.logo_url ? (profile.logo_url.length / 1024).toFixed(1) + 'KB' : 'N/A');
}

// Check database
const { data: companies, error } = await supabase.from('companies').select('*').limit(1);
console.log('2. Database:', error ? 'ERROR: ' + error.message : 'CONNECTED');
if (companies && companies.length > 0) {
  console.log('   - Company exists:', companies[0].company_name);
  console.log('   - Has logo_primary:', !!companies[0].logo_primary);
  console.log('   - Has logo_url:', !!companies[0].logo_url);
  if (companies[0].logo_primary) {
    console.log('   - Logo size:', (companies[0].logo_primary.length / 1024).toFixed(1) + 'KB');
  }
} else {
  console.log('   - No companies found');
}

// Check auth
const { data: { user } } = await supabase.auth.getUser();
console.log('3. Authentication:', user ? 'LOGGED IN as ' + user.email : 'NOT LOGGED IN');

console.log('=== END DIAGNOSTIC ===');
```

Copy and paste all the output here for further help.
