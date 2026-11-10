/**
 * The check that decides whether a job photo can be attached to a quote.
 *
 * These tests exist because the feature shipped refusing the only device it was
 * built for. Eric pressed "Add photos" on his phone and nothing attached: an
 * iOS library photo is `image/heic`, the route gated on the declared type
 * against a list that did not include it, and the bytes were never read. The
 * same list admitted GIF, BMP and TIFF, which then always failed the sniffer
 * behind it — permission on the way in, refusal on the way out.
 *
 * So the properties worth holding are: HEIC is recognised, the set recognised
 * is exactly the set admitted, and nothing is decided from a filename or a
 * header.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { sniffPhoto } from '../supabase/functions/server/photoSniff.ts';

/** A HEIC/HEIF header: four length bytes, 'ftyp', then the brand. */
function heic(brand: string): Uint8Array {
  const b = new Uint8Array(16);
  b.set([0x00, 0x00, 0x00, 0x18], 0); // box length, as an encoder writes it
  b.set([0x66, 0x74, 0x79, 0x70], 4); // 'ftyp'
  for (let i = 0; i < 4; i++) b[8 + i] = brand.charCodeAt(i);
  return b;
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const GIF89 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
const GIF87 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0]);

test('an iPhone photo is recognised — the bug Eric found', () => {
  // The whole point. Every brand an iPhone writes for a still.
  for (const brand of ['heic', 'heix', 'heim', 'heis', 'mif1']) {
    const got = sniffPhoto(heic(brand));
    assert.ok(got, `brand ${brand} was refused — this is the original bug`);
    assert.strictEqual(got.mime, 'image/heic', `brand ${brand}`);
    assert.strictEqual(got.ext, 'heic');
  }
});

test('a Live Photo or burst sequence is recognised too', () => {
  for (const brand of ['hevc', 'hevx', 'hevm', 'hevs', 'msf1']) {
    const got = sniffPhoto(heic(brand));
    assert.ok(got, `brand ${brand} was refused`);
    assert.strictEqual(got.mime, 'image/heif');
    // Stored as .heic deliberately: one extension for the family.
    assert.strictEqual(got.ext, 'heic');
  }
});

test('the three the shared sniffer knows still work', () => {
  assert.strictEqual(sniffPhoto(JPEG)?.mime, 'image/jpeg');
  assert.strictEqual(sniffPhoto(PNG)?.mime, 'image/png');
});

test('GIF is recognised, both versions', () => {
  // GIF was on the old allowlist and could never actually pass. Either admit
  // it or refuse it — not both.
  assert.strictEqual(sniffPhoto(GIF89)?.mime, 'image/gif');
  assert.strictEqual(sniffPhoto(GIF87)?.mime, 'image/gif');
});

test('AVIF fails closed rather than being stored as something it is not', () => {
  // Same container as HEIC, different codec, and nothing in this flow makes
  // one. An unrecognised brand must not be guessed at.
  assert.strictEqual(sniffPhoto(heic('avif')), null);
  assert.strictEqual(sniffPhoto(heic('avis')), null);
});

test('a document is refused however it is labelled', () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0]);
  assert.strictEqual(sniffPhoto(pdf), null);

  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.strictEqual(sniffPhoto(zip), null);
});

test('an SVG is never an image here', () => {
  // A script-bearing XML document, rendered back into a browser from our own
  // origin. The omission is the point.
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
  assert.strictEqual(sniffPhoto(svg), null);
});

test('nothing, or nearly nothing, is refused rather than crashing', () => {
  assert.strictEqual(sniffPhoto(null), null);
  assert.strictEqual(sniffPhoto(undefined), null);
  assert.strictEqual(sniffPhoto(new Uint8Array([])), null);
  assert.strictEqual(sniffPhoto(new Uint8Array([0xff, 0xd8])), null, 'a truncated JPEG header');
  assert.strictEqual(sniffPhoto(heic('heic').slice(0, 10)), null, 'ftyp but no room for a brand');
});

test('a HEIC box length other than 0x18 is still recognised', () => {
  // The length varies by encoder and is not part of the signature. Matching it
  // would make the check fail on half the phones in the world.
  const b = heic('heic');
  b.set([0x00, 0x00, 0x01, 0x2c], 0);
  assert.strictEqual(sniffPhoto(b)?.mime, 'image/heic');
});

test('the filename is never consulted', () => {
  // There is no filename parameter, and there must not be one: the bug being
  // fixed was trusting metadata over bytes. A JPEG called .heic is a JPEG.
  assert.strictEqual(sniffPhoto(JPEG)?.mime, 'image/jpeg');
  assert.strictEqual(sniffPhoto.length, 1, 'sniffPhoto takes bytes and nothing else');
});
