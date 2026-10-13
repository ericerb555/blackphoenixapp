/**
 * What is already on this resident's shelf.
 *
 * WHY A SHARED HOOK RATHER THAN A FLAG PER BUTTON
 *
 * The first version of the save button always started on "Save", because
 * nothing told it otherwise. So a business you had already kept invited you to
 * keep it again, and the only way to find out was to press it. A control that
 * misreports its own state is worse than no control: it makes a resident
 * distrust the shelf, which is the entire feature.
 *
 * One fetch per page, shared by every button on it. A category page has
 * forty-five of them, and forty-five requests to answer one question would be
 * absurd.
 *
 * SIGNED OUT IS NOT AN ERROR
 *
 * Most people reading the Exchange have no account, by design. With no session
 * this asks nothing and reports an empty shelf, which is the truth — not a
 * failure to report.
 */
import { useCallback, useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { supabase } from './supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export function useSavedBusinesses() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  /** Whether the answer is known yet. Buttons wait rather than flicker. */
  const [known, setKnown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { if (!cancelled) setKnown(true); return; }

        const res = await fetch(`${SERVER}/exchange/me/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && body?.success && Array.isArray(body.saved)) {
          setSavedIds(new Set(body.saved.map((b: any) => String(b.id))));
        }
      } catch {
        // An unreachable shelf leaves every button saying "Save", which is the
        // safe way to be wrong: pressing it is idempotent on the server.
      } finally {
        if (!cancelled) setKnown(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /** Keep the page in step when a button changes something. */
  const note = useCallback((orgId: string, saved: boolean) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (saved) next.add(orgId); else next.delete(orgId);
      return next;
    });
  }, []);

  return { savedIds, known, note };
}
