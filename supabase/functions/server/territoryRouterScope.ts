/**
 * Which paths the territory router's staff gate owns.
 *
 * ITS OWN FILE SO IT CAN BE TESTED. `node --test` cannot import a `.tsx`, and
 * the route module pulls in `npm:hono@4.13.19` besides — so the pure decision lives
 * here, beside `junkLinks.ts` and `anonPricer.ts`, and
 * `tests/territoryRouterScope.test.ts` holds it to its word.
 *
 * WHY THIS IS NOT `requireStaffOn`
 *
 * That helper matches `p === base || p.startsWith(base + '/')`, and for this
 * module a prefix is wrong twice — both times on live routes served by other
 * files:
 *
 *   `/applications`   is on PUBLIC_POST_PATHS. The subcontractor, vendor and
 *                     service-provider forms post to it with NO session. A
 *                     prefix match would have put a staff gate in front of the
 *                     public application forms.
 *   `/analytics`      this module owns the bare path. `/analytics/summary` and
 *                     `/analytics/portfolio/:email` belong elsewhere and are
 *                     read by the reporting and investor screens.
 *
 * The router is mounted at the API prefix, so its `use('*')` sees every request
 * the server handles: a prefix one character too greedy takes real traffic with
 * it, which has happened here before — a `use('*', requireStaff)` once took the
 * whole API staff-only, `/health` included, for a deploy.
 *
 * `/applications/:id/approve` is deliberately absent: it carries its own check,
 * verified against a real non-staff session, and a second gate would only
 * change the message that test asserts on.
 */
export function ownedByThisRouter(pathname: string): boolean {
  const segs = pathname.split('/').filter(Boolean);
  if (segs[0] !== 'make-server-3eae23a6') return false;
  const family = segs[1];
  if (family === 'territories') return true;
  if (family === 'applications' && segs[2] === 'status') return true;
  if (family === 'applications' && segs[3] === 'reject') return true;
  if (segs.length === 2 && (family === 'members' || family === 'founders' || family === 'analytics')) {
    return true;
  }
  return false;
}
