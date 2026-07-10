#!/bin/bash
# Run this script from inside your local clone of blackphoenixapp
# It downloads all changed files and pushes them to GitHub
# Usage: bash push_to_github.sh

TOKEN="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"
REPO="ericerb555/blackphoenixapp"
MSG="All session changes: role switcher, deal publisher, plan tracker, tech tiers, messaging, login fix"

push_file() {
  local f="$1"
  SHA=$(curl -sf "https://api.github.com/repos/$REPO/contents/$f" \
    -H "Authorization: token $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")
  python3 - <<PYEOF
import json, base64
with open("$f", "rb") as fh:
    content = base64.b64encode(fh.read()).decode()
payload = {"message": "$MSG", "content": content}
if "$SHA": payload["sha"] = "$SHA"
with open("/tmp/payload.json", "w") as out:
    json.dump(payload, out)
PYEOF
  STATUS=$(curl -s -X PUT "https://api.github.com/repos/$REPO/contents/$f" \
    -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
    --data @/tmp/payload.json \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'content' in d else 'FAIL: ' + d.get('message','?'))" 2>/dev/null)
  echo "$f: $STATUS"
}

files=(
  "src/app/pages/Login.tsx"
  "src/app/components/RoleSwitcher.tsx"
  "src/app/components/DealPublisher.tsx"
  "src/app/components/MaintenancePlanCreator.tsx"
  "src/app/components/TechRosterManager.tsx"
  "src/app/components/TierPicker.tsx"
  "src/app/components/portals/MaintenancePlanTracker.tsx"
  "src/app/components/portals/LandlordPortalView.tsx"
  "src/app/components/portals/PropertyManagerPortalView.tsx"
  "src/app/components/portals/CondoManagerPortalView.tsx"
  "src/app/components/portals/TerritoryPortalView.tsx"
  "src/app/components/portals/SubcontractorPortal.tsx"
  "src/app/components/portals/VendorPortalView.tsx"
  "src/app/components/portals/AdvertiserPortalView.tsx"
  "src/app/components/portals/CustomerPortalView.tsx"
  "src/app/components/portals/EmployeePortalView.tsx"
  "src/app/components/portals/InvestorPortalView.tsx"
  "src/app/pages/UnifiedDashboard.tsx"
  "src/app/supabase/functions/server-57095a78/index.tsx"
)

for f in "${files[@]}"; do
  push_file "$f"
done

echo ""
echo "Done! Check github.com/ericerb555/blackphoenixapp to verify."
