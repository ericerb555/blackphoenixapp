/**
 * Phoenix Exchange — a business putting its logo on its own listing.
 *
 * WHY THIS IS THE REWARD FOR CLAIMING, AND THEREFORE WORTH GETTING RIGHT
 *
 * Eighteen of 1,108 listings are claimed. Claiming today earns the right to
 * correct your own details, which is a chore, not a reward. A logo is the first
 * thing a business gets that is visibly a gain: it is the only piece of
 * branding a listing may carry, and it is what makes a claimed business look
 * different from the thousand that are not.
 *
 * WHAT THIS SCREEN IS CAREFUL TO SAY
 *
 * That uploading is not publishing. The commonest way a review queue earns
 * distrust is that somebody submits, sees their image on screen, assumes it is
 * live, and then finds out days later that it was not. So the waiting is named
 * as a step, the preview is labelled with what state it is in, and a rejection
 * always carries the reason — "not accepted" on its own just produces the same
 * image uploaded again.
 *
 * WHY IT REFUSES AN SVG OUT LOUD
 *
 * Most logos are SVGs, so being turned down is the likely case and a vague
 * error would be infuriating. The server will not take one because these files
 * are served from a public bucket and an SVG is a document that can carry
 * script. Saying so, and naming what to export instead, turns a dead end into
 * one more step.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. Named classes and inline styles only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Upload, Trash2, Clock, CheckCircle2, XCircle, ImageIcon,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface LogoView {
  state: string;
  says: string;
  reason: string | null;
  url: string | null;
  public: boolean;
  submittedAt: string | null;
  maxBytes: number;
}

interface Props {
  /** The listing this logo belongs to. The server checks the claim regardless. */
  orgId: string;
  /** `Bearer …`, or null when there is no session. */
  auth: () => Promise<string | null>;
}

const BADGE: Record<string, { icon: typeof Clock; colour: string; word: string }> = {
  submitted: { icon: Clock, colour: '#fcd34d', word: 'Waiting for review' },
  approved: { icon: CheckCircle2, colour: '#86efac', word: 'On your listing' },
  rejected: { icon: XCircle, colour: '#fca5a5', word: 'Not accepted' },
};

export default function ExchangeLogoPanel({ orgId, auth }: Props) {
  const [logo, setLogo] = useState<LogoView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    setSaid(null);
    try {
      const header = await auth();
      if (!header) { setLoading(false); return; }
      const res = await fetch(`${SERVER}/exchange/business/logo?org=${encodeURIComponent(orgId)}`, {
        headers: { Authorization: header },
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.success) setLogo(payload.logo ?? null);
      else setSaid({ ok: false, text: payload?.error || 'We could not read your logo.' });
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setLoading(false);
    }
  }, [orgId, auth]);

  useEffect(() => { void load(); }, [load]);

  const send = useCallback(async (chosen: File) => {
    setBusy(true);
    setSaid(null);
    try {
      const header = await auth();
      if (!header) { setSaid({ ok: false, text: 'Sign in first.' }); return; }

      const form = new FormData();
      form.append('org', orgId);
      form.append('file', chosen);

      /* No Content-Type header: the browser sets it with the multipart boundary,
         and setting it by hand produces a body the server cannot parse. */
      const res = await fetch(`${SERVER}/exchange/business/logo`, {
        method: 'POST',
        headers: { Authorization: header },
        body: form,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setSaid({ ok: false, text: payload?.error || 'That did not upload.' });
        return;
      }
      setLogo(payload.logo ?? null);
      setSaid({ ok: true, text: payload.note || 'Uploaded. We will look at it before it goes on your listing.' });
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }, [orgId, auth]);

  const remove = useCallback(async () => {
    setBusy(true);
    setSaid(null);
    try {
      const header = await auth();
      if (!header) { setSaid({ ok: false, text: 'Sign in first.' }); return; }
      const res = await fetch(`${SERVER}/exchange/business/logo?org=${encodeURIComponent(orgId)}`, {
        method: 'DELETE',
        headers: { Authorization: header },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setSaid({ ok: false, text: payload?.error || 'That did not come down.' });
        return;
      }
      setLogo(payload.logo ?? null);
      setSaid({ ok: true, text: 'Taken down.' });
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setBusy(false);
    }
  }, [orgId, auth]);

  const state = logo?.state ?? 'none';
  const badge = BADGE[state];
  const megabytes = logo ? Math.round(logo.maxBytes / 1024 / 1024) : 2;

  return (
    <div className="bpxb-section">
      <div className="bpxb-section-head">
        <div className="bpxb-section-name">Your logo</div>
        <div className="bpxb-section-tag">
          {/* Named as a step, not left as a silence. */}
          looked at before it goes on your listing
        </div>
      </div>

      {loading && (
        <div className="bpx-desc"><Loader2 size={15} className="animate-spin" /> Looking…</div>
      )}

      {!loading && (
        <div className="bpxb-logo-row">
          <div className="bpxb-logo-frame" data-empty={!logo?.url}>
            {logo?.url
              ? <img src={logo.url} alt="Your logo" />
              : <ImageIcon size={22} color="#6b7280" />}
          </div>

          <div className="bpxb-logo-words">
            {badge && (
              <div className="bpxb-logo-badge" style={{ color: badge.colour }}>
                <badge.icon size={14} /> {badge.word}
              </div>
            )}
            <div className="bpxb-note">{logo?.says ?? 'No logo yet.'}</div>

            <div className="bpxb-logo-acts">
              <button
                type="button"
                className="bpx-btn bpx-btn-primary"
                disabled={busy || !orgId}
                onClick={() => file.current?.click()}
              >
                {busy
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Upload size={15} />}
                {state === 'none' ? 'Upload a logo' : 'Replace it'}
              </button>

              {state !== 'none' && (
                <button type="button" className="bpx-btn" disabled={busy} onClick={() => void remove()}>
                  <Trash2 size={15} /> Take it down
                </button>
              )}
            </div>

            {/*
              The one thing worth saying before they choose a file rather than
              after: most logos are SVGs, and this will not take one.
            */}
            <div className="bpxb-note">
              A JPEG, PNG or WebP, under {megabytes}MB. Not an SVG — those are
              documents that can carry code and we will not serve one. Export a
              PNG with a transparent background if you have the choice.
            </div>

            {/*
              Replacing an approved logo takes it down until somebody looks
              again. Said here because it is a real cost and finding out
              afterwards would feel like a bug.
            */}
            {state === 'approved' && (
              <div className="bpxb-note">
                Replacing it takes it off your listing until we have looked at
                the new one — what residents see has to be what somebody
                reviewed.
              </div>
            )}

            {said && <div className={said.ok ? 'bpxb-said' : 'bpxb-failed'}>{said.text}</div>}
          </div>

          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (chosen) void send(chosen);
            }}
          />
        </div>
      )}
    </div>
  );
}
