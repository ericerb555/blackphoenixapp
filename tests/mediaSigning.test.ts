/**
 * Customer job media is private, and this is the parser that decides whether a
 * stored value gets a fresh signed link or is left alone.
 *
 * WHY THESE ASSERTIONS
 *
 * Getting this wrong fails in two opposite directions and only one of them is
 * visible.
 *
 * Too eager — treating a link we do not own as ours — produces a broken image
 * and somebody reports it within the hour.
 *
 * Too timid — failing to recognise one of the shapes a stored value can take —
 * leaves a public URL in place and nobody notices at all, because the image
 * still loads. It loads for everybody, which is the problem we are fixing.
 *
 * So the recognised shapes are pinned here, and so is the list of things that
 * must pass through untouched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStoredMedia,
  storageRef,
  signMediaValues,
  signWorkRequestMedia,
  PRIVATE_MEDIA_BUCKETS,
  MEDIA_URL_TTL_SECONDS,
} from '../supabase/functions/server/mediaSigning.ts';

const HOST = 'https://abcdefgh.supabase.co';

// ── what must be recognised ──────────────────────────────────────────────────

test('a public URL resolves to its bucket and path', () => {
  const ref = parseStoredMedia(
    `${HOST}/storage/v1/object/public/project-photos/admin-upload/1757_x9.jpg`,
  );
  assert.deepEqual(ref, { bucket: 'project-photos', path: 'admin-upload/1757_x9.jpg' });
});

test('a stale signed URL resolves to the same object, token discarded', () => {
  const ref = parseStoredMedia(
    `${HOST}/storage/v1/object/sign/project-videos/walk/abc.mp4?token=eyJhbGciOi.expired`,
  );
  assert.deepEqual(ref, { bucket: 'project-videos', path: 'walk/abc.mp4' });
});

test('the explicit storage:// form resolves', () => {
  const ref = parseStoredMedia('storage://project-blueprints/jobs/42/plan.pdf');
  assert.deepEqual(ref, { bucket: 'project-blueprints', path: 'jobs/42/plan.pdf' });
});

test('percent-escaped paths come back as the real object key', () => {
  const ref = parseStoredMedia(
    `${HOST}/storage/v1/object/public/project-photos/admin-upload/back%20deck.jpg`,
  );
  assert.deepEqual(ref, { bucket: 'project-photos', path: 'admin-upload/back deck.jpg' });
});

test('nested paths keep every segment', () => {
  const ref = parseStoredMedia(
    `${HOST}/storage/v1/object/public/project-photos/2026/09/job-14/kitchen/3.jpg`,
  );
  assert.equal(ref?.path, '2026/09/job-14/kitchen/3.jpg');
});

test('all three private buckets are recognised', () => {
  for (const bucket of PRIVATE_MEDIA_BUCKETS) {
    const ref = parseStoredMedia(`${HOST}/storage/v1/object/public/${bucket}/a/b.bin`);
    assert.equal(ref?.bucket, bucket, `${bucket} should be recognised`);
  }
});

// ── what must be left alone ──────────────────────────────────────────────────

test('a bucket we do not manage passes through', () => {
  // Company logos are deliberately public. Signing them would break every
  // place a logo is rendered to somebody who is not signed in.
  assert.equal(
    parseStoredMedia(`${HOST}/storage/v1/object/public/company-logos/company-logo.png`),
    null,
  );
  assert.equal(
    parseStoredMedia(`${HOST}/storage/v1/object/public/make-3eae23a6-gallery/x.jpg`),
    null,
  );
});

test('external links, data URIs and junk pass through', () => {
  for (const value of [
    'https://example.com/photo.jpg',
    'data:image/png;base64,iVBORw0KGgo=',
    '',
    '   ',
    'not a url at all',
    'storage://',
    'storage://project-photos',
  ]) {
    assert.equal(parseStoredMedia(value), null, `${JSON.stringify(value)} should pass through`);
  }
});

test('non-strings pass through rather than throwing', () => {
  for (const value of [null, undefined, 42, {}, [], true]) {
    assert.equal(parseStoredMedia(value), null);
  }
});

test('a traversal segment is refused rather than sent to the storage API', () => {
  assert.equal(parseStoredMedia('storage://project-photos/../secrets/key.txt'), null);
  assert.equal(parseStoredMedia('storage://project-photos/a/../../b.jpg'), null);
  assert.equal(parseStoredMedia('storage://project-photos/./b.jpg'), null);
});

// ── the reference writers should store ───────────────────────────────────────

test('storageRef round-trips through the parser', () => {
  const ref = storageRef('project-photos', 'admin-upload/7.jpg');
  assert.equal(ref, 'storage://project-photos/admin-upload/7.jpg');
  assert.deepEqual(parseStoredMedia(ref), {
    bucket: 'project-photos',
    path: 'admin-upload/7.jpg',
  });
});

// ── signing behaviour ────────────────────────────────────────────────────────

/** A storage client that records what it was asked for. */
function fakeStorage(behaviour: 'ok' | 'error' | 'throw' = 'ok') {
  const calls: { bucket: string; paths: string[]; ttl: number }[] = [];
  return {
    calls,
    storage: {
      from(bucket: string) {
        return {
          async createSignedUrls(paths: string[], ttl: number) {
            calls.push({ bucket, paths, ttl });
            if (behaviour === 'throw') throw new Error('storage down');
            if (behaviour === 'error') return { data: null, error: new Error('nope') };
            return {
              data: paths.map((p) => ({ path: p, signedUrl: `signed:${bucket}/${p}` })),
              error: null,
            };
          },
        };
      },
    },
  };
}

