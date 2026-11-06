/**
 * The JSON-LD block cannot be broken out of.
 *
 * `api/render.js` serves the public `/work` and `/blog` pages to crawlers, and
 * every value on them comes out of the database. Every one of those values is
 * escaped through `esc()` before it touches the HTML — except the structured
 * data, which went into a `<script>` block as raw `JSON.stringify` output.
 * That was L-1 of tasks/security-audit-2026-10-16.md, and it stayed open for
 * three weeks because nothing failed when it was wrong.
 *
 * It is Low severity because the values are staff-authored: a project title
 * typed into the admin, not a field a stranger can post. It is worth a test
 * anyway, because "only staff can write here" is a sentence about today's
 * routes, and the page it renders is public.
 *
 * THE REGRESSION THIS IS REALLY GUARDING. The fix is one `.replace`, and the
 * obvious way to write it is wrong in a way that looks right:
 *
 *     .replace(/</g, '<')     // a no-op — '<' IS '<'
 *     .replace(/</g, '\\u003c')    // correct — emits the six characters
 *
 * Both compile, both run, and the first changes nothing at all. A reader
 * cannot tell them apart at a glance and neither can a diff. So the test
 * below asserts on the emitted text rather than on the call.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonLdBlock } from '../api/render.js';

/** What an attacker would need to get into a title to own the page. */
const BREAKOUT = '</script><img src=x onerror=alert(1)>';

test('a closing script tag in the data never reaches the HTML', () => {
  const html = jsonLdBlock({ '@type': 'CreativeWork', name: `Kitchen ${BREAKOUT}` });

  // Built by concatenation so this file does not contain the sequence either.
  const closer = '</' + 'script>';
  const opener = '<' + 'script type="application/ld+json">';

  // Exactly one closer: the one this function wrote itself.
  assert.equal(html.split(closer).length - 1, 1);
  assert.ok(html.startsWith(opener));
  assert.ok(html.endsWith(closer));
  // Nothing resembling a tag survives anywhere in the payload.
  assert.ok(!html.slice(opener.length, -closer.length).includes('<'));
});

/**
 * The escape has to be invisible to the consumer. A crawler runs JSON.parse
 * over this; if the fix changed the data it would be trading one bug for a
 * quieter one.
 */
test('the data a crawler parses back is identical', () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `Kitchen ${BREAKOUT}`,
    genre: 'Kitchens & Baths <remodel>',
    url: 'https://theblackphoenixcompany.com/work/abc',
  };
  const html = jsonLdBlock(schema);
  const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'));

  assert.deepEqual(JSON.parse(inner), schema);
});

/**
 * The no-op guard. If somebody "simplifies" the doubled backslash away, the
 * two tests above still pass for the `</script>` case — `'<'` replaces
 * `<` with `<` and the breakout returns. This one fails immediately.
 */
test('< is emitted as the escape sequence, not as itself', () => {
  const html = jsonLdBlock({ name: '<' });
  const backslash = String.fromCharCode(92);

  assert.ok(html.includes(backslash + 'u003c'), 'expected a literal backslash-u003c in the output');
  assert.ok(!html.includes('"<"'), 'a bare < reached the output');
});

test('ordinary data is left alone', () => {
  const schema = { '@type': 'CollectionPage', name: 'Our Work', hasPart: [] };
  const html = jsonLdBlock(schema);
  const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'));

  assert.equal(inner, JSON.stringify(schema));
});
