/**
 * Reading the answers an application form collected.
 *
 * WHY THESE LIVE IN A LIB AND NOT IN THE FORM COMPONENT
 *
 * They are pure functions about SHAPE, and shape is exactly what went wrong:
 * two bugs shipped together because nothing checked what an answer actually
 * looked like. Node's test runner cannot load a `.tsx` file, so anything left
 * inside `GenericApplicationForm` cannot be tested — which is how both bugs
 * survived. See `tests/applicationPreview.test.ts`.
 */

export interface SkillItem {
  id: string;
  label: string;
  description: string;
}

/**
 * The skills that were actually ticked.
 *
 * WHY THIS EXISTS AT ALL
 *
 * `SkillSelector` stores its answer as an object keyed by skill id —
 * `{ hvac: { checked: true, level: 'Advanced', description: '' } }`. The
 * required-field check asked `!Array.isArray(value) || value.length === 0`,
 * and an object is not an array, so it reported "empty" no matter how many
 * skills were ticked.
 *
 * Every application whose skill step was `required` was therefore impossible to
 * submit: the applicant ticked HVAC, plumbing and electrical, pressed Next, and
 * was told "Please complete: Technical Skills" forever, with nothing on the
 * screen explaining why. That was five of the six sign-up applications,
 * including the field tech one.
 *
 * Unticking a skill deletes its entry, so presence would be enough — but
 * `checked` is read explicitly anyway, because a future writer who sets
 * `checked: false` rather than deleting should not silently re-break this.
 *
 * The array branch is not speculative: a queued offline application written by
 * an older build can come back in either shape, and a recovered application
 * must not fail validation because of when it was saved.
 */
export function selectedSkillIds(value: any): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).filter(Boolean);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([, detail]: [string, any]) => detail && typeof detail === 'object' ? detail.checked !== false : Boolean(detail))
    .map(([id]) => id);
}

/**
 * Any answer, as one line of text that React can actually render.
 *
 * Files arrive as a FileList and checkboxes as a boolean, neither of which is a
 * valid React child. A blank answer reads "Not provided" rather than as an
 * empty gap, because this screen is the applicant's last chance to notice that
 * they missed something.
 */
export function previewText(value: any): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    return value.length ? Array.from(value).map((file) => file.name).join(', ') : 'Not provided';
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => previewText(item)).filter((part) => part !== 'Not provided');
    return parts.length ? parts.join(', ') : 'Not provided';
  }
  if (typeof value === 'object') {
    // Uploaded files are serialised to `{ name, size, type }` before they are sent.
    if (typeof value.name === 'string') return value.name;
    const parts = Object.values(value).map((item) => previewText(item)).filter((part) => part !== 'Not provided');
    return parts.length ? parts.join(' · ') : 'Not provided';
  }
  return String(value);
}

/** One ticked skill, written the way somebody reading the application would want it. */
export function describeSkill(value: any, skillId: string, skills: SkillItem[] = []): string {
  const label = skills.find((s) => s.id === skillId)?.label || skillId;
  const detail = !Array.isArray(value) && value && typeof value === 'object' ? value[skillId] : null;
  if (!detail || typeof detail !== 'object') return label;
  const level = String(detail.level || '').trim();
  const note = String(detail.description || '').trim();
  return [label, level && `— ${level}`, note && `· ${note}`].filter(Boolean).join(' ');
}

