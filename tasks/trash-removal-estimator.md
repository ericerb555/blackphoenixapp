# PLAN — a trash removal estimate from photos and video

Eric, 2026-10-15:

> *"i want to put together a plan to add a video and picture trash removal
> estimator to add on to portals"*
>
> *"can we make sure it can access phone cameras if its used from an hand held
> device"*

What happens to the number afterwards — the customer's own instant estimate, the
PDF, and emailing it to themselves — is
`tasks/instant-estimate-for-the-customer.md`. This plan is about reading the
photos; that one is about the document.

---

## The finding that changes what this job is

**The intake is already built. The estimate does not exist. And the thing
currently sitting where the estimate should be is a fabrication that reaches the
customer's work request.**

Three findings, in the order they matter.

### 1. The photo intake for trash work already exists

`ClientWorkRequestForm` has a `trash_demo` project category (line 47) with its
own rules nobody needs to invent again:

- photos are **required** for this category and submission is blocked without
  them (line 987)
- the brief already asks for the four things an estimator actually needs — full
  view of the pile, close-ups showing material type, **access points (doors,
  hallways, stairs)**, and special considerations like tight spaces and heavy
  items (lines 2420–2440)
- three photos is the stated target, with a nudge below that (line 2529)
- uploads land in the private `project-photos` bucket as `storage://` refs, and
  `mediaSigning.ts` already mints short-lived signed URLs when a record is read

So the hard part of intake — asking a homeowner for the right photographs — is
done. **Nothing ever reads those photos.** The work request goes to the generic
estimator, which prices off the *description text*. A customer who uploaded nine
photographs of a basement gets a number derived from the sentence they typed.

### 2. `aiVideoAnalysisService.tsx` is invented data, and it is wired into the customer-facing form

This has to be said plainly, because the whole plan depends on not building on
top of it.

    aiVideoAnalysisService.tsx:234   extractKeyFrames() returns []
    aiVideoAnalysisService.tsx:240   analyzeRoomStructure() returns
                                     Math.random() room dimensions and a
                                     randomly picked room type
    aiVideoAnalysisService.tsx:264   detectMaterials() returns five hardcoded
                                     entries — medium oak hardwood, popcorn
                                     ceiling, chipping laminate countertop
    aiVideoAnalysisService.tsx:155   every result carries
                                     analysisConfidence: 92, completeness: 88

The server endpoint it calls, `POST /ai-floorplan/analyze-video`, returns **501
Not Implemented** (`ai-floorplan.tsx:395`) with the message "Video processing not
yet implemented". So every call takes the `catch` branch into
`fallbackAnalysis`, which runs those same hardcoded functions.

`AdvancedVideoCapture` — the component mounted behind the customer's **"Start
Video Recording"** button — does not even call the service. It runs a fake
progress bar and emits `mockResults` inline (line 290 onward): a Kohler
farmhouse sink, a Samsung refrigerator, costs of $8,500 / $12,000 / $18,500, and
a toast reading *"Detected Kitchen with 87% confidence"*.

And the form writes that onto the submitted work request —
`aiVideoAnalysis.dimensions`, `.estimatedCost`, `.analysisConfidence`,
`.floorPlan` (lines 1253–1267) — then creates a floor-plan record from it
(1362–1391).

Two live bugs fall out of reading it:

- The callback never fires. The component's prop is `onAnalysisComplete`
  (AdvancedVideoCapture.tsx:30); the form passes `onAIAnalysisComplete`
  (ClientWorkRequestForm.tsx:2605). So today the invented analysis probably does
  not actually land — saved by a typo.
- **The video never uploads.** `onVideoRecorded` hands back `(blob, url)`
  (line 135) and the form stores the first argument as if it were a whole
  `VideoFile` (line 2601). The upload then reads `video.blob`, which is
  `undefined`, and fails into `uploadFailures` (line 1050). Every video
  walkthrough recorded through this modal is lost.

- [x] **Delete the fabrications before anything else is built.** Not refactor —
      delete. `extractKeyFrames`, `analyzeRoomStructure`, `detectMaterials`,
      `extractMeasurements`, `detectIssues`, `generateRecommendations`,
      `estimateRenovationCost` and `mockResults` are all invention, and a new
      honest estimator standing next to them is indistinguishable from them to
      anybody using the app.
