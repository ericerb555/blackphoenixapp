# Supabase Security Setup Guide

## Overview

This guide sets up Row Level Security (RLS) policies to ensure:
- ✅ Only authenticated users can access data
- ✅ Users can only see/modify their own data
- ✅ Platform owners have full access
- ✅ Public pages remain accessible without authentication

## Step 1: Enable RLS on All Tables

Run this SQL in your Supabase SQL Editor to enable RLS on all tables:

```sql
-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- If you have these tables:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

## Step 2: Companies Table Policies

```sql
-- Companies: Users can only see companies they own or are members of
CREATE POLICY "Users can view their own companies"
ON companies FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  )
);

-- Companies: Users can insert their own companies
CREATE POLICY "Users can create companies"
ON companies FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Companies: Users can update their own companies
CREATE POLICY "Users can update their own companies"
ON companies FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Companies: Users can delete their own companies
CREATE POLICY "Users can delete their own companies"
ON companies FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

## Step 3: Company Documents Policies

```sql
-- Company Documents: Users can view documents for their companies
CREATE POLICY "Users can view their company documents"
ON company_documents FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
    UNION
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);

-- Company Documents: Users can upload documents to their companies
CREATE POLICY "Users can create company documents"
ON company_documents FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
    UNION
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);

-- Company Documents: Users can update their company documents
CREATE POLICY "Users can update company documents"
ON company_documents FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- Company Documents: Users can delete their company documents
CREATE POLICY "Users can delete company documents"
ON company_documents FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);
```

## Step 4: User Profiles Policies

```sql
-- User Profiles: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- User Profiles: Users can insert their own profile
CREATE POLICY "Users can create own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- User Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## Step 5: Platform Owner Special Privileges

If you want the platform owner (ericerb555@proton.me) to have full access:

```sql
-- Create a function to check if user is platform owner
CREATE OR REPLACE FUNCTION is_platform_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.email() = 'ericerb555@proton.me';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add platform owner policies to companies table
CREATE POLICY "Platform owner can view all companies"
ON companies FOR SELECT
TO authenticated
USING (is_platform_owner());

CREATE POLICY "Platform owner can update all companies"
ON companies FOR UPDATE
TO authenticated
USING (is_platform_owner())
WITH CHECK (is_platform_owner());

CREATE POLICY "Platform owner can delete all companies"
ON companies FOR DELETE
TO authenticated
USING (is_platform_owner());
```

## Step 6: Storage Bucket Policies

For file uploads (logos, documents), configure storage buckets:

```sql
-- Create storage bucket for company files
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-files', 'company-files', false);

-- Company files: Users can view their company's files
CREATE POLICY "Users can view their company files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE user_id = auth.uid()
  )
);

-- Company files: Users can upload to their company folder
CREATE POLICY "Users can upload their company files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE user_id = auth.uid()
  )
);

-- Company files: Users can update their company files
CREATE POLICY "Users can update their company files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE user_id = auth.uid()
  )
);

-- Company files: Users can delete their company files
CREATE POLICY "Users can delete their company files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE user_id = auth.uid()
  )
);
```

## Step 7: Email Confirmation Settings

In Supabase Dashboard → Authentication → Settings:

1. **Disable Email Confirmation** (for testing):
   - Uncheck "Enable email confirmations"
   - This allows users to sign in immediately after signup

2. **OR Set Up Email Service** (for production):
   - Configure SMTP settings
   - Customize email templates
   - Enable email confirmations

## Step 8: Auth Settings

In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: `https://blackphoenixapp-puw7r5vfl-black-phoenix-builds.vercel.app`
2. **Redirect URLs**: Add your domain
3. **JWT Expiry**: 3600 (1 hour)
4. **Refresh Token Rotation**: Enabled
5. **Security**: Enable "Secure email change"

## Step 9: Test the Setup

### Test 1: Anonymous User (Should Fail)
```javascript
// Try to query without auth - should return empty
const { data, error } = await supabase
  .from('companies')
  .select('*');
// Should return: error or empty data
```

### Test 2: Authenticated User (Should Succeed)
```javascript
// Sign in first
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Query own companies - should succeed
const { data, error } = await supabase
  .from('companies')
  .select('*');
// Should return: user's companies
```

### Test 3: Cross-User Access (Should Fail)
```javascript
// Try to access another user's company - should fail
const { data, error } = await supabase
  .from('companies')
  .select('*')
  .eq('id', 'someone-elses-company-id');
// Should return: empty or error
```

## Step 10: Monitoring & Logs

Monitor RLS policies in Supabase Dashboard:

1. Go to **Database → Roles**
2. Check **postgres** and **authenticated** roles
3. View **Policies** tab to see all active policies
4. Check **Logs** for failed auth attempts

## Troubleshooting

### Issue: "Row level security policy violation"
**Solution**: User is trying to access data they don't own. Check:
- Is user authenticated?
- Does the user have permission via company_members?
- Is the policy correctly written?

### Issue: "permission denied for table"
**Solution**: RLS not enabled or policy missing
- Run `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- Create policies for SELECT, INSERT, UPDATE, DELETE

### Issue: Platform owner can't access everything
**Solution**: Check is_platform_owner() function
- Make sure email matches exactly: `ericerb555@proton.me`
- Verify function exists: `SELECT is_platform_owner();`

## Security Best Practices

1. ✅ **Always enable RLS** on tables with user data
2. ✅ **Use auth.uid()** for user-specific policies
3. ✅ **Test policies** with different user accounts
4. ✅ **Monitor logs** for suspicious activity
5. ✅ **Use SECURITY DEFINER** sparingly (only for platform owner checks)
6. ✅ **Keep policies simple** - complex policies are hard to audit
7. ✅ **Document policies** - explain the business logic

## Next Steps

1. Run all SQL scripts above in Supabase SQL Editor
2. Test with your account (ericerb555@proton.me)
3. Test with a new test account
4. Monitor logs for any RLS violations
5. Adjust policies as needed

---

**Created**: 2026-05-17
**Last Updated**: 2026-05-17
**Status**: Ready for implementation
