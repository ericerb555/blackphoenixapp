/**
 * Whether a customer can record a walkthrough at all.
 *
 * THE BUG THESE PIN
 *
 * Both capture components asked for `video/webm;codecs=vp9`, and on failure
 * fell back to `video/webm` — a second type iOS Safari also does not support,
 * because its MediaRecorder does `video/mp4` only. So `new MediaRecorder` threw
 * and every iPhone customer who tapped record got an error. The fallback was to
 * another unsupported format, which is the whole mistake in one line.
 *
 * The rule being pinned is therefore: **never return a type the oracle has not
 * confirmed**, and treat "none of them" as "let the browser choose" rather than
 * as a reason to insist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickRecorderMimeType, extensionForMimeType, canRecordInPage,
  RECORDER_CANDIDATES,
} from '../src/app/lib/videoCapture.ts';

/** An oracle that supports exactly the listed types. */
const supporting = (...types: string[]) => ({
  isTypeSupported: (t: string) => types.includes(t),
});

/* ── the browsers that actually exist ────────────────────────────────────── */

test('iOS Safari, which supports mp4 only, gets mp4', () => {
  // The case the old code threw on.
  assert.equal(pickRecorderMimeType(supporting('video/mp4')), 'video/mp4');
});

test('iOS Safari that only names the codec still gets a supported type', () => {
  assert.equal(
    pickRecorderMimeType(supporting('video/mp4;codecs=avc1')),
    'video/mp4;codecs=avc1',
  );
});

test('Chrome, which supports both, is given mp4 so the file plays in Safari too', () => {
  // Deliberate: a webm recorded on Chrome will not play on an iPhone, and the
  // person reviewing a customer's walkthrough uses whatever is in their hand.
  const chrome = supporting(
    'video/mp4;codecs=avc1', 'video/mp4',
    'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
  );
  assert.equal(pickRecorderMimeType(chrome), 'video/mp4;codecs=avc1');
});

test('a webm-only browser gets webm rather than an unsupported mp4', () => {
  const firefoxish = supporting('video/webm;codecs=vp9', 'video/webm');
  assert.equal(pickRecorderMimeType(firefoxish), 'video/webm;codecs=vp9');
});

test('a browser supporting only bare webm gets bare webm', () => {
  assert.equal(pickRecorderMimeType(supporting('video/webm')), 'video/webm');
});

/* ── never assert an unsupported type ───────────────────────────────────── */

test('a browser supporting none of them yields null, not a guess', () => {
  // Null means "construct MediaRecorder with no options and let it choose",
  // which records. Returning a type here is what threw.
  assert.equal(pickRecorderMimeType(supporting()), null);
});

test('no oracle at all yields null rather than a default format', () => {
  assert.equal(pickRecorderMimeType(undefined), null);
  assert.equal(pickRecorderMimeType(null), null);
  assert.equal(pickRecorderMimeType({}), null);
});

test('an oracle that is not a function is not called', () => {
  assert.equal(pickRecorderMimeType({ isTypeSupported: 'yes' as any }), null);
});

test('an oracle that throws is treated as a no, not a crash', () => {
  const hostile = { isTypeSupported: () => { throw new Error('nope'); } };
  assert.equal(pickRecorderMimeType(hostile), null);
});

test('an oracle that throws on some types still finds a later one', () => {
  const picky = {
    isTypeSupported: (t: string) => {
      if (t.startsWith('video/mp4')) throw new Error('cannot answer');
      return t === 'video/webm';
    },
  };
  assert.equal(pickRecorderMimeType(picky), 'video/webm');
});

test('whatever is returned is always one of the candidates', () => {
  for (const type of RECORDER_CANDIDATES) {
    assert.equal(pickRecorderMimeType(supporting(type)), type);
  }
});

/* ── naming the file after what is in it ─────────────────────────────────── */

test('the extension comes from the recorded type', () => {
  assert.equal(extensionForMimeType('video/mp4;codecs=avc1'), 'mp4');
  assert.equal(extensionForMimeType('video/webm;codecs=vp9'), 'webm');
  assert.equal(extensionForMimeType('video/quicktime'), 'mov');
});

test('webm is matched before mp4 when a type names both', () => {
  // Safari reports some recordings with an mp4 container and a webm-ish codec
  // string; the container is what the extension must describe.
  assert.equal(extensionForMimeType('video/webm;codecs=avc1,mp4a'), 'webm');
});

test('an unreadable type defaults to mp4, not webm', () => {
  // The old default of webm is what mislabelled every Android upload. An
  // unknown video off a phone is far more likely to be mp4.
  assert.equal(extensionForMimeType(''), 'mp4');
  assert.equal(extensionForMimeType(undefined), 'mp4');
  assert.equal(extensionForMimeType(null), 'mp4');
  assert.equal(extensionForMimeType('application/octet-stream'), 'mp4');
});

test('case does not matter', () => {
  assert.equal(extensionForMimeType('VIDEO/WEBM'), 'webm');
});

/* ── is recording possible at all ────────────────────────────────────────── */

test('a scope with no MediaRecorder cannot record in page', () => {
  assert.equal(canRecordInPage({}), false);
  assert.equal(canRecordInPage({ MediaRecorder: undefined }), false);
  assert.equal(canRecordInPage({ MediaRecorder: 'nope' as any }), false);
});

test('a scope with a MediaRecorder constructor can', () => {
  assert.equal(canRecordInPage({ MediaRecorder: function () {} as any }), true);
});