- [x] Keep the capture shell of `AdvancedVideoCapture` / `InlineVideoCapture`.
      The recording, preview and permission handling are real and worth having.
      It is only the analysis that is fiction.

### 3. The pattern to copy already exists, and it is `blueprintTakeoff.ts`

The blueprint path solved this exact problem a month ago, and its rules are the
ones to follow here:

> *"A drawing gives you rooms and counts, and a task needs a QUANTITY IN ITS OWN
> UNIT."* — and: evidence, not completeness; assumptions marked, not avoided.

So the model **observes** and typed, tested code **computes**. Which is the
opposite of what `/project-vision/analyze` does — that route asks GPT-4o for
`unitCost`, `hourlyRate` and `estimatedCost` directly, which is why its output
cannot be checked against anything.

---

## Phone cameras — the answer, and a real bug found by checking

Eric's question deserves a direct answer: **yes on photos, today; no on video on
iPhone, and the reason is a two-line bug.**

### Photos already work on a handheld, and this is the path to lean on

`ClientWorkRequestForm.tsx:2470–2482` has a hidden input with `accept="image/*"`
and `capture="environment"` behind a **"Take Photo"** button, with **"Choose from
Library"** beside it. That is the right design and it needs no change: a
`capture` file input opens the phone's own camera on iOS Safari, Android Chrome
and every in-app browser, needs no `getUserMedia` permission prompt, and gives
back a full-resolution JPEG with the phone's own processing applied. The blue
"Settings → Browser → Camera → Allow" hint below it is the correct instinct and
should be kept.

- [ ] Carry that exact pattern — camera input, library input, permission hint —
      into the estimator wherever it is mounted, rather than inventing a second
      way in.

### Video recording is broken on iPhone

`InlineVideoCapture.tsx:112–114` and `AdvancedVideoCapture.tsx:114–116`:

    const options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
    }
    const mediaRecorder = new MediaRecorder(stream, options);

iOS Safari's `MediaRecorder` supports **`video/mp4` only**;
`isTypeSupported('video/webm')` is false there. So the fallback is to another
unsupported type and the constructor throws — the customer taps record on an
iPhone and gets an error. Where it does record, the type is hard-coded twice
more: `new Blob(chunks, { type: 'video/webm' })` (line 128) and the upload
filename `${...}.webm` (ClientWorkRequestForm.tsx:1047), so even an Android clip
is stored under a type nothing checked.

- [x] Choose the mimeType from what the browser actually supports — try
      `video/mp4`, then `video/webm;codecs=vp9`, then `video/webm`, then let
      `MediaRecorder` pick its own default — and refuse with a sentence rather
      than an exception if none is available.
- [x] Take the type from `mediaRecorder.mimeType` after construction and use it
      for the `Blob` and for the file extension. The server side already accepts
      all three: `VIDEO_TYPES` in `design-projects.tsx:185` maps mp4, mov and
      webm.
- [x] Fix the `onVideoRecorded` signature mismatch at the same time, or the
      recording still will not upload.

### What else a handheld needs

- [x] **Offer the native camera app first for video too** —
      `accept="video/*" capture="environment"`. It is the only path that works on
      every handset, it gets the phone's stabilisation and its own storage, and
      it survives the app being backgrounded mid-recording. The in-page recorder
      becomes the second option, not the only one.
- [ ] **A size ceiling before upload, not after.** `MAX_VIDEO_BYTES` is 200MB
      (`design-projects.tsx:182`) and two minutes of 4K off a current phone is
      roughly twice that. Cap the requested resolution at 1080p, cap the length
      at about 90 seconds for an estimate, and say both on screen *before* the
      recording starts — "a slow walk round the pile, about a minute" is better
      guidance and a smaller file.
- [x] **Rear camera and inline playback**: `facingMode: 'environment'` and
      `playsInline` are already set in both components. Keep them; a preview
      that goes fullscreen on iOS loses the record button underneath it.
- [ ] **Secure context**: `getUserMedia` needs HTTPS. Vercel gives us that in
      production, but it means camera capture will not work from a bare-IP dev
      server on a phone — worth a line in the brief so it is not mistaken for
      this bug.
- [ ] **Denial is a path, not a dead end.** If permission is refused, fall
      through to the library picker with the existing hint, and never leave the
      estimator unreachable because the camera was declined once months ago.

---

## The architecture

