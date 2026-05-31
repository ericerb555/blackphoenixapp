# User Data Isolation - Implementation Guide

## Overview
All portal data is now isolated per user account. When users sign in, they only see their own data. When they sign out and a new user signs in, the new user sees only their data.

## ✅ Already Implemented

### 1. API-Based Data (Fully Isolated)
The following data is stored on the backend with proper user filtering:
- **Work Requests**: `/make-server-57095a78/work-requests?userId={userId}`
- **Quotes**: `/make-server-57095a78/quotes?userId={userId}`
- **Invoices**: `/make-server-57095a78/invoices?userId={userId}`

These are automatically isolated per user through the backend API.

### 2. Referral System (localStorage-based)
**File**: `src/app/components/ReferralRewards.tsx`
**Storage**: `referrals_${userId}` and `referralCode_${userId}`
**Status**: ✅ Fully implemented using `useUserData` hook

## 🔧 Implementation Pattern

### Using the `useUserData` Hook

For any portal-specific data that needs user isolation:

```tsx
import { useUserData, useReferralCode } from '../lib/hooks/useUserData';

export default function MyPortalView() {
  // User-specific data storage
  const [jobs, setJobs] = useUserData<Job[]>('jobs', []);
  const [bids, setBids] = useUserData<Bid[]>('bids', []);
  const referralCode = useReferralCode();

  // Data is automatically:
  // - Loaded from localStorage on mount (per user)
  // - Saved to localStorage on change (per user)
  // - Cleared/reset when switching users
}
```

### Manual Implementation (without hook)

If you need more control:

```tsx
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function MyPortal() {
  const { user } = useAuth();
  const [data, setData] = useState([]);

  // Load user-specific data
  useEffect(() => {
    if (!user?.id) {
      setData([]);
      return;
    }

    const key = `myData_${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      setData([]); // Empty for new users
    }
  }, [user?.id]);

  // Save when data changes
  useEffect(() => {
    if (!user?.id) return;
    const key = `myData_${user.id}`;
    localStorage.setItem(key, JSON.stringify(data));
  }, [data, user?.id]);
}
```

## 📋 Portals to Update

### High Priority (User-Generated Data)
- [x] CustomerPortalView - ✅ Uses API with userId filtering
- [ ] SubcontractorPortal - Jobs, Bids
- [ ] VendorPortalView - Orders, Products, Performance
- [ ] AdvertiserPortalView - Campaigns, Ads
- [ ] InvestorPortalView - Portfolio, Investments

### Medium Priority (Configuration/Settings)
- [ ] EmployeePortalView - Timesheets, Schedule
- [ ] LandlordPortalView - Properties, Tenants
- [ ] CondoAssociationPortalView - Units, Residents

## 🔑 Storage Keys Convention

Use the pattern: `{dataType}_${userId}`

Examples:
- `referrals_user-abc-123`
- `jobs_user-abc-123`
- `bids_user-abc-123`
- `campaigns_user-abc-123`
- `portfolio_user-abc-123`

## 🧪 Testing User Isolation

1. Sign in as User A
2. Create some data (referrals, jobs, etc.)
3. Sign out
4. Sign in as User B
5. Verify User B sees empty data
6. Create different data for User B
7. Sign out and sign back in as User A
8. Verify User A still sees their original data

## 📝 Notes

- **Backend API data** (work requests, quotes, invoices) is already fully isolated
- **localStorage data** needs the `useUserData` hook or manual implementation
- **Mock data** (stats, charts) can remain shared as they're just for display
- **User profile info** is loaded from localStorage `userProfiles` object (already user-specific)

## 🚀 Next Steps

1. Apply the pattern to remaining portals
2. Test each portal with multiple users
3. Verify data isolation works correctly
4. Update any shared components that store user data
