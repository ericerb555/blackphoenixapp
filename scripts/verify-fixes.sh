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
# fulfill_order is NOT an order-creation tool (it dispatches orders already in a
# Zendrop store). It must stay out of the create-order patterns so we don't
# mis-call it and surface a misleading "Insufficient scope" error.
forbid  $ZD "/^fulfill_order\$/i"
forbid  $ZD "/^fulfill_.*order/i"
require $ZD "cannot place this order remotely"
# Product linking (import into the user's Zendrop account) — prerequisite for
# fulfillment, auto-run on payment.
require $ZD "linkProductToZendrop"
require $ZD "linkInventoryProduct"
require $ZD "pickProductLinkTool"
require $ZD "zendrop/link-product"
require $ZD "zendrop/link-all"
require $ZD "resolveZendropStoreId"

DP=supabase/functions/server/dropshipper.tsx
require $DP "submitZendropOrder"
# Zendrop must be intercepted before the generic REST post (still correct for
# other providers) can reach it.
require $DP "provider.id) === 'zendrop'"
# Auto-fill on payment: the forward path imports products into Zendrop first.
require $DP "linkInventoryProduct"
# A supplier that can't accept orders via API is manual, not a retryable error.
require $ZD "ZendropManualFulfillmentError"
require $ZD "ZENDROP_MANUAL_REQUIRED"
require $DP "ZENDROP_MANUAL_REQUIRED"
require $DP "manualRequired"
require $I "manual_required"
# Skip reasons used to be the opaque "(send failed)".
forbid  $DP "(send failed)"

# --- CJdropshipping (real create-order supplier) ------------------------------
# CJ has a REST create-order endpoint, so it is the working forward-on-payment
# path. This whole module was lost once; guard every load-bearing piece.
CJ=supabase/functions/server/cjdropshipping.tsx
require $CJ "authentication/getAccessToken"
require $CJ "shopping/order/createOrderV2"
require $CJ "CJ-Access-Token"
require $CJ "submitCJOrder"
require $CJ "normalizeAddress"
require $CJ "getAccessToken"
require $CJ "cj/verify"
require $CJ "cj/debug"
require $CJ "CJ_API_KEY"
# Dropshipper must route CJ orders through the REST create-order call, before
# the generic POST fallback.
require $DP "submitCJOrder"
require $DP "cjdropshipping"
# index must mount the CJ router or every /cj/* route 404s.
require $I "cjRouter"
require $I 'app.route("/", cjRouter)'

# --- AI SEO Engine (GrandRanker-style) ----------------------------------------
# Real OpenAI + KV module. Guard the module, its mount, and the frontend wiring
# so the whole section can't silently vanish.
SEO=supabase/functions/server/seo-engine.tsx
require $SEO "seo-engine/keywords/discover"
require $SEO "seo-engine/articles/generate"
require $SEO "seo-engine/visibility/check"
require $SEO "seo-engine/overview"
require $SEO "api.openai.com/v1/chat/completions"
require $SEO "OPENAI_API_KEY"
require $I "seoEngineRouter"
require $I 'app.route("/", seoEngineRouter)'
SEOP=src/app/pages/AiSeoEngine.tsx
require $SEOP "seo-engine/keywords/discover"
require $SEOP "seo-engine/articles/generate"
require src/app/routes.tsx '"ai-seo-engine"'
require src/app/nav.ts "ai-seo-engine"
# Publishing an AI article must create a real blog post in the store's blog KV.
require $SEO "publishArticleToBlog"
require $SEO "blog_post:"
require $SEO "htmlToMarkdown"

