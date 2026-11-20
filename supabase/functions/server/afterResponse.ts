/**
 * Finish a piece of work after the reply has gone out.
 *
 * Supabase's edge runtime can tear an isolate down once a handler returns, so a
 * bare fire-and-forget promise is not guaranteed to complete. `waitUntil` keeps
 * the isolate alive until it settles — the same contract as a service worker.
 * Where it is unavailable the promise is still started, which is no worse than
 * what the code did before.
 *
 * Use this only for work whose failure does not change the answer already sent.
 *
 * WHY IT IS ITS OWN FILE
 *
 * It was a private function in `auth.tsx`, which meant the second caller that
 * needed it would have copied it — and the copy is always the one that does
 * not get the fix. `notifyStaffInBackground` in `staff-notifications.tsx` is
 * what a bare version looks like: a real `.catch`, no `waitUntil`, and a staff
 * email that may or may not survive the handler returning.
 *
 * The server deploys from a FLAT build, so this sits beside its callers rather
 * than under `_shared/`.
 */
export function afterResponse(work: Promise<unknown>, label: string): void {
  const settled = work.catch((err) =>
    console.log(`[after-response:${label}] ${err?.message || err}`));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (typeof runtime?.waitUntil === 'function') runtime.waitUntil(settled);
}
