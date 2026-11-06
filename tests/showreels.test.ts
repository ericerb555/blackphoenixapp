/**
 * The landing page reels.
 *
 * The component draws them; this is the part that can be wrong without
 * anybody noticing. Two things are worth pinning:
 *
 * 1. **Beat selection is a function of TIME**, not a counter a timer
 *    increments. A backgrounded tab does not get its timers; one that comes
 *    back after a minute must resume on the right beat rather than race
 *    through the ones it missed. Driving it from elapsed seconds makes that
 *    free, and makes it testable without a clock.
 *
 * 2. **Every image URL must actually resolve.** A typo in a filename is a
 *    grey rectangle on the front page of the business, and nothing in the
 *    build or the type checker can see it. The last test here fetches them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHOWREELS,
  BEAT_SECONDS,
  beatAt,
  reelDuration,
  awaitingFootage,
  playableReels,
  galleryUrl,
  type Showreel,
} from '../src/app/lib/showreels.ts';

const reel = (beats: any[]): Showreel => ({ id: 'r', kicker: 'k', title: 't', beats });

/* ── timing ──────────────────────────────────────────────────────────────── */

test('a beat holds for the default unless it says otherwise', () => {
  assert.equal(reelDuration(reel([{ caption: 'a' }, { caption: 'b' }])), BEAT_SECONDS * 2);
  assert.equal(reelDuration(reel([{ caption: 'a', seconds: 5 }, { caption: 'b' }])), 5 + BEAT_SECONDS);
});

test('the right beat is on screen at each point', () => {
  const r = reel([{ caption: 'a', seconds: 2 }, { caption: 'b', seconds: 3 }, { caption: 'c', seconds: 1 }]);
  assert.equal(beatAt(r, 0), 0);
  assert.equal(beatAt(r, 1.9), 0);
  assert.equal(beatAt(r, 2), 1, 'the boundary belongs to the next beat');
  assert.equal(beatAt(r, 4.9), 1);
  assert.equal(beatAt(r, 5), 2);
  assert.equal(beatAt(r, 5.9), 2);
});

/** The backgrounded-tab case, which is the reason time is the input. */
test('it wraps forever, so a tab that slept resumes in the right place', () => {
  const r = reel([{ caption: 'a', seconds: 2 }, { caption: 'b', seconds: 3 }, { caption: 'c', seconds: 1 }]);
  const cycle = 6;
  assert.equal(beatAt(r, cycle), 0);
  assert.equal(beatAt(r, cycle * 1000 + 2.5), 1, 'still correct after an hour away');
  assert.equal(beatAt(r, cycle * 7 + 5.5), 2);
});

test('nonsense time lands on the first beat rather than NaN', () => {
  const r = reel([{ caption: 'a' }, { caption: 'b' }]);
  for (const t of [-5, NaN, Infinity, undefined as any]) {
    const i = beatAt(r, t);
    assert.ok(Number.isInteger(i) && i >= 0 && i < 2, `elapsed=${t} gave ${i}`);
  }
});

test('an empty or missing reel does not throw', () => {
  assert.equal(beatAt(reel([]), 3), 0);
  assert.equal(beatAt(null, 3), 0);
  assert.equal(reelDuration(null), 0);
  assert.equal(reelDuration(reel([])), 0);
});

test('a beat with a nonsense duration falls back rather than freezing the reel', () => {
  // seconds: 0 would otherwise make the reel infinitely long or divide by zero.
  const r = reel([{ caption: 'a', seconds: 0 }, { caption: 'b', seconds: -3 }]);
  assert.equal(reelDuration(r), BEAT_SECONDS * 2);
  assert.equal(beatAt(r, BEAT_SECONDS + 0.1), 1);
});

/* ── which reels are real ────────────────────────────────────────────────── */

test('trash removal is flagged as awaiting photographs, and the other two are not', () => {
  const byId = Object.fromEntries(SHOWREELS.map((r) => [r.id, r]));
  assert.equal(awaitingFootage(byId['trash-removal']), true);
  assert.equal(awaitingFootage(byId['kitchens']), false);
  assert.equal(awaitingFootage(byId['bathrooms']), false);
});

test('a reel with some type cards between photographs is not awaiting anything', () => {
  assert.equal(awaitingFootage(reel([{ caption: 'a', image: 'x.png' }, { caption: 'b' }])), false);
});