# --- Creative Studio (Higgsfield-style AI image suite) ------------------------
# Real OpenAI image gen persisted to Supabase Storage. Guard module, mount, and
# Content Center tab wiring so it can't silently vanish.
CS=supabase/functions/server/creative-studio.tsx
require $CS "creative-studio/generate"
require $CS "creative-studio/presets"
require $CS "creative-studio/status"
require $CS "api.openai.com/v1/images/generations"
require $CS "make-3eae23a6-creative"
require $CS "createSignedUrl"
require $I "creativeStudioRouter"
require $I 'app.route("/make-server-3eae23a6", creativeStudioRouter)'
ECC=src/app/pages/EnterpriseContentCenter.tsx
require $ECC "creative-studio"
require $ECC "CreativeStudio"
CSP=src/app/components/creativestudio/CreativeStudio.tsx
require $CSP "creative-studio/generate"
require $CSP "creative-studio/presets"

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
# The Orders page must read BOTH order stores; /store/orders alone misses every
# marketplace/digital-checkout order.
require $OM "marketplace/orders"
require $OM "normalizeOrder"
require $OM "isSampleOrder"
# The Orders page used to ship with five invented customers and orders.
forbid  $OM "demoOrders"
forbid  $OM "Marcus Thompson"

FAP=src/app/components/FulfillmentAutomationPanel.tsx
require $FAP "store/fulfillment/tick"

# The digital catalog needs a permanent entry point: the rail hides itself when
# the catalog is empty, which left no way in at all.
require src/app/pages/PublicStore.tsx '"/digital-products"'
require src/app/pages/DigitalStorefront.tsx "No digital products published yet"
require src/app/pages/PublicStore.tsx "Shop Downloads"
# Digital products also browse as their own shelf inside the product grid,
# each card with its own button through to the product page.
require src/app/pages/PublicStore.tsx 'layout="shelf"'
require src/app/components/DigitalProductsRail.tsx "View &amp; Download"

# Vertical product reels flank the hero, fed by the same published reels as
# the Watch & Shop rail. They hide rather than invent content.
require src/app/components/HeroSideReels.tsx "store-content/reels"
require src/app/pages/PublicStore.tsx 'HeroSideReels side="left"'
require src/app/pages/PublicStore.tsx 'HeroSideReels side="right"'

# ── Investments: funding starts at zero, computed live from real commitments ──
IK=supabase/functions/server/investments-kv.tsx
require $IK "fundingByOpportunity"
require $IK "withLiveFunding"
forbid  $IK "funded: 62"
forbid  $IK "funded: 78"
forbid  $IK "funded: 41"

# ── Landlord portal: rolled-back fixes re-applied, must stay wired ──
MPT=src/app/components/portals/MaintenancePlanTracker.tsx
forbid  $MPT "function demoPlan"
forbid  $MPT "function demoUsage"
forbid  $MPT "function demoPayments"
forbid  $MPT "Mike T."

DOS=src/app/components/portals/DealsOffersSection.tsx
require $DOS "portal-deals"
require $DOS "persistDeal"

LPV=src/app/components/portals/LandlordPortalView.tsx
require $LPV "async function saveSettings"
require $LPV "supabase.auth.updateUser"
forbid  $LPV "toast.success('Settings saved!')"

# ── Zendrop Orders: real forwarded orders, no invented customers ──
ZDI=src/app/pages/ZendropIntegration.tsx
forbid  $ZDI "MOCK_ORDERS"
forbid  $ZDI "Sarah Mitchell"
require $ZDI "dropshipper/orders"
require $ZDI "async function loadOrders"

# ── Paid-order recovery: rebuild orders for paid Stripe checkouts that never
#    fired the webhook/redirect, so the sale is never stranded at Stripe. ──
require supabase/functions/server/index.tsx "store/orders/recover"
require supabase/functions/server/index.tsx "getByPrefix('store:checkout:')"
require src/app/pages/OrderManager.tsx "async function recoverOrders"
require src/app/pages/OrderManager.tsx "store/orders/recover"

