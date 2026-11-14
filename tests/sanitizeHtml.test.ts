/**
 * What the sanitiser must refuse.
 *
 * Written as the attacks themselves rather than as "returns a string", so a
 * future change that reopens one of these fails with the payload on screen.
 *
 * `sanitizeSvg` needs a DOM and the node test runner has none, so the SVG
 * cases assert the documented no-DOM behaviour: refuse, do not pass through.
 * That is the property that matters most about it — a sanitiser that becomes
 * a no-op when it cannot see is worse than no sanitiser, because the call
 * site reads as protected.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeAttr, sanitizeSvg, asPlainTextHtml } from '../src/app/lib/sanitizeHtml.ts';

test('a script tag is text, not a script', () => {
  assert.equal(
    escapeHtml('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;',
  );
});

test('the ampersand is escaped first, so entities are not doubled', () => {
  // Escaping < before & would turn &lt; into &amp;lt; and print the code.
  assert.equal(escapeHtml('<'), '&lt;');
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('both quote styles are escaped, so neither can close an attribute', () => {
  assert.equal(escapeHtml(`" '`), '&quot; &#39;');
});

test('an attribute breakout is defused', () => {
  const payload = '" onmouseover="steal()';
  assert.ok(!escapeAttr(payload).includes('"'));
  assert.ok(!escapeAttr(payload).includes('='));
});

test('backtick and equals are escaped for attributes, not just quotes', () => {
  assert.equal(escapeAttr('a=`b`'), 'a&#61;&#96;b&#96;');
});

test('null and undefined become empty, never the words', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeAttr(null), '');
});

test('a number survives readably', () => {
  assert.equal(escapeHtml(1250.5), '1250.5');
});

test('plain text keeps its line breaks and loses its markup', () => {
  assert.equal(
    asPlainTextHtml('line one\nline <b>two</b>'),
    'line one<br>line &lt;b&gt;two&lt;/b&gt;',
  );
});

test('without a DOM the svg sanitiser refuses rather than passing input through', () => {
  // The dangerous failure mode: returning the input when it cannot be checked.
  assert.equal(sanitizeSvg('<svg onload="alert(1)"></svg>'), '');
  assert.equal(sanitizeSvg('<svg><script>alert(1)</script></svg>'), '');
});

test('empty and missing svg are empty, not thrown', () => {
  assert.equal(sanitizeSvg(''), '');
  assert.equal(sanitizeSvg(null), '');
  assert.equal(sanitizeSvg(undefined), '');
});