### Frames come out of the video in the browser

Supabase Edge Functions are Deno with no ffmpeg binary; there is no way to decode
an MP4 on the server. And the current client sends the **whole video as base64**
to the server (`aiVideoAnalysisService.tsx:70`), which for a 200MB clip is a
~270MB JSON body — it would fail even if the endpoint existed.

The browser already knows how to do this. `ReelRenderer.tsx:161` draws a
`<video>` element straight into a canvas.

- [ ] Seek a `<video>` to 8–12 evenly spaced timestamps, `drawImage` each into a
      canvas, `toBlob('image/jpeg', 0.8)`, and send **frames as images**. Eight
      is the figure the blueprint reader settled on for the same reason
      (`MAX_SHEETS_PER_READ`, `ai-blueprint-analysis.tsx:56`), and
      `project-vision` already takes `images: string[]`.
- [ ] Upload and keep the video regardless. A human estimator wants to watch it,
      and it is the evidence behind the number.
- [ ] Count a frame, not a request, against the ceiling — again the blueprint
      rule: the sheet is what costs money, so the sheet is the unit.

### The model observes; it is never asked for a price

- [ ] Ask for, per item or pile: a name, a count, a **material class**
      (wood / drywall / metal / concrete-and-masonry / mattress / appliance /
      electronics / tyre / yard waste / mixed household), an estimated volume,
      and a confidence.
- [ ] Ask for the conditions that drive labour rather than volume: storey count,
      stairs or lift, carry distance to where a truck can park, doorway and
      stairwell width, whether the space is cleared or occupied.
- [ ] Ask for the hazards that change the price or refuse the job: freon
      appliances, mattresses and box springs, tyres, paint and solvents,
      e-waste, propane tanks, suspected asbestos, anything that looks like a
      biohazard.
- [ ] Ask explicitly for **what it could not see** — the back of the pile, a
      room it never entered, a stack it could not see behind. A trash estimate's
      biggest error is always the volume hidden behind the front row, and a model
      that reports the gap lets the office ask one question instead of sending a
      truck twice.
- [ ] Ask for **no dollars at all**. Not a total, not a unit cost, not a range.

### `trashTakeoff.ts` — typed, tested, no model

A pure function from observations to priceable quantities, tested by hand the way
`blueprintTakeoff` is.

- [ ] Volume by material class, because the classes do not go to the same place
      or cost the same to tip.
- [ ] Volume to weight through a stated conversion table. **The repo already has
      one**: `TONS_PER_UNIT` in `WasteDisposalTracking.tsx:96` — 0.75 tons per
      cubic yard of construction debris, 3 tons per load — with the honest
      comment that these are field estimates, not exact weights. Lift it to the
      server so the estimate and the dump-run tracking cannot disagree.
- [ ] Truck loads from volume, because that is what gets dispatched, and a job
      that needs two trips costs two trips.
- [ ] Labour hours from volume, multiplied for the conditions: stairs, carry
      distance, heavy items, an occupied space. Base productivity in cubic yards
      per crew-hour, stated in one place with a reason beside it.
- [ ] Per-item surcharges as their own lines, never folded into the volume.
- [ ] Every line carries `from` (the observation it came from) and `assumed`,
      exactly as the blueprint takeoff does, so a wrong number traces to a wrong
      reading rather than to arithmetic.
- [ ] `tests/trashTakeoff.test.ts` against hand-written observation fixtures — a
      single-item pickup, a garage, a two-storey estate cleanout with a mattress
      and a fridge, and an empty reading.

### The rates are records, and the disposal rate is learnable

- [ ] Labour from `labor_rates:global` through `resolveLaborRates`. `laboring` at
      $40/hr already exists in `pricingDefaults.ts` and is the right trade.
- [ ] **Disposal from the dump tickets we already record.** `waste_entry:`
      records carry quantity, unit, cost, disposal method and location
      (`index.tsx:7593`). That is a real dollars-per-ton for this company from
      real tickets — the same move `rateLearning.ts` makes when it corrects
      production rates from finished jobs. Measured beats standard; a figure
      somebody set by hand beats both.
- [ ] Until there are enough tickets, a typed standard table marked `standard` —
      the convention `pricingDefaults.ts` set, and the reason it gives: a
      published standard figure is defensible, but it is not *this company's*
      number, and a quote that cannot tell the difference is the same dishonesty
      in a smarter suit.
