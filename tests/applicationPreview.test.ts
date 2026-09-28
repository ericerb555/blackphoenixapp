/**
 * The two shape bugs that made five application forms unusable.
 *
 * THE FIRST: NOTHING COULD BE SUBMITTED
 *
 * The required-field check asked `!Array.isArray(value) || value.length === 0`
 * of the skill answer. `SkillSelector` stores an OBJECT keyed by skill id, so
 * the check reported "empty" however many boxes were ticked — and the Employee,
 * Employment, Field Tech, Landlord and Condo Association applications all had a
 * required skill step. Every one of them said "Please complete: …" forever.
 *
 * THE SECOND: THE PREVIEW WOULD HAVE CRASHED
 *
 * The preview rendered `{formData[field.id] || 'Not provided'}` straight into
 * JSX. React throws "Objects are not valid as a React child" on an object, and
 * a skill answer is an object while a file answer is a FileList. That was
 * unreachable only because of the first bug, so fixing one alone would have
 * traded a dead end for a white screen.
 *
 * Both are about shape, so these tests are about shape: what counts as
 * answered, and whether everything that reaches JSX is a string.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectedSkillIds, describeSkill, previewText,
} from '../src/app/lib/applicationAnswers.ts';

const skills = [
  { id: 'hvac', label: 'HVAC Systems', description: 'Heating and cooling' },
  { id: 'plumbing', label: 'Plumbing', description: 'Pipes and fixtures' },
];

/** Exactly what `SkillSelector` puts in form state when two boxes are ticked. */
const ticked = {
  hvac: { checked: true, level: 'Advanced (6-10 years)', description: 'Rooftop units' },
  plumbing: { checked: true, level: '', description: '' },
};

test('ticked skills count as answered — the bug that blocked five applications', () => {
  assert.deepEqual(selectedSkillIds(ticked).sort(), ['hvac', 'plumbing']);
  assert.equal(selectedSkillIds(ticked).length > 0, true, 'a required skill step must be passable');
});

test('nothing ticked is still empty, so a required step is still enforced', () => {
  assert.deepEqual(selectedSkillIds({}), []);
  assert.deepEqual(selectedSkillIds(undefined), []);
  assert.deepEqual(selectedSkillIds(null), []);
  assert.deepEqual(selectedSkillIds('nonsense'), []);
});

/**
 * Unticking deletes the entry, so presence alone would do — but a future writer
 * who sets `checked: false` instead of deleting must not silently re-break the
 * validation that took five forms offline.
 */
test('an explicitly unchecked skill does not count', () => {
  assert.deepEqual(selectedSkillIds({ hvac: { checked: false, level: '', description: '' } }), []);
});

/**
 * An application queued offline by an older build can come back in either
 * shape. A recovered application must not fail validation over when it was saved.
 */
test('the older array shape is still accepted', () => {
  assert.deepEqual(selectedSkillIds(['hvac', 'plumbing']), ['hvac', 'plumbing']);
  assert.deepEqual(selectedSkillIds([]), []);
});

test('a ticked skill reads as a sentence, not as an object', () => {
  assert.equal(describeSkill(ticked, 'hvac', skills), 'HVAC Systems — Advanced (6-10 years) · Rooftop units');
  assert.equal(describeSkill(ticked, 'plumbing', skills), 'Plumbing');
  assert.equal(describeSkill(ticked, 'unknown', skills), 'unknown', 'an id with no label still names itself');
});

/**
 * The crash class, stated directly: if any of these returned a non-string, the
 * preview would throw and take the whole screen with it.
 */
test('every answer shape renders as a string', () => {
  const shapes: unknown[] = [
    undefined, null, '', 'plain text', 0, 42, true, false,
    [], ['a', 'b'], [''],
    {}, { name: 'photo.jpg', size: 12, type: 'image/jpeg' },
    ticked,
    [{ name: 'a.jpg' }, { name: 'b.jpg' }],
    { nested: { deeper: 'value' } },
  ];
  for (const shape of shapes) {
    const rendered = previewText(shape);
    assert.equal(typeof rendered, 'string', `previewText returned a non-string for ${JSON.stringify(shape)}`);
  }
});

test('a blank answer says so rather than leaving a gap', () => {
  assert.equal(previewText(undefined), 'Not provided');
  assert.equal(previewText(null), 'Not provided');
  assert.equal(previewText(''), 'Not provided');
  assert.equal(previewText([]), 'Not provided');
  assert.equal(previewText({}), 'Not provided');
});

test('a zero is an answer, not a blank', () => {
  assert.equal(previewText(0), '0');
  assert.equal(previewText(false), 'No');
  assert.equal(previewText(true), 'Yes');
});

test('an uploaded file reads as its filename', () => {
  assert.equal(previewText({ name: 'roof.jpg', size: 100, type: 'image/jpeg' }), 'roof.jpg');
  assert.equal(previewText([{ name: 'a.jpg' }, { name: 'b.jpg' }]), 'a.jpg, b.jpg');
});
