# Black Phoenix Builds - Complete System Test Guide

**Date:** Saturday, May 16, 2026  
**Purpose:** Systematically test each feature to identify what's working and what needs fixing

---

## ✅ What's Been Fixed So Far

### 1. Navigation Debugging - COMPLETE ✅
- All 8 landing pages have comprehensive console logging
- Fallback navigation in place
- Cohort tracking implemented
- See `/NAVIGATION_FIXES_COMPLETE.md` for details

### 2. Financial Reconciliation Page - COMPLETE ✅
- Full financial reconciliation system implemented
- Bank transaction tracking and matching
- Reconciliation periods and discrepancy management
- Comprehensive reporting and export capabilities
- See `/FINANCIAL_RECONCILIATION_GUIDE.md` for details

---

## 🧪 Test Each Feature Systematically

### TEST 1: Landing Page Navigation ✅
**Status:** Debugging in place, ready to test

**Steps:**
1. Open browser console (F12)
2. Go to `/builds-landing-page`
3. Click "Get a Free Quote" button
4. Watch console logs

**Expected Results:**
```
🏗️ [BuildsLandingPage] Component mounting/rendering
🏗️ [BuildsLandingPage] onNavigate prop: function ✓ present
💰 [BuildsLandingPage] Get Quote button clicked
💾 [BuildsLandingPage] Saved cohort to localStorage: construction
🔄 [BuildsLandingPage] handleNavigate called with page: request-service
✓ [BuildsLandingPage] Calling onNavigate prop
🧭 Navigating to: request-service
```

**✅ PASS Criteria:**
- Console shows all expected logs
- Page navigates to `/request-service`
- No errors in console

**❌ FAIL Indicators:**
- Missing logs → Identify which step fails
- No page change → Navigation broken
- Console errors → Report error message

**What to report if it fails:**
- Copy the console logs
- State which step failed
- Include any error messages

---

### TEST 2: Authentication & Signup Flow
**Status:** Ready to test

**Steps:**
1. Navigate to `/request-service` (from landing page or directly)
2. If not logged in, signup modal should appear
3. Sign up or log in
4. Verify work request form appears

**Expected Results:**
```
🎫 [RequestServicePage] Rendering - user: false authLoading: false
🎫 [RequestServicePage] No user found - showing signup modal
```

After signup:
```
🎫 [RequestServicePage] User is logged in: user@example.com
🎫 [RequestServicePage] Showing work request form for user: user@example.com
```

**✅ PASS Criteria:**
- Signup modal appears when not logged in
- Form appears after login/signup
- No authentication errors

**❌ FAIL Indicators:**
- Blank page instead of signup modal
- Form doesn't appear after login
- Authentication errors

---

### TEST 3: Work Request Form Submission
**Status:** Ready to test

**Steps:**
1. Log in and go to `/request-service`
2. Fill out the work request form (fill all required fields)
3. Submit the form
4. Watch console logs

**Expected Results:**
```
[Work Request] Testing server connectivity...
[Work Request] Health check response: 200 OK
[Work Request] Creating work request...
[Work Request] Work request created successfully
[Work Request] Creating project in pipeline...
Project created successfully!
🎫 [RequestServicePage] Project created: abc-123 - navigating to pipeline
🧭 Navigating to: unified-project-pipeline
```

**✅ PASS Criteria:**
- Form submits without errors
- Success toast appears
- Console shows "Project created successfully!"
- Navigation to pipeline occurs
- Work request appears in localStorage or backend

**❌ FAIL Indicators:**
- Form submission fails
- Network errors (check Network tab)
- No navigation to pipeline
- Project not created

**What to check if it fails:**
1. Open DevTools → Network tab
2. Look for failed API requests
3. Check request payload and response
4. Report the error details

---

### TEST 4: Quote Auto-Generation
**Status:** Ready to test (after TEST 3 passes)

**Steps:**
1. Submit a work request (TEST 3)
2. Navigate to `/unified-project-pipeline`
3. Find your submitted work request
4. Check if quote was auto-generated

**Expected Results:**
- Work request appears in pipeline
- Quote is automatically generated with:
  - Labor breakdown (hours × rates)
  - Materials list with quantities
  - Total pricing
  - Quote number

