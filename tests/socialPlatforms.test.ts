/**
 * What each platform will and will not accept.
 *
 * These rules decide whether a post is attempted at all, so they are checked
 * where the reason can be read rather than three seconds later inside
 * somebody else's error message. The publishing calls themselves cannot be
 * tested without connected accounts; these can.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORMS, PLATFORM_IDS, isPlatform, refusalFor, fitToPlatform,
} from '../supabase/functions/server/socialPlatforms.ts';

test('every platform the publisher knows about is described exactly once', () => {
  assert.equal(PLATFORM_IDS.length, 11);
  for (const id of PLATFORM_IDS) {
    assert.equal(PLATFORMS[id].id, id, `${id} disagrees with its own key`);
    assert.ok(PLATFORMS[id].label, `${id} has no label`);
    assert.ok(PLATFORMS[id].maxChars > 0, `${id} has no character limit`);
  }
});

test('an unknown platform is not a platform', () => {
  assert.equal(isPlatform('bluesky'), true);
  assert.equal(isPlatform('myspace'), false);
  assert.equal(isPlatform(''), false);
  assert.equal(isPlatform(null), false);
  assert.equal(isPlatform('toString'), false, 'inherited keys are not platforms');
});

// ── What each platform needs ──────────────────────────────────────────────

const text = { content: 'A finished deck in Salem.' };

test('the text-only platforms take a text-only post', () => {
  for (const id of ['facebook', 'bluesky', 'mastodon', 'linkedin', 'threads'] as const) {
    assert.equal(refusalFor(id, text), null, `${id} refused a plain text post`);
  }
});

test('INSTAGRAM REFUSES A TEXT POST, and says what is missing', () => {
  const refusal = refusalFor('instagram', text);
  assert.ok(refusal);
  assert.match(refusal!, /image or a video/);
});

test('instagram accepts either an image or a video', () => {
  assert.equal(refusalFor('instagram', { ...text, imageUrl: 'https://x/i.jpg' }), null);
  assert.equal(refusalFor('instagram', { ...text, videoUrl: 'https://x/v.mp4' }), null);
});

test('TIKTOK TAKES VIDEO AND NOTHING ELSE — an image is not enough', () => {
  assert.match(refusalFor('tiktok', { ...text, imageUrl: 'https://x/i.jpg' })!, /only takes video/);
  assert.equal(refusalFor('tiktok', { ...text, videoUrl: 'https://x/v.mp4' }), null);
});

test('an empty post is refused rather than sent', () => {
  assert.match(refusalFor('bluesky', { content: '   ' })!, /needs something to post/);
});

/**
 * Bluesky's 300 characters is the binding constraint in practice — a caption
 * written for Instagram will not fit.
 */
test('a caption too long for the platform is refused, with both numbers', () => {
  const long = 'x'.repeat(400);
  const refusal = refusalFor('bluesky', { content: long });
  assert.ok(refusal);
  assert.match(refusal!, /300 characters/);
  assert.match(refusal!, /400/);
  assert.equal(refusalFor('linkedin', { content: long }), null, 'LinkedIn allows 3000');
});

test('the exact limit is allowed and one over is not', () => {
  assert.equal(refusalFor('bluesky', { content: 'x'.repeat(300) }), null, '300 is the limit, not one past it');
  assert.ok(refusalFor('bluesky', { content: 'x'.repeat(301) }), 'one over is refused');
});

// ── Trimming rather than refusing ─────────────────────────────────────────

test('text that already fits is returned untouched', () => {
  assert.equal(fitToPlatform('bluesky', 'Short.'), 'Short.');
  assert.equal(fitToPlatform('linkedin', 'x'.repeat(3000)).length, 3000);
});

test('a long caption is trimmed to fit, on a word boundary', () => {
  const words = 'deck '.repeat(200).trim();
  const fitted = fitToPlatform('bluesky', words);
  assert.ok(fitted.length <= PLATFORMS.bluesky.maxChars, 'still too long');
  assert.match(fitted, /…$/, 'reads as shortened rather than cut off');
  assert.ok(!fitted.includes('dec…'), 'a word was cut in half');
});

/**
 * A single unbroken string has no word boundary to trim on. It must still come
 * back within the limit rather than being returned whole.
 */
test('a caption with no spaces is still brought within the limit', () => {
  const fitted = fitToPlatform('bluesky', 'x'.repeat(1000));
  assert.ok(fitted.length <= PLATFORMS.bluesky.maxChars);
  assert.match(fitted, /…$/);
});

