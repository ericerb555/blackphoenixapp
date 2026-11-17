/**
 * Every icon the site points at has to be a real file.
 *
 * Eric, 2026-11-16: *"wheni look up my app on the web can we please tie the
 * logo to put with it?"*
 *
 * WHY NOTHING EVER REPORTED THIS
 *
 * `index.html` asked for `/vite.svg`, `/manifest.json`, `/pwa-icon-192.png`,
 * `/pwa-icon-512.png`; `sw.js` asked for `/BPB_phoenix_full_color_logo.png`.
 * None of them existed. And because the SPA catch-all answers any unknown
 * path with `index.html`, each one came back **200 OK with 8KB of HTML** —
 * not a 404. The browser asked for an image, got a web page, discarded it,
 * and showed a blank glyph. Google's crawler did the same. Every check that
 * only looks at status codes said the site was fine.
 *
 * So a missing icon is invisible from the outside AND from the inside: the
 * build does not mind, no test rendered the head, and the only symptom is an
 * absence in a search result nobody is staring at.
 *
 * WHAT THIS ASSERTS
 *
 * That every local icon path referenced in `index.html`, `manifest.json` and
 * `sw.js` exists on disk under `public/`, and is a real image rather than a
 * stub. It is a file-existence test on purpose — it would have caught all six
 * of these the day they were written, and it needs no network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const publicDir = join(root, 'public');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

/** `href`/`src` values that point at a local file, not a remote URL or a data URI. */
function localRefs(source: string, attr: RegExp): string[] {
  return [...source.matchAll(attr)]
    .map((m) => m[1])
    .filter((v) => v.startsWith('/') && !v.startsWith('//'))
    .filter((v) => !v.startsWith('/src/')) // bundled by vite, not a public file
    .map((v) => v.split('?')[0]);
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const ICO = Buffer.from([0x00, 0x00, 0x01, 0x00]);

function assertRealImage(ref: string) {
  const onDisk = join(publicDir, ref.replace(/^\//, ''));
  assert.ok(
    existsSync(onDisk),
    `${ref} is referenced but does not exist in public/.\n`
      + 'It will NOT 404 — the SPA catch-all answers it with index.html, so a '
      + 'browser gets 200 text/html where it expected an image and silently '
      + 'shows nothing.',
  );
  const bytes = readFileSync(onDisk);
  assert.ok(statSync(onDisk).size > 100, `${ref} exists but is suspiciously small`);
  if (ref.endsWith('.png')) {
    assert.ok(bytes.subarray(0, 4).equals(PNG), `${ref} does not start with the PNG signature`);
  }
  if (ref.endsWith('.ico')) {
    assert.ok(bytes.subarray(0, 4).equals(ICO), `${ref} does not start with the ICO signature`);
  }
}

test('every icon and manifest in index.html is a real file', () => {
  const refs = [
    ...localRefs(indexHtml, /<link[^>]+rel="(?:icon|apple-touch-icon|manifest)"[^>]+href="([^"]+)"/g),
    ...localRefs(indexHtml, /<link[^>]+href="([^"]+)"[^>]+rel="(?:icon|apple-touch-icon|manifest)"/g),
  ];
  assert.ok(refs.length >= 4, `expected several icon references, found ${refs.length}`);
  for (const ref of refs) {
    if (ref.endsWith('.json')) {
      assert.ok(existsSync(join(publicDir, ref.replace(/^\//, ''))), `${ref} does not exist`);
      continue;
    }
    assertRealImage(ref);
  }
});

test('the favicon is ours, not the build tool default', () => {
  assert.doesNotMatch(
    indexHtml,
    /href="\/vite\.svg"/,
    "the favicon points at vite.svg — that is Vite's logo, and the file is not even shipped",
  );
});

test('every icon the manifest lists is a real file', () => {
  const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.json'), 'utf8'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'the manifest lists no icons');
  for (const icon of manifest.icons) assertRealImage(icon.src);
});

/**
 * Notification icons are the easiest to get wrong and the least likely to be
 * noticed: the notification still arrives, just with no logo on it.
 */
test('every icon the service worker shows is a real file', () => {
  const sw = readFileSync(join(publicDir, 'sw.js'), 'utf8');
  const refs = [...sw.matchAll(/(?:icon|badge):\s*'([^']+)'/g)]
    .map((m) => m[1])
    .filter((v) => v.startsWith('/'));
  assert.ok(refs.length > 0, 'no notification icons found; the extraction regex is wrong');
  for (const ref of refs) assertRealImage(ref);
});

/**
 * The social preview is the other half of "tie the logo to it" — what a text
 * message, a Facebook post or a Slack link renders. It was already correct;
 * this keeps it that way.
 */
test('the social preview image is a real file', () => {
  const og = indexHtml.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  assert.ok(og, 'og:image is missing');
  const path = og!.replace(/^https?:\/\/[^/]+/, '');
  assertRealImage(path);
});
