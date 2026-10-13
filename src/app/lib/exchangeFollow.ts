/**
 * Who this resident has chosen to hear from.
 *
 * WHY THIS IS NOT THE SAVED HOOK WITH A FLAG
 *
 * It looks almost identical to `exchangeSaved.ts` and it is deliberately a
 * separate thing, because the two mean opposite kinds of commitment. Saving is
 * a bookmark: private, silent, and the business never learns of it. Following
 * is consent to hear from them. A shared implementation with a `kind`
 * parameter would invite exactly one future change — "while we are here, let
 * us show businesses their savers too" — and that change must stay hard.
 *
 * One fetch per page, shared by every button on it, and nothing is asked at
 * all when there is no session: most people reading the Exchange have no
 * account, which is the design rather than a failure.
 */
import { useCallback, useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { supabase } from './supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export function useFollowedBusinesses() {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [known, setKnown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { if (!cancelled) setKnown(true); return; }

        const res = await fetch(`${SERVER}/exchange/me/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && body?.success && Array.isArray(body.following)) {
          setFollowedIds(new Set(body.following.map((b: any) => String(b.id))));
        }
      } catch {
        // Unreachable means every button reads "Follow", which is the safe way
        // to be wrong: following again is idempotent on the server.
      } finally {
        if (!cancelled) setKnown(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const note = useCallback((orgId: string, following: boolean) => {
    setFollowedIds((current) => {
      const next = new Set(current);
      if (following) next.add(orgId); else next.delete(orgId);
      return next;
    });
  }, []);

  return { followedIds, known, note };
}
