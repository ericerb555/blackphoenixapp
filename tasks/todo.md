# One standard settings panel for every portal

## What is wrong today

- **15 header buttons across 9 portals do nothing.** Seven Settings gears and
  eight notification Bells, none with a click handler at all.
- **Three portals lie.** Condo Manager, Property Manager and Sub-Tenant have a
  save button wired to `toast.success('Settings saved!')` and nothing else. It
  tells somebody their settings were saved and writes nothing anywhere.
- Landlord and Territory already save properly. They are the model.

## What already exists (and changes the plan)

Checking before building turned up more than expected:

| | state |
|---|---|
| `GET`/`PUT /me/notification-prefs` | **real, server-side, per user** — and the GET returns the event list and labels for that user |
| `GET /me/notifications` + read/clear | real — what the Bell should open |
| `GET /me/entitlements` | real — what this user actually has access to |
| `NotificationSettings.tsx` | good UI, but saves to **localStorage only**, so preferences do not follow a vendor to their phone |
| `PortalGlobalSettings.tsx` | real and server-backed, but it is the **admin** screen that configures portals globally — a vendor must never open it |

So the server work is largely done and simply was never wired to anything.

## The approach

One `PortalSettings` component, opened by the gear in every portal. Standard
everywhere, but it shows the right things per person on its own, because
`/me/notification-prefs` returns that user's own event list and `/me/entitlements`
returns what they can reach. No per-portal variants to maintain.

Nothing about any portal's layout or design changes — a dead button starts
opening a panel.

## Todo

- [ ] `PortalSettings` panel: Account, Notifications, Your access, Sign out
- [ ] Notifications section reads and writes `/me/notification-prefs`, so
      preferences follow the person across devices instead of sitting in one
      browser
- [ ] "Your access" reads `/me/entitlements` — read-only, and it answers the
      question each portal user actually has, which is what am I allowed to do here
- [ ] Wire the 7 Settings gears to open it
- [ ] Wire the 8 Bells to open it on the notifications section, backed by
      `/me/notifications`
- [ ] Replace the 3 fake "Settings saved!" buttons with the real panel
- [ ] Verify in a browser at desktop and phone size, not just a passing build

## Review

_(to be completed)_
