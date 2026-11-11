/**
 * The intake agent must ask about the things the estimator actually needs.
 *
 * This exists because it did not. There were two lists of "what we need from
 * the customer" — thirteen `check(...)` calls inside the `ai-guide-chat` route,
 * and `QuoteBriefInput` in `quoteBrief.ts` — and they had drifted until they
 * barely overlapped. The agent asked for name, email, phone, address, timeline
 * and budget. The estimator wanted square footage, ceiling height, access,
 * occupancy and exclusions. An interview could finish, report `complete: true`,
 * and leave the office a perfect postal address and no idea how big the room
 * was.
 *
 * The first test below is the one that matters: it reads `quoteBrief.ts` and
 * fails if an input it declares has no question attached to it. The drift that
 * caused the bug is now a build failure instead of a discovery.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  INTAKE_FIELDS, fieldsFor, statusOf, nextQuestion, coerceUpdates, isFilled,
  type IntakeCategory,
} from '../supabase/functions/server/intakeFields.ts';

/** The field names `QuoteBriefInput` declares, read from the source. */
function quoteBriefInputs(): string[] {
  const src = readFileSync('supabase/functions/server/quoteBrief.ts', 'utf8');
  const block = src.slice(
    src.indexOf('export interface QuoteBriefInput'),
    src.indexOf('export const BRIEF_MAX'),
  );
  assert.ok(block.length > 100, 'could not find QuoteBriefInput — has quoteBrief.ts moved?');
  return [...block.matchAll(/^\s{2}([a-zA-Z]+)\??:/gm)].map((m) => m[1]);
}

/**
 * Inputs that are deliberately not asked of a customer.
 *
 * `blueprintAnalysis` and `aiVideoAnalysis` are prior machine output, not
 * answers — `quoteBrief.ts` marks them "Kept for compatibility". Nobody is
 * interviewed about them.
 */
const NOT_INTERVIEW_QUESTIONS = new Set(['blueprintAnalysis', 'aiVideoAnalysis']);

test('every estimator input a customer could answer has a question', () => {
  const asked = new Set(INTAKE_FIELDS.map((f) => f.name));
  const unasked = quoteBriefInputs()
    .filter((name) => !NOT_INTERVIEW_QUESTIONS.has(name))
    .filter((name) => !asked.has(name));

  assert.deepStrictEqual(
    unasked,
    [],
    'These QuoteBriefInput fields have no question in intakeFields.ts, so the '
    + 'agent will never collect them and the estimator will never see them:\n  '
    + unasked.join('\n  '),
  );
});

test('the measurements that caused the bug are actually in the list', () => {
  // Named explicitly rather than counted, so deleting one is loud.
  const asked = new Set(INTAKE_FIELDS.map((f) => f.name));
  for (const name of [
    'squareFootage', 'linearFootage', 'ceilingHeight', 'roomCount', 'storeys',
    'unitCount', 'accessNotes', 'occupancy', 'parking', 'stairsOrLift',
    'workingHours', 'workNature', 'exclusions', 'urgency', 'deadline', 'brief',
  ]) {
    assert.ok(asked.has(name), `${name} is not asked about`);
  }
});

test('photos and video are asked about, on a form that already takes them', () => {
  const photos = INTAKE_FIELDS.find((f) => f.name === 'photos');
  assert.ok(photos, 'photos must be asked about — it is the highest-value answer');
  assert.strictEqual(photos.target, 'media');
  assert.ok(photos.requiredForQuote, 'a job with no photos should not read as quotable');
  assert.ok(INTAKE_FIELDS.some((f) => f.name === 'videos'));
});

test('there is no question for a field the form does not have', () => {
  // `projectDescription` was on the old checklist and is not a field on
  // ClientWorkRequestForm, so it counted as missing on every turn and the agent
  // asked for it forever. Its replacement is `brief`, which goes to the
  // estimator verbatim.
  assert.ok(!INTAKE_FIELDS.some((f) => f.name === 'projectDescription'));
  assert.ok(INTAKE_FIELDS.some((f) => f.name === 'brief' && f.target === 'brief'));
});

test('quotable is a higher bar than submittable', () => {
  // The old route reported complete when every contact box had text in it.
  const contactOnly = {
    clientName: 'Eric', clientEmail: 'e@example.com', siteAddress: '1 Elm St',
    brief: 'Replace the deck boards',
  };
  const s = statusOf(contactOnly, 'simple_service');
  assert.ok(s.submittable, 'it can be sent');
  assert.ok(!s.quotable, 'but nobody could price it');
  assert.ok(s.missingForQuote.length > 0);
});

test('a job with no category is never quotable', () => {
  const s = statusOf({ clientName: 'x', clientEmail: 'y', siteAddress: 'z', brief: 'w' }, '');
  assert.ok(!s.quotable, 'we do not know what kind of work it is');
});

test('a fully answered simple job is quotable', () => {
  const full: Record<string, unknown> = {
    clientName: 'Eric', clientEmail: 'e@example.com', siteAddress: '1 Elm St',
    city: 'Manchester', serviceType: 'painting',
    brief: 'Repaint the hallway', workNature: 'repaint existing',
    squareFootage: 320, accessNotes: 'front door', occupancy: 'occupied',
    photos: [1],
  };
  const s = statusOf(full, 'simple_service');
  assert.deepStrictEqual(s.missingForQuote, [], 'nothing should block pricing');
  assert.ok(s.quotable);
});