# ── Store hub must link the real Order Manager, distinct from the Dropshipper
#    "Forwarded Orders" view, so paid orders are reachable without typing a URL. ──
ESH=src/app/components/adstudio/EcommerceStoreHub.tsx
require $ESH "import OrderManager"
require $ESH "'customer-orders'"
require $ESH "render: () => <OrderManager />"

# ── Store analytics must ignore BP-DEMO/affiliate-demo seed orders so real
#    numbers never contradict themselves. ──
require $SVR "function isDemoOrder"
require $SVR "if (isDemoOrder(o)) continue;"

# ── Dropshipper SKU resolution: storefront ids are `provider_SKU` but inventory
#    is keyed by the raw supplier SKU. Paid orders stranded at "no inventory
#    match" until getInventoryItem strips the prefix and forwarding sends the
#    supplier's own SKU. ──
DSH=supabase/functions/server/dropshipper.tsx
require $DSH "Strip a leading .provider_. segment and retry"
require $DSH "sku: inventoryItem.sku, originalSku: item.sku"
require $DSH "item.originalSku ?? item.sku"

# ── Manual "Send to supplier" must find orders in BOTH order stores and write
#    back to the prefix the order came from (marketplace orders use store_order:). ──
require $IDX "let storageKey = storeOrderKey(orderId);"
require $IDX 'storageKey = `store_order:\${orderId}`;'
require $IDX "forwardStoreOrderToSupplier(order, storageKey)"
require $IDX "storageKey || storeOrderKey(order.id)"

# ── Unified product content pipeline: any product (physical OR digital) can be
#    pulled into every Content Center tool. ──
UAP=src/app/lib/useAllProducts.ts
require $UAP "marketplace/products"
require $UAP "isActive=true"
require $UAP "isDigital"
CHO=src/app/lib/contentHandoff.ts
require $CHO "sendProductToContentTool"
require $CHO "consumeContentProduct"
require $CHO "creator-studio"
PP=src/app/components/ProductPicker.tsx
require $PP "useAllProducts"
require $PP "showSendMenu"
ECC=src/app/pages/EnterpriseContentCenter.tsx
require $ECC "import ProductPicker"
require $ECC "CONTENT_OPEN_EVENT"
require $ECC "<ProductPicker showSendMenu />"
# Store Content Studio must load digital products too, not just /products.
require src/app/components/StoreContentStudio.tsx "marketplace/products"
require src/app/components/StoreContentStudio.tsx "consumeContentProduct"
require src/app/components/SocialMediaSchedulerTab.tsx "consumeContentProduct"

# ── One product → several content tools at once, plus a "Create content" menu
#    right on catalog/admin product rows. ──
require $CHO "sendProductToContentTools"
CCM=src/app/components/CreateContentMenu.tsx
require $CCM "sendProductToContentTools"
require $CCM "sendProductToContentTool"
require $PP "CreateContentMenu"
require $MA "CreateContentMenu"
require $MA "adminToUnified"
# The old Ad-Studio-only Megaphone button on digital rows is replaced by the menu.
forbid  $MA "Opening Ad Studio for"
require src/app/components/ProductCatalogBrowser.tsx "CreateContentMenu"
require src/app/components/ProductCatalogBrowser.tsx "stagedToUnified"

# ── Social Scheduler must publish through the REAL backend (Graph/LinkedIn/X)
#    with the owner's OAuth token — not just flip a local flag. ──
SMS=src/app/components/SocialMediaSchedulerTab.tsx
require $SMS "social/publish"
require $SMS "social/accounts"
require $SMS "social/connect/"
require $SMS "connectPlatform"
require $SMS "setAutoPublish"
# The publish button used to only mark posts published without ever posting.
forbid  $SMS "marked as published on"
require $I "make-server-3eae23a6/social/publish"
require $I "graph.facebook.com"
# Real LinkedIn + X (Twitter) publishing + OAuth.
require $I "urn:li:person"
require $I "api.twitter.com/2/tweets"
require $I "LINKEDIN_CLIENT_ID"
require $I "TWITTER_CLIENT_ID"

