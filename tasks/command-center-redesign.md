# Plan — rebuild the command center

Eric: the layout is the same, he wants a whole new one, the left sidebar goes,
and it has to be easier to use.

First, a correction: the fix I shipped was to `UnifiedDashboardMobile`, the phone
layout. The desktop command center — `UnifiedDashboard`, 1,598 lines, the one
with the sidebar — was never touched. That is why it looks the same.

## What is actually wrong

**91 modules across 9 categories**, reached through three separate navigation
systems at once:

| | |
|---|---|
| Left sidebar | app-level links (Owner Dashboard, Dropshipping, …) |
| Tab bar | 9 category tabs — Operations 21, Financial 24, Systems 22, Marketing 15, People 9, plus five small ones |
| Search box | **filters only inside the tab you are already on** |

That last row is the heart of it. Search cannot find anything unless you have
already guessed which of nine buckets it lives in — so the one tool that should
make 91 destinations tractable is the one thing that doesn't work across them.
Remove the sidebar and that problem is untouched.

## The design

**One page. Search everything. Your own shortcuts on top.**

1. **Search across all 91 modules, not the active tab.** Type "invoice" and get
   it wherever it lives. Focused with `/` or Cmd-K, results navigable by arrow
   keys, Enter opens the first hit. For a screen with this many destinations
   this is the single highest-value change — it is what "command center" means
   everywhere else.

2. **Pinned, at the top.** The eight or so things opened daily, chosen by Eric,
   always the first thing on screen. Stored per account, editable by dragging or
   a pin icon on any card.

3. **Recent, underneath.** Tracked automatically as modules are opened. What was
   used yesterday is usually what is needed today, and it costs nothing to
   remember.

4. **Then everything, on one scrolling page.** Category headings as section
   markers rather than tabs, so the whole surface is visible to scrolling, to
   eyes, and to the browser's own find. No drill-down, no guessing a bucket.

5. **No sidebar.** The handful of app-level links it carried move into a compact
   header row.

The principle: three navigation systems become one, and the page stops asking
where something lives before it will show it to you.

## What this does not change

Not touching what any module *is* or where it goes — only how they are reached.
Every path stays as it is. If the new layout is wrong, the old component is one
revert away.

## Todo

- [ ] Global search over all modules, keyboard-driven, with the category shown
      on each result so it stays learnable
- [ ] Pinned row, persisted per account, editable
- [ ] Recents, tracked locally, capped at about eight
- [ ] Single-page category sections replacing the tab bar
- [ ] Header row absorbing the sidebar's links; sidebar removed
- [ ] Density that suits 91 items — smaller cards than today, so more fits
      without scrolling
- [ ] Verified by measurement at desktop and tablet widths, and rendered before
      it is pushed

## Open questions

1. **Tabs as well as the sidebar?** The recommendation is that both go — tabs
   are the reason search is scoped and the reason drill-down exists. But it is a
   bigger change than asked for, so worth confirming.
2. **What are the eight things opened every day?** Those become the default
   pinned set. Everything else can be found; these should never need finding.

## Review — built and wired in

### What shipped

`CommandCenterHome` replaces the desktop command center. The old layout is kept
rather than deleted, reachable with `?classic=1` and remembered afterwards;
`?classic=0` comes back. It is a large screen to replace in one go, and an
instant way back costs nothing — importantly, it does not need a deploy to
escape from.

The phone layout is untouched. It was fixed separately and already works.

### On the page

- **Six figures**: revenue collected, owed to you, **overdue**, active jobs,
  customers, crew. Overdue, active jobs and customers click through to what is
  behind them.
- **Still delinquent**: every invoice past its due date, oldest first, with the
  customer, the invoice number and days late. Over 60 days red, over 30 amber,
  total in the corner.
- **Revenue by month**, six months, and an honest empty state when nothing has
  been paid rather than a drawn-in chart.
- **Every day**: eight pinned tools, changeable from any card in the drawer.
- **Search across all 91 modules**, `/` or `Cmd-K` — which the old screen could
  not do, because its search only filtered inside the tab you were on.
- **All tools drawer** replacing the sidebar and the nine-tab bar.

### Where the numbers come from

`/command-center/summary` and `/invoices`. Both already existed, so **this
needed no deploy**. Two fields the summary already returned were simply never
read by the old layout — `openInvoiceTotal` and `pendingWorkRequests` — and they
are now.

### Verified by rendering, not by building

The wired dashboard was rendered with stubbed contexts and both paths checked:

- default renders the new layout, reading the real 91-module list rather than
  sample data
- `?classic=1` renders the old layout intact
- overdue arithmetic checked against the rendered screen: 8,450 + 3,120.50 +
  1,875 = $13,446 across three invoices, correctly excluding a paid invoice and
  one not yet due
- the delinquent panel was initially untested because the probe had no session
  and the component returned early — caught and fixed before it was believed

### A related bug found while testing

`globals.css` sets `padding: 0.75rem 1rem` on every `input`, outside any layer,
so it beats any padding a component sets on itself. That is why the search
icon sat on top of its own placeholder. Worked around locally with an inline
style rather than touching global CSS again — but it affects every custom-padded
input in the application and is the same cascade trap as the reset, in a
different disguise.

### Still open

- The eight default pins are a guess. Every card in the drawer has a pin, so
  they are ten seconds to change, but the defaults are mine and not Eric's.
- No "recently used" list yet. It was in the plan and is worth adding once the
  layout has settled.
- 91 modules may itself be the problem. Some are likely dead or duplicated —
  worth an audit, and it would do more for usability than any layout.
