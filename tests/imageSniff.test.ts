/**
 * `sniffImage` — what a vendor is allowed to put in front of our customers.
 *
 * This is the check standing between a URL somebody outside the company chose and
 * a PUBLIC bucket that customers load. The Content-Type header is not consulted,
 * because it is the one part of a response its sender controls completely.
 *
 * The SVG cases are the point of the file. An SVG is an XML document that can
 * carry script, so accepting one here is stored cross-site scripting.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sniffImage } from '../supabase/functions/server/imageSniff.ts';

const bytes = (...n: number[]) => new Uint8Array(n);
const text = (s: string) => new TextEncoder().encode(s);
/** Pad to at least 32 bytes: a real file is never 12 bytes long. */
const pad = (u: Uint8Array, n = 32) => {
  const out = new Uint8Array(Math.max(n, u.length));
  out.set(u);
  return out;
};

test('JPEG is accepted, both JFIF and Exif', () => {
  assert.equal(sniffImage(pad(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1)))?.mime, 'image/jpeg');
  assert.equal(sniffImage(pad(bytes(0xff, 0xd8, 0xff, 0xe1, 0, 0x16, 0x45, 0x78, 0x69, 0x66, 0, 0)))?.mime, 'image/jpeg');
});

test('PNG is accepted', () => {
  const png = pad(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d));
  assert.equal(sniffImage(png)?.mime, 'image/png');
  assert.equal(sniffImage(png)?.ext, 'png');
});

test('WebP is accepted', () => {
  const webp = pad(new Uint8Array([...text('RIFF'), 0x24, 0, 0, 0, ...text('WEBP')]));
  assert.equal(sniffImage(webp)?.mime, 'image/webp');
});

test('SVG IS REFUSED — it is a document that can carry script', () => {
  assert.equal(sniffImage(pad(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))), null);
  assert.equal(sniffImage(pad(text('<?xml version="1.0"?><svg onload="fetch(\'/steal\')"/>'))), null);
});

test('an HTML page served with 200 is refused', () => {
  // The usual cause: a supplier's CMS answering an image URL with a login page.
  assert.equal(sniffImage(pad(text('<!DOCTYPE html><html><head><title>Sign in</title>'))), null);
});

test('a PDF spec sheet is refused', () => {
  assert.equal(sniffImage(pad(text('%PDF-1.7\n'))), null);
});

test('GIF, TIFF and a zip are refused', () => {
  assert.equal(sniffImage(pad(new Uint8Array([...text('GIF89a'), 1, 0, 1, 0, 0x80, 0]))), null);
  assert.equal(sniffImage(pad(bytes(0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0x0e, 0, 0, 1))), null);
  assert.equal(sniffImage(pad(bytes(0x50, 0x4b, 3, 4, 0x14, 0, 6, 0, 8, 0, 0, 0))), null, 'xlsx is not an image');
});

test('a JSON error body is refused', () => {
  assert.equal(sniffImage(pad(text('{"error":"forbidden","code":403}'))), null);
});

test('empty and too-short inputs are refused rather than crashing', () => {
  assert.equal(sniffImage(new Uint8Array(0)), null);
  assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff)), null);
});

test('RIFF that is not WEBP is refused', () => {
  const wave = pad(new Uint8Array([...text('RIFF'), 0x24, 0, 0, 0, ...text('WAVE')]));
  assert.equal(sniffImage(wave), null);
});

test('the signature must be AT THE START, not merely present', () => {
  // Otherwise a file that happens to contain JPEG bytes further in would pass.
  assert.equal(sniffImage(pad(new Uint8Array([0x00, 0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0]))), null);
});
