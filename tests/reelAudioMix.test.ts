/**
 * The music bed, and staying out of the way of the voice.
 *
 * A flat music track is the commonest reason an otherwise good reel sounds
 * amateur: loud enough to carry the video and it buries the narration, quiet
 * enough to hear every word and it may as well not be there. Ducking is the
 * difference between a video with music on it and a video that was mixed.
 *
 * TWO PROPERTIES CARRY THE REST
 *
 * 1. **The curve is always strictly increasing in time.**
 *    `linearRampToValueAtTime` on a time that is not strictly after the last
 *    one is undefined behaviour in the Web Audio API, and the symptom is
 *    SILENCE, not an error. A reel that renders with no music at all and no
 *    message is exactly the sort of fault that gets shipped.
 *
 * 2. **The bed never sits above its own level while somebody is talking.**
 *    That is the whole job.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  musicGainPlan,
  mergeSpans,
  narrationSpansOf,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_DUCK_TO,
  type GainPoint,
} from '../src/app/lib/reelAudioMix.ts';

/** The gain the curve is at a given moment, interpolated as the ramp would be. */
function gainAt(points: GainPoint[], t: number): number {
  if (!points.length) return 0;
  if (t <= points[0].time) return points[0].gain;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.time) {
      const span = b.time - a.time;
      if (span <= 0) return b.gain;
      return a.gain + ((b.gain - a.gain) * (t - a.time)) / span;
    }
  }
  return points[points.length - 1].gain;
}

/* ── the shape of any curve at all ───────────────────────────────────────── */

/** The one that turns a silent reel into a caught bug. */
test('time only ever moves forward, on every shape of input', () => {
  const shapes = [
    { reelSeconds: 30, narration: [{ start: 0, end: 30 }] },
    { reelSeconds: 30, narration: [{ start: 0, end: 1 }, { start: 1.05, end: 2 }] },
    { reelSeconds: 3, narration: [{ start: 0, end: 3 }], fadeIn: 5, fadeOut: 5 },
    { reelSeconds: 30, narration: [{ start: 29.9, end: 40 }] },
    { reelSeconds: 30, narration: [] },
    { reelSeconds: 0.5, narration: [{ start: 0, end: 0.4 }] },
  ];
  for (const shape of shapes) {
    const plan = musicGainPlan(shape);
    for (let i = 1; i < plan.length; i++) {
      assert.ok(
        plan[i].time > plan[i - 1].time,
        `${JSON.stringify(shape)} produced ${plan[i - 1].time} then ${plan[i].time}`,
      );
    }
  }
});

test('every gain stays within 0 and 1', () => {
  const plan = musicGainPlan({ reelSeconds: 30, narration: [{ start: 5, end: 10 }], volume: 99, duckTo: -4 });
  for (const p of plan) assert.ok(p.gain >= 0 && p.gain <= 1, `gain ${p.gain}`);
});

test('it opens from silence and ends in silence', () => {
  const plan = musicGainPlan({ reelSeconds: 20, narration: [{ start: 4, end: 9 }] });
  assert.equal(plan[0].time, 0);
  assert.equal(plan[0].gain, 0);
  assert.equal(plan[plan.length - 1].time, 20);
  assert.equal(plan[plan.length - 1].gain, 0);
});

/* ── the ducking itself ──────────────────────────────────────────────────── */

test('the bed drops under the voice and comes back after it', () => {
  const plan = musicGainPlan({
    reelSeconds: 30,
    narration: [{ start: 10, end: 15 }],
    volume: 0.5,
    duckTo: 0.1,
    fadeIn: 1,
    fadeOut: 1,
  });

  assert.ok(gainAt(plan, 5) > 0.45, 'full bed before the line');
  assert.ok(gainAt(plan, 12) <= 0.11, 'ducked during the line');
  assert.ok(gainAt(plan, 17) > 0.45, 'back up after it');
});