- [ ] Every line reports `your-rate` / `standard` / `estimated`.
      `QuotePricingBasisBanner` already renders that distinction.

### Metering

- [ ] A new `trash` bucket in `aiCeiling.ts` beside `render`, `blueprint` and
      `ai`, with `TIER_LIMIT_KEY: 'trashEstimatesPerMonth'`. Its own bucket
      because the estimate is the unit a customer would buy, and because a
      runaway loop here reads a dozen frames per call.
- [ ] Reserve before the model call, refund on every failure path, the shape
      `ai-blueprint-analysis.tsx` uses — charging on success lets a burst of
      parallel requests all pass the same check before any is counted.
- [ ] **Not** also listed in `AI_METERED_PREFIXES` (`index.tsx:896`); that
      comment is explicit that a route metering itself must stay out of the list
      or it is charged twice.

---

## The add-on, and which portals

Follow `contentAddOns.ts` exactly — it is the precedent for a feature sold *on
top of the portal an account already has*, which is what "add on to portals"
means here.

- [ ] `plan_addon:{audience}:trash-estimator` records, one per buying audience,
      with `group: 'trash-estimator'` and explicit `groupRank` so a ladder cannot
      reorder itself when somebody edits a price.
- [ ] `active: false` until a Stripe price exists, same as the content rungs. The
      records can be written and read over before anything is offered.
- [ ] What the subscription sells is **metered capacity** — estimates per month —
      not access to a screen. State the ceilings as limits on the record so
      `effectiveLimits` can read them, and use `0` for unlimited, said out loud.

Audiences, with the reason for each:

    customer                a price before anyone drives out. The trash_demo
                            intake is already built for exactly this.
    landlord                turnover and clear-outs between tenants. "Remove all
    property_manager        trash & debris" is already a line in
    condo_association       UnitTurnoverChecklist, and common-area dumping is a
                            standing condo complaint.
    employee / staff        the crew standing in the basement with a phone. NOT
                            an add-on — aiSpend waives staff entirely — but this
                            is the path that makes the rate card real, because it
                            is where an estimate gets compared to what the job
                            actually took.

- [ ] **Not** `vendor` or `subcontractor` in the first pass. A hauler bidding on
      the work wants to *see* the customer's photos, which is the bid room, not
      an estimator of their own.

Worth knowing before pricing it: `holdsAddOn` gives a trialist **every** add-on
except the two on-call products, so this is inside the free trial by default.
That is the right answer here — it costs compute, not a rota, and nobody is left
standing in a flooded basement when it lapses.

---

## What the output must be

- [ ] A **range**, not a figure, with the itemised basis beside it: volume by
      material, loads, labour hours, surcharges, disposal.
- [ ] **What it could not see**, printed as prominently as the number. This is
      the honest edge of a photo estimate, and hiding it is what makes a customer
      feel ambushed on the day.
- [ ] **Where each price came from**, per line.
- [ ] The frames it read, viewable. When a number looks wrong the first question
      is what the estimator was looking at — the same reason the Command Center
      plan added "what the estimator was told".
- [ ] Said plainly: confirmed on arrival. A photo cannot see the back of the
      pile, and the estimate should say so in its own words rather than in terms
      and conditions.

---

## Done: steps 1 and 2, 2026-10-16

### The fabrications are deleted

`aiVideoAnalysisService.tsx` is gone — all 640 lines. Worth knowing why that was
cheap: `analyzeVideo` **had no caller anywhere**. The only live export was a
type, so the entire service was dead code wearing the costume of a feature.

`AdvancedVideoCapture` keeps its recorder and loses the rest: the fake progress
bar, the three-second wait, `mockResults`, the "AI Analysis Enabled" badge, and
the three cards promising automatic measurements, material detection and instant
cost estimates. It says the honest thing now instead — *"Nothing is read
automatically yet — a person watches this when they price your job."*

Two blocks came out of `ClientWorkRequestForm`: the invented analysis copied onto
the submitted record, and an 89-line block gated on `formData.aiVideoAnalysis`
that sent an admin alert and an email/SMS notification. **That block never ran**,
because of the prop-name typo — and removing it loses nothing, because
`POST /work-requests` calls `notifyStaffInBackground` unconditionally on the
server. Checked before cutting rather than assumed.

