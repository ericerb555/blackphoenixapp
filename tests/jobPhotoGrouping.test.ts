/**
 * Finding one job's photographs without losing the rest.
 *
 * The failure this guards is silent in both directions. A grouping that drops
 * photos looks exactly like a company that has not taken many — which is how
 * the Before & After Creator showed an empty library for its whole life while
 * reading the wrong key off a full response. And a filter that falls back to
 * "everything" when it matches nothing is how another customer's bathroom
 * ends up in an advertisement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  photoSrc, usablePhotos, jobsWithPhotos, photosForJob, unfiledCount, NO_JOB,
} from '../src/app/lib/jobPhotoGrouping.ts';

const photo = (over: Record<string, unknown> = {}) => ({
  id: 'p1', image: 'https://example.test/a.jpg', title: 'A', ...over,
});

/* ── where a photo's address lives ───────────────────────────────────────── */

/**
 * Four spellings, because the list is shared with JobPhotos and assembled
 * from records written by different paths. Reading only `signedUrl || url` is
 * half of the original bug: an uploaded gallery row keeps its address in
 * `image`, so every uploaded photo was discarded.
 */
test('an uploaded gallery row is found by its image field', () => {
  assert.equal(photoSrc(photo()), 'https://example.test/a.jpg');
});

test('a signed url wins when both are present', () => {
  assert.equal(photoSrc(photo({ signedUrl: 'https://s.test/s.jpg' })), 'https://s.test/s.jpg');
});

test('a linked photo is found by sourceUrl', () => {
  assert.equal(photoSrc({ sourceUrl: 'https://x.test/l.jpg' }), 'https://x.test/l.jpg');
});

test('a row with no address at all is not a photograph', () => {
  assert.equal(photoSrc({ title: 'nothing' }), '');
  assert.equal(photoSrc(null), '');
  assert.equal(usablePhotos([photo(), { title: 'no address' }]).length, 1);
});

test('whitespace is not an address', () => {
  assert.equal(photoSrc({ image: '   ' }), '');
});

/* ── grouping ────────────────────────────────────────────────────────────── */

test('jobs are listed most photographed first', () => {
  const jobs = jobsWithPhotos([
    photo({ jobId: 'j1', jobTitle: 'Pelham bathroom' }),
    photo({ jobId: 'j2', jobTitle: 'Salem deck' }),
    photo({ jobId: 'j1', jobTitle: 'Pelham bathroom' }),
    photo({ jobId: 'j1', jobTitle: 'Pelham bathroom' }),
  ]);
  assert.deepEqual(jobs.map((j) => [j.id, j.count]), [['j1', 3], ['j2', 1]]);
  assert.equal(jobs[0].label, 'Pelham bathroom');
});

test('photos with no job produce no job entries', () => {
  assert.deepEqual(jobsWithPhotos([photo(), photo({ jobId: '' })]), []);
});

/**
 * A job whose title never made it across is still offered. Its photographs
 * are real, and an opaque id is better than losing them.
 */
test('a job with no title falls back to its id, and picks a title up later', () => {
  const jobs = jobsWithPhotos([
    photo({ jobId: 'job_abc' }),
    photo({ jobId: 'job_abc', jobTitle: 'Manchester kitchen' }),
  ]);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].label, 'Manchester kitchen');
});

test('a very long job title is trimmed rather than breaking the control', () => {
  const [job] = jobsWithPhotos([photo({ jobId: 'j', jobTitle: 'x'.repeat(200) })]);
  assert.ok(job.label.length <= 70);
});

/* ── filtering ───────────────────────────────────────────────────────────── */

test('no filter means every photograph', () => {
  const all = [photo({ jobId: 'j1' }), photo()];
  assert.equal(photosForJob(all, '').length, 2);
});

test('a job filter returns only that job', () => {
  const all = [photo({ id: 'a', jobId: 'j1' }), photo({ id: 'b', jobId: 'j2' }), photo({ id: 'c' })];
  assert.deepEqual(photosForJob(all, 'j1').map((p) => p.id), ['a']);
});

/**
 * The rule that keeps the old library reachable: almost everything already
 * uploaded has no job, and none of it may become invisible.
 */
test('the unfiled bucket finds photos with no job', () => {
  const all = [photo({ id: 'a', jobId: 'j1' }), photo({ id: 'b' }), photo({ id: 'c', jobId: '' })];
  assert.deepEqual(photosForJob(all, NO_JOB).map((p) => p.id), ['b', 'c']);
  assert.equal(unfiledCount(all), 2);
});

/**
 * The expensive one. Falling back to the whole library when a filter matches
 * nothing would quietly offer every customer's photographs under one
 * customer's name.
 */
test('a job with no photos shows nothing, never everything', () => {
  const all = [photo({ jobId: 'j1' }), photo({ jobId: 'j2' })];
  assert.deepEqual(photosForJob(all, 'j-unknown'), []);
});

test('nothing in, nothing out', () => {
  assert.deepEqual(jobsWithPhotos(null), []);
  assert.deepEqual(photosForJob(null, 'j1'), []);
  assert.deepEqual(usablePhotos(undefined), []);
  assert.equal(unfiledCount(null), 0);
});