/** A bed that drops on the first syllable has already stepped on it. */
test('the duck begins before the line does', () => {
  const plan = musicGainPlan({ reelSeconds: 30, narration: [{ start: 10, end: 15 }], fadeIn: 1 });
  assert.ok(gainAt(plan, 9.95) < gainAt(plan, 9.0), 'already coming down before 10s');
});

test('ducking to a level above the bed is treated as a mistake, not honoured', () => {
  // Otherwise the audible result is music getting LOUDER under the voice.
  const plan = musicGainPlan({ reelSeconds: 20, narration: [{ start: 5, end: 10 }], volume: 0.3, duckTo: 0.9 });
  assert.ok(gainAt(plan, 7) <= 0.3 + 1e-6);
});

test('no narration means the bed simply plays', () => {
  const plan = musicGainPlan({ reelSeconds: 20, narration: [], volume: 0.6, fadeIn: 1, fadeOut: 1 });
  assert.ok(Math.abs(gainAt(plan, 10) - 0.6) < 1e-6);
});

test('wall-to-wall narration still leaves a bed, quietly', () => {
  const plan = musicGainPlan({ reelSeconds: 20, narration: [{ start: 0, end: 20 }], volume: 0.5, duckTo: 0.1 });
  assert.ok(gainAt(plan, 10) <= 0.11);
  assert.ok(gainAt(plan, 10) > 0, 'ducked, not muted');
});

/* ── merging, so the bed does not swell between words ────────────────────── */

/**
 * Two lines a fraction apart are one stretch of talking. Coming back up in
 * the gap produces an audible swell, which is the artefact that makes a mix
 * sound automated rather than made.
 */
test('lines close together are treated as one', () => {
  assert.deepEqual(
    mergeSpans([{ start: 0, end: 2 }, { start: 2.2, end: 4 }]),
    [{ start: 0, end: 4 }],
  );
});

test('lines genuinely far apart stay apart', () => {
  const merged = mergeSpans([{ start: 0, end: 2 }, { start: 9, end: 11 }]);
  assert.equal(merged.length, 2);
});

test('overlapping and out-of-order spans are tidied', () => {
  assert.deepEqual(
    mergeSpans([{ start: 5, end: 8 }, { start: 0, end: 6 }]),
    [{ start: 0, end: 8 }],
  );
});

test('nonsense spans are dropped rather than inverting the curve', () => {
  assert.deepEqual(mergeSpans([{ start: 5, end: 5 }, { start: 9, end: 2 }] as any), []);
  assert.deepEqual(mergeSpans(null as any), []);
});

/* ── reading the storyboard ──────────────────────────────────────────────── */

test('narration spans come from the beats that actually carry a voice', () => {
  const spans = narrationSpansOf([
    { duration: 3, audioUrl: 'a.mp3' },
    { duration: 4, audioUrl: null },
    { duration: 5, audioUrl: 'b.mp3' },
  ]);
  assert.deepEqual(spans, [{ start: 0, end: 3 }, { start: 7, end: 12 }]);
});

test('a storyboard with no narration yields no spans', () => {
  assert.deepEqual(narrationSpansOf([{ duration: 3 }, { duration: 4 }]), []);
  assert.deepEqual(narrationSpansOf([]), []);
  assert.deepEqual(narrationSpansOf(null as any), []);
});

/* ── the defaults are the ones documented ────────────────────────────────── */

test('the default bed ducks to roughly a seventh of its level', () => {
  assert.ok(DEFAULT_DUCK_TO < DEFAULT_MUSIC_VOLUME);
  assert.ok(DEFAULT_DUCK_TO > 0, 'ducked, never muted');
  const plan = musicGainPlan({ reelSeconds: 30, narration: [{ start: 10, end: 20 }] });
  assert.ok(gainAt(plan, 15) <= DEFAULT_DUCK_TO + 1e-6);
});

test('a reel of no length produces no curve rather than a broken one', () => {
  assert.deepEqual(musicGainPlan({ reelSeconds: 0 }), []);
  assert.deepEqual(musicGainPlan({ reelSeconds: -5 }), []);
  assert.deepEqual(musicGainPlan({} as any), []);
});
