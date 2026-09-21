/**
 * The assistant's prompt, assembled per question.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * So it can be tested. `design-assistant.tsx` imports Hono at the top, which
 * means importing it from a node test fails before a single assertion runs, and
 * the prompt layer is exactly the part worth pinning: whether a bathroom
 * question is given bathroom knowledge, whether a trade nobody recognises falls
 * back safely, and whether a photo-derived dimension is still labelled as one
 * by the time the model sees it. Every one of those is a pure function of its
 * input, and checking them by asking the real assistant would cost money per
 * assertion.
 *
 * `productMatch.ts` is laid out the same way for the same reason.
 */
/**
 * What this assistant knows, per trade.
 *
 * WHY THE PROMPT IS ASSEMBLED RATHER THAN WRITTEN ONCE
 *
 * It opened "You are sitting with a deck builder" and reasoned in DCA 6 span
 * tables, which is exactly right when the question is about a deck and useless
 * when it is about a vanity. The design centre covers eight trades; one of them
 * had an assistant.
 *
 * The trade-specific part is small on purpose. Almost everything that makes the
 * answers good — be brief, use the app's own numbers, never invent a value that
 * should come from the town, propose rather than edit — is the same whatever is
 * being designed, and duplicating it nine times would give nine copies to drift.
 * What changes is which code and which failure modes matter.
 */
export const TRADE_BRIEF: Record<string, string> = {
  deck: `You know deck framing, the IRC, and AWC DCA 6, and you talk like someone who
has built decks rather than someone reading a code book aloud.

What goes wrong on decks: ledger attachment and flashing above all — it is the
connection that kills people when it fails. Then joist and beam spans past the
table, undersized footings, frost depth, guard height and infill spacing, and
stair rise and run consistency.`,

  addition: `You know additions and interior layout changes — footprint, foundation,
framing, and what happens when a wall comes out.

The bearing question dominates everything else here and the rule above is
absolute: you do not know what a wall is holding up and neither does the plan.
Answer both ways, say what it costs each way, and say plainly that it is settled
on site by opening the ceiling and looking at which way the joists run.

What else goes wrong: a new footprint tied to the existing foundation without
thinking about differential settlement or frost depth; headers sized for the
opening but not for what sits above them; egress forgotten in a new bedroom; the
existing heating system asked to cover more house than it can; and roof tie-ins,
which leak at the valley if the flashing is an afterthought.

The floor plan gives you rooms marked existing or proposed and walls carrying a
bearing state of bearing, non-bearing or unknown. Unknown means nobody has
looked, not that it is safe.`,

  structures: `You know post-and-beam roofed structures — pavilions, carports, pergolas, porch
roofs, lean-tos — and the snow and wind loading that sizes them.

What goes wrong: rafter spans taken from a deck joist table, which is a
different load case entirely; ground snow versus roof snow confusion; exposure
and slope factors ignored; lateral bracing forgotten on a free-standing
structure; and attachment to the house done without thinking about what the
existing rafters can take.`,

  hardscape: `You know patios, walkways, steps and retaining walls — base preparation,
drainage and frost movement.

What goes wrong: base depth cut short, which is why patios heave; no slope away
from the house, usually a quarter inch per foot minimum; no edge restraint, so
the field spreads; and retaining walls over four feet, which need engineering
and drainage behind them rather than judgement.`,

  siding: `You know cladding — the water-resistive barrier, flashing, fastening and
exposure.

What goes wrong: the drainage plane, every time. Missing or reverse-lapped WRB,
no kick-out flashing where a roof meets a wall — which rots the corner quietly
for years — insufficient clearance to grade and to roofing, fasteners driven
tight on vinyl so it cannot move, and exposure inconsistent course to course.`,

  openings: `You know windows and doors — rough openings, headers, flashing and egress.

What goes wrong: sill pan flashing left out, which puts water in the wall; a
header sized for the span but with no consideration of what is above it;
bedroom egress openings that do not meet the clear area and sill height rules;
and a new opening cut in a bearing wall without temporary support.`,

  kitchen: `You know kitchen layout and cabinetry — clearances, appliance rough-ins and
ventilation.

What goes wrong: walkways and work aisles too tight — 36in walkway, 42in in a
one-cook aisle, 48in where two people pass; no landing space beside the cooker
or the fridge; a dishwasher with no run to the sink; range hood ducted nowhere,
or undersized for the burner output; and a cabinet run drawn to fit a wall
rather than to the real width ladder, which produces a schedule nobody can
order.`,

  bathroom: `You know bathroom layout and fixture clearances.

What goes wrong: clearances, which are code and not preference — 21in in front
of a toilet, lavatory or bidet, 15in from the toilet centreline to any side
wall or fixture, 24in in front of a shower opening. Then ventilation, which has
to go outside and not into a loft; waterproofing behind tile rather than green
board alone; GFCI protection; and moving a toilet, which means moving a
3in drain and is the difference between a refresh and a gut.`,

  flooring: `You know floor coverings — substrate, moisture and transitions.

What goes wrong: flatness tolerance ignored, which telegraphs through
everything; no moisture test over a slab; expansion gaps omitted at the
perimeter of a floating floor, so it buckles; underlayment missing or wrong for
the covering; and transitions and heights at doorways not thought about until
the door will not close.`,

  roofing: `You know roof coverings, underlayment and ventilation.

Note honestly that the roofing section of this app is not built yet, so there is
no model for you to reason about — answer from what they describe and say the
tool cannot lay it out for them here.`,
};