**✅ PASS Criteria:**
- Quote exists for work request
- Quote has detailed labor breakdown
- Quote has comprehensive materials list
- Pricing is calculated correctly
- All line items are editable

**❌ FAIL Indicators:**
- No quote generated
- Quote is empty or incomplete
- Missing labor or materials
- Pricing not calculated

**What to check if it fails:**
1. Check console for auto-quote errors
2. Open DevTools → Network tab
3. Look for `/auto-generate-quote` request
4. Check if request succeeded or failed
5. Report the response

---

### TEST 5: Cohort System & Pricing
**Status:** Ready to test

**Steps:**
1. Click "Get a Free Quote" from BuildsLandingPage (cohort: construction)
2. Sign up and submit work request
3. Check if cohort is reflected in quote pricing
4. Repeat for different cohorts (handyman, demolition, etc.)

**Expected Results:**
- Cohort saved to localStorage: `quote_request_cohort`
- Work request includes cohort information
- Quote pricing reflects cohort-specific rates
- Subscription discounts applied (if subscribed)

**✅ PASS Criteria:**
- Cohort persists through signup flow
- Different cohorts have different pricing
- Subscription discounts apply correctly

**❌ FAIL Indicators:**
- Cohort not saved or lost
- All quotes have same pricing regardless of cohort
- Subscription discounts not applied

---

### TEST 6: Company Data Persistence
**Status:** Ready to test

**Steps:**
1. Create or update company data
2. Refresh the page (F5)
3. Navigate to different pages
4. Close browser and reopen
5. Check if company data persists

**Expected Results:**
```
✅ [App] Company data verification available: run verifyCompanyData() in console
🔍 [App] Running company data verification...
✓ [DataPersistence] Company data found in localStorage
✓ [DataPersistence] Backup created
```

**✅ PASS Criteria:**
- Company data survives page refresh
- Company data survives navigation
- Company data survives browser restart
- Backups are created automatically

**❌ FAIL Indicators:**
- Company data disappears after refresh
- Company data lost after navigation
- No backups found

**What to check if it fails:**
1. Open DevTools → Console
2. Run: `verifyCompanyData()`
3. Check output for missing data
4. Open DevTools → Application → Local Storage
5. Look for company data keys
6. Report what's missing

---

### TEST 7: Subscription Flow
**Status:** Ready to test

**Steps:**
1. Go to any landing page with subscription plans
2. Click "Subscribe Now" on a plan
3. Complete subscription signup
4. Verify subscription status
5. Submit a quote request
6. Check if subscription discount is applied

**Expected Results:**
- Subscription signup completes
- User marked as subscriber
- Quotes show discount (e.g., 15% off)
- Subscription persists across sessions

**✅ PASS Criteria:**
- Can complete subscription signup
- Subscription status saved
- Discounts applied to quotes
- Subscription data persists

**❌ FAIL Indicators:**
- Subscription signup fails
- Discounts not applied
- Subscription status lost after refresh

---

### TEST 8: Financial Reconciliation Page ✨ NEW
**Status:** Ready to test

**Steps:**
1. Open browser console (F12)
2. Seed sample data: `seedReconciliationData('default')`
3. Navigate to `/financial-reconciliation`
4. Test all 5 tabs (Dashboard, Transactions, Periods, Discrepancies, Reports)
5. Test filtering and reconciliation actions

**Expected Results:**
```
🌱 [Seed] Creating sample reconciliation data...
✅ [Seed] Created 10 sample transactions
✅ [Seed] Created 3 reconciliation matches
✅ [Seed] Created reconciliation period: period_xxx
✅ [Seed] Created 3 sample discrepancies
📊 [Seed] Reconciliation Summary: { totalTransactions: 10, reconciledCount: 3, ... }
📊 [Financial Reconciliation] Loading data for company: default
✅ [Financial Reconciliation] Data loaded: { transactions: 10, matches: 3, ... }
```

**Dashboard Tab Tests:**
- See 4 metric cards with correct numbers
- Recent Transactions section shows 5 transactions
- Open Discrepancies section shows 3 discrepancies
- All amounts formatted correctly

**Transactions Tab Tests:**
- Search filter works (type "Customer")
- Status filter works (select "Reconciled" or "Unreconciled")
- Date filter works (select "Last 7 Days")
- Transaction table displays all data
- Reconcile button appears for unreconciled transactions