# ── Content Studio: Brand Kit + Omnichannel Repurposer + AI Planner. Real
#    OpenAI + KV, no mocks; wired as a Content Center tab. ──
CST=supabase/functions/server/content-studio.tsx
require $CST "content-studio/brand-kit"
require $CST "content-studio/repurpose"
require $CST "content-studio/packs"
require $CST "content-studio/plan"
require $CST "OPENAI_API_KEY"
require $CST "api.openai.com/v1/chat/completions"
require $CST "brandContext"
require $I "contentStudioRouter"
require $I 'app.route("/make-server-3eae23a6", contentStudioRouter)'
CSTP=src/app/components/contentstudio/ContentStudio.tsx
require $CSTP "content-studio/brand-kit"
require $CSTP "content-studio/repurpose"
require $CSTP "content-studio/plan"
require $ECC "contentstudio/ContentStudio"
require $ECC "activeTab === 'content-studio'"

# ── Content Studio → Social Scheduler handoff (real text drafts, incl. whole
#    pack queue). These were silently lost in a prior reset — guard them. ──
CH=src/app/lib/contentHandoff.ts
require $CH "sendDraftToScheduler"
require $CH "sendDraftsToScheduler"
require $CH "consumeSchedulerDraft"
require $CH "consumeSchedulerDraftQueue"
require $CH "channelToPlatform"
require $CSTP "sendDraftToScheduler"
require $CSTP "sendDraftsToScheduler"
require $CSTP "Send whole pack"
require $SMS "consumeSchedulerDraft"
require $SMS "consumeSchedulerDraftQueue"

# ── Brand Kit applied across generators: SEO Engine + Creative Studio read the
#    shared brand context so all AI output matches one brand. ──
require $CST "loadBrandContext"
require $CST "loadBrandVisual"
require $CST "brandKitStatus"
require $SEO "loadBrandContext"
require $SEO "useBrandKit"
require $SEO "usedBrandKit"
require $CS "loadBrandVisual"
require $CS "useBrandKit"
require $CS "usedBrandKit"
require $CSP "useBrandKit"          # Creative Studio component toggle
require $CSP "brandConfigured"      # Brand-Kit-not-set hint
require $SEOP "useBrandKit"         # SEO Engine page toggle
require $SEOP "brandConfigured"     # Brand-Kit-not-set hint

# ── AI Content Studio ('create' tab): fully de-mocked. Real compose endpoint +
#    CMS persistence (create/update/delete) + real library load. No setTimeout
#    fakes, no hardcoded Unsplash seed, no local fake caption/compliance. ──
require $CST "content-studio/compose"
ACS=src/app/components/AIContentStudio.tsx
require $ACS "content-studio/compose"
require $ACS "createContentPiece"
require $ACS "updateContentPiece"
require $ACS "fetchContentPieces"
require $ACS "loadLibrary"
require $ACS "fillTemplate"
forbid $ACS "generateAICaption"
forbid $ACS "calculateBrandCompliance"
forbid $ACS "setTimeout\(resolve, 2500\)"

# ── Enterprise Content Center inline dead-ends fixed: Storage tab renders the
#    media library, Templates buttons navigate, Settings channel toggles persist,
#    Analytics shows real breakdowns (no fabricated % deltas / "coming soon"). ──
require $ECC "activeTab === 'storage'"
require $ECC "MediaLibraryManager"
require $ECC "channelPrefs"
require $ECC "toggleChannelPref"
require $ECC "Content by Status"
require $ECC "Top Performing Content"
forbid $ECC "12% from last month"
forbid $ECC "Detailed performance metrics and insights coming soon"

# ── Media Library de-mocked: no hardcoded demo media/folder counts; real upload
#    + loadDual hydration; folder counts computed from real items. ──
MLM=src/app/components/MediaLibraryManager.tsx
forbid $MLM "Kitchen Renovation - Before.jpg"
forbid $MLM "example.com/video1.mp4"
require $MLM "folderCount"
require $MLM "make-server-3eae23a6/media/upload"

