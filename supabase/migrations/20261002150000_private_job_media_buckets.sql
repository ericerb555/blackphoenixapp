-- ============================================================================
-- The job media buckets actually become private
--
-- `20261002120000_private_job_media.sql` granted the insert policies. This is
-- the other half: the bucket flags themselves.
--
-- WHY THIS IS A MIGRATION AND NOT LEFT TO THE EDGE FUNCTION
--
-- `ensureStorageBuckets` in the edge function already knows how to flip these,
-- and it has been deployed for some time. Checked against production on
-- 2026-10-02, all three buckets were still `public = true` with no size or
-- type limit — because that function was reachable from exactly one place,
-- inside `POST /work-requests`, behind a `.catch(() => {})`. It ran only when
-- a customer happened to submit a request, and its failure was discarded.
--
-- A security control that depends on somebody else's unrelated action, and
-- throws away its own errors, is not a control. So the state is declared here,
-- where applying it is recorded and re-runnable, and the function's version
-- becomes the belt rather than the braces.
--
-- WHY THE ORDER MATTERS, AND WHY THIS ONE GOES FIRST
--
-- Granting the insert policies while the buckets were still public would have
-- made things WORSE than leaving them broken. Uploads have never worked — RLS
-- is on for `storage.objects` with no policies at all — so these buckets hold
-- zero objects. Policies alone would start customer photographs and home
-- walkthrough videos flowing into buckets that anyone holding a URL can read.
-- Private first, then the writes.
--
-- WHAT THE LIMITS ARE, AND WHERE THEY COME FROM
--
-- Exactly `JOB_MEDIA_BUCKETS` in the edge function, so the two cannot disagree
-- and a later run of `ensureStorageBuckets` cannot quietly undo this. If you
-- change one, change the other.
--
--   project-photos       15MB   images only
--   project-videos      200MB   mp4, webm, quicktime, m4v
--   project-blueprints   50MB   pdf and scan images
--
-- Blueprints upload to `project-blueprints`, which is the bucket whose
-- allow-list contains `application/pdf`. They were going to `project-photos`,
-- which accepts images and nothing else — harmless only for as long as no
-- allow-list was enforced, and a silent rejection of every PDF the moment one
-- was. Fixed in `ClientWorkRequestForm` in the same change as this.
--
-- NO DATA MIGRATION IS NEEDED, and that is not optimism: these three buckets
-- have never held a single object, so there are no legacy public URLs to break
-- and nothing stored under the old blueprint path.
-- ============================================================================

update storage.buckets
   set public = false,
       file_size_limit = 15 * 1024 * 1024,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp',
         'image/gif', 'image/heic', 'image/heif'
       ]
 where id = 'project-photos';

update storage.buckets
   set public = false,
       -- A phone shoots big files and a walkthrough is the largest thing a
       -- customer sends. Generous, but not unbounded: unbounded is how a free
       -- consumer side becomes an unbounded bill.
       file_size_limit = 200 * 1024 * 1024,
       allowed_mime_types = array[
         'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'
       ]
 where id = 'project-videos';

update storage.buckets
   set public = false,
       file_size_limit = 50 * 1024 * 1024,
       allowed_mime_types = array[
         'application/pdf',
         'image/jpeg', 'image/png', 'image/webp', 'image/tiff'
       ]
 where id = 'project-blueprints';
