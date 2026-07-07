#!/bin/bash
# Push role-switcher changes to GitHub when connectivity is restored
TOKEN="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"
REPO="ericerb555/blackphoenixapp"
MSG="Role switcher: inject mock company profiles per role for testing"

files=(
  "src/app/components/RoleSwitcher.tsx"
  "src/app/components/portals/TerritoryPortalView.tsx"
  "src/app/components/portals/SubcontractorPortal.tsx"
  "src/app/components/portals/PropertyManagerPortalView.tsx"
  "src/app/components/portals/CondoManagerPortalView.tsx"
  "src/app/components/portals/LandlordPortalView.tsx"
  "src/app/components/portals/VendorPortalView.tsx"
  "src/app/components/portals/AdvertiserPortalView.tsx"
  "src/app/components/portals/EmployeePortalView.tsx"
  "src/app/components/portals/InvestorPortalView.tsx"
  "src/app/components/portals/CustomerPortalView.tsx"
)

for f in "${files[@]}"; do
  LOCAL="/workspaces/default/code/$f"

  SHA=$(curl -sf "https://api.github.com/repos/$REPO/contents/$f" \
    -H "Authorization: token $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")

  python3 - <<PYEOF
import json, base64

with open("$LOCAL", "rb") as fh:
    content = base64.b64encode(fh.read()).decode()

payload = {"message": "$MSG", "content": content, "sha": "$SHA"}

with open("/tmp/api_payload.json", "w") as out:
    json.dump(payload, out)
PYEOF

  STATUS=$(curl -s -X PUT "https://api.github.com/repos/$REPO/contents/$f" \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    --data @/tmp/api_payload.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if 'content' in d else '❌ ' + d.get('message','?'))" 2>/dev/null)

  echo "$f: $STATUS"
done