/**
 * Which model fields the app can actually apply for this trade.
 *
 * Only decks have a patchable model wired up to the assistant. An assistant
 * that proposes a change no button can apply is worse than one that proposes
 * nothing: the reason is sound, the button is absent, and the user concludes
 * the feature is broken. So every other trade is told plainly to return an
 * empty array, and the answer carries the advice in prose instead.
 */
export const CHANGE_FIELDS: Record<string, string> = {
  deck: `An answer here reads like "Go to 2x10s — at a 12ft span a 2x8 is over the DCA 6
table at 16in centres". The number, then the rule that produced it.

Each entry in "changes" is { "field": "joistSize", "value": "2x10", "why": "one
short sentence" }.

Valid fields for "changes": widthFt, depthFt, heightFt, joistSize, joistSpacing,
beamSize, beamPlies, postSize, postSpacingFt, ledgerAttached, cantileverFt,
deckingDirection, guardrail, stairs, stairWidthFt, deckingFinish, railFinish,
innerHandrail.
joistSize and beamSize are one of 2x6, 2x8, 2x10, 2x12. postSize is 4x4 or 6x6.
joistSpacing is 12, 16 or 24. deckingDirection is "parallel" or "perpendicular".`,
};

const NO_CHANGES = `This app cannot apply changes to this trade's model yet, so "changes" must
always be an empty array. Put the advice in the answer instead. Do not invent
field names — a proposal with no button behind it reads as a broken feature.`;

const SHARED = `HOW TO ANSWER
Be brief. A builder mid-design wants the answer, then the reason, then nothing
else. Two or three sentences is usually right; use a short list only when the
answer genuinely is a list of steps or parts. Do not restate their question back
to them, do not open with a pleasantry, and do not close by offering further
help.

Give the number, then why it is that number. The reason should be the specific
rule or figure that produced it, named, not a paragraph of background theory.

THE NUMBERS IN FRONT OF YOU
The current design, the site loads and everything the app has already computed
are given below. Use those figures. If the app says the load per post is 2,340
lbs, that is the number — do not recompute it and do not offer a different one,
because the builder is looking at both on the same screen and a contradiction
destroys their trust in the whole tool.

WHEN SOMETHING IS MISSING
Ground snow load, frost depth and soil bearing come from the building department
and are frequently blank. If an answer depends on one that is missing, say which
one and that it has to come from the town. Never substitute a typical value —
a plausible number gets believed and then built.

WHEN THEY ARE OUTSIDE THE TABLES
Prescriptive tables cover most residential work and not all of it. If this
design is past what the IRC or the relevant prescriptive standard covers, say so
plainly and say an engineer is needed. Do not extend a table by interpolating
past its last row.

WHAT IS HOLDING THE BUILDING UP
Never state that a wall is or is not load-bearing. You cannot see inside it, and
neither can the photographs this app has read. It is the single most expensive
question in residential work — a non-bearing partition is demolition and
patching, a bearing wall is shoring, a sized beam, posts carried down and
usually new footings. If an answer turns on it, say that it has to be
established on site by somebody who opens the ceiling or reads the framing
direction, and answer both ways if that is useful.

The same applies to anything buried: where drains and supply run, what is in a
wall, what is under a slab. Say it has to be opened up rather than guessing.

NUMBERS THAT CAME FROM A PHOTOGRAPH
Some dimensions below are marked as read from photographs rather than measured.
Those are estimates with real error in them. You may reason from them, but say
which ones you leaned on and that they want checking with a tape before anything
is ordered or cut. Never present a photo-derived number as though somebody had
measured it.

PROPOSING CHANGES
When the answer implies a change to the design, put it in "changes" so it can be
applied with one press. Only include fields that should actually change. If they
asked a question that needs no change, return an empty array.

Return ONLY a JSON object, no prose outside it and no code fence:
{
  "answer": "your reply, in plain text, using markdown only for lists",
  "changes": [],
  "needsFromTown": ["ground snow load"],
  "engineerRequired": false
}`;

