/**
 * Whether a rendered video can be posted at all.
 *
 * The Video Studio exported WebM/VP9 and offered it as a download. All three
 * target platforms refuse WebM, and Meta's API refuses it *silently* — error
 * code 24, after the upload and the transcode queue. So these rules are
 * checked in front, where a person can be told in a sentence.
 *
 * The publishing code itself cannot be tested without a connected account.
 * These rules can, which is why they live apart from it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickRecordingFormat, checkReel, totalSeconds, REEL_RULES, REEL_MIME_CANDIDATES,
} from '../src/app/lib/reelSpec.ts';

/** A browser that supports everything picks the first, best candidate. */
test('MP4 with H.264 and AAC is chosen when the browser can record it', () => {
  const format = pickRecordingFormat(() => true);
  assert.equal(format.container, 'mp4');
  assert.equal(format.extension, 'mp4');
  assert.equal(format.postable, true);
  assert.equal(format.mimeType, REEL_MIME_CANDIDATES[0]);
});

/**
 * The case that makes the feature check necessary rather than decorative:
 * Chromium builds ship without H.264 and AAC for licensing reasons, so
 * "Chrome does MP4" is not true of everything calling itself Chromium.
 */
test('A CHROMIUM BUILD WITHOUT H.264 FALLS BACK TO WEBM, MARKED UNPOSTABLE', () => {
  const format = pickRecordingFormat((mime) => mime.startsWith('video/webm'));
  assert.equal(format.container, 'webm');
  assert.equal(format.postable, false, 'the caller must not offer to publish this');
});

test('a browser supporting nothing still returns something, and never claims postable', () => {
  const format = pickRecordingFormat(() => false);
  assert.equal(format.postable, false);
  assert.equal(format.container, 'webm');
});

test('a browser that throws on a codec string is taken to mean no', () => {
  const format = pickRecordingFormat((mime) => {
    if (mime.includes('avc1')) throw new Error('nope');
    return mime === 'video/webm';
  });
  assert.equal(format.container, 'webm');
  assert.equal(format.postable, false);
});

test('a bare video/mp4 browser is still postable — it will pick H.264 itself', () => {
  const format = pickRecordingFormat((mime) => mime === 'video/mp4');
  assert.equal(format.mimeType, 'video/mp4');
  assert.equal(format.postable, true);
});

// ── The reel rules ────────────────────────────────────────────────────────

const good = { width: 1080, height: 1920, seconds: 20, fps: 30, container: 'mp4' };

test('a 1080x1920 twenty-second MP4 at 30fps is accepted', () => {
  assert.deepEqual(checkReel(good), { ok: true, problems: [] });
});

test('a square or landscape video is refused, and told which size to choose', () => {
  const square = checkReel({ ...good, width: 1080, height: 1080 });
  assert.equal(square.ok, false);
  assert.match(square.problems[0], /9:16/);
  assert.match(square.problems[0], /1080×1080/);

  assert.equal(checkReel({ ...good, width: 1920, height: 1080 }).ok, false);
});

test('a near-miss aspect ratio is refused rather than rounded through', () => {
  assert.equal(checkReel({ ...good, height: 1900 }).ok, false);
});

test('too short and too long are both refused, with the actual length named', () => {
  const short = checkReel({ ...good, seconds: 2 });
  assert.equal(short.ok, false);
  assert.match(short.problems[0], /at least 3 seconds/);

  const long = checkReel({ ...good, seconds: 120 });
  assert.equal(long.ok, false);
  assert.match(long.problems[0], /at most 90 seconds/);
});

test('the exact boundaries are allowed — 3 and 90 seconds both pass', () => {
  assert.equal(checkReel({ ...good, seconds: REEL_RULES.minSeconds }).ok, true);
  assert.equal(checkReel({ ...good, seconds: REEL_RULES.maxSeconds }).ok, true);
});

test('frame rates outside 24-60 are refused', () => {
  assert.equal(checkReel({ ...good, fps: 15 }).ok, false);
  assert.equal(checkReel({ ...good, fps: 120 }).ok, false);
  assert.equal(checkReel({ ...good, fps: 24 }).ok, true);
  assert.equal(checkReel({ ...good, fps: 60 }).ok, true);
});

/** The original bug, stated as a test. */
test('WEBM IS REFUSED, and the message says every platform refuses it', () => {
  const webm = checkReel({ ...good, container: 'webm' });
  assert.equal(webm.ok, false);
  assert.match(webm.problems[0], /MP4/);
  assert.match(webm.problems[0], /refuses/);
});

/**
 * Three renders wasted is the alternative. Everything wrong comes back at once.
 */
test('every problem is reported together, not one render at a time', () => {
  const bad = checkReel({ width: 1080, height: 1080, seconds: 200, fps: 10, container: 'webm' });
  assert.equal(bad.ok, false);
  assert.equal(bad.problems.length, 4, 'aspect, length, frame rate and container');
});

test('a video with no size is refused rather than dividing by zero', () => {
  const none = checkReel({ width: 0, height: 0, seconds: 20, fps: 30, container: 'mp4' });
  assert.equal(none.ok, false);
  assert.match(none.problems[0], /no size/);
});

test('the running time is the sum of the scenes, ignoring nonsense', () => {
  assert.equal(totalSeconds([{ seconds: 4 }, { seconds: 6 }]), 10);
  assert.equal(totalSeconds([{ seconds: 4 }, {}, { seconds: -3 }]), 4);
  assert.equal(totalSeconds([]), 0);
});
