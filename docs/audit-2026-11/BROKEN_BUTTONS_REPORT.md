# Phase 3 — Interactive element audit

Run 2026-11-19 with `node scripts/dead-ui-scan.mjs` over 679 `.tsx` files.
Re-runnable; `FULL=1` prints every row rather than the top of each list.

## Method, and what it cannot tell you

The brief asks for every one of **4,498 buttons** to be clicked in every role.
That is roughly twenty-five hours of machine time per role. Three failure
modes can be proven **without** clicking, because the evidence is in the
source, and that is what this pass does:

| | Found |
|---|---:|
| **A** — a button with no handler at all | **188** |
| **B** — a handler navigating to a route that does not exist | **0** |
| **C1** — a handler whose *entire body* is a message | **44** |
| **C2** — claims success without reaching the server | **85** |

**This cannot tell you a button works.** A handler calling the right endpoint
with the wrong argument is indistinguishable from a correct one here. It
narrows 4,498 to a list short enough to open by hand. Everything below is
*code reviewed*, not *behaviour tested*, and is counted that way.

### A note on the instrument itself

The first run reported line numbers that were wrong — comments were stripped
before matching, so every offset after a comment had shifted, and a finding
pointed at an `<input>` forty lines from the button it meant. Comments are now
blanked in place, preserving every offset, and three findings were spot-checked
against the file before this report was written. **A report with wrong line
numbers is worse than no report**: it sends somebody to the wrong place and
spends the trust they had in the rest of it.

## C1 — the handler is only a message. 44 of them.

These need no judgement: the whole body is a toast. Split by what the message
*claims*, because that is what decides severity.

### C1a — tells the user an action completed when nothing happened

**This is the defect class.** Severity is driven by what is claimed.

| Claim | File | Line |
|---|---|---:|
| `Reward payment processed` | `pages/SubscriptionHub.tsx` | 819 |
| `Subscription paused` | `pages/SubscriptionHub.tsx` | 695 |
| `Deal approved!` | `pages/RevenueMonetizationHub.tsx` | 1644 |
| `Deal approved!` | `pages/RevenueMonetizationHub.tsx` | 1688 |
| `Promotion approved and added to admin alerts!` | `pages/RevenueMonetizationHub.tsx` | ~1075 |
| `Markup saved!` | `components/MultiDropshipperManager.tsx` | ~845 |
| `Setting updated` | `components/MultiDropshipperManager.tsx` | ~1214 |
| `Settings saved!` | `pages/AbandonedCart.tsx` | ~297 |
| `Settings saved — all content templates updated` | `pages/AIRankingEngine.tsx` | ~1014 |
| `Health score recalculated.` | `pages/PropertyAIEnterprise.tsx` | ~910 |
| `Capital plan exported.` | `pages/PropertyAIEnterprise.tsx` | ~989 |
| `Competitor analysis report generated` | `components/ShopIntelligenceSuite.tsx` | ~1310 |
| `Competitor alert set — you'll be notified…` | `components/ShopIntelligenceSuite.tsx` | ~1306 |
| `Downloading report...` | three portal views (Advertiser, Investor, Vendor) | — |
| `AI systems refreshed` | `components/AIDiagnosticsCenter.tsx` | ~256 |

**`Reward payment processed` is the most serious.** A user is told money moved
and no request was made. Nothing is actually paid, so no money is lost — the
damage is a person believing a payment happened and acting on it.

### C1b — signposts, not lies

Roughly a third of the 44 tell the user where to go or what will happen next,
and are honest: *"View subscription plans to upgrade"*, *"Navigate to
Enterprise Content Center → AI Generator"*, *"Your account manager will move
you to X. Nothing has been charged."*, *"You'll be notified when AI Studio
launches!"*. Lazy in places, but they claim nothing false. **Not defects.**

## C2 — 85 claim success without reaching the server

Each needs reading, because some are legitimate: a handler may change local
state and say so (`setWeatherSource('demo')` then "Weather source set to Demo
Mode" did exactly what it claimed), or call a prop the parent persists. Not
yet triaged.

## A — 188 buttons with no handler

Not yet triaged. Expected to contain false positives: icon buttons inside a
wrapping link, decorative controls, and buttons whose handler arrives through
a spread prop. The count is a ceiling, not a finding.

## Already found and fixed by this method

**`UserManagementHub`** — four of its five tabs rendered a placeholder: an
icon, a sentence, three buttons with no `onClick`, and invented statistics
reading "24 Total / 18 Active" on a platform with ten accounts. Eric reported
it as "the add button does nothing". It now renders the real team panel.
Fixed and deployed 2026-11-18.

## Counted honestly

| | Count |
|---|---:|
| Buttons discovered | 4,498 |
| Buttons **behaviour-tested by clicking** | **0** |
| Buttons **statically reviewed** | 4,498 |
| Confirmed defects (C1a) | ~15 |
| Leads requiring triage (A + C2) | 273 |
| Confirmed working | **0** — nothing here establishes that |