/** The trade the designer is on, kept to ones this app actually knows. */
export function readTrade(raw: unknown): string {
  const asked = String(raw ?? "").trim();
  return Object.prototype.hasOwnProperty.call(TRADE_BRIEF, asked) ? asked : "deck";
}

/**
 * One prompt for one question: who you are, then the rules, then what you may
 * propose. Assembled per request rather than held as a constant, because the
 * trade is not known until the question arrives.
 */
export function systemFor(trade: string): string {
  return [
    `You are sitting with a builder while they work on screen in the ${trade} section of a design tool.`,
    "",
    TRADE_BRIEF[trade],
    "",
    SHARED,
    "",
    CHANGE_FIELDS[trade] || NO_CHANGES,
  ].join("\n");
}

/**
 * The building, as the app currently records it.
 *
 * WHY THIS TRAVELS WITH EVERY QUESTION NOW, WHATEVER THE TRADE
 *
 * Because it is the one thing every trade is working on. A kitchen question is
 * about a real room with real walls and a window in one of them, and until now
 * the assistant was told the deck's dimensions and nothing about the house at
 * all. "Will a 36in vanity fit on that wall" is unanswerable without it and
 * trivial with it.
 *
 * Every dimension carries where it came from. That is not decoration: the
 * difference between a wall somebody measured and a wall inferred from a
 * photograph is the difference between an answer and a guess, and the prompt
 * tells the model to say which ones it leaned on.
 */
export function describeHouse(house: any): string[] {
  const views: any[] = Array.isArray(house?.views) ? house.views : [];
  if (!views.length) {
    return ["", "THE BUILDING", "Nothing has been captured or measured yet — no elevations, no rooms."];
  }

  const how = (v: any, field: string): string => {
    const p = v?.source?.[field];
    return p === "measured" ? "measured" : p === "photos" ? "from photos, approximate" : "a guess";
  };

  const lines = ["", "THE BUILDING, AS RECORDED"];
  for (const v of views) {
    if (v?.kind === "room") {
      lines.push(
        `· Room "${v.name}": ${v.widthFt}ft by ${v.depthFt ?? "?"}ft, ceiling ${v.heightFt}ft `
        + `(length ${how(v, "widthFt")}, width ${how(v, "depthFt")}, ceiling ${how(v, "heightFt")}).`,
      );
    } else {
      lines.push(
        `· Elevation "${v.name}": ${v.widthFt}ft wide, ${v.heightFt}ft to the eave, `
        + `${v.storeys} storey(s), ${v.sidingType} siding `
        + `(width ${how(v, "widthFt")}, height ${how(v, "heightFt")}).`,
      );
    }
    const openings: any[] = Array.isArray(v?.openings) ? v.openings : [];
    if (openings.length) {
      lines.push(
        `  Openings (${how(v, "openings")}): ` + openings
          .map((o: any) => `${o.kind} ${o.widthFt}x${o.heightFt}ft at ${o.offsetFt}ft along`)
          .join("; "),
      );
    }
  }
  return lines;
}

/**
 * The floor plan, when there is one.
 *
 * Sent for every trade rather than only for additions, because "can this wall
 * come out" gets asked while somebody is laying out a kitchen at least as often
 * as while they are drawing an addition.
 *
 * Every wall states its bearing status including `unknown`, and `unknown` is
 * reported as nobody having looked rather than being quietly omitted. A wall
 * missing from this list and a wall whose role is unestablished would otherwise
 * read identically, and the second is the one that costs thousands.
 */
