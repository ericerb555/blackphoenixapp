# PLAN — a realistic estimate the customer gets at once, and can email themselves

Eric, 2026-10-15:

> *"before we start lets get a detailed plan to allow customer to get a
> realistic estimates maybe we can create a quote right away and then they can
> email it to themselves?"*

Companion to `tasks/trash-removal-estimator.md`, which covers reading the photos.
This one covers what happens to the number afterwards.

---

## The finding that changes what this job is

**Everything needed to send a customer a document they can keep already exists
and works. What does not exist is permission for the customer to make one — and
that is deliberate, recent, and should not be undone.**

Four findings. The first decides the shape of the whole feature.

### 1. "Only the company writes a quote" — and it was made so on purpose

`quotes.tsx:282`, written as a fix, not an oversight:

> *"`quoteActor` already existed here and the list route uses it properly — staff
> see every quote, a customer sees only their own. The four write handlers used
> it nowhere, so **any signed-in account could create, edit, reassign or delete
> any quote by id**. A quote becomes a contract and then an invoice, so that is
> the price of a job editable by whoever asks."*

`requireQuoteStaff` now guards create, edit, assign and delete. The same lock was
put on three neighbouring routes for the same reason:

    PUT /quotes/:id             "the figures a customer is about to sign were
                                editable by anyone who could name the quote"
    POST /quotes/generate-link  "any signed-in account could mint a link for any
                                quote id and then read or sign it"
    POST /quotes/:id/send-to-customer   administrator only

So **"create a quote right away" cannot mean giving the customer `POST
/quotes`.** In this codebase a quote is the precursor to a contract and an
invoice; it carries a sequential number minted on creation so gaps are
auditable, and its prices are frozen at send so there is a record of what was
promised. A customer-authored record in that series is not a convenience, it is
a hole in the audit trail.

### 2. The guard against exactly this already exists, and it is the right one

`send-to-customer` refuses to send a quote whose `pricingBasis` is in
`UNPRICED_BASES` — `offline-demo` or `server-heuristic` — unless an
administrator explicitly acknowledges it, and it returns a distinct code
(`UNPRICED_QUOTE_NEEDS_ACKNOWLEDGEMENT`) so the editor can ask rather than
report an error. The acknowledgement is recorded on the quote with who and when.

That gate was built for precisely the situation this feature creates: a complete,
itemised, plausible document whose numbers did not come from real prices. A
photo-derived estimate has to pass through it rather than around it.

### 3. The emailed-link mechanism is already built, end to end

Nothing here needs inventing:

    shareToken.ts               256-bit token, stored as a SHA-256 hash,
                                30-day expiry (QUOTE_LINK_DAYS), revocable,
                                refuses a second decision
    POST /quotes/generate-link  mints it, writes quote_token:{hash}, returns
                                /customer-quote-approval?token=… (admin only)
    GET  /quotes/by-token/:t    public — one answer for invalid, expired and
                                revoked, so a stranger guessing learns nothing
    POST /quotes/by-token/:t/sign   public approval and signature
    /email-center/send          Resend, with base64 attachments, and it already
                                strips a data-URI prefix because that corrupts
                                the PDF
    PDFService.getQuotePDFBase64    a finished PDF, already headed **ESTIMATE**
                                with **Valid Until:** and filename prefix
                                `Estimate` (pdfService.ts, QUOTE_WORDING)

The document the customer would receive is already worded as an estimate. That is
a useful accident and the plan leans on it.

### 4. Two things that must be fixed first, both found by reading

**`CustomerQuoteApproval.tsx` ships a fake quote as its default state, and merges
the real one on top of it field by field.**

`useState<Quote>` is initialised with John Smith, `john.smith@email.com`, a
Kitchen Renovation at 123 Main St, $10,200 of white shaker cabinets and Kashmir
White granite (line 258 onward). The load effect then does
`setQuote(prev => ({ ...prev, materials: qd.materials || prev.materials, ... }))`
— `|| prev` on **every field**. So:

- a quote whose shape lacks `materials` displays **granite countertops**
- a failed fetch (`r.ok ? r.json() : null`) sets `loading = false` and leaves the
  **entire fiction** on screen with no error

This is the page a customer lands on from an emailed link. A trash removal
estimate sent through it today could show a kitchen remodel.

- [ ] Replace the mock default with an empty state and render nothing until the
      token resolves. A failed or expired token gets the refusal, not a
      fallback.
- [ ] Remove every `|| prev` in the merge. A field the quote does not have is
      absent, not inherited.

**`/email-center/send` is an open relay, and the portal must not call it.**

It takes `to`, `subject`, `html` and `attachments` from the request body, sends
through Resend as `Black Phoenix <FROM_EMAIL>`, and has no cap. It is **not** in
`ADMIN_PREFIXES`, so its tier is `user` — reachable by every customer, tenant,
vendor and subcontractor with a session. That is the same shape as the
market-alert pair described at the top of `ADMIN_PREFIXES`:

