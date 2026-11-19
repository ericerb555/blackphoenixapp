/**
 * Every field that makes room for an icon actually gets the room.
 *
 * Eric, 2026-11-19: "please fix the overlapping in the feild boxes them selfs
 * within the sign ups of the junk removal pricing app and make sure we check
 * all app wide too."
 *
 * THE FAULT, AND WHY IT IS INVISIBLE IN THE SOURCE
 *
 * A field with an icon is written the obvious way — the icon at `absolute
 * left-3`, the input at `pl-10` so its text starts clear of it. The second half
 * never happened. Tailwind v4 emits utilities inside `@layer`; the
 * `* { padding: 0 }` reset in `globals.css` is UNLAYERED; and an unlayered rule
 * beats a layered one outright, without specificity being consulted. So every
 * `pl-*` on every input computed to 0px while the icon stayed where it was.
 *
 * Nothing about the component says so. It reads correctly, it typechecks, and
 * the text sits on top of the icon.
 *
 * 173 inputs across 109 files were affected when this was measured.
 *
 * WHAT THIS TEST IS FOR
 *
 * `globals.css` now restores the clearance for the specific utilities in use.
 * That list is finite, so the day somebody writes `pl-14` the padding silently
 * does nothing again — the same bug, a new number, and no error anywhere. This
 * reads the source and fails with the name of the file that needs the rule.
 *
 * It deliberately does NOT assert that the reset be removed. That reset is a
 * decision Eric reviewed and kept; turning padding back on globally restyles
 * the whole application and was reverted once already.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Clearance starts at 2rem — below that it is ordinary breathing room. */
const ICON_CLEARANCE_MIN = 8;

const CSS = fs.readFileSync('src/styles/globals.css', 'utf8');

/** The end of a JSX tag, counting braces — `onChange={(e) => …}` holds a `>`. */
function tagEnd(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i;
  }
  return Math.min(text.length, from + 2000);
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|dist|\.git/.test(p)) sourceFiles(p, out);
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

/** Every `pl-*` / `pr-*` / `px-*` an input or textarea asks for, app-wide. */
function clearancesInUse(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  for (const file of sourceFiles('src')) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /<(input|textarea)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const tag = text.slice(m.index, tagEnd(text, m.index));
      const cls = tag.match(/className=\{?"([^"]*)"/);
      if (!cls) continue;
      for (const c of cls[1].match(/\bp([lxr])-(\d+)\b/g) || []) {
        const size = Number(c.split('-')[1]);
        if (size < ICON_CLEARANCE_MIN) continue;
        const where = used.get(c) || [];
        if (!where.includes(file)) where.push(file);
        used.set(c, where);
      }
    }
  }
  return used;
}

