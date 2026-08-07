#!/usr/bin/env bash
# Guard against the fixed screens silently reverting to mocked/fabricated data.
# Run:  bash scripts/verify-fixes.sh
# Exits non-zero and names the file if any known-bad pattern reappears or any
# required implementation goes missing.

cd "$(dirname "$0")/.." || exit 1
fail=0

# pattern must NOT appear
forbid() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo "REVERTED  $1 — fabricated/mocked marker is back: $2"
    fail=1
  fi
}

# pattern MUST appear
require() {
  if ! grep -q "$2" "$1" 2>/dev/null; then
    echo "MISSING   $1 — implementation gone: $2"
    fail=1
  fi
}

W=src/app/pages/WeatherJobSiteMonitor.tsx
forbid  $W "generateMockSites"
forbid  $W "Downtown Renovation"
require $W "fetchCollection"
require $W "handleAddSite"

D=src/app/pages/WasteDisposalTracking.tsx
forbid  $D "Mock stats"
forbid  $D "totalWaste: 487.5"
forbid  $D "Math.random() \* 30"
forbid  $D '\$2,340'
require $D "TONS_PER_UNIT"
require $D "handleScheduleRun"

M=src/app/pages/MaterialsCenter.tsx
forbid  $M "Coming soon"
require $M "PO_STATUS_STYLES"

S=src/app/lib/services/materialsHubService.tsx
require $S "updateMaterial"
require $S "deleteMaterial"

H=src/app/pages/SupplierManagementHub.tsx
forbid  $H "Coming Soon"
forbid  $H "added successfully!'"
require $H "SupplierRfqTab"
require $H "SupplierAuditTab"
require $H "handleSaveSupplier"

for f in src/app/components/suppliers/SupplierRfqTab.tsx \
         src/app/components/suppliers/SupplierAuditTab.tsx; do
  [ -f "$f" ] || { echo "MISSING   $f — file deleted"; fail=1; }
done

SA=src/app/components/StoreAnalyticsDashboard.tsx
forbid  $SA "DEMO_REVENUE_DATA"
forbid  $SA "DEMO_FINANCIALS"
forbid  $SA "Showing sample data"
require $SA "No orders yet"
require $SA "downloadCsv"

TP=src/app/components/portals/TerritoryPortalView.tsx
forbid  $TP "DEMO_REVENUE"
forbid  $TP "DEMO_PIPELINE"
forbid  $TP '\$131,800'
require $TP "territory/revenue"

SP=src/app/components/SubscriptionPlans.tsx
forbid  $SP "Implement actual save logic"
require $SP "subscription-plan-overrides"

VS=src/app/components/VendorStorefront.tsx
forbid  $VS "Persist to user account"
require $VS "product-favorites"

PG=src/app/pages/PortalGlobalSettings.tsx
forbid  $PG "Import functionality coming soon"
require $PG "unrecognised key"

MC=supabase/functions/server/maintenance-config.tsx
require $MC "subscription-plan-overrides"

SVR=supabase/functions/server/store-analytics.tsx
require $SVR "customerStats"
require $SVR "quickStats"

I=supabase/functions/server/index.tsx
require $I "supplier-rfqs"
require $I "supplier-audits"
require $I "make-server-3eae23a6/suppliers"
require $I "registerFieldOpsCollection"
require $I "territory/revenue"
require $I "product-favorites"
# Hono serves the first matching route, so a second /purchase-orders
# registration silently shadows the real one.
forbid  $I "registerFieldOpsCollection('purchase-orders'"

# ── digital product pages ────────────────────────────────────────────────────
[ -f src/app/pages/DigitalProductPage.tsx ] || { echo "MISSING   src/app/pages/DigitalProductPage.tsx — file deleted"; fail=1; }
[ -f src/app/components/DigitalProductsRail.tsx ] || { echo "MISSING   src/app/components/DigitalProductsRail.tsx — file deleted"; fail=1; }

DP=src/app/pages/DigitalProductPage.tsx
require $DP "marketplace/products/"
require $DP "requestDownload"

RT=src/app/routes.tsx
require $RT "digital-product"
require $RT "DigitalProductPage"

DS=src/app/pages/DigitalStorefront.tsx
require $DS "openProductPage"
# The old owned-product CTA pointed at /document?id=, which never served the file.
forbid  $DS "document?id="
# Catalog prices are cents; the server multiplies by 100. Sending cents
# overcharged buyers 100x.
require $DS "unitCents / 100"

MA=src/app/pages/MarketplaceAdmin.tsx
require $MA "productPagePath"
require $MA "uploadFile"

PS=src/app/pages/PublicStore.tsx
require $PS "DigitalProductsRail"

MP=supabase/functions/server/marketplace.tsx
require $MP "FILE_BUCKET"
require $MP "findPaidOrder"
require $MP "stripFiles"
require $MP "marketplace/entitlements"

# --- Zendrop order forwarding -------------------------------------------------
# Zendrop speaks MCP (JSON-RPC 2.0) at app.zendrop.com/mcp/v1. Order forwarding
# used to POST to a REST endpoint that does not exist, so paid orders silently
# stalled at fulfillment_status "pending".
ZD=supabase/functions/server/zendrop.tsx
require $ZD "submitZendropOrder"
require $ZD "listZendropTools"
require $ZD "pickOrderTool"
require $ZD "zendrop/order-tool"

DP=supabase/functions/server/dropshipper.tsx
require $DP "submitZendropOrder"
# Zendrop must be intercepted before the generic REST post (still correct for
# other providers) can reach it.
require $DP "provider.id) === 'zendrop'"
# Skip reasons used to be the opaque "(send failed)".
forbid  $DP "(send failed)"

# --- Auto-fulfillment ---------------------------------------------------------
IDX=supabase/functions/server/index.tsx
require $IDX "dropshipper/orders/:orderId/retry"
require $IDX "store/fulfillment/settings"
require $IDX "store/fulfillment/run"
require $IDX "store/fulfillment/tick"
require $IDX "runFulfillmentSweep"
require $IDX "forwardStoreOrderToSupplier"

OM=src/app/pages/OrderManager.tsx
require $OM "FulfillmentAutomationPanel"
require $OM "sendToSupplier"
# The Orders page used to ship with five invented customers and orders.
forbid  $OM "demoOrders"
forbid  $OM "Marcus Thompson"

FAP=src/app/components/FulfillmentAutomationPanel.tsx
require $FAP "store/fulfillment/tick"

if [ $fail -eq 0 ]; then
  echo "All fixes present."
fi
exit $fail
