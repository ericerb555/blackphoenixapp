# Turning on the OWASP rules — the runbook

Eric, 2026-11-14: *"mod security with owaso core rule set and enable it to
blocking mode on every route that accepts user imput"*, then *"ok so basically
add it on cloudflare"*, then *"i can do it later"*.

This is what "later" needs. It is written to be followed without re-deriving
any of it, and the order matters in two places.

## FIRST, THE SUBSTITUTION, SO NOBODY IS SURPRISED LATER

ModSecurity cannot run here and neither can fail2ban. Both are host software —
ModSecurity loads into Nginx or Apache, fail2ban tails a log file and drives
iptables. The API is Supabase Edge Functions and the front end is Vercel.
There is no host, no log file on disk, and no iptables.

What does the same job on this stack:

| Asked for | Here |
|---|---|
| ModSecurity + OWASP CRS, blocking | Cloudflare **WAF Managed Rules → Cloudflare OWASP Core Ruleset**, action Block |
| fail2ban, escalating bans | `supabase/functions/server/ipReputation.ts` — already written, already wired into every request, escalation added 2026-11-14 |

The second one is in the application because a firewall cannot see meaning:
forty requests to `/quotes/by-token/<forty different tokens>` are forty
ordinary GETs to Cloudflare and an enumeration run to us. That module's header
explains the split and is worth reading before changing either layer.

## THE PREREQUISITE THAT DECIDES WHETHER ANY OF THIS HELPS

A WAF only sees traffic that goes through Cloudflare.

**The API does.** `SUPABASE_ORIGIN` in `src/app/lib/apiConfig.ts` is
`https://api.theblackphoenixcompany.com`, which is the proxied hostname the
`api-origin-proxy` Worker serves. Verified in the live bundle on 2026-11-14:
one reference to that hostname, none to `*.supabase.co`.

**Auth does NOT.** `src/app/lib/supabase.ts` builds its client against
`https://<projectId>.supabase.co` directly, so every `/auth/v1/*` call —
sign-in, sign-up, token refresh, password reset — bypasses Cloudflare
completely.

That is the half a WAF is usually bought for. Credential stuffing, signup
abuse and token-refresh floods all land on `/auth/v1` and **a blocking OWASP
ruleset on the API hostname will not touch any of them.** It is not a reason
not to do this; it is a reason not to believe the job is finished afterwards.

Closing it means either Supabase's custom-domain add-on for the auth hostname,
or routing auth through the Worker as well. Neither is in scope here and both
belong on the list before anybody calls the perimeter done.

## WHAT TO TURN ON

Cloudflare dashboard → the `theblackphoenixcompany.com` zone → **Security →
WAF → Managed rules**.

1. Deploy **Cloudflare OWASP Core Ruleset**.
2. Set **Paranoia level: PL2**. PL1 misses too much; PL3 and PL4 are written
   for applications that never accept free text and this one is mostly free
   text — quotes, notes, project descriptions.
3. Set **Score threshold: Medium (40)** to begin with.
4. Set **Action: Managed Challenge**, not Block, for the first run.
5. Leave **Cloudflare Managed Ruleset** on as well. It is the signature-based
   one and it is where the actual exploits get caught; OWASP CRS is the
   scoring layer on top.

Managed rules are a **Pro plan feature** ($20–25/mo). On Free the ruleset is
not available — `docs/security/waf.md` says the same and it has not changed.

### Why Managed Challenge before Block

Because of what this application sends. Verified against the code on
2026-11-14, these routes put **base64 image payloads inside JSON bodies**:

    POST /make-server-3eae23a6/ai/vision                       blueprint reads
    POST /make-server-3eae23a6/content-studio/pick-before-after up to 8 photos
    POST /make-server-3eae23a6/ai-floorplan/analyze-image       floor plans
    POST /make-server-3eae23a6/ai-floorplan/analyze-video       frames

and these are multipart uploads:

    POST /make-server-3eae23a6/gallery/upload                   job photos
    POST /make-server-3eae23a6/media/upload                     media library

A long base64 string is a reliable OWASP CRS false positive — it matches SQLi
and XSS character-frequency rules by accident, because it contains every
character. Going straight to Block means blueprint analysis, the before/after
picker and crew photo upload stop working the moment it is switched on, and
the failure will look like the app being broken rather than like a firewall.

So: **Managed Challenge for a week, read what it catches, then Block.** That
is step 2 of `docs/security/waf.md` and the reason it exists.

### The exceptions to add before Block

Once the logs are read, add a **WAF exception** (Security → WAF → Managed
rules → the OWASP ruleset → Add exception) skipping the OWASP ruleset for:

    (http.request.uri.path contains "/ai/vision")
    or (http.request.uri.path contains "/content-studio/pick-before-after")
    or (http.request.uri.path contains "/ai-floorplan/")
    or (http.request.uri.path contains "/gallery/upload")
    or (http.request.uri.path contains "/media/upload")

Every one of those is authenticated and staff-gated on the server, so the
exception is narrow and the authorisation gate is still in front of them.
Skipping the OWASP *scoring* ruleset on those paths does not skip the
Cloudflare Managed Ruleset, which should stay on everywhere.

Do not add exceptions speculatively. Add them for what the challenge week
actually flags, with this list as the prediction to check against.

## THE OTHER HALF, WHICH IS ALREADY BUILT AND IS NOT ON

`IP_REPUTATION_ENFORCE` is unset in production, so `ipReputation` is in
report-only: it scores, logs `would-ban`, and allows. Setting it to `true` and
redeploying is the whole change.

**Do not set it yet.** Read on 2026-11-14:

    ipreg:70.109.187.2   score 55.9   banned_until in 15 min   last seen 21:30

The ban threshold is 30. That address was in a would-ban state at the moment
of reading, and it is the same address recorded in `ipReputation.ts`'s own
header as the one used to measure the Worker on 2026-11-11 — which makes it
very likely to be Eric's own.

Turning enforcement on in that state locks him out of the platform for fifteen
minutes, then thirty, then an hour, because the escalation now works.

**Before enabling:** find what is scoring that address, which will be auth
refusals or 404s from testing rather than anything hostile, and either fix the
signal or allowlist the address. Then enable, and watch the `would-ban` lines
become `BAN` lines for addresses that deserve it.

## THE ORDER

1. Confirm whether `70.109.187.2` is Eric. Fix or allowlist.
2. Pro plan, if it is not already.
3. OWASP CRS at PL2, score 40, **Managed Challenge**.
4. One week. Read Security → Events, filtered to the OWASP ruleset.
5. Exceptions for whatever legitimately tripped — the five paths above are the
   prediction.
6. **Action → Block.**
7. `IP_REPUTATION_ENFORCE=true`, redeploy, watch the logs for a day.
8. Auth is still outside all of this. Put it on the list.
