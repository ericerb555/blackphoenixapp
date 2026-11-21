/**
 * What the customer typed, in the names the estimator reads.
 *
 * WHY THIS EXISTS
 *
 * Eric, 2026-11-20, about a real request: "now that micheal work request is
 * and it didnt generate how to i get it to generate or into quote editor so i
 * can tell the generator what i need?"
 *
 * Tracing that found the generator was barely being told anything about ANY
 * work request, because three layers each use different field names for the
 * same facts and nothing translated between them.
 *
 * `ClientWorkRequestForm` sends, and the server stores verbatim
 * (`POST /work-requests` is `{ ...stripBase64(body) }` — a passthrough):
 *
 *     project_name   service_type / serviceType   description
 *     site_address   city   state   zip_code
 *     total_square_feet   total_floors   lot_size_sqft
 *     property_type   urgency   style_preferences
 *
 * `estimateForWorkRequest` asked for:
 *
 *     title                    ← nothing sends this; the form sends project_name
 *     serviceType              ← matched
 *     description              ← matched
 *     location || address      ← nothing sends either; the form sends site_address
 *     estimatedValue           ← nothing sends this
 *
 * and `composeEstimatorContext` asked for `squareFootage`, `storeys`,
 * `roomCount`, `propertyType`, `ceilingHeight`, `unitCount` — none of which
 * match `total_square_feet`, `total_floors`, `property_type`.
 *
 * So of everything a customer fills in, the estimator actually received the
 * service type, the free-text description and the urgency. **The square
 * footage, the number of floors, the lot size, the address and the project
 * name never reached it.** Not a failure anybody could see: a quote came back,
 * it was simply priced off two fields instead of ten.
 *
 * WHY A TRANSLATION RATHER THAN RENAMING THINGS
 *
 * The stored records cannot be renamed — there are live work requests using
 * these names, and `POST /work-requests` is a passthrough, so any client that
 * ever posted is part of the contract. Renaming the estimator's inputs would
 * break `quote-generator.tsx`, which shares them. One translation, in one
 * file, with both spellings accepted, is the only change that cannot strand
 * data.
 *
 * Every getter below takes the first of several spellings that is actually
 * present, so an older record, a newer one, and anything a portal posts all
 * land in the same shape.
 */

/** First non-empty value among the given keys. */
function pick(src: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = src[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

/** First usable positive number among the given keys. */
function num(src: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const n = Number(src[k]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/**
 * The job site as one line.
 *
 * The form stores the street, city, state and postcode separately and the
 * estimator wants a single `location`. Assembled rather than taking
 * `site_address` alone, because "12 Probe Lane" prices differently from
 * "12 Probe Lane, Salem, NH" — travel and local rates both key off the town.
 */
export function locationOf(wr: Record<string, unknown>): string | undefined {
  const direct = pick(wr, 'location', 'address', 'site_address', 'siteAddress', 'property_address');
  const city = pick(wr, 'city');
  const state = pick(wr, 'state');
  const zip = pick(wr, 'zip_code', 'zipCode', 'postal_code');
  const parts = [direct, city, state, zip].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

/** The five fields `runEstimator` reads, filled from whatever the record has. */
export function estimatorInputFor(wr: Record<string, unknown> | null | undefined) {
  const r = (wr && typeof wr === 'object' ? wr : {}) as Record<string, unknown>;
  return {
    title: pick(r, 'title', 'project_name', 'projectName', 'name'),
    serviceType: pick(r, 'serviceType', 'service_type', 'service', 'project_type', 'projectType'),
    description: pick(r, 'description', 'details', 'additionalNotes', 'additional_notes', 'notes'),
    location: locationOf(r),
    estimatedValue: num(r, 'estimatedValue', 'estimated_value', 'budget', 'budget_max'),
  };
}

/**
 * The `QuoteBriefInput` that `composeEstimatorContext` turns into prose.
 *
 * `squareFootage` prefers the programmed total the form computes over the lot
 * size: a takeoff wants the floor area being worked on, and a large lot with a
 * small extension is the case where using the wrong one is most wrong.
 */
export function briefInputFor(wr: Record<string, unknown> | null | undefined) {
  const r = (wr && typeof wr === 'object' ? wr : {}) as Record<string, unknown>;
  return {
    serviceType: pick(r, 'serviceType', 'service_type', 'service', 'project_type'),
    propertyType: pick(r, 'propertyType', 'property_type'),
    workNature: pick(r, 'workNature', 'work_nature', 'scope'),

    unitCount: num(r, 'unitCount', 'unit_count', 'units'),
    storeys: num(r, 'storeys', 'total_floors', 'totalFloors', 'floors'),
    accessNotes: pick(r, 'accessNotes', 'access_notes', 'access'),

    squareFootage: num(r, 'squareFootage', 'total_square_feet', 'totalSquareFeet', 'square_feet', 'sqft'),
    linearFootage: num(r, 'linearFootage', 'linear_footage', 'linear_feet'),
    roomCount: num(r, 'roomCount', 'room_count', 'rooms'),
    ceilingHeight: num(r, 'ceilingHeight', 'ceiling_height'),

    occupancy: pick(r, 'occupancy'),
    parking: pick(r, 'parking'),
    stairsOrLift: pick(r, 'stairsOrLift', 'stairs_or_lift'),
    workingHours: pick(r, 'workingHours', 'working_hours'),

    urgency: pick(r, 'urgency', 'priority'),
    preferredWindow: pick(r, 'preferredWindow', 'preferred_window', 'preferred_start'),
    deadline: pick(r, 'deadline', 'hard_deadline'),

    brief: pick(r, 'brief', 'description', 'details', 'additionalNotes'),
    exclusions: pick(r, 'exclusions'),
  };
}