### Capture is fixed, and typecheck had been saying so

`videoCapture.ts` holds the format negotiation, shared by both components, with
17 tests. The rule it pins is the one the old code had backwards: **never return
a type the browser has not confirmed**, and treat "none of them" as "let
MediaRecorder choose" rather than as a reason to insist. mp4 is preferred where
both are available — not for iOS, which would reach it anyway, but because a
webm recorded on Chrome will not play on the iPhone of whoever reviews it.

The native camera comes first for video now, as it already did for photos:
`accept="video/*" capture="environment"`. No permission dance, no format to
negotiate, the phone's own stabilisation, and it survives the browser being
backgrounded mid-recording, which an in-page recording does not. The in-page
recorder is the second button, because its live preview and timer are genuinely
better on a desktop with a webcam.

**The data-loss bug was sitting in the typecheck baseline the whole time.**
Three of the four findings in `ClientWorkRequestForm` were exactly it:

    Type 'Blob | VideoFile' is not assignable to type 'VideoFile'
    Type 'Blob' is missing the following properties: blob, url, duration
    Type '{ onVideoRecorded: (videoFile: Blob) => void; ... }' is not assignable

A baseline is a promise to come back to something, and this is what living in
one costs: every video a customer recorded was being dropped on the floor, and
the compiler had been saying so in three separate lines. App findings went
313 → 307.

### Not done, of what step 2 listed

- No **byte-size ceiling before upload**. Resolution is capped at 1080p and the
  in-page recorder stops at 120 seconds, which bounds it in practice, but a clip
  chosen from the camera roll is still only checked by the server, at 200MB,
  after the upload has already happened.
- The **secure-context note** is documentation rather than code, and belongs
  wherever the dev brief lives.

---

## Order of work

1. **Delete the fabrications** (`aiVideoAnalysisService.tsx`, `mockResults`).
   First, because everything built afterwards gets judged against whatever is
   already claiming to do the job.
2. **Fix capture on handhelds** — mimeType negotiation, the `onVideoRecorded`
   signature, the native-camera video input. Shippable on its own, and it fixes
   video for every existing caller, not just this feature.
3. **`trashTakeoff.ts` and its tests.** No UI, no model, no network. This is the
   part that has to be right and the part that can be checked.
4. **`trashDisposalRates.ts`**, plus the measured dollars-per-ton read off
   `waste_entry:` records.
5. **The route**: frames in, observations out, takeoff, repriced, provenance,
   metered in its own bucket.
6. **Browser frame extraction and the estimate panel.**
7. **Wire it into the `trash_demo` work request**, which is where a customer
   already is when they want this.
8. **The add-on records, inactive**, and the portal tabs.

Each step is useful on its own. Steps 1 and 2 are worth doing even if the rest is
never built.

---

## Deliberately not in this plan

**No server-side video decoding.** No ffmpeg in Deno, and no ffmpeg.wasm either —
decoding a 200MB clip inside an edge function's memory limit is not a thing to
attempt for eight frames the browser can produce in a second.

**No reuse of `/project-vision/analyze` as it stands.** It asks the model for
unit costs and hourly rates, which is the specific mistake this plan exists to
avoid. If the two converge later, it should be by that route adopting a takeoff,
not by this one adopting its prompt.

**No binding price.** A range, plus the basis, plus confirmation on arrival.

**No dumpster logistics, scheduling or routing.** `dump_run:` records and the
waste-tracking page already own that, and an estimator reaching into dispatch is
how both end up half-built.

**No change to `EstimatorInput` or `runEstimator`.** The trash takeoff produces
priced quantity lines directly, the way `blueprintTakeoff` does. Pushing trash
through the renovation estimator's prompt would get a renovation-shaped answer.

---

## Decisions needed from Eric

1. **Does the customer see a price, or does the office see it first?** Changes
   whether this is a self-serve quote or an estimating tool with a review step.
2. **Volume unit we quote in** — cubic yards, truck loads, or both. The trade
   mostly sells fractions of a truck; cubic yards are what a takeoff computes.
3. **Hazard items: price them or refuse them?** Freon appliances, tyres, paint
   and anything that looks like asbestos. A surcharge, and a surcharge with a
   warning, are different products.
4. **Add-on prices and rungs**, or whether this is included in existing tiers.

---

## Review

*(To be completed when the work is done.)*