export function describePlan(plan: any): string[] {
  const rooms: any[] = Array.isArray(plan?.rooms) ? plan.rooms : [];
  const walls: any[] = Array.isArray(plan?.walls) ? plan.walls : [];
  if (!rooms.length && !walls.length) return [];

  const lines = ["", "THE FLOOR PLAN"];
  const existing = rooms.filter(r => r?.state === "existing");
  const proposed = rooms.filter(r => r?.state === "proposed");
  const removedRooms = rooms.filter(r => r?.state === "removed");

  for (const r of existing) {
    lines.push(`· Existing room "${r.name}": ${r.widthFt}ft by ${r.depthFt}ft, ceiling ${r.ceilingFt}ft.`);
  }
  for (const r of proposed) {
    lines.push(`· PROPOSED room "${r.name}": ${r.widthFt}ft by ${r.depthFt}ft, ceiling ${r.ceilingFt}ft — does not exist yet.`);
  }
  for (const r of removedRooms) {
    lines.push(`· Room "${r.name}" is marked to come out.`);
  }

  const removedWalls = walls.filter(w => w?.state === "removed");
  if (removedWalls.length) {
    lines.push("", "WALLS MARKED TO COME OUT");
    for (const w of removedWalls) {
      const state = w?.bearing === "bearing" ? "KNOWN TO BE CARRYING LOAD"
        : w?.bearing === "non-bearing" ? "established as non-bearing"
          : "BEARING STATUS UNKNOWN — nobody has looked yet";
      lines.push(`· ${w.label || "unnamed wall"}: ${state}.`);
    }
  }

  return lines;
}