**Periods Tab Tests:**
- See 1 reconciliation period
- Period shows date range and balances
- Transaction breakdown is accurate
- Status badge displays correctly

**Discrepancies Tab Tests:**
- See 3 discrepancies with severity badges
- Each discrepancy shows description and amount
- Status badges display correctly

**Reports Tab Tests:**
- Reconciliation Summary shows correct stats
- Financial Summary shows correct totals
- Export buttons are present

**✅ PASS Criteria:**
- All tabs load without errors
- Data displays correctly in all tabs
- Filters work properly
- No console errors
- Responsive design works on mobile

**❌ FAIL Indicators:**
- Tabs don't switch or show errors
- Data not loading or displaying incorrectly
- Filters not working
- Console errors present
- Page not responsive

**What to check if it fails:**
1. Run in console: `reconciliationService.getReconciliationStats('default')`
2. Check if data exists: `localStorage.getItem('bank_transactions')`
3. Check console for errors
4. Check Network tab for failed requests
5. Report specific tab/feature that failed

---

## 📊 Test Results Template

Copy this template and fill it out as you test:

```
## Test Results - [Your Name] - [Date/Time]

### TEST 1: Landing Page Navigation
- Status: [ ] PASS / [ ] FAIL
- Notes: 
- Console logs: [paste if failed]

### TEST 2: Authentication & Signup
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Errors: [paste if any]

### TEST 3: Work Request Form Submission
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Network errors: [paste if any]

### TEST 4: Quote Auto-Generation
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Quote details: [describe what's missing]

### TEST 5: Cohort System & Pricing
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Cohort tested: [list]
- Pricing issues: [describe]

### TEST 6: Company Data Persistence
- Status: [ ] PASS / [ ] FAIL
- Notes:
- What's missing: [describe]

### TEST 7: Subscription Flow
- Status: [ ] PASS / [ ] FAIL  
- Notes:
- Issues: [describe]

### TEST 8: Financial Reconciliation Page
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Issues: [describe]
```

---

## 🐛 How to Report Issues

When something fails, provide:

### 1. Which Test Failed
Example: "TEST 3: Work Request Form Submission"

### 2. What You Expected
Example: "Expected form to submit and navigate to pipeline"

### 3. What Actually Happened  
Example: "Form submission failed with 404 error"

### 4. Console Logs
Example:
```
[Work Request] Testing server connectivity...
❌ Error: Failed to fetch
Network tab shows: 404 Not Found on /make-server-57095a78/work-requests
```

### 5. Screenshots (if helpful)
- Screenshot of error
- Screenshot of console
- Screenshot of Network tab

---

## 🔧 Quick Debugging Commands

### Check Company Data
```javascript
// In browser console:
verifyCompanyData()
```

### Check Cohort
```javascript
// In browser console:
localStorage.getItem('quote_request_cohort')
```

### Check Auth Status
```javascript
// In browser console:
supabase.auth.getSession()
```

### Check Work Requests
```javascript
// In browser console:
localStorage.getItem('workRequests')
```

---

## 🎯 Testing Priority

Test in this order:
1. **Navigation** (TEST 1) - Foundation for everything else
2. **Authentication** (TEST 2) - Required for all features
3. **Form Submission** (TEST 3) - Core functionality
4. **Quote Generation** (TEST 4) - Critical feature
5. **Company Data** (TEST 6) - Should work in parallel
6. **Cohort System** (TEST 5) - After basics work
7. **Subscriptions** (TEST 7) - Last, after core features work
8. **Financial Reconciliation** (TEST 8) - Last, after core features work

---

## ✅ What to Do After Testing

1. **If everything passes:** Celebrate! 🎉 Then test edge cases.

2. **If some tests fail:** Report which ones using the template above.

3. **If many tests fail:** Start with the first failure and fix that first. Many failures might cascade from one root cause.

4. **For each failure:** Provide console logs, network errors, and screenshots.

---

**Next Steps:**
1. Run through these tests systematically
2. Document results using the template
3. Report failures with detailed logs
4. I'll fix each issue one at a time based on your findings

Let's identify exactly what's broken so we can fix it!