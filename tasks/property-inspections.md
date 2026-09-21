# Property inspections, and condition on the way in and out

Two requests from Eric, on the landlord portal:

> "in the landlord portal we need to add a unit condition form with photos and
> videos to document conditions when move in and out. add it in the leases tab"

> "under properties the landlords should be able to do a whole property
> inspection with photos and video and a ai assistant can put together a
> property maintenace plan as well as update schedule and budgeting"

**Nothing is built.** Section 4 has the decisions; section 3 the order of work.

---

## 1. Most of the plumbing already exists

Worth saying first, because it changes what this costs.

**The properties tab already takes photos and video.** `LandlordPortalView` has
a `propertyMedia` picker — `accept="image/*,video/*"`, multiple, up to 12 files
at 100MB — posted as FormData to `/landlord/properties`. Its own help text
says: *"Upload photos and short videos so AI can assess the property's
condition."* The intent was there; the assessment was not.

**The leases tab already has the condition form.** `LandlordFormsManager`
handles `move-in`, `move-out` and `pet-deposit`, with thirteen default areas —
living room, kitchen, bathrooms, flooring, HVAC, smoke and CO detectors,
exterior — and an Excellent → Damaged scale per area. What it has no notion of
is **evidence**.

**The property AI already wants inspections.** `PropertyAIEnterprise` scores
each property partly on `lastInspectionDate`, and when there isn't one it
reports *"No inspection date recorded"* and *"Schedule a professional
inspection."* It also already tracks a reserve fund and monthly expenses, which
is where a budget has to land.

So this is not three new systems. It is evidence on a form that exists, a record
for a walkthrough, and an assistant feeding a screen that is already asking.

---

## 2. The shape

**An inspection is its own record**, separate from property media.

    inspection:{propertyId}:{id}
      when, who
      areas[]  — each with condition, notes, and its own photos and video
      status   — draft while walking round, complete when submitted

Property media is the portfolio: what the building looks like. An inspection is
a dated event with findings. Collapsing them would mean a photo from 2024 sitting
beside one from today with nothing to say which was which — and a condition
record whose date cannot be trusted is worth nothing in the only moment it
matters.

**Media attaches to an AREA, not to the form.** This is the most important
choice here and the easiest to get wrong. In a deposit dispute the question is
never "are there photos of this flat" — it is "what did the carpet in bedroom 2
look like the day they moved in". A pile of twenty photos against a form cannot
answer that. Twenty photos against thirteen named areas can.

The same structure serves both surfaces: the move-in and move-out forms already
have the areas, so they gain media per area, and a whole-property inspection is
the same shape with a wider area list.

**The assistant proposes; it does not schedule or spend.** It reads the
inspection and drafts a maintenance plan, a schedule and a budget, and every one
of those lands as a proposal somebody accepts. This is the rule the design
assistant and the plan drafter already follow, and it matters more here because
two of the three outputs are commitments — a date somebody has to keep and money
somebody has to find.

---

## 3. Order of work

- [ ] **P1. Media per area on the condition forms.** The smallest piece with the
      most value: `LandlordFormsManager` already has the areas and the scale, so
      each area gains photos and video. Move-in and move-out become evidence
      rather than assertion.
- [ ] **P2. The inspection record and its routes.** Create, save as draft,
      complete, list per property. A walkthrough happens over an hour with bad
      signal, so it saves as it goes rather than in one submit at the end.
- [ ] **P3. The inspection screen**, under Properties. Area by area, photo and
      video per area, condition and notes — usable one-handed on a phone,
      because that is where it will actually be used.
- [ ] **P4. `lastInspectionDate` flows back**, so the property AI's score stops
      saying none is recorded. Cheap, and it closes the loop that already exists.
- [ ] **P5. The assistant.** Reads a completed inspection, drafts a maintenance
      plan, a schedule and a budget. Metered like every other model call.
      Proposes only.
- [ ] **P6. Accepting a proposal** — what a plan, a schedule and a budget
      actually become. See question (b): this is where it touches the pipeline.

P1 is worth doing first whatever is decided about the rest, because the forms
are in use now and evidence is the half they lack.

---

## 4. What needs deciding

**a) Does the assistant look at the video, or only the photos?**

Video analysis is dear, and a walkthrough video is minutes long. The cheaper and
probably better design is that video is stored as *evidence* — for the dispute,
the record, the human — while the assistant reads the photos and the notes. Eric
has a standing rule against spending on a model run before the inputs are worth
it (`dont-spend-a-render-on-an-unfinished-model`), which points the same way:
if video analysis happens at all it should be deliberate and per-inspection,
not automatic.

Recommendation: store video, analyse photos and notes, and offer video analysis
as an explicit action later if it is wanted.

**b) Does an inspection finding become work?**

This is the real architectural question. `pipeline-is-the-spine` says anything
producing a number or a document writes into the pipeline. A finding of "roof
flashing failing, budget $4,000" could:

- stay inside the landlord's own maintenance plan, as their record; or
- become a **work request** to Black Phoenix, which is how it turns into a quote
  and a job.

The second is the business. It is also a much bigger claim on the landlord's
behalf, so it should be something they choose per finding rather than something
the assistant does.

Recommendation: the plan is theirs; each line has a "get this quoted" that
raises a work request. That keeps the pipeline the spine without volunteering
their money.

**c) Who else may see an inspection?**

A move-out inspection is evidence in a disagreement between a landlord and their
tenant. Does the tenant get a copy, and at what point? Sharing it is arguably
fairer and definitely more contentious; not sharing it makes it one side's
record. Eric's call, and it changes what the tenant portal shows.

**d) How much media, and for how long?**

Twelve files at 100MB is the current property limit. Thirteen areas with photos
and video each will exceed that comfortably. Storage costs money and inspections
are worth keeping for years — a move-in record matters most when the tenant
leaves, which may be a decade later.

---

## 5. What this does not do

- It does not restyle the landlord portal. New panels in existing tabs.
- It does not replace `LandlordFormsManager`. The forms stay; they gain
  evidence.
- It does not build a second property AI. `PropertyAIEnterprise` exists and is
  already asking for this data; the assistant feeds it rather than competing.
