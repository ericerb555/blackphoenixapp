/**
 * Whether a composed product post reaches a live business page.
 *
 * The bug being fixed is quiet rather than loud: the composer saved a record
 * with `channels: ['social']` and told the user it was "ready to schedule",
 * and nothing in the server ever read a `store_post:` row again. There is no
 * scheduler for them, so every post ever composed would have sat in the
 * key-value store forever.
 *
 * These guard the decision to publish, because publishing is the side effect
 * that cannot be undone — once a post is on a page, people have seen it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  platformsFor, shouldPublishNow, statusFromResults, describeResults,
  SOCIAL_PLATFORMS,
} from '../supabase/functions/server/storePostPublish.ts';

test('the bare channel "social" means every platform we can post to', () => {
  const { platforms, unsupported } = platformsFor(['social']);
  assert.deepEqual(platforms.sort(), [...SOCIAL_PLATFORMS].sort());
  assert.deepEqual(unsupported, [], 'it names no platform, but it plainly meant the socials');
});

test('named platforms are honoured, and duplicates collapse', () => {
  assert.deepEqual(platformsFor(['facebook']).platforms, ['facebook']);
  assert.deepEqual(platformsFor(['facebook', 'facebook']).platforms, ['facebook']);
  assert.deepEqual(platformsFor(['FaceBook', ' instagram ']).platforms.sort(), ['facebook', 'instagram']);
});

/**
 * Silently dropping a channel is how "I asked it to email as well" turns into
 * nobody being emailed and nobody knowing.
 */
test('a channel we cannot post to is reported, not discarded', () => {
  const { platforms, unsupported } = platformsFor(['facebook', 'email', 'tiktok']);
  assert.deepEqual(platforms, ['facebook']);
  assert.deepEqual(unsupported, ['email', 'tiktok']);
});

test('nonsense yields nothing rather than throwing', () => {
  assert.deepEqual(platformsFor(undefined).platforms, []);
  assert.deepEqual(platformsFor(null).platforms, []);
  assert.deepEqual(platformsFor('social').platforms, [], 'a bare string is not a channel list');
  assert.deepEqual(platformsFor([]).platforms, []);
});

/**
 * The safety half. Composing and saving must never post by accident, so the
 * intent has to be stated outright.
 */
test('SAVING DOES NOT POST — publishing needs asking for in as many words', () => {
  assert.equal(shouldPublishNow({ channels: ['social'], status: 'ready' }), false);
  assert.equal(shouldPublishNow({ channels: ['social'] }), false);
  assert.equal(shouldPublishNow({}), false);
});

test('a draft never posts, even when it asks to', () => {
  assert.equal(shouldPublishNow({ publishNow: true, channels: ['social'], status: 'draft' }), false);
  assert.equal(shouldPublishNow({ publishNow: true, channels: ['social'], status: 'DRAFT' }), false);
});

test('publishing with no channel named posts nowhere', () => {
  assert.equal(shouldPublishNow({ publishNow: true, channels: [], status: 'ready' }), false);
  assert.equal(shouldPublishNow({ publishNow: true, channels: ['email'], status: 'ready' }), false);
});

test('a post that asks to publish, to a real platform, publishes', () => {
  assert.equal(shouldPublishNow({ publishNow: true, channels: ['social'], status: 'ready' }), true);
  assert.equal(shouldPublishNow({ publishNow: true, channels: ['instagram'] }), true);
});

test('only a literal true publishes — a truthy string does not', () => {
  assert.equal(shouldPublishNow({ publishNow: 'yes', channels: ['social'] }), false);
  assert.equal(shouldPublishNow({ publishNow: 1, channels: ['social'] }), false);
});

/**
 * The honesty half. A record saying "published" when every page refused it is
 * the failure this whole task exists to remove.
 */
test('every platform refusing is recorded as FAILED, not published', () => {
  const results = [
    { platform: 'facebook', success: false, error: 'Not connected' },
    { platform: 'instagram', success: false, error: 'Instagram requires an image or video to post.' },
  ];
  assert.equal(statusFromResults(results), 'failed');
});

test('one platform taking it counts as published, failures kept beside it', () => {
  const results = [
    { platform: 'facebook', success: true, id: '123' },
    { platform: 'instagram', success: false, error: 'Instagram requires an image or video to post.' },
  ];
  assert.equal(statusFromResults(results), 'published');
});

test('no results at all is a failure, not a success', () => {
  assert.equal(statusFromResults([]), 'failed');
});

test('the summary says what happened, including why something was refused', () => {
  assert.equal(describeResults([]), 'Nothing was sent.');
  assert.equal(
    describeResults([{ platform: 'facebook', success: true, id: '1' }]),
    'Posted to facebook.',
  );
  const mixed = describeResults([
    { platform: 'facebook', success: true, id: '1' },
    { platform: 'instagram', success: false, error: 'needs an image' },
  ]);
  assert.match(mixed, /Posted to facebook/);
  assert.match(mixed, /instagram refused it: needs an image/);
});

test('a refusal with no reason still says so rather than reading as fine', () => {
  assert.match(
    describeResults([{ platform: 'facebook', success: false }]),
    /facebook refused it: no reason given/,
  );
});