> *"let any of them send arbitrary email and arbitrary SMS, to any address or
> number they chose, wearing Black Phoenix's identity — phishing, spam, and a
> burnt sender reputation on somebody else's Resend and Twilio bill."*

- [ ] Do not wire "email it to me" to `/email-center/send`. The route for this
      names no recipient — see below. Whether `/email-center` itself should move
      behind an admin check is a separate finding worth raising on its own; this
      plan only undertakes not to make it worse.

---

## The shape that works: two documents, not one

    ESTIMATE    the customer's. Made instantly, from their own photos, for
                their own job. A range. Self-serve. Expires. Theirs to keep,
                download and email to themselves.

    QUOTE       the company's. Numbered, sequential, auditable. Priced against
                the catalogue and the rate card. Frozen at send. Becomes a
                contract and then an invoice. A staff act, always.

An estimate is **an input to** a quote, not a draft of one. The customer gets
their number in a minute without anybody touching it; the office turns it into a
quote when they choose to, with the estimate attached as what it came from.

This is not a compromise on Eric's ask — it is the only version of it that does
not put an unreviewed number into the series that ends in an invoice. And it is
already how the PDF is worded.

- [ ] `estimate:{id}` records, with `jobId` / `workRequestId` when there is one.
- [ ] `POST /estimates` — writable by a **customer, for themselves only**. The
      owner is the email off the verified token via `intakeActor`, never a body
      field, the same rule `quoteActor` states: *"`?userId=` is a request, not a
      proof."*
- [ ] **The browser sends observations and conditions; it never sends money.**
      Every figure is computed server-side by `trashTakeoff` against the rate
      card. The precedent is `/store/checkout`, exempt from the auth wall
      precisely because *"every unit price is looked up from our own product
      records… an item that cannot be priced is refused rather than sold at the
      price the browser suggested."*
- [ ] `GET /estimates` scoped exactly as `quotes.tsx` scopes quotes: staff see
      all, a customer sees their own, one with no email on it is staff-only
      because there is nobody it can be proven to belong to.
- [ ] `POST /estimates/:id/to-quote` — **staff only**, `requireQuoteStaff`. Mints
      the quote number, carries the estimate id across as provenance, and goes
      through the existing send gate.

---

## What makes it a *realistic* estimate

Eric's word, and the part most likely to go wrong. Five rules.

- [ ] **A range, not a figure.** Low / likely / high, derived from the takeoff's
      own per-item confidence and from how much volume it marked unseen — not a
      flat ±15% dressed up as analysis. The market-rent route already returns
      `low / typical / high` and the customer-facing widget already renders that
      shape.
- [ ] **Priced from records, never by the model.** Labour from
      `labor_rates:global` through `resolveLaborRates`; disposal from the
      `waste_entry:` dump tickets, falling back to a standard table marked
      `standard`. `repriceEstimate` already labels every line `catalogue` /
      `your-rate` / `standard` / `estimated`, and `QuotePricingBasisBanner`
      already renders the distinction.
- [ ] **What it could not see, printed beside the number.** The honest edge of a
      photo estimate. A customer who is told "we could not see behind the stack
      on the left" accepts a revision on the day; one who is not, does not.
- [ ] **A new `pricingBasis: 'photo-takeoff'`**, added to the allowlist in
      `normalizeDoc`. Not folded into `estimator`: a takeoff read off photographs
      carries a different uncertainty from one read off a drawing, and the two
      should not be indistinguishable in the record six months from now.
- [ ] **Low confidence blocks the automatic path, not the estimate.** Where the
      takeoff flags significant unseen volume, a suspected hazard, or an access
      condition it could not judge, the customer still gets their range — and it
      is marked *needs a look from us* rather than being quietly presented as
      firm. Extend the `send-to-customer` gate to ask about those, the same way
      it already asks about an unpriced basis.
- [ ] **An expiry, stated on the document.** The PDF already has a
      **Valid Until:** field and nothing fills it. Disposal rates and fuel move;
      a range with no end date is a promise nobody made. 30 days, to match
      `QUOTE_LINK_DAYS`.

---

## "Email it to themselves" — the design

The request is modest and the failure mode is not: an email endpoint a customer
can aim is a spam relay, and the one we have is already aimable.

- [ ] **`POST /estimates/:id/email-to-me`.** One route, one verb, and the name is
      the security property: **the body cannot name a recipient.** The address is
      the verified session email, resolved server-side. There is no `to` field to
      send.
- [ ] **The server composes the email from the stored estimate record**, not from
      HTML the browser supplies. Anything else is `/email-center/send` with
      extra steps.
- [ ] **A token link rather than a server-rendered attachment.** `PDFService` is
      jsPDF in the browser; there is no PDF renderer on the server and porting
      one into Deno to attach a file nobody asked for is the wrong trade. So the
      email carries the figures in HTML plus a 30-day token link to the estimate.
      **Download PDF** stays a button in the browser, where `getQuotePDFBase64`
      already works and costs the server nothing.
      - The alternative — browser builds the PDF, posts the base64, server
        attaches it — is tempting because `EmailService.sendInvoiceEmail` already
        does exactly that for invoices. It is rejected here for one reason: the
        attachment would then be a document the *customer* composed, sent from
        our domain under our name. Fine for an invoice staff generated. Not fine
        for a self-serve estimate.
