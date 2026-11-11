# PLAN — an agent that interviews the customer until the job is actually quotable

Eric, 2026-11-10:

> *"when i request or a customer work requests can we build and agent in the
> work request/ quote buttons to help the customer fill out everything we need
> to get the most accurate details and picture and videos?"*

**Yes. And the surprise is that most of it is already built — it is just broken
for the people it was built for, and it is interviewing them about the wrong
things.**

Companion to `tasks/instant-estimate-for-the-customer.md`, which covers what
happens to the number afterwards, and `tasks/trash-removal-estimator.md`, which
covers reading the photos.

---

## The five findings that decide the shape of this

Every one of these came from reading the deployed code, not from guessing.

### F1 — The agent exists. It shipped, and nobody said so.

`POST /make-server-3eae23a6/ai-guide-chat` (index.tsx:4068) is a working intake
assistant: it takes the conversation and the current `formData`, works out which
fields are filled and which are missing, asks about *one* missing field at a
time, and returns

    { message, fieldUpdates, missingFields, filledFields, complete }

`ClientWorkRequestForm.tsx:1839` already calls it, already renders the
conversation, and already applies `fieldUpdates` straight into the form. The
chat panel, the "what is still missing" list and the completion flag are all
there.

So this job is not "build an agent". It is "fix the one it has, and point it at
the right questions".

### F2 — It is broken for every signed-out customer · **THIS IS THE BUG**

The form lives on `request-service`, a **public** route. The call at line 1851
sends `await authedHeaders()`, and `authedHeaders()` is documented to **throw**
when there is no session:

> *"It throws rather than quietly falling back to the anon key."*

So for a visitor who is not signed in — which is most people who reach a public
"request service" page — `sendAiMessage` throws before the request is even made,
lands in its own `catch`, and renders:

> *"Sorry, I'm having trouble connecting right now. You can fill in the form
> fields manually and click Continue when ready."*

It reads as a flaky AI service. It is a missing token. **This exact bug has
already been found and fixed once in this very file** — the comment at line 694
describes the dead materials fetches breaking the same way, on the same route,
for the same reason. The AI guide call was not part of that sweep.

And the server agrees with the client, so fixing only one side changes nothing:
`/ai-guide-chat` is **not** in `PUBLIC_POST_PATHS` (index.tsx:1005), so an
anonymous POST is refused by the auth gate regardless of what the browser sends.

**Both halves have to move together, and that is a decision, not a typo** — see
§Decisions, because making an AI endpoint public is the expensive part of this
whole plan.

### F3 — It asks for contact details, not for the things that make an estimate accurate

This is the substantive gap, and it is the one Eric's question is actually
about. What the agent currently checks (index.tsx:4091):

    projectName · clientName · clientEmail · clientPhone · siteAddress
    city · state · zipCode · projectDescription · timeline · budget
    propertyType · priorityLevel
    (+ kitchen layout / cabinet / countertop, architectural style, room count)

What the estimator actually consumes, from `quoteBrief.ts` — the module whose
entire job is "turning what somebody knows about a job into context an estimator
can use":

    size        squareFootage · linearFootage · roomCount · ceilingHeight
    place       unitCount · storeys · accessNotes
    conditions  occupancy · parking · stairsOrLift · workingHours
    timing      urgency · preferredWindow · deadline
    nature      workNature  (new work, or replacing something already there)
    words       brief (verbatim, weighted last) · exclusions

**The overlap is almost nil.** Not one measurement the takeoff needs is on the
agent's list. An interview that ends with a complete address and no square
footage has collected a customer, not a job — and `StartQuoteModal` already
exposes every one of those fields, under "Job details — the numbers a takeoff
needs", for Eric to type in by hand afterwards.

`quoteBrief.ts` also states the rule that makes an interviewer the right tool
here rather than a longer form:

> *"A field nobody filled in is absent, not 'unknown'. Sending
> `Ceiling height: unknown` tells a model something about the job: that somebody
> looked and could not say. Omitting the line tells it nothing, which is the
> truth."*

A form full of boxes gets `unknown` typed into it, or skipped. An interviewer
that asks "roughly how tall are the ceilings — normal eight foot, or higher?"
gets a number or an honest nothing. That is the whole argument for this feature,
and it only pays off if it asks about the measurements.

### F4 — It never mentions photos or videos, on a form that already takes them

Eric asked for pictures and video. The form already has the upload (line 948)
and already uploads to the `project-photos` bucket on submit (line 1083). For
trash and demolition it is already **mandatory**:

    'Please upload at least one photo of items to remove for an accurate quote'

The agent knows none of this. `photos` is not in its field list, so it never
asks, never counts what was attached, and cannot say *"I can see the deck but
not where it meets the house — one more from the left-hand side would let us
price the flashing."* That sentence is the entire value of an agent over a form,
and it is the one thing it cannot currently say.

