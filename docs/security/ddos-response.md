# DDoS response plan

**Version 1.0, 2026-10-16.** Companion to `docs/security/incident-response.md`,
which covers breaches; this covers availability. Review every 6 months.

Written before an attack rather than during one, which is the only time it can
be written well. Under attack you will not be reading prose, so the first
section is a card you can act on in two minutes and everything else is
background.

> **Read this now, once, while nothing is wrong.** The single most important
> fact in it is that **this is a billing event as much as an outage** — see
> [The bill](#the-bill-is-part-of-the-attack). Most people discover that
> afterwards.

---

## The first ten minutes

### 1. Confirm it is an attack, not a success

Check before you act. A launch, a press mention, or somebody's newsletter looks
identical on a traffic graph and the response is the opposite.

| Looks like an attack | Looks like real traffic |
|---|---|
| One path, or a handful, hammered | Spread across the app the way people use it |
| Few source ASNs, odd geography | Distribution resembles your customer base |
| No referrers, uniform user agents | Varied referrers, real browser fingerprints |
| Flat or square-wave rate | Ragged, with human rhythm |
| Expensive endpoints targeted | Cheap and expensive in normal proportion |

Where to look: Vercel dashboard → Observability; Supabase dashboard → Reports
→ API; Supabase logs (`query_logs`, the `edge_logs` source).

### 2. Classify it

| | What it is | First move |
|---|---|---|
| **L7 flood** | Volume of ordinary-looking HTTP | Cloudflare Under Attack mode |
| **Targeted expensive endpoint** | Few requests, each costing a model call, a PDF, or a takeoff | Disable that feature's flag, then rate-limit it |
| **Credential / token grinding** | Login or share-token guessing at volume | Already scored by `ipReputation.ts`; tighten at the edge |
| **Amplification via our own egress** | Making us fetch things | `safeFetch` bounds it; check the AI spend meters |

The second row is the one to expect here, and it is the cheapest to run
against us: a handful of requests per second to an AI route costs the attacker
nothing and costs us real money per request.

### 3. Act, by layer

**If Cloudflare is in front** (see `docs/security/waf.md` — not yet as of
2026-10-16):

1. **Under Attack mode** — dashboard → Security → Settings. One toggle,
   interstitial challenge on every request. Blunt, immediate, and it will
   annoy real customers; that is the correct trade while you work out what is
   happening.
2. **Rate-limit the targeted path** specifically, rather than everything.
3. **Block by ASN or country** if the sources are concentrated. Narrowest rule
   that works.
4. Turn Under Attack mode **off** once a targeted rule is holding. Left on, it
   quietly suppresses real signups for days.

**Today, without Cloudflare**, the honest list is much shorter:

1. Vercel absorbs network-layer floods on its own and you have no controls
   beyond that. Vercel Firewall rules need a paid plan.
2. Supabase sits behind their Cloudflare, but the rules are theirs. **Open a
   Supabase support ticket early** — they can act at their edge and you cannot.
3. Set `AUTH_ENFORCE`-style feature flags off for whatever is being targeted.
   The AI routes are metered by `aiSpend`; lowering those ceilings is the
   fastest way to cap damage.
4. **Last resort: pause the Supabase project.** It stops everything, including
   paying customers. Justified only when the alternative is an unbounded bill.

### 4. Protect the bill

Do this during, not after. See below.

### 5. Say something

If it is visible to customers for more than a few minutes, post a short
status note. "We are aware and working on it" costs nothing and stops the
support load compounding the outage.

---

## The bill is part of the attack

This stack is usage-priced end to end: Supabase edge function invocations,
database egress, Vercel bandwidth and function time, and — the expensive one —
OpenAI and Anthropic calls behind the AI routes. An attacker who cannot take
the service down can still make it cost money, and on this architecture that
is the easier attack by a wide margin.

**Before anything happens:**

- Set spend caps and billing alerts on Supabase, Vercel, OpenAI and Anthropic.
  An alert at 2× normal daily spend is worth more than any dashboard.
- Know what a normal day costs. You cannot spot an anomaly against a number
  you have never looked at.
- `AI_METERED_PREFIXES` in the edge function already meters every model-calling
  route through `aiSpend`. Those ceilings are the throttle that matters most
  here — know where they are set and how to lower them without a deploy.

**During:** lower the AI ceilings first. It is the highest cost-per-request
surface and the least damaging thing to degrade — an estimate that has to wait
is a worse experience; a five-figure model bill is a worse month.

---

## What already helps

Not nothing, and worth knowing before you reach for the panic switch:

- **`ipReputation.ts`** scores behaviour — token grinding, auth refusals,
  scanning breadth — and escalates throttle → temporary ban. It is behavioural
  rather than volumetric, so it catches the low-and-slow attacks a rate limit
  misses. It does *not* help against a flood; that is the firewall's job.
- **`aiSpend`** caps the expensive routes per account.
- **The authorisation gate** means an unauthenticated flood reaches a 401 after
  one token lookup rather than touching the database.
- **Supabase and Vercel both have upstream DDoS absorption** at the network
  layer. Layer 3/4 is genuinely not your problem; layer 7 is.

## What is missing

Stated plainly so the plan is not read as more complete than it is.

- **No WAF.** `docs/security/waf.md` is the plan; nothing is deployed.
- **No edge rate limiting.** Per-IP limits only exist inside the application,
  which means the request has already cost us by the time it is counted.
- **No spend caps or billing alerts configured** as of 2026-10-16.
- **No status page**, so communicating during an outage means ad-hoc email.
- **No load baseline.** Nobody has recorded what a normal hour looks like, so
  "unusual" is currently a judgement call made under pressure.

Closing the first three is most of the value and none of them is a large job.

---

## Afterwards

Within a week, in `docs/security/incidents/`:

- Timeline, peak rate, what was targeted, what the attacker achieved.
- **What it cost** — in money, not just minutes.
- Which control actually stopped it, and how long it took to find.
- What would have detected it sooner. If the answer is an alert, build the
  alert.
- Add a check to `scripts/security-probe.mjs` if anything about the response
  revealed a control that was absent or misconfigured.