test('a reel that could only draw a hole is not shown', () => {
  const ok = reel([{ caption: 'a' }]);
  const empty = { id: 'e', kicker: 'k', title: 't', beats: [] } as Showreel;
  const video = { id: 'v', kicker: 'k', title: 't', beats: [], videoUrl: 'clip.mp4' } as Showreel;

  assert.deepEqual(playableReels([ok, empty, video]).map((r) => r.id), ['r', 'v']);
  assert.deepEqual(playableReels([]), []);
  assert.deepEqual(playableReels(null as any), []);
});

/* ── the shipped reels ───────────────────────────────────────────────────── */

test('the three reels he asked for are all there and all playable', () => {
  assert.deepEqual(SHOWREELS.map((r) => r.id), ['kitchens', 'bathrooms', 'trash-removal']);
  assert.equal(playableReels().length, 3);
});

test('every reel is long enough to be worth watching and short enough to loop', () => {
  for (const r of SHOWREELS) {
    const seconds = reelDuration(r);
    assert.ok(seconds >= 12 && seconds <= 30, `${r.id} runs ${seconds}s`);
  }
});

test('every beat has a caption, and captions stay short enough to read', () => {
  for (const r of SHOWREELS) {
    for (const beat of r.beats) {
      assert.ok(beat.caption.trim().length > 0, `${r.id} has an empty caption`);
      assert.ok(beat.caption.length <= 70, `${r.id}: "${beat.caption}" is ${beat.caption.length} chars`);
    }
  }
});

test('no reel points at a stock photo library', () => {
  for (const r of SHOWREELS) {
    for (const beat of r.beats) {
      const url = String(beat.image || '');
      assert.ok(
        !/unsplash|pexels|shutterstock|istock|getty/i.test(url),
        `${r.id} uses a stock image: ${url}`,
      );
    }
  }
});

/* ── the URL builder ─────────────────────────────────────────────────────── */

test('a gallery URL is built from an origin and a filename', () => {
  const origin = 'https://example.supabase.co';
  assert.equal(
    galleryUrl(origin, 'completed-project-01-0.png'),
    'https://example.supabase.co/storage/v1/object/public/make-3eae23a6-gallery/website/completed-project-01-0.png',
  );
  // A trailing slash on the origin or a leading one on the file must not
  // produce a double slash, which some CDNs treat as a different path.
  assert.equal(galleryUrl(origin + '/', '/a.png'), galleryUrl(origin, 'a.png'));
  assert.equal(galleryUrl('', 'a.png'), '');
  assert.equal(galleryUrl(origin, ''), '');
});

/**
 * The one that catches a typo nothing else can.
 *
 * A wrong filename is a grey rectangle on the front page of the business,
 * and it type-checks, builds and renders without complaint.
 *
 * The project reference is read out of `supabase/info.tsx` rather than typed
 * here, the same way `scripts/security-probe.mjs` does it, so this test can
 * never be checking a project the app no longer talks to.
 *
 * Skipped when the network is unavailable, because a skip says "not checked"
 * and a pass would be a lie.
 */
test('every image actually loads', { timeout: 60_000 }, async (t) => {
  const info = readFileSync(new URL('../src/app/utils/supabase/info.tsx', import.meta.url), 'utf8');
  const projectId = info.match(/projectId\s*=\s*["'`]([a-z0-9]+)["'`]/i)?.[1];
  assert.ok(projectId, 'could not read projectId from supabase/info.tsx');
  const origin = `https://${projectId}.supabase.co`;

  const files = SHOWREELS.flatMap((r) => r.beats.map((b) => b.image).filter(Boolean)) as string[];
  assert.ok(files.length >= 10, 'expected the kitchen and bathroom reels to have photos');

  const results = await Promise.all(
    files.map(async (file) => {
      const url = galleryUrl(origin, file);
      try {
        const res = await fetch(url, { method: 'HEAD' });
        return { file, status: res.status, type: res.headers.get('content-type') || '' };
      } catch {
        return { file, status: 0, type: '' };
      }
    }),
  );

  if (results.every((r) => r.status === 0)) {
    t.skip('no network — image URLs not verified');
    return;
  }

  const bad = results.filter((r) => r.status !== 200 || !r.type.startsWith('image/'));
  assert.deepEqual(bad, [], `these did not resolve to an image: ${JSON.stringify(bad, null, 1)}`);
});
