/**
 * What to ask a model about an existing deck, and what it may answer.
 *
 * Eric: "i want the exisiting framing and footing caught in the auto generate
 * proccess so it can build be a framed deck in my design center".
 *
 * THE MODEL COUNTS. THE CODE MEASURES.
 *
 * Nothing here asks for a length, a span, a joist size out of a span table, a
 * footing depth or a price. It asks for COUNTS and RELATIONSHIPS, because
 * lumber is standard and that is what turns a count into a measurement:
 * `deckFromObservation` derives height from the riser count against the 7"–7¾"
 * code band, width from joists at 12/16/24 on centre, and depth from boards
 * facing 5½" with a 3/16" gap. A model asked "how wide is it?" would guess. A
 * model asked "how many joists?" is reading.
 *
 * This is also why video matters, which was Eric's correction to me: "the
 * video capture should be able to get pre good measurement". You cannot see a
 * whole deck or a full flight of stairs in one still, and you cannot separate a
 * joist from a shadow without parallax. Frames make counting possible.
 *
 * `deckObservationReply.ts` is the gate that distrusts the answer. These are
 * the instructions; that is the check. Neither substitutes for the other — a
 * prompt is a request, not a guarantee.
 */

/** Frames per read. Matches `trashReading.MAX_IMAGES` for the same reason. */
export const MAX_FRAMES = 12;

const COMMON = `You are a deck builder's surveyor. You are shown frames from a
customer's photographs and video of an EXISTING deck that is going to be
rebuilt. Your job is to report what is physically there.

ANSWER ONLY IN COUNTS AND RELATIONSHIPS. Do not estimate any dimension in feet
or inches. Do not give a span, a joist size from a span table, a footing depth,
a load or a price. Those are computed from your counts by code that knows the
lumber dimensions and the code minimums. A dimension you invent becomes a
framed deck, a permit packet and a number put in front of a customer.

COUNT, DO NOT ESTIMATE. "About twenty boards" is not a count. If you cannot
count a thing, leave the field out entirely rather than approximating it —
leaving it out is a real answer that makes the deck get measured, and a guess
is not.

LEAVE A FIELD OUT RATHER THAN GUESS IT. An omitted field means "I could not
establish this". It is never read as zero.

Answer as a single JSON object with these fields, every one optional except
"frames":

  frames             the frame numbers you actually used
  joistCount         joists counted across the deck
  joistSpacingInches 12, 16 or 24 — only if you can see the spacing
  boardCount         deck boards counted across the run
  deckingDirection   "parallel" or "perpendicular", RELATIVE TO THE HOUSE WALL
  riserCount         treads counted on the stair flight
  footingCount       concrete footings or piers you can see
  postCount          posts carrying the beam
  joistSize          "2x6" | "2x8" | "2x10" | "2x12", if end grain is visible
  beamSize           same list, if the beam is visible
  beamPlies          how many plies the beam is built up from
  postSize           "4x4" or "6x6"
  ledgerAttached     true if bolted to the house, false if free-standing
  guardrail          true or false
  stairs             true or false
  stairWidthFt       only if a stated or measured figure is visible
  couldNotSee        short lines naming what the frames do not show
  measuredOnSite     true ONLY if a tape measure or a written dimension is
                     visible in a frame, with widthFt / depthFt / heightFt

DECKING DIRECTION DECIDES WHICH DIMENSION THE BOARDS MEASURE, so it matters
more than it looks. Boards running PARALLEL to the house wall stack outwards
from it, so the count measures how far the deck projects. Boards running
PERPENDICULAR run away from the wall and stack sideways, so the count measures
how wide it is. If you are not certain which, leave it out.

WHAT YOU COULD NOT SEE IS PART OF THE ANSWER. The underside, the footings
below grade, the ledger flashing and the far corner are the usual ones. Name
them in "couldNotSee". They are printed beside the figures, not discarded.

If the frames do not let you report anything useful — the deck is under snow,
the frames are of something else, it is too dark — answer exactly
{"unsure": true, "why": "..."} and nothing else.`;

/**
 * Pass one: read the frames.
 */
export function deckReadingSystem(frameCount: number): string {
  return `${COMMON}

The ${frameCount} frame${frameCount === 1 ? "" : "s"} are numbered from 0 in
the order you were given them. "frames" is a list of those numbers — the frames
you actually used. Never write a filename, a URL or an id there; only numbers
between 0 and ${frameCount - 1}.`;
}

/**
 * Pass two: the same frames, plus what pass one said.
 *
 * The instructions are checkable actions rather than an attitude. "Be careful"
 * cannot be verified; "count each thing once" and "drop what you cannot find"
 * can be, and the reply gate checks the shape of what comes back.
 */
export function deckVerifySystem(frameCount: number): string {
  return `${COMMON}

You are checking a first reading of these same ${frameCount} frames. The first
reading follows this message. Return the CORRECTED version of it.

COUNT EACH THING ONCE. These frames are a walk round one deck, so the same
footing, the same post and the same flight of stairs appear in several of them.
The first reading often counts a thing once per frame, which would turn three
footings into nine and triple the deck. Merge them: one count per real object,
with every frame it appears in listed in "frames".

A COUNT IS ONLY A COUNT IF YOU CAN STILL COUNT IT. If the first reading gives a
number and you cannot arrive at it from these frames, leave that field out.
Do not keep it because it sounds like a normal deck.

DISAGREEMENT MEANS LEAVE IT OUT. Where your count differs from the first
reading's and you cannot tell which is right, omit the field. There is no
averaging here: half-way between two joist counts is a deck that does not
exist, and an omitted field is handled properly downstream — it makes the deck
get measured.

CHECK THE DECKING DIRECTION HARDEST. It decides which dimension the board count
measures, so getting it backwards swaps the deck's width and depth. If the
first reading states one and you cannot confirm it, leave it out.

RE-STATE WHAT IS HIDDEN. Keep everything the first reading could not see, add
anything you cannot see, and keep it in "couldNotSee".

"frames" is a list of frame numbers between 0 and ${frameCount - 1}. Never a
filename, a URL or an id.`;
}