### F5 — The model can write any field, and the customer's text is not fenced

Two defects worth fixing while we are in here.

**No allowlist on what comes back.** index.tsx:4195:

```js
const parsed = JSON.parse(fieldsMatch[1].trim());
for (const [k, v] of Object.entries(parsed)) {
  if (v !== '' && v !== null && v !== undefined && v !== 0) fieldUpdates[k] = v;
}
```

Every key the model emits is passed through, and the client spreads it over form
state: `setFormData(prev => ({ ...prev, ...data.fieldUpdates }))`. The filter is
on the *value*, never the *key*. So the model may write fields nobody asked it
about — and one of them is `photos`, which is a `File[]`. A `"photos": "none"`
in that block replaces the array with a string, and the submit loop
`for (const photo of formData.photos)` then iterates the characters of the word
"none". That is a crash in the submit path reachable from a conversation.

**The customer's own words go into the prompt unfenced.** `formData` values are
interpolated directly into the system prompt. Compare `phoenix-chat.tsx:656`,
which fences input *"even though it came from staff"*, and `untrustedContent.ts`,
which exists for exactly this. A customer who types instructions into the
description field is currently talking to the system prompt.

Neither is a data breach — the endpoint reads a form and writes to the same
browser that sent it — but both are free to fix and one of them is a crash.

---

## The shape that works

### One agent, two callers, two field sets

Eric asked for it on "the work request **/ quote** buttons", and those are
genuinely different interviews:

    CUSTOMER, on request-service     the public intake. Asks for the
                                     measurements, the conditions, the access,
                                     and the photos. Never asks about price.

    STAFF, in Start Quote            the same engine, pointed at the same
                                     `quoteBrief` fields, for Eric filling in a
                                     job he took over the phone. May ask about
                                     rates, exclusions and margin, because the
                                     person answering works here.

Same route, a `surface: 'customer' | 'staff'` parameter, one shared definition
of the fields. The thing that must not be shared is what each is allowed to
discuss.

### The field list becomes one definition, in one file

Today the agent's checklist is thirteen hand-written `check(...)` calls inside a
17,000-line file, and the estimator's needs are an interface in another. They
have already drifted to near-zero overlap, which is what happens to two lists
that are meant to match and are written down twice.

- [ ] One module — `intakeFields.ts` — exporting the fields, each with its
      prompt-facing question, whether it is required for a *quotable* job, which
      service types it applies to, and how to validate what comes back.
- [ ] `ai-guide-chat` builds its checklist from it. `quoteBrief.ts` consumes the
      same names. `StartQuoteModal`'s "Job details" panel renders from it.
- [ ] A test that fails when a `quoteBrief` input has no question attached —
      the same shape as `tests/migrationSearchPath.test.ts`: the drift that
      caused F3 becomes a build failure rather than a discovery.

### "Complete" has to mean quotable, not filled

`complete: missing.length === 0` currently means every contact box has text in
it. It should mean *we could price this*. Those are different thresholds and the
difference is the whole feature:

- [ ] **Required for a quotable job**, by service type — a deck needs linear
      footage and storeys; a kitchen needs square footage and ceiling height; a
      trash removal needs photos above all. The agent stops when those are in,
      not when the address is.
- [ ] **Say what is still unknown rather than inventing it.** Carry
      `quoteBrief`'s rule all the way to the customer: the agent reports what it
      could not establish, and that list travels onto the work request so
      whoever picks it up knows what to ask on site.
- [ ] **Never block submission.** A customer who will not answer another
      question still gets to send the request. The agent's job is to raise the
      average, not to gate the door. This is also the honest answer to "what if
      the model is down" — the form has always worked without it.

### Photos and video, asked for by name

- [ ] The agent is told how many photos are attached and what they were named,
      and asks for the specific missing angle — not "please add photos".
- [ ] Video gets asked for where it earns its place: a walkthrough for a whole-
      house job, a pan across a yard for trash removal. The attachment panel
      built on 2026-11-10 already takes video and already converts iPhone HEIC,
      so the upload path is done.
- [ ] **Reading the photos is deliberately out of scope here.** That is
      `trash-removal-estimator.md`. This agent asks for them and counts them;
      it does not price from them. Keeping those separate is what stops this
      plan from becoming that one.

### The cost and abuse design, which is the real work

Making an LLM endpoint reachable without a session is the expensive decision in
this plan, and the metering as written does not cover it:

```js
const user = await intakeActor(c);
if (!user?.email) return next();   // the auth gate above already had its say
```

`reserveAiSpend` keys off an account, and the comment is explicit that it
*"runs after the auth gate, so the caller is already known to be signed in"*.
Open the route to anonymous callers and every anonymous call skips the ceiling
entirely — an uncapped bill behind a public URL, which is precisely the failure
`aiCeiling.ts` was written to prevent for subscribers.

