/**
 * Save a business to your own shelf.
 *
 * WHY IT IS VISIBLE TO SIGNED-OUT PEOPLE
 *
 * It would be easy to hide this until somebody signs in, and that would be
 * worse. A resident has no idea the feature exists, so hiding it means nobody
 * ever discovers there is a reason to have an account. Shown to everybody,
 * pressed by a signed-out visitor, it says what it is and offers the sign-in —
 * once, politely, without a modal.
 *
 * WHY THE STATE IS OPTIMISTIC
 *
 * Saving is a bookmark. The cost of showing it saved a moment before the
 * server agrees is nil, and the cost of a spinner on a button somebody presses
 * while scrolling is a page that feels slow. If the request fails the button
 * goes back and says so.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Props {
  orgId: string;
  name: string;
  /** Whether it is already on the shelf, when the caller knows. */
  initiallySaved?: boolean;
  onChange?: (saved: boolean) => void;
}

export default function SaveBusinessButton({ orgId, name, initiallySaved = false, onChange }: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = useCallback(async (event: React.MouseEvent) => {
    // The row around this button selects a map pin, and the listing name next
    // to it is a link. Neither should fire because somebody saved something.
    event.preventDefault();
    event.stopPropagation();

    setBusy(true);
    setNote(null);
    const wanted = !saved;
    setSaved(wanted);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSaved(!wanted);
        setNote('Sign in to keep this');
        return;
      }

      const res = wanted
        ? await fetch(`${SERVER}/exchange/me/saved`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId }),
        })
        : await fetch(`${SERVER}/exchange/me/saved/${encodeURIComponent(orgId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

      if (!res.ok) {
        setSaved(!wanted);
        setNote('That did not save');
        return;
      }
      onChange?.(wanted);
    } catch {
      setSaved(!wanted);
      setNote('That did not save');
    } finally {
      setBusy(false);
    }
  }, [orgId, saved, onChange]);

  return (
    <span className="bpxb-save-wrap">
      <button
        type="button"
        className="bpxb-save"
        data-saved={saved}
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from your saved businesses` : `Save ${name}`}
        title={saved ? 'Saved — only you can see this' : 'Save this, only you can see it'}
      >
        {busy
          ? <Loader2 size={13} className="animate-spin" />
          : saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        {saved ? 'Saved' : 'Save'}
      </button>
      {note && (
        <span className="bpxb-save-note">
          {note === 'Sign in to keep this'
            ? <a href="/login">Sign in to keep this</a>
            : note}
        </span>
      )}
    </span>
  );
}
