/**
 * A file cannot arrive wearing a label its contents do not support.
 *
 * WHAT THIS CLOSES, WITH THE DATE
 *
 * Found 2026-11-17. `media-library.tsx` validated `file.type` — the string the
 * client sends — against an allow list that included `image/svg+xml`, then
 * stored the object with `contentType: file.type`. The bytes were never
 * examined, so an uploader chose both what passed the check and the header
 * the file was served back with. SVG is an XML document that can carry
 * script.
 *
 * `image-upload.tsx` one file away had always read the bytes, and said why:
 * *"has to genuinely look like one, so a script cannot arrive wearing the
 * label."* The good pattern existed and was documented; the other uploader
 * never adopted it.
 *
 * WHY THE SIGNATURES ARE WRITTEN OUT HERE
 *
 * A test that builds its fixtures by calling the thing it tests proves
 * nothing. These are the real leading bytes of each format, written by hand,
 * so the assertions fail if somebody edits a signature to make a stubborn
 * upload work.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sniffMedia } from '../supabase/functions/server/mediaSniff.ts';

const bytes = (...v: number[]) => new Uint8Array([...v, ...new Array(32).fill(0)]);
const withAscii = (s: string, at = 0, lead: number[] = []) => {
  const out = new Uint8Array(64);
  lead.forEach((v, i) => { out[i] = v; });
  for (let i = 0; i < s.length; i++) out[at + i] = s.charCodeAt(i);
  return out;
};

test('real image signatures are recognised', () => {
  assert.equal(sniffMedia(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime, 'image/jpeg');
  assert.equal(sniffMedia(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime, 'image/png');
  assert.equal(sniffMedia(withAscii('GIF89a'))?.mime, 'image/gif');
  assert.equal(sniffMedia(withAscii('BM'))?.mime, 'image/bmp');
  assert.equal(sniffMedia(bytes(0x49, 0x49, 0x2a, 0x00))?.mime, 'image/tiff');
  assert.equal(sniffMedia(bytes(0x4d, 0x4d, 0x00, 0x2a))?.mime, 'image/tiff');
});

test('real video signatures are recognised', () => {
  // ISO base media: bytes 4-7 are "ftyp", 8-11 the brand.
  assert.equal(sniffMedia(withAscii('ftypisom', 4))?.mime, 'video/mp4');
  assert.equal(sniffMedia(withAscii('ftypqt  ', 4))?.mime, 'video/quicktime');
  assert.equal(sniffMedia(bytes(0x1a, 0x45, 0xdf, 0xa3))?.mime, 'video/webm');
  assert.equal(sniffMedia(withAscii('AVI ', 8, [0x52, 0x49, 0x46, 0x46]))?.mime, 'video/x-msvideo');
  assert.equal(sniffMedia(withAscii('FLV'))?.mime, 'video/x-flv');
});

test('images and videos are told apart', () => {
  assert.equal(sniffMedia(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.kind, 'image');
  assert.equal(sniffMedia(withAscii('ftypisom', 4))?.kind, 'video');
});

/**
 * The finding itself.
 *
 * An SVG is text and has no signature, so it cannot be mistaken for an image
 * by a byte check — it simply fails to match anything, which is the correct
 * answer and the one the old code could not reach, because it never looked.
 */
test('an SVG is refused however it is labelled', () => {
  for (const svg of [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<?xml version="1.0"?><svg onload="alert(1)"/>',
    '   <svg />',
  ]) {
    assert.equal(sniffMedia(new TextEncoder().encode(svg)), null, `accepted an SVG: ${svg.slice(0, 40)}`);
  }
});

test('a script, a page or an executable is refused', () => {
  const cases: Record<string, Uint8Array> = {
    html: new TextEncoder().encode('<!doctype html><script>alert(1)</script>'),
    javascript: new TextEncoder().encode('alert(document.cookie)'),
    'windows exe': bytes(0x4d, 0x5a, 0x90, 0x00),
    elf: bytes(0x7f, 0x45, 0x4c, 0x46),
    zip: bytes(0x50, 0x4b, 0x03, 0x04),
    pdf: new TextEncoder().encode('%PDF-1.7'),
    empty: new Uint8Array(0),
  };
  for (const [name, b] of Object.entries(cases)) {
    assert.equal(sniffMedia(b), null, `accepted ${name}`);
  }
});

/**
 * `BM` is only two bytes, which is the shortest signature here and therefore
 * the one most likely to match something that is not a bitmap. Pinned so that
 * a future "just check the first two bytes" shortcut for another format has
 * to reckon with it.
 */
test('a short signature is not matched on a truncated file', () => {
  assert.equal(sniffMedia(new Uint8Array([0x42])), null, 'one byte should decide nothing');
  assert.equal(sniffMedia(new Uint8Array([])), null);
});

test('the declared type is not a parameter, so it cannot be trusted', () => {
  // The whole function takes bytes and nothing else. If somebody adds a
  // `claimed` argument, this stops compiling — which is the point.
  assert.equal(sniffMedia.length, 1, 'sniffMedia takes more than bytes now');
});

/**
 * The call site, at the source.
 *
 * The sniffer being correct proves nothing about whether the uploader uses
 * it — and the entire finding was in the using.
 */
test('media-library stores the sniffed type, not the declared one', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const code = readFileSync(
    join(import.meta.dirname, '..', 'supabase/functions/server/media-library.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  assert.match(code, /sniffMedia\(/, 'media-library no longer sniffs the bytes');
  assert.doesNotMatch(code, /contentType:\s*file\.type/, 'the declared type is being stored again');
});
