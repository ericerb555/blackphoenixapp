-- ============================================================================
-- Customer job media becomes private
--
-- `project-photos`, `project-videos` and `project-blueprints` were created as
-- PUBLIC buckets with no size limit and no type restriction, and the upload
-- helpers handed out permanent `getPublicUrl` links. Anyone holding a URL
-- could open a customer's job-site photographs and their blueprints, invited
-- to bid or not.
--
-- That was survivable while the audience was a handful of invited
-- subcontractors. Phoenix Exchange broadcasts work to a marketplace and asks
-- customers for video walkthroughs of the inside of their homes, so it is not
-- survivable now. This is the storage half of the fix; the bucket flags and
-- the read path are in the edge function (`ensureStorageBuckets` and
-- `mediaSigning.ts`).
--
-- WHAT THIS GRANTS, AND MORE IMPORTANTLY WHAT IT DOES NOT
--
-- Writes only. There is deliberately NO select, update or delete policy for
-- `anon` or `authenticated` on these buckets, which means:
--
--   * nothing can be read from them with a browser key, at all
--   * every read goes through the server, which signs a short-lived URL after
--     deciding the caller may see that record
--   * a signed-in subcontractor cannot mint a link to a customer's
--     photographs by guessing or harvesting a path
--
-- The service role bypasses row-level security, which is how the signer works
-- and why no read policy is needed for it.
--
-- WHY ANONYMOUS UPLOAD IS STILL ALLOWED
--
-- The work request form supports a public intake path for new customers —
-- `${user?.id || 'guest'}/...` — so a household that has not signed up yet can
-- still send photographs with their request. Removing that would close the
-- front door to new business.
--
-- It is narrowed rather than removed: an anonymous upload may only land under
-- `guest/`, and the bucket now carries a size cap and a MIME allow-list that
-- it did not have before. This is strictly tighter than today, where anybody
-- could upload anything of any size AND read everything back.
--
-- TEST THIS SOMEWHERE THAT IS NOT PRODUCTION FIRST. If the policies are wrong
-- the symptom is that customers silently cannot attach photographs to a work
-- request, which is the kind of failure nobody reports and everybody feels.
-- ============================================================================

-- Old permissive policies may exist from the dashboard rather than from a
-- migration, under any name. These are the names this file owns; dropping
-- them first keeps the migration re-runnable.
drop policy if exists job_media_insert_authenticated on storage.objects;
drop policy if exists job_media_insert_guest on storage.objects;


-- ------------------------------------------------------------
-- A signed-in person may attach media to a request.
--
-- Not scoped to a per-user folder on purpose: staff upload under
-- `admin-upload/` from the pipeline view, customers under their own user id,
-- and narrowing by prefix here would break one of the two. The account is
-- identified and the bucket is unreadable without the server, which is where
-- the real control sits.
-- ------------------------------------------------------------
create policy job_media_insert_authenticated on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('project-photos', 'project-videos', 'project-blueprints')
  );


-- ------------------------------------------------------------
-- A household that has not signed up yet may attach media, but only under
-- `guest/`, so anonymous traffic cannot write into a path that looks like it
-- belongs to a real account.
-- ------------------------------------------------------------
create policy job_media_insert_guest on storage.objects
  for insert to anon
  with check (
    bucket_id in ('project-photos', 'project-videos', 'project-blueprints')
    and (storage.foldername(name))[1] = 'guest'
  );


-- ------------------------------------------------------------
-- Deliberately absent: select, update and delete for anon and authenticated.
--
-- If a future change needs a browser to read one of these objects directly,
-- that is a decision to make on purpose rather than by adding a policy to make
-- an error message go away. The correct answer is almost always a signed URL
-- from the server instead.
-- ------------------------------------------------------------