So the public path needs its own budget, and it cannot be per-account because
there is no account:

- [ ] **A per-conversation cap.** A server-minted intake session id, a hard
      ceiling on turns (8–10 is a generous interview), and a token ceiling per
      turn. The conversation is the unit, not the user.
- [ ] **A per-IP daily cap**, using `ipReputation.ts`, which already exists and
      already learned the lesson that *"a per-request counter write makes the
      anti-abuse code its own amplifier"* — so it buffers. Same approach.
- [ ] **A global daily ceiling for the public surface**, with the agent
      degrading to the plain form when it is hit. A spend cap that stops the
      feature is survivable; one that stops at the invoice is not.
- [ ] **Every call on the ledger.** `aiLedger.ts` and `modelPricing.ts` already
      record and price model calls, so the honest answer to "what is this
      costing" is a query, not an estimate. Put the public surface in its own
      bucket so it can be read separately — and read it after a week before
      opening it wider.
- [ ] **`aiKillSwitch.ts` covers it**, so the public agent can be switched off
      without a deploy.
- [ ] The model choice is a cost decision too: this is field extraction and
      short questions, not reasoning. The cheapest capable model, and the
      conversation trimmed rather than resent whole each turn.

I am not going to put a dollar figure on it here — the ledger has real prices
and I would be inventing one. The structure above is what makes the figure
knowable and bounded before it is spent.

### Security, briefly

- [ ] Fence the customer's text with `untrustedContent.ts` before it reaches the
      prompt.
- [ ] Allowlist the keys `fieldUpdates` may contain, from `intakeFields.ts`, and
      coerce types — `photos` never writable by the model, measurements only as
      numbers.
- [ ] The agent reads and writes one in-flight form. It gets no tools, no
      database reads, and no access to pricing, rates or other customers'
      requests. `phoenixTools.ts` exists for staff; the customer agent gets
      none of it.
- [ ] It must never discuss price. An "estimate" from a chat window is a number
      the customer will hold us to, and `instant-estimate-for-the-customer.md`
      already settled where estimates may come from and what they must be
      labelled. The agent collects; the estimator prices.

---

## Order of work

Deliberately staged so the cheap fix ships first and the expensive decision
comes with evidence.

1. **Make it work for signed-in customers, today.** Swap `authedHeaders()` for
   `authedHeadersOrAnon(publicAnonKey)` in the form and stop the throw. For a
   signed-in customer the agent starts working immediately; for a signed-out one
   it degrades to the form exactly as it does now, instead of pretending the
   service is down. Add the `fieldUpdates` key allowlist and the fencing in the
   same change — both are small and one prevents a crash.
2. **`intakeFields.ts`, and point the agent at the estimator's fields.** This is
   where the accuracy Eric asked about actually comes from, and it needs no new
   infrastructure or decisions. Ask about photos and video here too.
3. **Make "complete" mean quotable**, per service type, and carry the
   still-unknown list onto the work request.
4. **Then, and only then, decide about the public surface** — with the caps,
   the ledger bucket, and a week of real numbers from stage 1–3 to argue from.
5. **The staff surface in Start Quote**, reusing all of it.

Stages 1–3 are useful on their own and carry no new recurring cost, because they
run on the existing metered, signed-in path.

---

## Decisions needed from Eric

1. **Does the agent work for signed-out visitors, or only once they sign in?**
   The whole cost-and-abuse section exists only if the answer is "signed out".
   Requiring an email first is cheaper, safer, gives you a lead even when they
   abandon the form, and is how most contractors' intake works. Opening it to
   everyone catches more enquiries and needs every cap in §Cost built first.
   **My recommendation: signed-in only for now**, ship stages 1–3, then look at
   the ledger and decide.

2. **Should it keep asking the customer their budget?** It does today. It
   anchors the price before you have quoted, and some of the figures it collects
   would then sit beside your own in the same record. Easy to drop; your call.

3. **How hard does it push on photos?** Trash and demolition already require at
   least one. Should the agent treat photos as required for every job type,
   strongly encouraged, or only where the takeoff genuinely needs them?

4. **Does it ever show the customer a number?** My strong recommendation is no —
   see `instant-estimate-for-the-customer.md`, which has already worked out the
   two-document answer. Worth confirming you agree, because it shapes what the
   agent is allowed to say.

---

## Not in this plan, on purpose

- **Reading the photos to price the job.** That is
  `trash-removal-estimator.md`.
- **Letting the customer create a quote.** Settled already in
  `instant-estimate-for-the-customer.md`: a quote is a staff act, because it
  becomes a contract and then an invoice.
- **Voice intake.** The phone-call path is its own thing and the voice work is
  mid-flight in another session.
