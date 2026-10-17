# HTTP security headers

Set in `vercel.json`, which is JSON and therefore cannot carry comments — so
the reasoning lives here. Added 2026-10-16 as Phase 1 of
`tasks/security-audit-2026-10-16.md`, which found the site serving HSTS and
nothing else.

Verified by `npm run security` (the `HDR-*` checks).

## What each one is for

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Forces HTTPS for two years after a first visit. Already present; `includeSubDomains` is new. |
| `X-Frame-Options` | `SAMEORIGIN` | Stops a hostile site framing a portal and harvesting clicks. |
| `X-Content-Type-Options` | `nosniff` | Stops the browser second-guessing a declared content type. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Our URLs carry quote and screening tokens. Without this, the full URL — token included — is sent to every third-party resource the page loads. |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Severs the `window.opener` link to pages we open. `-allow-popups` rather than plain `same-origin` because the Stripe redirect needs the handle back. |
| `Permissions-Policy` | see below | Denies device APIs by default. |
| `Content-Security-Policy-Report-Only` | see below | Bounds the damage of any XSS. Report-only for now — see the rollout note. |

## Why `SAMEORIGIN` and not `DENY`

`DENY` is the stronger answer and the wrong one here: the app frames its own
pages in several places. `SAMEORIGIN` blocks every third-party framing, which
is the actual clickjacking threat, and leaves our own embeds working.

## Why HSTS has no `preload`

`includeSubDomains` is safe and reversible. `preload` is neither — it submits
the domain to a list baked into browser binaries, and removal takes months to
reach users. Any subdomain that cannot serve HTTPS becomes unreachable with no
quick way back. Add it deliberately, after confirming every subdomain is
HTTPS-only, not as part of a security sweep.

## Permissions-Policy, and why three things are allowed

```
camera=(self), microphone=(self), geolocation=(self), payment=(self), …everything else=()
```

All three are genuinely used and the app breaks without them: `getUserMedia`
in eight places and `MediaRecorder` in thirty-five (the change-order camera,
the employee mobile app, video capture and the reel renderer), and
`navigator.geolocation` in three. `payment=(self)` is for Stripe.

Everything else — accelerometer, gyroscope, magnetometer, USB, MIDI, serial,
bluetooth, and Topics advertising — is denied outright. Nothing uses them, and
denying them means a compromised third-party script cannot either.

## The CSP, and why it is report-only

The policy below is the **target**, deployed in report-only so the browser
reports what it would have blocked without actually blocking it. Switching a
first-draft CSP straight to enforcing on a storefront is how you take down
checkout on a Friday.

```
default-src 'self'; base-uri 'self'; object-src 'none';
frame-ancestors 'self'; form-action 'self' https://checkout.stripe.com;
script-src  'self' 'sha256-R0O0…' 'sha256-dQDQ…' https://js.stripe.com;
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src    'self' data: https://fonts.gstatic.com;
img-src     'self' data: blob: <supabase> unsplash cdn-files-a maptiler ytimg osm-tiles;
media-src   'self' data: blob: <supabase> commondatastorage;
connect-src 'self' <supabase https+wss> api.stripe.com api.maptiler.com nominatim;
frame-src   'self' js.stripe.com hooks.stripe.com youtube youtube-nocookie openstreetmap;
worker-src  'self' blob:;
upgrade-insecure-requests
```

Each origin is there because something real needs it: Stripe Elements loads
`js.stripe.com` and frames `hooks.stripe.com`; the Exchange map draws tiles
from `api.maptiler.com`; supplier product images come from
`files.cdn-files-a.com`; `commondatastorage.googleapis.com` serves sample
video.

### `script-src` uses hashes, not `'unsafe-inline'`

`index.html` carries two inline scripts — a console-noise filter and a
service-worker cleanup. The easy fix is `'unsafe-inline'`, and it would gut the
policy: inline script is exactly what an XSS injects, so allowing it makes
`script-src` close to decorative. The two are hashed instead, so those two
exact scripts run and no others.

**The cost is that editing `index.html` silently invalidates a hash.** In
report-only that shows up as a violation report nobody is watching; once
enforcing, the script just stops running. So the hashes are checked
automatically — `npm run security` recomputes them from `index.html` and fails
if they have drifted from `vercel.json` (check `HDR-CSP-HASH`). Edit the file,
run the probe, paste the new hash in.

### `style-src` does need `'unsafe-inline'`

Emotion and MUI inject `<style>` elements at runtime; there is no hash or nonce
available for content generated in the browser. This is the standard
compromise for an Emotion app, and style injection is a far weaker vector than
script injection.

### Known violations the report will show

Expected, and not yet fixed:

1. **`<script type="application/ld+json">` on `/work` and `/blog`.** CSP applies
   to inline script of every type, data blocks included. `api/render.js` writes
   these for SEO. Fix by serving the JSON-LD from an external file or adding a
   per-request nonce.
2. **Anything new.** That is the point of this phase.

## Promoting to enforcing

1. Collect reports for a week across the storefront, portals, checkout and the
   Exchange map. Add a `report-uri`/`report-to` endpoint first, or read them
   from browser consoles — right now nothing collects them, so this step means
   actually looking.
2. Fix the JSON-LD violation and anything legitimate the reports surface.
3. Rename the header to `Content-Security-Policy` and redeploy.
4. Flip `HDR-content-security-policy` in `scripts/security-probe.mjs` from
   `warn` to `fail` so a regression is caught.