test('trimming an unknown platform returns the text rather than throwing', () => {
  assert.equal(fitToPlatform('nowhere' as any, 'hello'), 'hello');
});

test('the platforms with a surprise say so, and the plain ones stay quiet', () => {
  assert.ok(PLATFORMS.instagram.caveat, 'needing media is worth saying');
  assert.ok(PLATFORMS.tiktok.caveat, 'private-until-audited is worth saying');
  assert.ok(PLATFORMS.bluesky.caveat, 'an app password is not a login');
  assert.ok(PLATFORMS.linkedin.caveat, 'personal profile, not company page');
  assert.equal(PLATFORMS.facebook.caveat, undefined, 'nothing surprising about Facebook');
});

test('mastodon is the only one whose server is part of the account', () => {
  assert.equal(PLATFORMS.mastodon.needsInstance, true);
  const others = PLATFORM_IDS.filter((id) => id !== 'mastodon');
  for (const id of others) assert.notEqual(PLATFORMS[id].needsInstance, true, `${id} should not need an instance`);
});

// ── Tier 2: the gated platforms ───────────────────────────────────────────

/**
 * Pinterest and Google Business both succeed in ways that are not success:
 * a trial pin comes back with a real id and is visible to nobody, and Google
 * answers every call with a quota refusal until it approves the request.
 * Both are stated at connection time, which is what these guard.
 */
test('the platforms that can succeed invisibly say so', () => {
  assert.match(PLATFORMS.pinterest.caveat!, /visible only to you/);
  assert.match(PLATFORMS.google_business.caveat!, /zero quota/);
});

test('YOUTUBE ALLOWS ONLY 100 CHARACTERS — a caption written elsewhere will not fit', () => {
  assert.equal(PLATFORMS.youtube.maxChars, 100);
  const caption = 'A finished kitchen in Salem, New Hampshire. '.repeat(5);
  assert.ok(refusalFor('youtube', { content: caption, videoUrl: 'https://x/v.mp4' }));
  assert.ok(fitToPlatform('youtube', caption).length <= 100);
});

test('youtube takes video and nothing else', () => {
  assert.match(refusalFor('youtube', { content: 'hi', imageUrl: 'https://x/i.jpg' })!, /only takes video/);
  assert.equal(refusalFor('youtube', { content: 'hi', videoUrl: 'https://x/v.mp4' }), null);
});

test('pinterest needs an image; google business does not need media at all', () => {
  assert.match(refusalFor('pinterest', { content: 'A new deck' })!, /image or a video/);
  assert.equal(refusalFor('pinterest', { content: 'A new deck', imageUrl: 'https://x/i.jpg' }), null);
  assert.equal(refusalFor('google_business', { content: 'Booking spring work now.' }), null);
});

/**
 * A pin has no default board and a Business Profile post has no default
 * location. Choosing either on somebody's behalf posts to the wrong place.
 */
test('the platforms that need a destination chosen are marked as such', () => {
  assert.equal(PLATFORMS.pinterest.needsBoard, true);
  assert.equal(PLATFORMS.google_business.needsLocation, true);

  const others = PLATFORM_IDS.filter((id) => id !== 'pinterest');
  for (const id of others) assert.notEqual(PLATFORMS[id].needsBoard, true, `${id} should not need a board`);
});

/**
 * The two LinkedIn connections are separate platforms, and the reason is not
 * tidiness: `w_organization_social` needs LinkedIn's Community Management
 * approval, and asking for it on the self-serve connection would make
 * LinkedIn refuse the WHOLE authorisation for an unapproved app — breaking
 * personal posting, which works today, to offer company posting, which does
 * not yet. Kept apart, both can be held at once.
 */
test('personal and company LinkedIn are separate platforms, both postable as text', () => {
  assert.notEqual(PLATFORMS.linkedin.id, PLATFORMS.linkedin_company.id);
  assert.equal(refusalFor('linkedin', { content: 'Hiring two carpenters.' }), null);
  assert.equal(refusalFor('linkedin_company', { content: 'Hiring two carpenters.' }), null);
  assert.equal(PLATFORMS.linkedin_company.needsOrganization, true);
  assert.notEqual(PLATFORMS.linkedin.needsOrganization, true, 'a personal post has no organisation');
});

test('each LinkedIn says which one it is, so neither looks broken', () => {
  assert.match(PLATFORMS.linkedin.caveat!, /personal profile/i);
  assert.match(PLATFORMS.linkedin_company.caveat!, /approval/i);
});