test('globals.css covers every icon clearance an input asks for', () => {
  const used = clearancesInUse();
  assert.ok(used.size > 0, 'the scan found no padded inputs at all — it has broken');

  const missing: string[] = [];
  for (const [cls, files] of used) {
    const axis = cls[1]; // l, r or x
    // `px-N` needs both sides; the others need their own.
    const needed = axis === 'x'
      ? [`input.pl-${cls.split('-')[1]}`, `input.pr-${cls.split('-')[1]}`]
      : [`input.${cls}`];
    for (const sel of needed) {
      if (!CSS.includes(sel)) {
        missing.push(`${sel} — wanted by ${files.length} file(s), e.g. ${files[0]}`);
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    'These inputs ask for room for an icon and will not get it, because a '
    + 'Tailwind padding utility computes to 0px under the unlayered reset. '
    + 'Add the rule to globals.css beside the others:\n  ' + missing.join('\n  '),
  );
});

test('the rules are outside @layer, or they do nothing', () => {
  // An unlayered `*` reset beats a layered rule whatever its specificity, so a
  // fix written inside @layer would be silently inert — which is the exact
  // failure it exists to correct.
  const at = CSS.indexOf('input.pl-10');
  assert.ok(at > 0, 'the clearance rules are missing from globals.css');

  const before = CSS.slice(0, at);
  const opened = (before.match(/@layer[^;{]*\{/g) || []).length;
  // Count braces to see whether any @layer block is still open at that point.
  let depth = 0;
  for (const ch of before) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  assert.equal(
    opened > 0 && depth > 0,
    false,
    'the clearance rules sit inside an open @layer block, where the `*` reset will beat them',
  );
});

test('the reset that causes this is still in place and still explained', () => {
  // Pinned so nobody "fixes" the symptom by deleting the cause. Turning padding
  // back on globally restyles every screen; it shipped once and was reverted.
  assert.match(CSS, /\*\s*\{[^}]*padding:\s*0/, 'the global reset has gone — read the comment above it first');
  assert.ok(
    CSS.includes('DO NOT WRAP THIS IN @layer'),
    'the explanation for the reset has been removed; it is the only reason the next person will not undo it',
  );
});

/*
 * The second half of the same fault, reported after the first fix shipped:
 * "still overlapping on the mobile device."
 *
 * `space-y-*` is margin-top on siblings and `mb-*` is margin-bottom, so the
 * unlayered `* { margin: 0 }` reset flattens both. A label sits on its own
 * field and the field sits on the next label. It shows on a phone first
 * because two mobile-only rules take up the last of the slack — 16px fields so
 * Safari will not zoom, and a 44px touch-target minimum.
 */

/** Every `mb-*` a <label> asks for, and every `space-y-*` a <form> asks for. */
function formSpacingInUse() {
  const labels = new Map<string, string[]>();
  const forms = new Map<string, string[]>();
  for (const file of sourceFiles('src')) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/<label\b[^>]{0,400}?className=\{?"([^"]*)"/g)) {
      for (const c of m[1].match(/\bmb-\d+(\.\d+)?\b/g) || []) {
        const where = labels.get(c) || [];
        if (!where.includes(file)) where.push(file);
        labels.set(c, where);
      }
    }
    for (const m of text.matchAll(/<form\b[^>]{0,400}?className=\{?"([^"]*)"/g)) {
      for (const c of m[1].match(/\bspace-y-\d+\b/g) || []) {
        const where = forms.get(c) || [];
        if (!where.includes(file)) where.push(file);
        forms.set(c, where);
      }
    }
  }
  return { labels, forms };
}

test('a label gets the gap it asks for above its field', () => {
  const { labels } = formSpacingInUse();
  assert.ok(labels.size > 0, 'the scan found no labelled fields — it has broken');

  const missing: string[] = [];
  for (const [cls, files] of labels) {
    /*
     * `mb-1.5` is written `label.mb-1\.5` in CSS: a bare dot would start a new
     * class selector, so it has to be escaped. The replacement needs a real
     * backslash in the string, which is why it is doubled here — `'\.'` is
     * just a dot to JavaScript, and this test passed against the wrong
     * selector until that was spotted.
     */
    const selector = `label.${cls.replace('.', '\\.')}`;
    if (!CSS.includes(selector)) {
      missing.push(`${selector} — wanted by ${files.length} file(s), e.g. ${files[0]}`);
    }
  }
  assert.deepEqual(missing, [], 'These labels will render flush against their field:\n  ' + missing.join('\n  '));
});

test('a form gets the gap it asks for between its fields', () => {
  const { forms } = formSpacingInUse();
  const missing: string[] = [];
  for (const [cls, files] of forms) {
    if (!CSS.includes(`form.${cls} >`) && !CSS.includes(`form.${cls}>`)) {
      missing.push(`form.${cls} — wanted by ${files.length} file(s), e.g. ${files[0]}`);
    }
  }
  assert.deepEqual(missing, [], 'These forms will stack their fields with no gap:\n  ' + missing.join('\n  '));
});
