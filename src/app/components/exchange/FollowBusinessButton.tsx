/**
 * Hear from a business when they have something on.
 *
 * WHY THE WORDING IS NOT "FOLLOW"
 *
 * "Follow" is a social-network verb and it sets the wrong expectation: people
 * read it as a feed, and then resent the business for appearing in it. The
 * label says what actually happens — you will see their deals — so nobody is
 * surprised by the consequence of pressing it.
 *
 * WHY IT SITS BESIDE SAVE AND LOOKS DIFFERENT
 *
 * Saving is private and silent; this is consent to hear from somebody. They
 * are genuinely different commitments, so they should not look like two
 * instances of the same control.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Props {
  orgId: string;
  name: string;
  initiallyFollowing?: boolean;
  onChange?: (following: boolean) => void;
}

export default function FollowBusinessButton({
  orgId, name, initiallyFollowing = false, onChange,
}: Props) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // The answer arrives after the first render, so the initial value alone is
  // not enough. Guarded on `busy` so a request in flight is not overwritten.
  useEffect(() => {
    if (!busy) setFollowing(initiallyFollowing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiallyFollowing]);

  const toggle = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setBusy(true);
    setNote(null);
    const wanted = !following;
    setFollowing(wanted);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setFollowing(!wanted);
        setNote('sign-in');
        return;
      }

      const res = wanted
        ? await fetch(`${SERVER}/exchange/me/following`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId }),
        })
        : await fetch(`${SERVER}/exchange/me/following/${encodeURIComponent(orgId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

      if (!res.ok) { setFollowing(!wanted); setNote('failed'); return; }
      onChange?.(wanted);
    } catch {
      setFollowing(!wanted);
      setNote('failed');
    } finally {
      setBusy(false);
    }
  }, [orgId, following, onChange]);

  return (
    <span className="bpxb-save-wrap">
      <button
        type="button"
        className="bpxb-follow"
        data-following={following}
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        aria-label={following
          ? `Stop seeing deals from ${name}`
          : `See deals from ${name}`}
        title={following
          ? 'You will see their deals. They are never told who follows them.'
          : 'See their deals on your own page. They are never told who follows them.'}
      >
        {busy
          ? <Loader2 size={13} className="animate-spin" />
          : following ? <Bell size={13} /> : <BellOff size={13} />}
        {following ? 'Getting deals' : 'Get their deals'}
      </button>
      {note && (
        <span className="bpxb-save-note">
          {note === 'sign-in'
            ? <a href="/login">Sign in to get their deals</a>
            : 'That did not work'}
        </span>
      )}
    </span>
  );
}
