/**
 * The second copy of every stored file.
 *
 * Storage objects are outside the daily database backup — Supabase's docs say
 * so outright — so the photographs behind every trash estimate had no second
 * copy anywhere. These tests cover the decisions in that job, which are the
 * parts that can be wrong without anything appearing to be.
 *
 * THE TWO THAT WOULD HURT
 *
 * The backup bucket being treated as a source. Then each run copies the copy,
 * `media-backup/project-photos/x.jpg` becomes
 * `media-backup/media-backup/project-photos/x.jpg`, and the bill grows
 * geometrically while every run reports success. One missing line.
 *
 * The plan not being incremental. If the rule re-copies unchanged objects, a
 * nightly job rewrites the entire library every night — which works, looks
 * fine, and is the reason somebody turns it off in six months.
 *
 * And the quiet one: a mirror that deletes. The whole purpose is surviving a
 * deletion, so the plan is copy-only by construction and there is a test that
 * says so, because "sync" is the word people reach for and syncing a deletion
 * destroys the thing being protected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_BUCKET, isBackupSource, backupPathFor, planCopies, buildManifest,
  manifestKey, type StoredObject,
} from '../supabase/functions/server/storageBackup.ts';

const obj = (name: string, size: number, updatedAt = '2026-11-17T00:00:00.000Z'): StoredObject =>
  ({ name, size, updatedAt });

test('the backup bucket is never a source', () => {
  // The geometric-growth bug. Everything else here is tidiness next to it.
  assert.equal(isBackupSource(BACKUP_BUCKET), false);
  assert.equal(isBackupSource('project-photos'), true);
  assert.equal(isBackupSource(''), false);
  assert.equal(isBackupSource('   '), false);
});

test('a copy of the backup bucket is never planned, even if handed to us', () => {
  const plan = planCopies(
    { [BACKUP_BUCKET]: [obj('project-photos/a.jpg', 10)], 'project-photos': [obj('a.jpg', 10)] },
    new Map(),
  );
  assert.equal(plan.length, 1);
  assert.equal(plan[0].bucket, 'project-photos');
});

test('paths are namespaced by source bucket', () => {
  // Two buckets with a logo.png must not land on each other, and a restore
  // needs to know where each file goes back to.
  assert.equal(backupPathFor('project-photos', 'a/b.jpg'), 'project-photos/a/b.jpg');
  assert.equal(backupPathFor('make-3eae23a6-reels', 'clip.mp4'), 'make-3eae23a6-reels/clip.mp4');
  assert.equal(backupPathFor('b', '/leading.jpg'), 'b/leading.jpg', 'a leading slash must not double');
});

test('a new object is copied', () => {
  const plan = planCopies({ 'project-photos': [obj('a.jpg', 100)] }, new Map());
  assert.deepEqual(plan, [
    { bucket: 'project-photos', name: 'a.jpg', target: 'project-photos/a.jpg', reason: 'new' },
  ]);
});

test('an unchanged object is NOT copied again', () => {
  // The incremental rule. Without it the nightly run rewrites everything.
  const existing = new Map([['project-photos/a.jpg', 100]]);
  assert.deepEqual(planCopies({ 'project-photos': [obj('a.jpg', 100)] }, existing), []);
});

test('an object whose size changed is copied again', () => {
  const existing = new Map([['project-photos/a.jpg', 100]]);
  const plan = planCopies({ 'project-photos': [obj('a.jpg', 250)] }, existing);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].reason, 'changed');
});

test('the plan never asks for a deletion', () => {
  // A file gone from the source but present in the backup is the success case,
  // not drift to reconcile. Nothing in the plan shape can express a delete.
  const existing = new Map([['project-photos/deleted.jpg', 10], ['project-photos/a.jpg', 10]]);
  const plan = planCopies({ 'project-photos': [obj('a.jpg', 10)] }, existing);
  assert.deepEqual(plan, [], 'nothing to do, and certainly nothing to remove');
  for (const entry of plan) assert.ok(['new', 'changed'].includes(entry.reason));
});

test('an object with no name is skipped rather than copied to the bucket root', () => {
  const plan = planCopies({ 'project-photos': [obj('', 10), obj('a.jpg', 10)] }, new Map());
  assert.equal(plan.length, 1);
  assert.equal(plan[0].name, 'a.jpg');
});

test('the manifest records what exists, so a lost bucket is a list', () => {
  const m = buildManifest(
    '2026-11-17T01:00:00.000Z',
    { 'project-photos': [obj('a.jpg', 100), obj('b.jpg', 50)], 'make-3eae23a6-reels': [obj('c.mp4', 900)] },
    3,
    0,
  );
  assert.equal(m.buckets, 2);
  assert.equal(m.objects, 3);
  assert.equal(m.bytes, 1050);
  assert.equal(m.copied, 3);
  assert.equal(m.index['project-photos/a.jpg'], 100);
  assert.equal(m.index['make-3eae23a6-reels/c.mp4'], 900);
});

test('the manifest excludes the backup bucket from its own counts', () => {
  const m = buildManifest(
    '2026-11-17T01:00:00.000Z',
    { [BACKUP_BUCKET]: [obj('project-photos/a.jpg', 100)], 'project-photos': [obj('a.jpg', 100)] },
    0,
    0,
  );
  assert.equal(m.buckets, 1);
  assert.equal(m.objects, 1);
  assert.equal(m.bytes, 100);
});

test('failures are counted, not swallowed', () => {
  // A run that copied nothing and reported success is the failure mode this
  // whole module exists to avoid repeating.
  const m = buildManifest('2026-11-17T01:00:00.000Z', { 'project-photos': [obj('a.jpg', 1)] }, 0, 1);
  assert.equal(m.failed, 1);
  assert.equal(m.copied, 0);
});

test('one manifest per day, keyed by date', () => {
  assert.equal(manifestKey('2026-11-17T01:00:00.000Z'), 'storage_backup:2026-11-17');
  assert.equal(manifestKey('2026-11-17T23:59:59.999Z'), 'storage_backup:2026-11-17');
  assert.notEqual(manifestKey('2026-11-18T00:00:00.000Z'), manifestKey('2026-11-17T00:00:00.000Z'));
});