test('one call per bucket, not one per file', async () => {
  const sb = fakeStorage();
  await signMediaValues(sb, [
    `${HOST}/storage/v1/object/public/project-photos/a.jpg`,
    `${HOST}/storage/v1/object/public/project-photos/b.jpg`,
    `${HOST}/storage/v1/object/public/project-videos/c.mp4`,
  ]);
  assert.equal(sb.calls.length, 2, 'two buckets touched means two calls');
  assert.deepEqual(sb.calls.find((c) => c.bucket === 'project-photos')?.paths, ['a.jpg', 'b.jpg']);
});

test('signed values land back in their original positions', async () => {
  const sb = fakeStorage();
  const out = await signMediaValues(sb, [
    'https://example.com/keep-me.jpg',
    `${HOST}/storage/v1/object/public/project-photos/a.jpg`,
    'data:image/png;base64,zzz',
  ]);
  assert.deepEqual(out, [
    'https://example.com/keep-me.jpg',
    'signed:project-photos/a.jpg',
    'data:image/png;base64,zzz',
  ]);
});

test('the default lifetime is an hour', async () => {
  const sb = fakeStorage();
  await signMediaValues(sb, [`${HOST}/storage/v1/object/public/project-photos/a.jpg`]);
  assert.equal(sb.calls[0].ttl, MEDIA_URL_TTL_SECONDS);
  assert.equal(MEDIA_URL_TTL_SECONDS, 3600);
});

test('a storage failure leaves the value rather than dropping it', async () => {
  for (const behaviour of ['error', 'throw'] as const) {
    const sb = fakeStorage(behaviour);
    const original = `${HOST}/storage/v1/object/public/project-photos/a.jpg`;
    const out = await signMediaValues(sb, [original]);
    assert.deepEqual(out, [original], `${behaviour}: a visible broken image beats a vanished one`);
  }
});

test('no private references means no storage calls at all', async () => {
  const sb = fakeStorage();
  const values = ['https://example.com/a.jpg', ''];
  const out = await signMediaValues(sb, values);
  assert.equal(sb.calls.length, 0);
  assert.equal(out, values, 'the same array is handed back untouched');
});

// ── work request records ─────────────────────────────────────────────────────

test('media is signed wherever a record happens to keep it', async () => {
  const sb = fakeStorage();
  const record = {
    id: 'wr_1',
    media_attachments: {
      photos: [`${HOST}/storage/v1/object/public/project-photos/a.jpg`],
      videos: [`${HOST}/storage/v1/object/public/project-videos/b.mp4`],
    },
    photos: [`${HOST}/storage/v1/object/public/project-photos/legacy.jpg`],
  };
  const out = await signWorkRequestMedia(sb, record);

  assert.equal(out.media_attachments.photos[0], 'signed:project-photos/a.jpg');
  assert.equal(out.media_attachments.videos[0], 'signed:project-videos/b.mp4');
  assert.equal(out.photos[0], 'signed:project-photos/legacy.jpg');
});

test('the original record is never mutated', async () => {
  const sb = fakeStorage();
  const photos = [`${HOST}/storage/v1/object/public/project-photos/a.jpg`];
  const media = { photos };
  const record = { id: 'wr_1', media_attachments: media };

  const out = await signWorkRequestMedia(sb, record);

  assert.notEqual(out, record, 'a changed record is a copy');
  assert.equal(record.media_attachments, media, 'the input keeps its own object');
  assert.equal(photos[0], `${HOST}/storage/v1/object/public/project-photos/a.jpg`);
});

test('a record with no media is handed straight back', async () => {
  const sb = fakeStorage();
  const record = { id: 'wr_2', client_name: 'Wanda' };
  const out = await signWorkRequestMedia(sb, record);
  assert.equal(out, record);
  assert.equal(sb.calls.length, 0);
});

test('a missing client is not an error', async () => {
  const record = { id: 'wr_3', photos: ['storage://project-photos/a.jpg'] };
  assert.equal(await signWorkRequestMedia(null, record), record);
});