test('the next question is the one that blocks pricing, not the next in the list', () => {
  const values = { clientName: 'Eric', clientEmail: 'e@example.com' };
  const next = nextQuestion(values, 'kitchen_bath');
  assert.ok(next, 'something should still be asked');
  // siteAddress and brief are requiredToSubmit, so they come before the
  // measurements, which come before anything merely useful.
  assert.ok(['siteAddress', 'brief'].includes(next.name), `asked for ${next.name} first`);
});

test('a measurement is only present when it reads as a positive number', () => {
  const field = INTAKE_FIELDS.find((f) => f.name === 'squareFootage')!;
  assert.ok(isFilled(field, 320));
  assert.ok(isFilled(field, '320 sq ft'));
  assert.ok(!isFilled(field, 0), 'zero square feet is not a measurement');
  assert.ok(!isFilled(field, ''), 'blank is not a measurement');
  assert.ok(!isFilled(field, 'unknown'), 'and neither is the word unknown');
});

/* ── what the model may write back ──────────────────────────────────────── */

test('the model cannot write a field nobody asked it about', () => {
  const { form, brief, rejected } = coerceUpdates(
    { squareFootage: 320, budgetMax: 1, priorityLevel: 'urgent', nonsense: 'x' },
    'simple_service',
  );
  assert.strictEqual(brief.squareFootage, 320);
  assert.ok(!('budgetMax' in form) && !('budgetMax' in brief), 'budget is not on the list');
  assert.ok(!('priorityLevel' in form), 'nor is priority');
  assert.ok(rejected.includes('budgetMax') && rejected.includes('nonsense'));
});

test('the model can never claim an attachment — the crash path', () => {
  // `photos` is a File[] on the form. The old code filtered on the VALUE only,
  // so `"photos": "none"` replaced the array with a string and the submit loop
  // `for (const photo of formData.photos)` iterated the letters of "none".
  const { form, brief, rejected } = coerceUpdates({ photos: 'none', videos: 3 }, 'trash_demo');
  assert.ok(!('photos' in form) && !('photos' in brief));
  assert.ok(!('videos' in form) && !('videos' in brief));
  assert.ok(rejected.includes('photos'));
  assert.ok(rejected.includes('videos'));
});

test('a measurement that is not a number is refused, not stored as text', () => {
  const { brief, rejected } = coerceUpdates({ squareFootage: 'quite big' }, 'simple_service');
  assert.ok(!('squareFootage' in brief));
  assert.ok(rejected.includes('squareFootage'));
});

test('text is trimmed to its field ceiling', () => {
  const long = 'x'.repeat(9000);
  const { brief } = coerceUpdates({ brief: long }, 'simple_service');
  assert.strictEqual(String(brief.brief).length, 6000, 'BRIEF_MAX in quoteBrief.ts is 6000');
});

test('rubbish in place of a field block is survived', () => {
  for (const junk of [null, undefined, 'a string', 42, [1, 2, 3]]) {
    const out = coerceUpdates(junk, 'simple_service');
    assert.deepStrictEqual(out.form, {});
    assert.deepStrictEqual(out.brief, {});
  }
});

test('a field is only writable where it applies', () => {
  // unitCount is for whole renovations and new builds, not a repaint.
  const simple = coerceUpdates({ unitCount: 4 }, 'simple_service');
  assert.ok(simple.rejected.includes('unitCount'));
  const reno = coerceUpdates({ unitCount: 4 }, 'full_renovation');
  assert.strictEqual(reno.brief.unitCount, 4);
});

/* ── the shape of the list itself ───────────────────────────────────────── */

test('every field has a question a person could answer out loud', () => {
  for (const f of INTAKE_FIELDS) {
    assert.ok(f.question && f.question.length > 12, `${f.name} has no real question`);
    assert.ok(f.label && f.label.length > 1, `${f.name} has no label`);
    assert.ok(/[?.]$/.test(f.question.trim()), `${f.name}'s question is not punctuated`);
  }
});

test('no duplicate field names', () => {
  const names = INTAKE_FIELDS.map((f) => f.name);
  assert.deepStrictEqual(names, [...new Set(names)]);
});

test('a customer is never asked a staff-only question', () => {
  const categories: IntakeCategory[] = ['simple_service', 'kitchen_bath', 'full_renovation', 'new_construction', 'trash_demo'];
  for (const cat of categories) {
    assert.ok(
      fieldsFor(cat, 'customer').every((f) => !f.staffOnly),
      `a staff-only field leaked into the customer interview for ${cat}`,
    );
  }
});

test('trash and demo leans on photographs', () => {
  const fields = fieldsFor('trash_demo', 'customer');
  const photos = fields.find((f) => f.name === 'photos');
  assert.ok(photos?.requiredForQuote, 'the form already refuses to submit one without a photo');
  // And it should not be demanding kitchen measurements for a dump run.
  assert.ok(!fields.some((f) => f.name === 'ceilingHeight'));
});