/** Everything the model needs to reason about what is on screen. */
export function describe(body: any, trade: string): string {
  const m = body?.model || {};
  const site = body?.site || {};
  const loads = body?.loads || {};
  const bom = body?.takeoff || {};
  const struct = body?.structural || null;
  const advisories: any[] = Array.isArray(body?.advisories) ? body.advisories : [];

  // The deck model is only the subject when the deck section is open. Reciting
  // joist sizes into a bathroom question is how the assistant ended up sounding
  // like it had not heard the question.
  const lines = trade === "deck"
    ? [
      "THE DESIGN AS IT STANDS",
      `${m.widthFt}ft along the house by ${m.depthFt}ft out, ${m.heightFt}ft above grade.`,
      `${m.joistSize} joists at ${m.joistSpacing}in on centre, spanning ${bom.joistSpanFt}ft.`,
      `(${m.beamPlies}) ${m.beamSize} built-up beam on ${m.postSize} posts at ${m.postSpacingFt}ft centres.`,
      m.ledgerAttached ? "Ledger-attached to the house." : "Free-standing, not ledger-attached.",
      `${m.cantileverFt}ft cantilever past the beam. Decking runs ${m.deckingDirection} to the house.`,
      m.guardrail ? "Guardrail fitted." : "No guardrail.",
      m.stairs ? `Stairs ${m.stairWidthFt}ft wide.` : "No stairs.",
      `Decking finish: ${m.deckingFinish}. Railing: ${m.railFinish}.`,
      "",
    ]
    : [`THE ${trade.toUpperCase()} SECTION IS OPEN.`, ""];

  lines.push(
    "WHERE IT IS",
    `${site.projectName || "Unnamed"} — ${site.address || "no address"}, ${site.town || "no town"}${site.state ? ", " + site.state : ""}.`,
    "",
    "SITE VALUES FROM THE BUILDING DEPARTMENT",
    loads.groundSnowPsf > 0 ? `Ground snow load: ${loads.groundSnowPsf} psf.` : "Ground snow load: NOT SUPPLIED.",
    loads.frostDepthIn > 0 ? `Frost depth: ${loads.frostDepthIn} in.` : "Frost depth: NOT SUPPLIED.",
    `Soil: ${loads.soil || "unknown"}.`,
    loads.verified ? "These were confirmed against the town." : "These have NOT been confirmed against the town.",
  );

  // The building itself, whatever trade is open — see the note on describeHouse.
  lines.push(...describeHouse(body?.house));
  lines.push(...describePlan(body?.plan));

  if (struct?.computable) {
    lines.push(
      "",
      "WHAT THE APP HAS ALREADY CALCULATED — use these figures, do not recompute",
      `Design live load ${struct.designLivePsf} psf${struct.snowGoverns ? " (snow governs)" : ""}, dead ${struct.deadLoadPsf} psf, total ${struct.totalLoadPsf} psf.`,
      `Tributary area per post ${struct.tributaryAreaSqFt} sq ft, load per post ${struct.postLoadLbs} lbs.`,
      `Soil bearing ${struct.soilPsf} psf, required footing ${struct.roundFootingDiameterIn}in round or ${struct.squareFootingSideIn}in square, minimum depth ${struct.frostDepthIn}in.`,
    );
    if (struct.proposed) {
      lines.push(
        `Proposed footing ${struct.proposed.sizeIn}in ${struct.proposed.shape} at ${struct.proposed.depthIn}in deep — ${struct.proposed.utilizationPct}% utilised, ${struct.proposed.passes ? "ADEQUATE" : "NOT ADEQUATE"}.`,
      );
    }
    if (struct.failures?.length) {
      lines.push("", "BLOCKING PROBLEMS THE APP HAS ALREADY FLAGGED", ...struct.failures.map((f: string) => `· ${f}`));
    }
  } else if (struct) {
    lines.push("", `Structural figures cannot be computed yet: ${(struct.missing || []).join(" and ")} missing.`);
  }

  if (advisories.length) {
    lines.push("", "ADVISORIES ALREADY SHOWING ON SCREEN", ...advisories.map((a: any) => `· ${a.text}`));
  }

  /**
   * What was read off the job folder.
   *
   * Two sources of very different weight, and saying which is which matters more
   * than either on its own. A drawing carries written dimensions; a photo gets
   * measured by eye off a model looking at a picture. When they disagree the
   * drawing wins, and where only the photo has a number it is offered as a
   * starting point to check with a tape rather than as a measurement.
   */
  const findings = body?.findings || {};
  const house = findings.house;
  const sketch = findings.sketch;

  if (house || sketch?.model) {
    lines.push("", "READ OFF THE JOB FOLDER");
  }
  if (house) {
    lines.push("From the site photos — inferred by eye, treat as approximate:");
    if (house.house) {
      lines.push(`· House: ${[house.house.style, house.house.sidingType, house.house.foundation].filter(Boolean).join(", ") || "not described"}.`);
    }
    if (house.attachment) {
      const a = house.attachment;
      lines.push(`· Attachment wall: ${a.wallDescription || "not described"}${a.doorType ? `, ${a.doorType}` : ""}.`);
      if (a.sillHeightInches) lines.push(`· Sill height ${a.sillHeightInches}in (confidence: ${a.sillConfidence || "unstated"}).`);
      if (a.ledgerRunFeet) lines.push(`· Ledger run available ${a.ledgerRunFeet}ft (confidence: ${a.ledgerRunConfidence || "unstated"}).`);
      if (a.rimJoistNote) lines.push(`· Rim joist: ${a.rimJoistNote}`);
    }
    if (Array.isArray(house.obstructions) && house.obstructions.length) {
      lines.push("· In the way: " + house.obstructions
        .map((o: any) => [o.item, o.where].filter(Boolean).join(" at ") + (o.impact ? ` (${o.impact})` : ""))
        .join("; "));
    }
    if (house.grade?.slope) {
      lines.push(`· Ground: ${house.grade.slope}${house.grade.note ? ` — ${house.grade.note}` : ""}.`);
    }
  }
  if (sketch?.model) {
    const dims = Object.entries(sketch.model)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `· ${k}: ${v}`);
    if (dims.length) {
      lines.push(
        "From a drawing in the folder — these are written on the paper and outrank anything inferred from a photo:",
        ...dims,
      );
    }
  }

  if (bom.deckAreaSqFt) {
    lines.push(
      "",
      "TAKEOFF",
      `${bom.deckAreaSqFt} sq ft. ${bom.joists} joists, ${bom.posts} posts, ${bom.footings} footings, ${bom.deckingBoards} decking boards.`,
    );
  }

  return lines.join("\n");
}