- [ ] **Reuse the share token, do not invent a second kind.** `mintShareToken`
      gives 256 bits, hashed at rest, expiring, revocable, and
      `shareTokenUsable` already answers invalid / expired / revoked with one
      message so a guesser learns nothing. A new `estimate_token:{hash}` keyed
      the same way, read by a public `GET /estimates/by-token/:token` added to
      `PUBLIC_PREFIXES` beside `/quotes/by-token/` — with that list's own
      reasoning quoted, because it is the reason this works at all: *"a signing
      link whose whole purpose is to reach somebody without an account cannot
      require an account."*
      - **Reading only.** The quote token authorises *signing*; this one
        authorises nothing. An estimate cannot be accepted — accepting is what a
        quote is for — so the by-token route for estimates is GET and there is
        no POST beside it.
- [ ] **A daily cap per account.** `withinIssueCap` in `exchangeClaim.ts` is the
      precedent, and its comment is the right framing: *"the abuse is not
      somebody failing to type their own code — it is using our server to text a
      stranger thirty times."* Same here: the cap exists so nobody uses our
      Resend reputation as a mailing loop.
- [ ] **Every send is logged.** `logSentEmail` already records recipient,
      subject, template and status, and the Email Center screen already lists
      the last 200. Nothing new needed.

---

## What the customer actually sees

- [ ] After the photos: a range, the itemised basis, what could not be seen, and
      an expiry date.
- [ ] Three buttons, in this order: **Email this to me** · **Download PDF** ·
      **Ask us to confirm it**.
- [ ] The third is the one that matters commercially. It is the handoff — it
      files the estimate for the office with the photos attached, and it is where
      a self-serve number becomes a job. Without it the feature answers a
      question and loses the customer.
- [ ] In the portal, the estimate appears in its own list — not mixed into
      **Quotes & Invoices**, because a customer who cannot tell their own
      estimate from our quote will hold us to the wrong one.
- [ ] Signed-out customers get the estimate on screen and by email, and are
      offered an account to keep it. The work request path behind it needs a
      session today (`/work-requests` is not in `PUBLIC_POST_PATHS`), so the
      guest route is its own decision — see below.

---

## Order of work

1. **Fix `CustomerQuoteApproval.tsx`** — the mock default and the `|| prev`
    merge. Before anything is emailed to anybody, because that is the page the
    link lands on. Worth doing today regardless of this feature.
2. **The estimate record and its routes** — `POST /estimates` (customer, own
    only, prices computed server-side), `GET /estimates` (scoped), and the
    `photo-takeoff` basis.
3. **The range, and the unseen-volume reporting** out of `trashTakeoff`.
4. **`POST /estimates/:id/email-to-me`** — session email only, server-composed,
    token link, daily cap.
5. **The public `GET /estimates/by-token/:token`** and the page it lands on,
    read-only.
6. **Download PDF** in the portal, through the existing `getQuotePDFBase64`.
7. **"Ask us to confirm it"** — the handoff, and the pipeline card behind it.
8. **`POST /estimates/:id/to-quote`**, staff only, through the existing send
    gate.

Steps 1 and 2 are the whole security story. Step 4 is the thing Eric asked for
and it is twenty lines once step 2 exists.

---

## Deliberately not in this plan

**No customer-written quotes.** See the finding. The estimate is a different
record with a different name and no number in the quote series.

**No loosening of `/email-center/send`, and no new caller of it from a portal.**
That route's exposure is a finding in its own right and wants its own decision,
not a feature leaning on it.

**No server-side PDF rendering.** jsPDF stays in the browser, where it already
works.

**No acceptance or signature on an estimate.** Accepting is what a quote is for,
and an estimate somebody can sign is a quote with the audit trail removed.

**No guest estimates in the first pass.** It is a real opportunity — the work
request form already reaches for `publicAnonKey` as though guests were intended
— but `/work-requests` is not in `PUBLIC_POST_PATHS`, the media buckets are
private, and every entry on that list carries an argument about what the route
trusts. This one would need the same argument written properly rather than
assumed.

---

## Decisions needed from Eric

1. **Does the self-serve range go out without anybody looking at it?** The plan
   assumes yes, marked as an estimate with an expiry, except where the takeoff
   flags low confidence. The alternative is that every estimate waits for the
   office, which is safer and loses most of the value.
2. **How wide is the range allowed to get before we stop showing a number?** At
   some spread the honest answer is "we need to see it" — $400 to $1,900 is not
   an estimate, it is a shrug.
3. **How many estimates a day per account**, for the email cap and the model
   ceiling.
4. **Does an estimate expire at 30 days or sooner?** Disposal rates move.

---

## Review

*(To be completed when the work is done.)*