# ── Creator Studio (Video Recreation Engine): real AI recreation copy from the
#    backend, not the local template. Template kept only as offline fallback. ──
require $CST "content-studio/recreate-script"
VRE=src/app/components/VideoRecreationEngine.tsx
require $VRE "content-studio/recreate-script"
require $VRE "usedAI"

# ── Photo-to-Video export: real client-side canvas + MediaRecorder render that
#    produces a downloadable video (no fake export). ──
VEO=src/app/components/VideoExportOptions.tsx
require $VEO "MediaRecorder"
require $VEO "captureStream"
require $VEO "renderAndDownload"

# ── Autopilot Campaigns: hands-off ScaleShot-style engine that reuses the real
#    content-studio/creative-studio/social-media modules (no mocked generation
#    or publishing) and an idempotent, cron-free advance runner. ──
APB=supabase/functions/server/autopilot.tsx
require $APB "/autopilot/campaigns"
require $APB "/autopilot/campaigns/:id/generate-plan"
require $APB "/autopilot/campaigns/:id/generate-assets"
require $APB "/autopilot/campaigns/:id/advance"
require $APB "/content-studio/plan"
require $APB "/content-studio/compose"
require $APB "/creative-studio/generate"
require $APB "/social/publish"
require $APB "postedAt"          # idempotency guard against double-posting
require $APB "/autopilot/tick"   # external-cron upgrade path
# Opt-in human-in-the-loop review: keeps hands-off generation intact but lets a
# campaign hold posts for approval/edit/regenerate before publishing.
require $APB "requireApproval"
require $APB "pending_approval"
require $APB "/approve-all"
require $APB "/items/:itemId/approve"
require $APB "/items/:itemId/reject"
require $APB "/items/:itemId/edit"
require $APB "/items/:itemId/regenerate"
IDX=supabase/functions/server/index.tsx
require $IDX "autopilotRouter"
APF=src/app/pages/AutopilotCampaigns.tsx
require $APF "/autopilot/due"
require $APF "runHeartbeat"
require $APF "requireApproval"
require $APF "approveAll"
require $APF "pending_approval"
require src/app/routes.tsx "autopilot-campaigns"
require src/app/nav.ts "autopilot-campaigns"
# UI import casing must match the case-sensitive filenames git tracks, or
# Vercel's Linux build fails with "Could not resolve ../components/ui/...".
require $APF "components/ui/Card"
require $APF "components/ui/Button"
require $APF "components/ui/Badge"
require $APF "components/ui/Input"
forbid $APF "components/ui/card'"
forbid $APF "components/ui/button'"
forbid $APF "components/ui/badge'"
forbid $APF "components/ui/input'"

# --- Video Studio (faceless video creator, Path A) ---
VSB=supabase/functions/server/video-studio.tsx
require $VSB "/video-studio/script"
require $VSB "/video-studio/scene-image"
require $VSB "/video-studio/voiceover"
require $VSB "/video-studio/projects"
require $VSB "audio/speech"
require $VSB "make-3eae23a6-video"
require supabase/functions/server/index.tsx "videoStudioRouter"
VSF=src/app/pages/VideoStudio.tsx
require $VSF "/video-studio/script"
require $VSF "captureStream"
require $VSF "MediaRecorder"
require $VSF "createMediaStreamDestination"
require $VSF "components/ui/Card"
require $VSF "components/ui/Button"
require $VSF "components/ui/Input"
forbid $VSF "components/ui/card'"
forbid $VSF "components/ui/button'"
require src/app/routes.tsx "video-studio"
require src/app/nav.ts "video-studio"

if [ $fail -eq 0 ]; then
  echo "All fixes present."
fi
exit $fail
