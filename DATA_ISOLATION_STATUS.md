# Data Isolation Status by Portal

## ✅ Fully Implemented

### CustomerPortalView
**Status**: ✅ Complete  
**Data Isolated**:
- Work Requests (API with userId filter)
- Quotes (API with userId filter)  
- Invoices (API with userId filter)
- Referrals (localStorage with useUserData hook)
- Messages (localStorage with useUserData hook)
- User Profile (localStorage - name, email, phone, address)

**Storage**:
- Backend: `/make-server-824f083c/work-requests?userId={id}`
- Backend: `/make-server-824f083c/quotes?userId={id}`
- Backend: `/make-server-824f083c/invoices?userId={id}`
- Local: `referrals_{userId}`, `referralCode_{userId}`
- Local: `customer_messages_{userId}`
- Local: `userProfiles[email]`

### SubcontractorPortal
**Status**: ✅ Complete  
**Data Isolated**:
- Active Jobs (localStorage with useUserData hook)
- Pending Bids (localStorage with useUserData hook)
- Referrals (shared ReferralRewards component)

**Storage**:
- Local: `subcontractor_jobs_{userId}`
- Local: `subcontractor_bids_{userId}`
- Local: `referrals_{userId}` (from ReferralRewards)

## 🔄 Needs Implementation

### VendorPortalView
**Recommended Data to Isolate**:
- Orders
- Products
- Performance metrics
- Referrals (use shared component)

**Suggested Keys**:
- `vendor_orders_{userId}`
- `vendor_products_{userId}`
- `vendor_performance_{userId}`

### AdvertiserPortalView
**Recommended Data to Isolate**:
- Campaigns
- Ad placements
- Performance data
- Referrals (use shared component)

**Suggested Keys**:
- `advertiser_campaigns_{userId}`
- `advertiser_ads_{userId}`
- `advertiser_performance_{userId}`

### InvestorPortalView
**Recommended Data to Isolate**:
- Portfolio
- Investments
- Performance tracking
- Referrals (use shared component)

**Suggested Keys**:
- `investor_portfolio_{userId}`
- `investor_investments_{userId}`
- `investor_performance_{userId}`

### EmployeePortalView
**Recommended Data to Isolate**:
- Timesheets
- Schedule
- Tasks
- Time off requests

**Suggested Keys**:
- `employee_timesheets_{userId}`
- `employee_schedule_{userId}`
- `employee_tasks_{userId}`

### LandlordPortalView
**Recommended Data to Isolate**:
- Properties
- Tenants
- Maintenance requests
- Financial data

**Suggested Keys**:
- `landlord_properties_{userId}`
- `landlord_tenants_{userId}`
- `landlord_maintenance_{userId}`

### CondoAssociationPortalView  
**Recommended Data to Isolate**:
- Units
- Residents
- Fees/assessments
- Maintenance

**Suggested Keys**:
- `condo_units_{userId}`
- `condo_residents_{userId}`
- `condo_assessments_{userId}`

## 📚 Quick Reference

### To Add User Isolation to a Portal:

1. **Import the hook**:
   ```tsx
   import { useUserData, useReferralCode } from '../../lib/hooks/useUserData';
   ```

2. **Replace mock data**:
   ```tsx
   // Before:
   const jobs = [{ id: 1, ... }, { id: 2, ... }];
   
   // After:
   const [jobs, setJobs] = useUserData<Job[]>('portal_jobs', []);
   ```

3. **Use the referrals component**:
   ```tsx
   import ReferralRewards from '../ReferralRewards';
   
   // In your portal tabs:
   {activeTab === 'referrals' && <ReferralRewards />}
   ```

## 🔐 Key Benefits

1. **Automatic Isolation**: Each user sees only their data
2. **Clean Account Switching**: New users start with empty state
3. **Data Persistence**: User data persists across sessions
4. **No Backend Changes**: Works with localStorage (optional backend integration)
5. **Consistent Pattern**: Same approach across all portals

## 🧪 Testing Checklist

For each portal:
- [ ] Sign in as User A
- [ ] Create/add data
- [ ] Sign out
- [ ] Sign in as User B
- [ ] Verify User B sees empty data
- [ ] Add different data for User B
- [ ] Sign out and back in as User A
- [ ] Verify User A's original data is still there
