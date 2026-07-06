# Push All Changes to GitHub

## Option 1 — If you have the repo on your computer already

Open Terminal and run:

```bash
cd /path/to/blackphoenixapp

git remote set-url origin https://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@github.com/ericerb555/blackphoenixapp.git

git pull origin main

git push origin main
```

Vercel will auto-deploy once the push succeeds.

---

## Option 2 — Fresh clone (if you don't have it locally)

```bash
git clone https://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@github.com/ericerb555/blackphoenixapp.git

cd blackphoenixapp

git push origin main
```

---

## Files changed this session (for reference)

- src/app/pages/PublicStore.tsx (full dark luxury redesign + hero text change)
- src/app/pages/Login.tsx (icon overlap fix)
- src/app/pages/UnifiedDashboard.tsx (new tabs: deals, plan creator, tech roster, dropshippers)
- src/app/lib/rbac.ts (ADMIN role added)
- src/app/components/RoleSwitcher.tsx (ADMIN + mock profiles for all roles)
- src/app/components/DealPublisher.tsx (new)
- src/app/components/MaintenancePlanCreator.tsx (new)
- src/app/components/TechRosterManager.tsx (new)
- src/app/components/TierPicker.tsx (new)
- src/app/components/MultiDropshipperManager.tsx (new)
- src/app/components/ShopIntelligenceSuite.tsx (new)
- src/app/components/VideoRecreationEngine.tsx (new)
- src/app/components/portals/AdminPortalView.tsx (dispatch center added)
- src/app/components/portals/MaintenancePlanTracker.tsx (new)
- src/app/components/portals/LandlordPortalView.tsx
- src/app/components/portals/PropertyManagerPortalView.tsx
- src/app/components/portals/CondoManagerPortalView.tsx
- src/app/components/portals/TerritoryPortalView.tsx
- src/app/components/portals/SubcontractorPortal.tsx (bid media upload)
- src/app/components/portals/VendorPortalView.tsx
- src/app/components/portals/AdvertiserPortalView.tsx
- src/app/components/portals/CustomerPortalView.tsx
- src/app/components/portals/EmployeePortalView.tsx
- src/app/components/portals/InvestorPortalView.tsx
- src/app/pages/EnterpriseContentCenter.tsx (shop intelligence + creator studio tabs)
- src/app/pages/BidRoomV2.tsx (media attachments display)
- src/app/supabase/functions/server-57095a78/index.tsx (new endpoints)
