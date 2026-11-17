/**
 * iOS must not zoom the page when somebody taps a field.
 *
 * Safari on iOS zooms in when a text field smaller than 16px takes focus and
 * does not zoom back out. The page is then too wide for the screen: controls
 * crowd together, the layout shifts under the finger, and a tap aimed at one
 * button lands on its neighbour. It reads as "the buttons are bunched up" and
 * "I tapped it and it errored", which is why the junk quote page was checked
 * twice against the breakpoints with nothing found. Nothing was wrong with the
 * layout.
 *
 * WHY THIS IS TESTED AT ALL, GIVEN IT IS THREE LINES OF CSS
 *
 * It is invisible everywhere it would be noticed. Every desktop browser, every
 * screenshot taken at desktop width, and every one of the 380 pages the smoke
 * sweep renders are all fine. It only appears on a real phone — the worst
 * feedback loop there is — so the thing that holds it closed has to be checked
 * somewhere that runs on every commit.
 *
 * WHAT IS ACTUALLY FRAGILE HERE
 *
 * Not the font size. The CASCADE. Tailwind v4 puts `.text-sm` in
 * `@layer utilities`, and a class beats a bare `input` selector on
 * specificity, so the rule only works because it sits OUTSIDE any layer —
 * unlayered declarations win over layered ones whatever their specificity.
 * Wrap it in a layer while tidying the stylesheet and 50 fields quietly go
 * back to zooming, with nothing failing anywhere. That is what these
 * assertions are for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

/**
 * Comments go first, and the first version of this test is why.
 *
 * The explanatory comment above the rule in `index.css` discusses `@layer`
 * and names the very mistake this file guards against. The brace walker read
 * that prose as a real layer block, found the media query's `{` after it, and
 * failed the rule for being inside a layer it was never in. A checker fooled
 * by a comment about the thing it checks is worse than no checker: it fails on
 * correct code, so the next person deletes it.
 */
const css = readFileSync(join(root, 'src/styles/index.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Which `@layer` block, if any, encloses a position in the file.
 *
 * Walks braces rather than pattern-matching, because `@layer utilities;` (the
 * ordering statement) and `@layer utilities { … }` (the block) look alike at
 * the start and mean completely different things.
 */
function layerAt(source: string, target: number): string {
  let depth = 0;
  const stack: { open: number; name: string }[] = [];
  for (let i = 0; i < target; i++) {
    if (source[i] === '@' && source.startsWith('@layer', i)) {
      const semi = source.indexOf(';', i);
      const brace = source.indexOf('{', i);
      if (brace >= 0 && (semi < 0 || brace < semi)) {
        stack.push({ open: depth + 1, name: source.slice(i, brace).trim() });
      }
    }
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      if (stack.length && stack[stack.length - 1].open === depth) stack.pop();
      depth--;
    }
  }
  return stack.length ? stack[stack.length - 1].name : '';
}

test('fields get a 16px floor on narrow screens', () => {
  const at = css.indexOf('max-width: 640px');
  assert.ok(at > 0, 'the narrow-screen media query is gone from src/styles/index.css');

  const block = css.slice(at, css.indexOf('}', css.indexOf('font-size', at)) + 1);
  assert.match(block, /font-size:\s*16px/, 'the 16px floor is gone');
  for (const el of ['input', 'textarea', 'select']) {
    assert.ok(block.includes(el), `${el} is no longer covered by the floor`);
  }
});

/**
 * The assertion that actually matters.
 *
 * Everything else here could pass while the fix does nothing at all.
 */
test('the rule sits outside every @layer, or a class would outrank it', () => {
  const at = css.indexOf('max-width: 640px');
  assert.equal(
    layerAt(css, at),
    '',
    'the 16px floor has been moved inside an @layer — .text-sm will now beat it '
      + 'on specificity and every small field zooms again',
  );
});

/**
 * The tempting wrong fix.
 *
 * Setting `maximum-scale=1` or `user-scalable=no` also stops the zoom, by
 * stopping anybody from ever zooming — including people who need to in order
 * to read the page at all. If someone reaches for it, this says no.
 */
test('the viewport still lets people zoom', () => {
  const viewport = html.match(/<meta\s+name="viewport"[^>]*>/i)?.[0] || '';
  assert.ok(viewport, 'the viewport meta tag is missing from index.html');
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*no/i, 'zoom has been disabled for everybody');
  assert.doesNotMatch(
    viewport,
    /maximum-scale\s*=\s*1(\.0+)?\b/i,
    'maximum-scale=1 disables zoom as surely as user-scalable=no',
  );
});

/**
 * Checkboxes, radios and ranges are deliberately left alone: they hold no
 * text, iOS does not zoom for them, and resizing them would move layout for no
 * reason. Pinned so a later simplification to a bare `input` does not quietly
 * resize every tick box in the application.
 */
test('controls that hold no text are left out', () => {
  const at = css.indexOf('max-width: 640px');
  const block = css.slice(at, css.indexOf('}', css.indexOf('font-size', at)) + 1);
  for (const type of ['checkbox', 'radio', 'range']) {
    assert.match(
      block,
      new RegExp(`:not\\(\\[type=['"]?${type}`),
      `${type} inputs are no longer excluded`,
    );
  }
});
